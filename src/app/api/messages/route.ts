import { convex } from "@/lib/convex-client";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import z from "zod";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { inngest } from "@/ingest/client";




const requestSchema = z.object({
    conversationId: z.string(),
    message: z.string()
});


export async function POST(request: Request) {
    const { userId } = await auth();

    if (!userId) {
        return NextResponse.json(
            { error: "[API MESSAGES ROUTE.TS] Error, unauthorized" },
            { status: 401 });
    }

    const internalKey = process.env.CURSOR_CLONE_CONVEX_INTERNAL_KEY;

    if (!internalKey) {
        return NextResponse.json(
            { error: "[API MESSAGE ROUTE.TS] Internal key is not configured" },
            { status: 500 }
        );
    }

    const body = await request.json();

    const { conversationId, message } = requestSchema.parse(body);

    //Call convex mutation
    const conversation = await convex.query(api.system.getConversationById, { conversationId: conversationId as Id<"conversations">, internalKey });

    if (!conversation) {
        return NextResponse.json({
            error: `[API MESSAGE ROUTE.TS] Error, conversation is not found for given id: ${conversationId}.`
        }, { status: 404 });
    }

    const projectId = conversation.projectId;

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
        role: "assistant",//created message from AI. We create the tuple entry (relational database) first, 
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
        data :{
            messageId:assistantMessageId
        },
    }); 


    //Invoke Inngest Background AI query job to process the message!
    return NextResponse.json({
        success: true,
        eventId: 0,
        messageId: assistantMessageId
    });

}
