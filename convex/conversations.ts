import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { verifyAuthentication } from "./auth";



export const create = mutation({
    args: {
        projectId: v.id("projects"),
        title: v.string(),
    },

    handler: async (ctx, args) => {
        const identity = await verifyAuthentication(ctx);
        const project = await ctx.db.get("projects", args.projectId); //pass in the projectId as argument

        if (!project) {
            throw new Error("[CONVEX CLIENT CREATE AI CHAT CONVERSATION] Error, project not found");
        }

        if (project.ownerId !== identity.subject) {
            throw new Error("[CONVEX CLIENT CREATE AI CHAT CONVERSATION] Error, unauthorized access to this project. UserID provided is not equal to userId assigned to this project!");
        }

        const conversationId = await ctx.db.insert("conversations", {
            projectId: args.projectId,
            title: args.title,
            updatedAt: Date.now(),
        });

        return conversationId;
    },
});


export const getById = query({
    args: {
        id: v.id("conversations")
    },

    handler: async (ctx, args) => {

        const identity = await verifyAuthentication(ctx);

        const conversation = await ctx.db.get("conversations", args.id);
        if (!conversation) {
            throw new Error(`[CONVEX CLIENT FETCH CONVERSATION] Error, conversation for given id: ${args.id} is null`)
        }

        const project = await ctx.db.get("projects", conversation.projectId);

        if (!project) {
            throw new Error(`[CONVEX CLIENT FETCH CONVERSATION] Error, project object for project id: ${conversation.projectId} tied to given conversation: ${args.id} is null.`);
        }

        if (project.ownerId !== identity.subject) {
            throw new Error(`[CONVEX CLIENT FETCH CONVERSATION] Error, current userId does not match userId assigned to the project this conversation belongs to. Unauthorized access.`);
        }

        return conversation;

    }
});


export const getByProject = query({
    args: {
        projectId: v.id("projects"),
    },

    handler: async (ctx, args) => {
        const identity = await verifyAuthentication(ctx);

        const project = await ctx.db.get("projects", args.projectId);

        if (!project) {
            throw new Error(`[CONVEX CLIENT FETCH CONVERSATION] Error, project object for given projectId: ${args.projectId} is null.`);
        }

        if (project.ownerId !== identity.subject) {
            throw new Error(`[CONVEX CLIENT FETCH CONVERSATION] Error, current userId does not match userId assigned to the project this conversation belongs to. Unauthorized access.`);
        }

        return await ctx.db.query("conversations")
            .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
            .order("desc")
            .collect();
    },
});


export const getMessages = query({
    args: {
        conversationId: v.id("conversations"),
    },

    handler: async (ctx, args) => {
        const identity = await verifyAuthentication(ctx);

        const conversation = await ctx.db.get("conversations", args.conversationId);

        if (!conversation) {
            throw new Error(`[CONVEX CLIENT FETCH CONVERSATION] Error, conversation object for given conversationId: ${args.conversationId} is null.`);
        }

        const project = await ctx.db.get("projects", conversation.projectId);

        if (!project) {
            throw new Error(`[CONVEX CLIENT FETCH CONVERSATION] Error, project object for given projectId: ${conversation.projectId} is null.`);
        }

        if (project.ownerId !== identity.subject) {
            throw new Error(`[CONVEX CLIENT FETCH CONVERSATION] Error, current userId does not match userId assigned to the project this conversation belongs to. Unauthorized access.`);
        }

        return await ctx.db.query("messages")
            .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
            .order("asc")
            .collect();
    },
});
