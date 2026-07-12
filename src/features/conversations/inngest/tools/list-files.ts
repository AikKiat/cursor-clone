import { createTool } from "@inngest/agent-kit";
import { z } from "zod";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { convex } from "@/lib/convex-client";

interface listFilesToolOptions {
	internalKey: string;
    projectId: Id<"projects">;
}

const paramsSchema = z.object({
	fileIds: z
		.array(z.string().min(1, "File ID cannot be empty"))
		.min(1, "Provide at least one fileId"),
});

export const createListFilesTool = ({ projectId, internalKey }: listFilesToolOptions) => {
	return createTool({
		name: "listFiles",
		description:
            "List all files and folders in this project. Returns names, IDs, types, and parentId \
            for each item. Items with parentId: null are at root level. Use the parentId to understand the folder structure - \
            items with the same parentId are in the same folder.",
		parameters: z.object({}),
		handler: async (parameters, { step: toolStep }) => {
			
			try {
				return await toolStep?.run("list-files", async () => {
                    const files = await convex.query(api.system.getProjectFiles,{
                        internalKey,
                        projectId: projectId as Id<"projects">
                    });

                    const sorted = files.sort((a,b) =>{
                        if(a.type !== b.type){
                            return a.type ==="folder" ? -1: 1; //if a is a folder, then sorted behind b. Else, in front. Generally, files are sorted before folders.
                        }
                        return a.name.localeCompare(b.name); //and also in alphabetical order
                    });

                    const fileList = sorted.map((file)=>({
                        id: file._id,
                        name: file.name,
                        type: file.type,
                        parentId: file.parentId ?? null,
                    }));

                    return JSON.stringify(fileList);


                });
			} catch (error) {
				return `[INNGEST LIST FILES TOOL] Error listing files/folders: ${error instanceof Error ? error.message : "Unknown Error"}`;
			}
		},
	});
};
