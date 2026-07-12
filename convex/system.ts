import { v } from "convex/values";
import type {Id} from "./_generated/dataModel.d.ts";
import { mutation, query } from "./_generated/server";

const validateInternalKey = (key: string) => {
	const internalKey = process.env.CURSOR_CLONE_CONVEX_INTERNAL_KEY;
	if (!internalKey) {
		throw new Error(
			"[CONVEX CLIENT SYSTEM.TS] Error, CONVEX_INTERNAL_KEY is not configured",
		);
	}

	if (key !== internalKey) {
		throw new Error("[CONVEX CLIENT SYSTEM.TS] Error, invalid internal key");
	}
};

export const getConversationById = query({
	args: {
		conversationId: v.id("conversations"),
		internalKey: v.string(),
	},
	handler: async (ctx, args) => {
		//Check for Internal Key validity first, no not just anyone call call this CONVEX client query function!!!
		validateInternalKey(args.internalKey);

		return await ctx.db.get(args.conversationId);
	},
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
			),
		),
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
	},
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
			status: "completed" as const,
		});
	},
});

export const getProcessingMessages = query({
	args: {
		internalKey: v.string(),
		projectId: v.id("projects"),
	},
	handler: async (ctx, args) => {
		validateInternalKey(args.internalKey);

		return await ctx.db
			.query("messages")
			.withIndex("by_project_status", (q) =>
				q.eq("projectId", args.projectId).eq("status", "processing"),
			)
			.collect();
	},
});

export const updateMessageStatus = mutation({
	args: {
		internalKey: v.string(),
		messageId: v.id("messages"),
		status: v.union(
			v.literal("processing"),
			v.literal("completed"),
			v.literal("cancelled"),
		),
	},

	handler: async (ctx, args) => {
		validateInternalKey(args.internalKey);

		await ctx.db.patch(args.messageId, {
			status: args.status,
		});
	},
});

export const getRecentMessages = query({
	args: {
		internalKey: v.string(),
		conversationId: v.id("conversations"),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		validateInternalKey(args.internalKey);

		const messages = await ctx.db
			.query("messages")
			.withIndex("by_conversation", (q) =>
				q.eq("conversationId", args.conversationId),
			)
			.order("asc")
			.collect();

		const limit = args.limit ?? 10;
		return messages.slice(-1, -1 - limit - 1); //the top 10
	},
});

export const updateConversatinTitle = mutation({
	args: {
		internalKey: v.string(),
		conversationId: v.id("conversations"),
		title: v.string(),
	},
	handler: async (ctx, args) => {
		validateInternalKey(args.internalKey);
		await ctx.db.patch(args.conversationId, {
			title: args.title,
			updatedAt: Date.now(), //patch the tuple of conversationId = conversationId --> updated tuple and then new createdAt date
		});
	},
});

//used for Agent "list files" functionality
export const getProjectFiles = query({
	args: {
		internalKey: v.string(),
		projectId: v.id("projects"),
	},
	handler: async (ctx, args) => {
		validateInternalKey(args.internalKey);

		return await ctx.db
			.query("files")
			.withIndex("by_project", (q) => q.eq("projectId", args.projectId))
			.collect();
	},
});

export const getFileById = query({
	args: {
		internalKey: v.string(),
		fileId: v.id("files"),
	},
	handler: async (ctx, args) => {
		validateInternalKey(args.internalKey);
		return await ctx.db.get(args.fileId);
	},
});

export const updateFile = mutation({
	args: {
		internalKey: v.string(),
		fileId: v.id("files"),
		content: v.string(),
	},
	handler: async (ctx, args) => {
		validateInternalKey(args.internalKey);
		const file = await ctx.db.get(args.fileId);

		if (!file) {
			throw new Error(
				`[CONVEX CLIENT SYSTEM.TS] Error, failed to retrieve file data object for given id: {args.fileId}`,
			);
		}

		await ctx.db.patch(args.fileId, {
			content: args.content,
			updatedAt: Date.now(),
		});

		return args.fileId;
	},
});

//Used for Agent create file tool!
export const createFile = mutation({
	args: {
		internalKey: v.string(),
		projectId: v.id("projects"),
		name: v.string(),
		content: v.string(),
		parentId: v.optional(v.id("files")),
	},
	handler: async (ctx, args) => {
		validateInternalKey(args.internalKey);
		const files = await ctx.db
			.query("files")
			.withIndex("by_project_parent", (q) =>
				q.eq("projectId", args.projectId).eq("parentId", args.parentId),
			)
			.collect();

		const existing = files.find(
			(file) => file.name === args.name && file.type === "file",
		);

		if (existing) {
			throw new Error(
				"[CONVEX CLIENT SYSTEM.TS] Error, file already exists. Cannot create duplicate file of same name and type.",
			);
		}

		const fileId = await ctx.db.insert("files", {
			projectId: args.projectId,
			name: args.name,
			type: "file",
			content: args.content,
			parentId: args.parentId,
			updatedAt: Date.now(),
		});

		return fileId;
	},
});

//Used for Agent create file tool!
export const createFiles = mutation({
	args: {
		internalKey: v.string(),
		projectId: v.id("projects"),
		files: v.array(
			v.object({
				name: v.string(),
				content: v.string(),
			}),
		),
		parentId: v.optional(v.id("files")),
	},
	handler: async (ctx, args) => {
		validateInternalKey(args.internalKey);
		const currentFiles = await ctx.db
			.query("files")
			.withIndex("by_project_parent", (q) =>
				q.eq("projectId", args.projectId).eq("parentId", args.parentId),
			)
			.collect();

		const results: { name: string; fileId: string; error?: string }[] = [];

		for (const file of args.files) {
			const existing = currentFiles.find(
				(existingFile) =>
					existingFile.name === file.name && existingFile.type === "file",
			);

			if (existing) {
				results.push({
					name: file.name,
					fileId: existing._id,
					error: "File already exists",
				});
				continue;
			}

			const fileId = await ctx.db.insert("files", {
				projectId: args.projectId,
				name: file.name,
				type: "file",
				content: file.content,
				parentId: args.parentId,
				updatedAt: Date.now(),
			});

			results.push({ name: file.name, fileId: fileId });
		}

		return results;
	},
});

//Used for Agent create folder tool!
export const createFolder = mutation({
	args: {
		internalKey: v.string(),
		projectId: v.id("projects"),
		name: v.string(),
		parentId: v.optional(v.id("files")),
	},
	handler: async (ctx, args) => {
		validateInternalKey(args.internalKey);
		const folders = await ctx.db
			.query("files")
			.withIndex("by_project_parent", (q) =>
				q.eq("projectId", args.projectId).eq("parentId", args.parentId),
			)
			.collect();

		const existing = folders.find(
			(file) => file.name === args.name && file.type === "folder",
		);

		if (existing) {
			throw new Error(
				"[CONVEX CLIENT SYSTEM.TS] Error, folder already exists. Cannot create duplicate folder of same name and type.",
			);
		}

		const folderId = await ctx.db.insert("files", {
			projectId: args.projectId,
			name: args.name,
			type: "folder",
			parentId: args.parentId,
			updatedAt: Date.now(),
		});

		return folderId;
	},
});

export const renameFile = mutation({
	args: {
		newName: v.string(),
		fileId: v.id("files"),
		internalKey: v.string(),
	},

	handler: async (ctx, args) => {
		validateInternalKey(args.internalKey);

		const file = await ctx.db.get("files",args.fileId);

		if (!file) {
			throw new Error(
				"[CONVEX CLIENT SYSTEM.TS] File is not found for renameFile().",
			);
		}
		const siblings = await ctx.db
			.query("files")
			.withIndex("by_project_parent", (q) =>
				q.eq("projectId", file.projectId).eq("parentId", file.parentId),
			).collect();

        const existing = siblings.find(
            (sibling) => sibling.name === args.newName && 
                          sibling.type === file.type && 
                          sibling._id !== args.fileId
        );

        if(existing) {
            throw new Error(`[CONVEX CLIENT SYSTEM.TS] ${file.type} named ${args.newName} already exists.`);
        }

        await ctx.db.patch("files", args.fileId, {
            name: args.newName,
            updatedAt: Date.now()
        });

        return args.fileId;
	},
});


export const deleteFile = mutation({
    args:{
        internalKey: v.string(),
        fileId: v.id("files")
    },
    handler: async(ctx,args) =>{
        validateInternalKey(args.internalKey);

        const file = await ctx.db.get("files", args.fileId);

        if(!file){
            throw new Error(`[CONVEX CLIENT SYSTEM.TS] Delete File method: Error, file of ${args.fileId} does not exist.`)
        }

        let deletionQueue: { id: Id<"files">, name: string }[] = [{ name: file.name, id: args.fileId }];
       
        const deleteRecursive = async (deletionQueue: { id: Id<"files">, name: string }[]) => {

            while (deletionQueue.length > 0) {

                console.log(deletionQueue);

                let first = deletionQueue.shift();

                if (first?.id == null) {
                    throw new Error("[CONVEX DELETE FUNCTION] - FileID is null");
                }

                const item = await ctx.db.get("files", first.id);

                if (item == null) {
                    throw new Error(`[CONVEX DELETE FUNCTION] - Item is null for given fileId:${first.id}, ${first.name}`);
                }

                if (item.type === "folder") {
                    const children = (await ctx.db
                        .query("files")
                        .withIndex("by_project_parent",
                            (q) => q.eq("projectId", item.projectId).eq("parentId", first.id))
                        .collect());
                    for (let i = 0; i < children.length; i++) { 
                        if (!deletionQueue.includes({ id: first.id, name: first.name })) {
                            deletionQueue.push({ id: children[i]._id, name: children[i].name });
                        }
                    }
                }

                if (item.storageId) {
                    await ctx.storage.delete(item.storageId);
                }

                await ctx.db.delete("files", item._id); //Delete from files relation/table, the tuple with _id = fileId.

            }
        }

        //call the function
        await deleteRecursive(deletionQueue);

        //update the cloud symbol as well, so we update this corresponding project tuple in the projects relations as well!
        await ctx.db.patch("projects", file.projectId, {
            updatedAt: Date.now()
        });

    }
})
