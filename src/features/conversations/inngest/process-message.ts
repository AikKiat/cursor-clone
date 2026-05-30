

import { Id } from "@/../convex/_generated/dataModel";
import { inngest } from "@/ingest/client";
import { convex } from "@/lib/convex-client";
import { NonRetriableError } from "inngest";
import { api, internal } from "../../../../convex/_generated/api";

interface MessageEvent {
    messageId: Id<"messages">;
    conversationId: Id<"conversations">;
    projectId: Id<"projects">;
    message: string;
}


//create the inngest background job to invoke the client``
export const processMessage = inngest.createFunction(
    {
        id: "process-message",
        cancelOn: [
            {
                //cancel this function on the event of message/cancel, and ONLY if the id matches data.messageId
                event: "message/cancel",
                if: "event.data.message == async.data.messageId",
            },
        ],
        onFailure: async ({ event, step }) => {
            const { messageId } = event.data.event.data as MessageEvent;
            const internalKey = process.env.CURSOR_CLONE_CONVEX_INTERNAL_KEY;

            if (internalKey) {
                await step.run("update-message-on-failure", async () => {
                    await convex.mutation(api.system.updateMessageContent, {
                        internalKey,
                        messageId,
                        content: "My Aplogies, I am unable to process this message at the moment."
                    });
                });
            }
        }
    },
    {
        event: "message/sent",
    },
    async ({ event, step }) => {
        const {
            messageId,
            // conversationId,
            // projectId,
            // message
        } = event.data as MessageEvent;

        const internalKey = process.env.CURSOR_CLONE_CONVEX_INTERNAL_KEY;

        if (!internalKey) {
            throw new NonRetriableError("[INNGEST BACKGROUND JOB INVOKE] CURSOR_CLONE_CONVEX_INTERNAL_KEY is not configured.");
        }

        await step.sleep("wait-for-ai-processing", "5s");

        await step.run("update-assistant-message", async () => {
            await convex.mutation(api.system.updateMessageContent, {
                internalKey,
                messageId,
                content: " AI Processing done"
            })
        })
    }
);
