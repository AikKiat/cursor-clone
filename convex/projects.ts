import { mutation, query } from "./_generated/server";

import { v } from "convex/values";


//Create a single entry in Projects schema
export const create = mutation({
    args: {
        name: v.string(),
    },
    handler: async (ctx, args) => {

        const identity = await ctx.auth.getUserIdentity(); //Related to convex user authentication and management via Clerk, using JWT.
        if (!identity) {
            throw new Error("[CONVEX CLIENT - PROJECTS SCHEMA, ADD PROJECT] Unauthorised user, unable to fetch data from schema projects")
        }


        await ctx.db.insert("projects", {
            name: args.name,
            ownerId: identity.subject
        });
    },
});

//Get an entry
export const get = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity(); //Related to convex user authentication and management via Clerk, using JWT.
        if (!identity) {
            throw new Error("[CONVEX CLIENT - PROJECTS SCHEMA, GET] Unauthorised user, unable to fetch data from schema projects")
        }
        return await ctx.db.query("projects") //use database indexing here, so we only fetch all tuples (relational database) 
        //where the ownerId field is == signed in owner id, 
        //which is denoted by identity variable through ctx.auth (which is provided via Clerk)
        //However, for this to be possible ownerId must be declared as the index, hence the notation in schema.ts to directly specify ownerId to be an indexed field.
        //Else, the default fields for indexing are _id, and _creation_time
        .withIndex("by_owner", (q) => q.eq("ownerId", identity.subject))
        .collect();
    },
})
