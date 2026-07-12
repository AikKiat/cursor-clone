import { createTool } from "@inngest/agent-kit";
import { z } from "zod";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { convex } from "@/lib/convex-client";

interface updateFileToolOptions {
	internalKey: string;
}

const paramsSchema = z.object({
	fileId: z.string().min(1, "File ID is required"),
	content: z.string(),
});

export const createUpdateFileTool = ({
	internalKey,
}: updateFileToolOptions) => {
	return createTool({
		name: "updateFile",
		description: "Update the content of an exisiting file.",
		parameters: z.object({
			fileId: z.string().describe("The ID of the file to update"),
			content: z.string().describe("The new content for the file"),
		}),
		handler: async (parameters, { step: toolStep }) => {
			const parsed = paramsSchema.safeParse(parameters);
			if (!parsed.success) {
				return `[INNGEST UPDATE FILE TOOL] Error, ${parsed.error.issues[0].message}`;
			}

			const { fileId, content } = parsed.data;

            const file = await convex.query(api.system.getFileById,{
                internalKey,
                fileId: fileId as Id<"files">
            });

            if(!file){
                return `[INNGEST UPDATE FILE TOOL] Error. File for given fileId: ${fileId} does not exist in the database`;
            }

            if(file.type ==="folder"){
                return `[INNGEST UPDATE FILE TOOL] Error. Given file of fileId: ${fileId} is a folder! Cannot update folders. We can only modify file contents.`;
            }


			try {
				return await toolStep?.run("update-file", async () => {
                    await convex.mutation(api.system.updateFile,{
                        internalKey,
                        fileId:fileId as Id<"files">,
                        content
                    });

                    return `File of fileId: ${fileId} and filename: ${file.name} updated successfully!`;
				});
			} catch (error) {
				return `[INNGEST UPDATE FILE TOOL] Error updating file: ${error instanceof Error ? error.message : "Unknown Error"}`;
			}
		},
	});
};
