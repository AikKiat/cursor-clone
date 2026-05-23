import { v } from "convex/values";
import { mutation, query } from "./_generated/server";


const validateInternalKey = (key: string) => {
    const internalKey = process.env.CURSOR_CLONE_CONVEX_INTERNAL_KEY;
    if (!internalKey) {
        throw new Error("[CONVEX CLIENT SYSTEM.TS] Error, CONVEX_INTERNAL_KEY is not configured");
    }

    if (key !== internalKey) {
        throw new Error("[CONVEX CLIENT SYSTEM.TS] Error, invalid internal key");

    }
}


export const getConversationById = query({
    args: {
        conversationId: v.id("conversations"),
        internalKey: v.string()
    },
    handler: async (ctx, args) => {

        //Check for Internal Key validity first, no not just anyone call call this CONVEX client query function!!!
        validateInternalKey(args.internalKey);

        return await ctx.db.get(args.conversationId);
    }
});


export const createMessage = mutation({
    args: {
        internalKey: v.string(),
        conversationId: v.id("conversations"),
        projectId: v.id("projects"),
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
        status: v.optional(
            v.union(
                v.literal("completed"),
                v.literal("processing"),
                v.literal("cancelled"),
            )
        )
    },
    handler: async (ctx, args) => {
        validateInternalKey(args.internalKey);

        const messageId = await ctx.db.insert("messages", {
            conversationId: args.conversationId,
            projectId: args.projectId,
            role: args.role,
            content: args.content,
            status: args.status,
        });

        await ctx.db.patch(args.conversationId, {
            updatedAt: Date.now(),
        });

        return messageId;
    }
});


export const updateMessageContent = mutation({
    args: {
        internalKey: v.string(),
        messageId: v.id("messages"),
        content: v.string(),
    },

    handler: async (ctx, args) => {
        validateInternalKey(args.internalKey);

        await ctx.db.patch(args.messageId, {
            //patch in the content, so that it becomes from "" (default value) to actual response from AI procured from Inngest background job result
            content: args.content,
            status: "completed" as const
        })
    }
})

