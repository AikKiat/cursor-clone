import { createTool } from "@inngest/agent-kit";
import { z } from "zod";
import { api} from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { convex } from "@/lib/convex-client";

interface createFolderToolOptions {
	internalKey: string;
	projectId: Id<"projects">;
}

const paramsSchema = z.object({
	name: z.string().min(1, "Folder name is required"),
	parentId: z.string(),
});

export const createCreateFolderTool = ({
	internalKey,
	projectId,
}: createFolderToolOptions) => {
	return createTool({
		name: "createFolder",
		description: "Create a new folder in the project",
		parameters: z.object({
			name: z.string().describe("The name of the folder to create"),
			parentId: z
				.string()
				.describe(
					"The ID (not name!) of the parent folder from listFiles, or empty string for root level.",
				),
		}),
		handler: async (parameters, { step: toolStep }) => {
			const parsed = paramsSchema.safeParse(parameters);
			if (!parsed.success) {
				return `[INNGEST CREATE FOLDER TOOL] Error, ${parsed.error.issues[0].message}`;
			}

			const { name, parentId } = parsed.data;

			try {
				return await toolStep?.run("create-folder", async () => {
					if (parentId) {
						try {
							const parentFolder = await convex.query(api.system.getFileById, {
								internalKey,
								fileId: parentId as Id<"files">,
							});
							if (!parentFolder) {
								return `[INNGEST CREATE FOLDER TOOL] Error. Parent Folder with ID : ${parentId} not found in database. Use listFiles to get valid folder IDs.`;
							}

							if (parentFolder.type !== "folder") {
								return `[INNGEST CREATE FOLDER TOOL] Error. Parent folder with ID: ${parentId} is not a folder type. Use a folder ID as parentId.`;
							}
						} catch {
							return `[INNGEST CREATE FOLDER TOOL] Error. Invalid parentId of ${parentId}. Use listFiles to get the valid folder ID, or use empty string for root level.`;
						}
					}
					const folderId = await convex.mutation(api.system.createFolder, {
                        parentId: parentId ? (parentId as Id<"files">) : undefined,
                        name: name,
						projectId: projectId as Id<"projects">,
						internalKey,
					});

                    return `[INNGEST CREATE FOLDER TOOL] Folder created with ID: ${folderId}.`;
				});
			} catch (error) {
				return `[INNGEST CREATE FOLDER TOOL] Error reading files: ${error instanceof Error ? error.message : "Unknown Error"}`;
			}
		},
	});
};
