import { mutation, query } from "./_generated/server";

import { v } from "convex/values";
import { verifyAuthentication } from "./auth";


//Create a single entry in Projects schema
export const create = mutation({
    args: {
        name: v.string(),
    },
    handler: async (ctx, args) => {

        const verifiedIdentity = await verifyAuthentication(ctx); //if we remove const, an error will be thrown
        //This is appropriate as cosnt is a keyword that signifies that a particular variable cannot have its value changed after it wass first defined.
        //So we cannot randomly just alter the verfiedUser identity mid-code

        const projectId = await ctx.db.insert("projects", {
            name: args.name,
            ownerId: verifiedIdentity.subject,
            updatedAt: Date.now()
        });

        return projectId;
    },
});

//Get a set of entries based on limit (like LIMIT in SQL)
export const getPartial = query({
    args: {
        limit: v.number(),
    },
    handler: async (ctx, args) => {

        const verifiedIdentity = await verifyAuthentication(ctx);

        return await ctx.db.query("projects") //use database indexing here, so we only fetch all tuples (relational database) 

            //where the ownerId field is == signed in owner id, 
            //which is denoted by identity variable through ctx.auth (which is provided via Clerk)
            //However, for this to be possible ownerId must be declared as the index, hence the notation in schema.ts to directly specify ownerId to be an indexed field.
            //Else, the default fields for indexing are _id, and _creation_time

            .withIndex("by_owner", (q) => q.eq("ownerId", verifiedIdentity.subject))
            .take(args.limit);
    },
})

export const getFull = query({
    handler: async (ctx) => {

        const verifiedIdentity = await verifyAuthentication(ctx);

        return await ctx.db.query("projects") //use database indexing here, so we only fetch all tuples (relational database) 
            //where the ownerId field is == signed in owner id, 
            //which is denoted by identity variable through ctx.auth (which is provided via Clerk)
            //However, for this to be possible ownerId must be declared as the index, hence the notation in schema.ts to directly specify ownerId to be an indexed field.
            //Else, the default fields for indexing are _id, and _creation_time
            .withIndex("by_owner", (q) => q.eq("ownerId", verifiedIdentity.subject))
            .collect();
    },
})



export const getById = query({
    args: {
        id: v.id("projects")
    },
    handler: async (ctx, args) => {

        const verifiedIdentity = await verifyAuthentication(ctx);

        const project = await ctx.db.get("projects", args.id);

        if (project?.ownerId !== verifiedIdentity.subject) {
            throw new Error("[CONVEX CLIENT FUNCTIONS DEF, PROJECTS] Unauthorised access to project");
        }
        return project;
    },
})


export const rename = mutation({
    args: {
        id: v.id("projects"),
        name : v.string(),
    },

    handler: async (ctx, args) => {

        const verifiedIdentity = await verifyAuthentication(ctx);

        const project = await ctx.db.get("projects", args.id);

        if (project?.ownerId !== verifiedIdentity.subject) {
            throw new Error("[CONVEX CLIENT FUNCTIONS DEF, PROJECTS] Unauthorised access to project");
        }

        await ctx.db.patch("projects", args.id, {
            name : args.name,
            updatedAt : Date.now()
        });
    },
})
