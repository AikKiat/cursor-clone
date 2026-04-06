import { defineSchema, defineTable } from "convex/server";
import {v} from "convex/values";


export default defineSchema({ //the schema here, which is a collection of relations/tables, 
    //has one relation here called projects
    projects: defineTable({
        name : v.string(),
        ownerId : v.string(),
        importStatus: v.optional( //this means that this tuple field / attribute of 
                                 //importStatus is a value that is of the set
                                 //consisting ofthe union of "importing", "completed" or "failed."
            v.union(
                v.literal("importing"),
                v.literal("completed"),
                v.literal("failed")
            ),
        ),
    }),
})
