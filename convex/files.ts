import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { verifyAuthentication } from "./auth";
import { Id } from "./_generated/dataModel";




export const get = query({

    args: {
        projectId: v.id("projects"),
    },
    handler: async (ctx, args) => {

        const verifiedIdentity = await verifyAuthentication(ctx);

        const project = await ctx.db.get("projects", args.projectId);

        if (!project) {
            throw new Error("[CONVEX CLIENT QUERY FILES] Project is not found");
        }

        if (project.ownerId !== verifiedIdentity.subject) {
            throw new Error("[CONVEX CLIENT QUERY FILES] Unauthorised user to access this project.");
        }


        return await ctx.db.query("files")
            .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
            .collect();
    },
});


export const getFile = query({

    args: {
        fileId: v.id("files"),
    },
    handler: async (ctx, args) => {

        const verifiedIdentity = await verifyAuthentication(ctx);

        const file = await ctx.db.get("files", args.fileId);

        if (!file) {
            throw new Error("[CONVEX CLIENT QUERY FILE] File is not found");
        }

        const project = await ctx.db.get("projects", file.projectId); //get the project this file is based on.

        if (!project) {
            throw new Error("[CONVEX CLIENT QUERY FILE] Project is not found");
        }

        if (project.ownerId !== verifiedIdentity.subject) {
            throw new Error("[CONVEX CLIENT QUERY FILE] Unauthorised user to access this project.");
        }

        return file; //return back the file object
    },
});


export const getFolderContents = query({

    args: {
        projectId: v.id("projects"),
        parentId: v.optional(v.id("files")) //The parentId for files under this particular folder. 
        //So we are finding all other files/folders which have this as their parentId,
        //and are thus children of this folder.
    },
    handler: async (ctx, args) => {

        const verifiedIdentity = await verifyAuthentication(ctx);

        const project = await ctx.db.get("projects", args.projectId); //get the project this file is based on.

        if (!project) {
            throw new Error("[CONVEX CLIENT QUERY FOLDER CONTENTS] Project is not found");
        }

        if (project.ownerId !== verifiedIdentity.subject) {
            throw new Error("[CONVEX CLIENT QUERY FOLDER CONTENTS] Unauthorised user to access this project.");
        }

        const files = await ctx.db.query("files").withIndex("by_project_parent", (q) =>
            q.eq("projectId", args.projectId).eq("parentId", args.parentId)
        ).collect();
        //over here, the object q's projectId must be equal to the current args project Id, and it's parentId,
        //must be the current parentId specified in args.

        //Folder common file explorer display hierarchy --> show folders first, then files, and all in alphabetical order.
        return files.sort((a, b) => {
            //folder comes first
            if (a.type === "folder" && b.type === "file") return -1; //So reverse order
            if (a.type === "file" && b.type === "folder") return 1;
            return a.name.localeCompare(b.name); //Else if both same type, buoy down to alphabetical comparison. 
            //Lexicographic, traverses each string until finding a delineating / determining comparison
        });
    },
});


export const createFile = mutation({
    args: {
        projectId: v.id("projects"),
        parentId: v.optional(v.id("files")),
        name: v.string(),
        content: v.string()
    },
    handler: async (ctx, args) => {
        const verifiedIdentity = await verifyAuthentication(ctx);

        const project = await ctx.db.get("projects", args.projectId); //get the project this file is based on.

        if (!project) {
            throw new Error("[CONVEX CLIENT CREATE FILE] Project is not found");
        }

        if (project.ownerId !== verifiedIdentity.subject) {
            throw new Error("[CONVEX CLIENT CREATE FILE] Unauthorised user to access this project.");
        }

        //check if file with same name already exists!
        const files = (await ctx.db
            .query("files")
            .withIndex("by_project_parent",
                (q) => q.eq("projectId", args.projectId).eq("parentId", args.parentId))
            .collect());

        const existing = files.find(
            (file) => file.name === args.name && file.type === "file"
        );

        if (existing) throw new Error("[CONVEX CLIENT CREATE FILE] File name already exists!");

        await ctx.db.insert("files",
            {
                projectId: args.projectId,
                parentId: args.parentId,
                name: args.name,
                content: args.content,
                type: "file",
                updatedAt: Date.now()
            }
        );

        //update the cloud symbol as well, so we update this corresponding project tuple in the projects relations as well!
        await ctx.db.patch("projects", args.projectId, {
            updatedAt: Date.now()
        });
    }
});



export const createFolder = mutation({
    args: {
        projectId: v.id("projects"),
        parentId: v.optional(v.id("files")),
        name: v.string(), //folder does not accept any intrinsic content. Hence no content attribute.
    },
    handler: async (ctx, args) => {
        const verifiedIdentity = await verifyAuthentication(ctx);

        const project = await ctx.db.get("projects", args.projectId); //get the project this file is based on.

        if (!project) {
            throw new Error("[CONVEX CLIENT CREATE FOLDER] Project is not found");
        }

        if (project.ownerId !== verifiedIdentity.subject) {
            throw new Error("[CONVEX CLIENT CREATE FOLDER] Unauthorised user to access this project.");
        }

        //check if folder with same name already exists!
        const folders = (await ctx.db
            .query("files")
            .withIndex("by_project_parent",
                (q) => q.eq("projectId", args.projectId).eq("parentId", args.parentId))
            .collect());

        const existing = folders.find(
            (folder) => folder.name === args.name && folder.type === "folder"
        );

        if (existing) throw new Error("[CONVEX CLIENT CREATE FOLDER] File name already exists!");

        await ctx.db.insert("files", //both files and folders share the same relation. Hence reflexive/self association via parentId
            {
                projectId: args.projectId,
                parentId: args.parentId,
                name: args.name,
                type: "folder",
                updatedAt: Date.now()
            }
        );

        //update the cloud symbol as well, so we update this corresponding project tuple in the projects relations as well!
        await ctx.db.patch("projects", args.projectId, {
            updatedAt: Date.now()
        });
    }
});


export const renameFile = mutation({
    args: {
        id: v.id("files"),
        newName: v.string(),
    },
    handler: async (ctx, args) => {
        const verifiedIdentity = await verifyAuthentication(ctx);

        const file = await ctx.db.get("files", args.id);

        if (!file) throw new Error("[CONVEX CLIENT RENAME FILE] File does not exist!");

        const project = await ctx.db.get("projects", file.projectId);

        if (!project) throw new Error(`[CONVEX CLIENT RENAME FILE] Project of projectId=${file.projectId} does not exist!`);

        if (project.ownerId !== verifiedIdentity.subject) {
            throw new Error(`[CONVEX CLIENT RENAME FILE] Unauthorised user access to this project of project id:${file.projectId}`)
        }

        //Now we must check if the new name already exists in the same parent folder. Not global folder! Same parent folder only.

        //get all siblings
        const siblings = await ctx.db.query("files").withIndex("by_project_parent",
            (q) => q.eq("projectId", file.projectId).eq("parentId", file.parentId)).collect();


        const existing = siblings.find(
            (sibling) =>
                sibling.name == args.newName &&
                sibling.type === file.type &&
                sibling._id !== args.id //means file id, so diff file.
        )

        if (existing) {
            throw new Error("[CONVEX CLIENT RENAME FILE] File with same name already exists in the same folder!");
        }

        //Else if nothing wrong, update
        await ctx.db.patch("files", args.id, {
            //patch this tuple's (of attribute id = args.id) field attribute of name, 
            //with this new name value. 
            name: args.newName,
            updatedAt: Date.now()
        });

        //update the cloud symbol as well, so we update this corresponding project tuple in the projects relations as well!
        await ctx.db.patch("projects", file.projectId, {
            updatedAt: Date.now()
        });
    }

});



export const deleteFile = mutation({
    args: {
        id: v.id("files"),
    },
    handler: async (ctx, args) => {
        const verifiedIdentity = await verifyAuthentication(ctx);

        const file = await ctx.db.get("files", args.id);

        if (!file) throw new Error("[CONVEX CLIENT DELETE FILE/FOLDER] File does not exist!");

        const project = await ctx.db.get("projects", file.projectId);

        if (!project) throw new Error(`[CONVEX CLIENT DELETE FILE/FOLDER] Project of projectId=${file.projectId} does not exist!`);

        if (project.ownerId !== verifiedIdentity.subject) {
            throw new Error(`[CONVEX CLIENT RENAME FILE/FOLDER] Unauthorised user access to this project of project id:${file.projectId}`);
        }

        //When delete, must recursively delete!
        //Use DFS to find the lowest fiile inside.

        let deletionQueue: {id: Id<"files">, name: string}[] = [{name: file.name, id: args.id}];


        const deleteRecursive = async (deletionQueue: {id: Id<"files">, name: string}[]) => {

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
                    for (let i = 0; i < children.length; i++) { //thats ehy we index by 1 here cus the first element is the original parent
                        if (!deletionQueue.includes({id: first.id, name: first.name})) {
                            deletionQueue.push({id:children[i]._id, name: children[i].name});
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
});


//update file content
export const updateFile = mutation({
    args: {
        id: v.id("files"),
        content: v.string(), //string of binary representation of content
    },
    handler: async (ctx, args) => {
        const verifiedIdentity = await verifyAuthentication(ctx);

        const file = await ctx.db.get("files", args.id);

        if (!file) throw new Error("[CONVEX CLIENT UPDATE FILE] File does not exist!");

        const project = await ctx.db.get("projects", file.projectId);

        if (!project) throw new Error(`[CONVEX CLIENT UPDATE FILE] Project of projectId=${file.projectId} does not exist!`);

        if (project.ownerId !== verifiedIdentity.subject) {
            throw new Error(`[CONVEX CLIENT UPDATE FILE] Unauthorised user access to this project of project id:${file.projectId}`);
        }

        await ctx.db.patch("files", args.id, {
            content: args.content,
            updatedAt: Date.now()
        });

        //update the cloud symbol as well, so we update this corresponding project tuple in the projects relations as well!
        await ctx.db.patch("projects", file.projectId, {
            updatedAt: Date.now()
        });
    }
})
