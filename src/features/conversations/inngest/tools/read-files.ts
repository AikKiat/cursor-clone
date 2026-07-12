import { createTool } from "@inngest/agent-kit";
import { z } from "zod";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { convex } from "@/lib/convex-client";

interface readFilesToolOptions {
	internalKey: string;
}

const paramsSchema = z.object({
	fileIds: z
		.array(z.string().min(1, "File ID cannot be empty"))
		.min(1, "Provide at least one fileId"),
});

export const createReadFilesTool = ({ internalKey }: readFilesToolOptions) => {
	return createTool({
		name: "readFiles",
		description:
			"Read the content of the files from this project. Returns file contents.",
		parameters: z.object({
			fileIds: z.array(z.string()).describe("Array of file IDs to read"),
		}),
		handler: async (parameters, { step: toolStep }) => {
			const parsed = paramsSchema.safeParse(parameters);
			if (!parsed.success) {
				return `[INNGEST READ FILE TOOL] Error, ${parsed.error.issues[0].message}`;
			}

			const { fileIds } = parsed.data;

			try {
				return await toolStep?.run("read-files", async () => {
					const retrievedFilesContents: {
						id: string;
						name: string;
						content: string;
					}[] = [];

					for (const fileId of fileIds) {
						const file = await convex.query(api.system.getFileById, {
							internalKey: internalKey,
							fileId: fileId as Id<"files">,
						});

						if (file == null || file.content == null) {
							console.log(
								`[INNGEST READ FILE TOOL] File of given fileId: ${fileId} is null, or has no content. (file.content is null)`,
							);
							continue;
						}

						retrievedFilesContents.push({
							id: file._id,
							name: file.name,
							content: file.content,
						});
					}

					if (retrievedFilesContents.length === 0) {
						return "[INNGEST READ FILE TOOL]. Resultant file data array is empty, after fetching files for the given set of ids. Are the fileIds valid?";
					}

					return JSON.stringify(retrievedFilesContents);
				});
			} catch (error) {
				return `[INNGEST READ FILE TOOL] Error reading files: ${error instanceof Error ? error.message : "Unknown Error"}`;
			}
		},
	});
};
