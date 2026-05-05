import { defineSchema, defineTable } from "convex/server";
import {v} from "convex/values";


export default defineSchema({ //the schema here, which is a collection of relations/tables, 
    //has one relation here called projects
    projects: defineTable({
        name : v.string(),
        ownerId : v.string(),
        updatedAt : v.number(),
        importStatus: v.optional( //this means that this tuple field / attribute of 
                                 //importStatus is a value that is of the set
                                 //consisting ofthe union of "importing", "completed" or "failed."
            v.union(
                v.literal("importing"),
                v.literal("completed"),
                v.literal("failed")
            ),
        ),
        exportStatus : v.optional(
            v.union(
                v.literal("importing"),
                v.literal("completed"),
                v.literal("failed"),
                v.literal("cancelled")
            )
        ),
        exportReportUrl : v.optional(v.string()),
    })
    .index("by_owner", ["ownerId"]),

    files: defineTable({
        projectId: v.id("projects"),
        parentId: v.optional(v.id("files")), //this attribute is linked to this relation itself. So one file 
        //can have many files (folder), 
        //and within each file there can be many files as well (folder of files and folders)
        //UML Reflexive association, or self-association.
        name: v.string(),
        type: v.union(v.literal("file"), v.literal("folder")),
        //hence we define whether it is a file or folder here.
        content: v.optional(v.string()), //text files only
        storageId: v.optional(v.id("_storage")), //reference to a convex _storage property
        updatedAt : v.number(),
        //we set up these indexes to  retrieve data efficiently.
    }).index("by_project",["projectId"])
    .index("by_parent",["parentId"])
    .index("by_project_parent",["projectId", "parentId"])
})
