import { createTool } from "@inngest/agent-kit";
import { z } from "zod";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { convex } from "@/lib/convex-client";

interface deleteFilesToolOptions {
	internalKey: string;
}

const paramsSchema = z.object({
	fileIds: z
		.array(z.string().min(1, "File ID cannot be empty"))
		.min(1, "Provide at least one file ID"),
});

export const createDeleteFilesTool = ({
	internalKey,
}: deleteFilesToolOptions) => {
	return createTool({
		name: "deleteFiles",
		description:
			"Delete files or folders from the project. If deleting a folder, all contents will be deleted recursively.",
		parameters: z.object({
			fileIds: z
				.array(z.string())
				.describe("Array of file or folder IDs to delete"),
		}),
		handler: async (parameters, { step: toolStep }) => {
			const parsed = paramsSchema.safeParse(parameters);
			if (!parsed.success) {
				return `[INNGEST DELETE FILES TOOL] Error, ${parsed.error.issues[0].message}`;
			}

			const { fileIds } = parsed.data;

			const filesToDelete: {
				id: string;
				name: string;
				type: string;
			}[] = [];

			for (const fileId of fileIds) {
				const file = await convex.query(api.system.getFileById, {
					fileId: fileId as Id<"files">,
					internalKey,
				});

				if (!file) {
					return `[INNGEST DELETE FILES TOOL] Error. File with ID: ${fileId} not found in database. Use listFiles to get valid file IDs.`;
				}

				filesToDelete.push({
					id: file._id,
					name: file.name,
					type: file.type,
				});
			}

			try {
				return await toolStep?.run("delete-files", async () => {
					const results: string[] = [];
					for (const file of filesToDelete) {
						await convex.mutation(api.system.deleteFile, {
							internalKey,
							fileId: file.id as Id<"files">,
						});

						results.push(
							`[INNGEST DELETE FILES TOOL] Succesfully deleted file of ${file.type}, name of :${file.name}`,
						);
					}
					return results.join("\n");
				});
			} catch (error) {
				return `[INNGEST DELETE FILES TOOL] Error reading files: ${error instanceof Error ? error.message : "Unknown Error"}`;
			}
		},
	});
};
