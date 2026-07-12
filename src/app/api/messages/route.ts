import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import z from "zod";
import { processMessage } from "@/features/conversations/inngest/process-message";
import { inngest } from "@/ingest/client";
import { convex } from "@/lib/convex-client";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

const requestSchema = z.object({
	conversationId: z.string(),
	message: z.string(),
});

export async function POST(request: Request) {
	const { userId } = await auth();

	if (!userId) {
		return NextResponse.json(
			{ error: "[API MESSAGES ROUTE.TS] Error, unauthorized" },
			{ status: 401 },
		);
	}

	const internalKey = process.env.CURSOR_CLONE_CONVEX_INTERNAL_KEY;

	if (!internalKey) {
		return NextResponse.json(
			{ error: "[API MESSAGE ROUTE.TS] Internal key is not configured" },
			{ status: 500 },
		);
	}

	const body = await request.json();

	const { conversationId, message } = requestSchema.parse(body);

	//Call convex mutation
	const conversation = await convex.query(api.system.getConversationById, {
		conversationId: conversationId as Id<"conversations">,
		internalKey,
	});

	if (!conversation) {
		return NextResponse.json(
			{
				error: `[API MESSAGE ROUTE.TS] Error, conversation is not found for given id: ${conversationId}.`,
			},
			{ status: 404 },
		);
	}

	const projectId = conversation.projectId;

	// NOTE: This extra check of cancelling currently processing messages,
	//is only if users are alright with their current chats not continuing
	//when deciding to start a new one, and send a new message to this new chat.
	//first, check for processing messages, and cancel all of them. This is to prevent unhandled background jobs from being spammed to be built unprecendentedly
	
    const processingMessages = await convex.query(
		api.system.getProcessingMessages,
		{
			internalKey,
			projectId,
		},
	);

	if (processingMessages.length > 0) {
		//We loop through all currently processing messages, send the
		//event to cancel each of their uniquely associated inngest
		//background jobs
		await Promise.all(
			processingMessages.map(async (message) => {
				await inngest.send({
					name: "message/cancel",
					data: {
						messageId: message._id,
					},
				});
				//and then over here also update the status in the db
				await convex.mutation(api.system.updateMessageStatus, {
					internalKey,
					messageId: message._id,
					status: "cancelled",
				});
			}),
		);
	}

	//convex variable is from convex-client in lib folder which declares the new HTTP Client convex class
	await convex.mutation(api.system.createMessage, {
		internalKey,
		conversationId: conversationId as Id<"conversations">,
		projectId,
		role: "user", //role of user meaning this created message is based off the human's typed input.
		//AI generated response is handled later from Inngest's background AI LLM invokation
		content: message,
	});

	const assistantMessageId = await convex.mutation(api.system.createMessage, {
		internalKey,
		conversationId: conversationId as Id<"conversations">,
		projectId,
		role: "assistant", //created message from AI. We create the tuple entry (relational database) first,
		//then when Inngest's background AI call finishes, we get the content and patch it in!
		//That's why the content now is still "" and the status is "processing"
		content: "",
		status: "processing",
	});

	//Signal to inngest client over here cound to this registered NEXTJS app undr Inngest server,
	//to send the EVENT of "message/sent" to the main server which will hence call the registered function(s) WHICH ARE SUBSCRIBED to this event!
	//Declared in the api/inngest/route.ts
	const event = await inngest.send({
		name: "message/sent",
		data: {
			messageId: assistantMessageId,
            conversationId,
            projectId,
            message,
		},
	});

	//Invoke Inngest Background AI query job to process the message!
	return NextResponse.json({
		success: true,
		eventId: 0,
		messageId: assistantMessageId,
	});
}
