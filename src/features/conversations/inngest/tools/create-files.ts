import { createTool } from "@inngest/agent-kit";
import { z } from "zod";
import { api } from "@/../convex/_generated/api";
import type { Id } from "@/../convex/_generated/dataModel";
import { convex } from "@/lib/convex-client";

interface createFilesToolOptions {
	internalKey: string;
	projectId: Id<"projects">;
}

const paramsSchema = z.object({
	parentId: z.string(),
	files: z
		.array(
			z.object({
				name: z.string().min(1, "File name cannot be empty"),
				content: z.string(),
			}),
		)
		.min(1, "Provide at least 1 file to create"),
});

export const createCreateFilesTool = ({
	internalKey,
	projectId,
}: createFilesToolOptions) => {
	return createTool({
		name: "createFiles",
		description:
			"Create multiple files at once in the same folder. Use this to batch create files that share \
            the same parent folder. More efficient than creating files one by one.",
		parameters: z.object({
			parentId: z.string().describe(
				"The ID of the parent folder. Use empty string for the root level. \
                                          Must be a valid folder ID from listFiles.",
			),
			files: z.array(
				z.object({
					name: z.string().describe("The file name including extension"),
					content: z.string().describe("The file content"),
				}),
			),
		}),
		handler: async (parameters, { step: toolStep }) => {
			const parsed = paramsSchema.safeParse(parameters);
			if (!parsed.success) {
				return `[INNGEST CREATE FILES TOOL] Error, ${parsed.error.issues[0].message}`;
			}

			const { parentId, files } = parsed.data;

			try {
				return await toolStep?.run("create-files", async () => {
					let resolvedParentId: Id<"files"> | undefined;

					if (parentId && parentId !== "") {
						try {
							resolvedParentId = parentId as Id<"files">;
							const parentFolder = await convex.query(api.system.getFileById, {
								internalKey,
								fileId: resolvedParentId,
							});

							if (!parentFolder) {
								return `[INNGEST CREATE FILES TOOL] Error: Parent folder with id: ${resolvedParentId} does not exist in the database. Use listFiles to get the valid folder IDs again.`;
							}
							if (parentFolder.type !== "folder") {
								return `[INNGEST CREATE FILES TOOL] Error. The resolved parent id of ID: ${resolvedParentId} is a file, not a folder. Use a folder ID as parentId.`;
							}
						} catch {
							return `[INNGEST CREATE FILES TOOL] Error. Invalid parentId of ${resolvedParentId}. Use listFiles to get the valid folder ID, or use empty string for root level.`;
						}
					}
					const results = await convex.mutation(api.system.createFiles, {
						parentId: resolvedParentId,
						projectId: projectId as Id<"projects">,
						files,
						internalKey,
					});

					const created = results.filter((r) => !r.error);
					const failed = results.filter((r) => r.error);
					let response = `Created ${created.length} file(s)`;
					if (created.length > 0) {
						response += `: ${created.map((r) => r.name).join("")}`;
					}
					if (failed.length > 0) {
						response += `. Failed: ${failed.map((r) => `${r.name} (${r.error})`).join(", ")}`;
					}
				});
			} catch (error) {
				return `[INNGEST CREATE FILES TOOL] Error reading files: ${error instanceof Error ? error.message : "Unknown Error"}`;
			}
		},
	});
};
