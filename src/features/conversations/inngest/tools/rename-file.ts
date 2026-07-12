import { createTool } from "@inngest/agent-kit";
import { z } from "zod";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { convex } from "@/lib/convex-client";

interface renameFileToolOptions {
	internalKey: string;
}

const paramsSchema = z.object({
	fileId: z.string().min(1, "File ID is required"),
	newName: z.string().min(1, "New name is required"),
});

export const createRenameFileTool = ({
	internalKey,
}: renameFileToolOptions) => {
	return createTool({
		name: "renameFile",
		description: "Rename a file or a folder",
		parameters: z.object({
			fileId: z.string().describe("The ID of the file to rename"),
			newName: z.string().describe("The new name for the file or folder"),
		}),
		handler: async (parameters, { step: toolStep }) => {
			const parsed = paramsSchema.safeParse(parameters);
			if (!parsed.success) {
				return `[INNGEST RENAME FILE TOOL] Error, ${parsed.error.issues[0].message}`;
			}

			const { fileId, newName } = parsed.data;

            const file = await convex.query(api.system.getFileById,{
                internalKey,
                fileId: fileId as Id<"files">
            });

            if(!file){
                return `[INNGEST UPDATE FILE TOOL] Error. File for given fileId: ${fileId} does not exist in the database`;
            }

			try {
				return await toolStep?.run("rename-file", async () => {
                    await convex.mutation(api.system.renameFile,{
                        internalKey,
                        fileId:fileId as Id<"files">,
                        newName,
                    });

                    return `[INNGEST RENAME FILE TOOL] Successfully renamed file/folder of ${file.name} to ${newName}.`;

				});
			} catch (error) {
				return `[INNGEST RENAME FILE TOOL] Error renaming file: ${error instanceof Error ? error.message : "Unknown Error"}`;
			}
		},
	});
};
