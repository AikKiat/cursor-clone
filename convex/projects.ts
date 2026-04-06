import { mutation, query } from "./_generated/server";

import {v} from "convex/values";


//Create a single entry in Projects schema
export const create = mutation({ 
    args :{
        name : v.string(),
    },
    handler: async (ctx, args) =>{
        await ctx.db.insert("projects", {
            name : args.name,
            ownerId: "123", //default placeholder value for all inserted tuples now.
        });
    },
});

//Get an entry
export const get = query({
    args :{},
    handler: async(ctx) =>{
        return await ctx.db.query("projects").collect();
    },
})
