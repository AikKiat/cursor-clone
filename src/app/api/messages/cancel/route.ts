import { auth } from "@clerk/nextjs/server";
import { startOfMinute } from "date-fns";
import { MessageCircleCode } from "lucide-react";
import { NextResponse } from "next/server";
import { truncateByDomain } from "recharts/types/util/ChartUtils";
import z, { success } from "zod";
import { ModelSelectorGroup } from "@/components/ai-elements/model-selector";
import { inngest } from "@/ingest/client";
import { convex } from "@/lib/convex-client";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

const requestSchema = z.object({
	projectId: z.string(),
});

export async function POST(request: Request) {
	const { userId } = await auth();

	if (!userId) {
		return NextResponse.json(
			{ error: "[AI CONVERSATION CANCEL MESSAGE ROUTE] Unauthorised" },
			{ status: 401 },
		);
	}

	const body = await request.json();

	const { projectId } = requestSchema.parse(body);

	const internalKey = process.env.CURSOR_CLONE_CONVEX_INTERNAL_KEY;

	if (!internalKey) {
		return NextResponse.json(
			{
				error:
					"[AI CONVERSATION CANCEL MESSAGE ROUTE] Error, internalKey is not configured",
			},
			{
				status: 500,
			},
		);
	}

	//FInd all the processing messages in this project and cancel their processing!!!

	const processingMessages = await convex.query(
		api.system.getProcessingMessages,
		{
			internalKey,
			projectId: projectId as Id<"projects">,
		},
	);

	if (processingMessages.length === 0) {
		return NextResponse.json({ success: true, cancelled: false });
	}

	//Else, if there actually are messages currently processing, cancel them

	//We loop through all currently processing messages, send the
	//event to cancel each of their uniquely associated inngest
	//background jobs
	const cancelledIds = await Promise.all(
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

			return message._id; //over here, return this particular message's id out of this callback,
			//and it gets added thus, into the array which is cancelledIds.
		}),
	);

	return NextResponse.json({
		success: true,
		messageIds: cancelledIds,
	},{status:200});
}
