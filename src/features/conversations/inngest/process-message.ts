import { anthropic, createAgent, createNetwork } from "@inngest/agent-kit";
import { NonRetriableError } from "inngest";
import { codec } from "zod";
import type { Id } from "@/../convex/_generated/dataModel";
import {
	CODING_AGENT_SYSTEM_PROMPT,
	TITLE_GENERATOR_SYSTEM_PROMPT,
} from "@/app/api/inngest/constants";
import { inngest } from "@/ingest/client";
import { convex } from "@/lib/convex-client";
import { api } from "../../../../convex/_generated/api";
import { DEFAULT_CONVERSATION_TITLE } from "../../../../convex/constants";
import { createCreateFilesTool } from "./tools/create-files";
import { createCreateFolderTool } from "./tools/create-folder";
import { createDeleteFilesTool } from "./tools/delete-file";
import { createListFilesTool } from "./tools/list-files";
import { createReadFilesTool } from "./tools/read-files";
import { createRenameFileTool } from "./tools/rename-file";
import { createScrapeUrlsTool } from "./tools/scrape-urls";
import { createUpdateFileTool } from "./tools/update-file";

interface MessageEvent {
	messageId: Id<"messages">;
	conversationId: Id<"conversations">;
	projectId: Id<"projects">;
	message: string;
}

//create the inngest background job to invoke the client``
export const processMessage = inngest.createFunction(
	{
		id: "process-message",
		cancelOn: [
			{
				//cancel this function on the event of message/cancel, and ONLY if the id matches data.messageId
				event: "message/cancel",
				if: "event.data.message == async.data.messageId",
			},
		],
		onFailure: async ({ event, step }) => {
			const { messageId } = event.data.event.data as MessageEvent;
			const internalKey = process.env.CURSOR_CLONE_CONVEX_INTERNAL_KEY;

			if (internalKey) {
				await step.run("update-message-on-failure", async () => {
					await convex.mutation(api.system.updateMessageContent, {
						internalKey,
						messageId,
						content:
							"My Aplogies, I am unable to process this message at the moment.",
					});
				});
			}
		},
	},
	{
		event: "message/sent",
	},
	async ({ event, step }) => {
		const { messageId, conversationId, projectId, message } =
			event.data as MessageEvent;

		const internalKey = process.env.CURSOR_CLONE_CONVEX_INTERNAL_KEY;

		if (!internalKey) {
			throw new NonRetriableError(
				"[INNGEST BACKGROUND JOB INVOKE] CURSOR_CLONE_CONVEX_INTERNAL_KEY is not configured.",
			);
		}

		//Add as a check, delaying the inngest job here for a while because sometimes it can run faster than the convex database updates itself,leading to referencing of invalid data
		await step.sleep("wait for database sync", "1s");

		const conversation = await step.run("get-conversation", async () => {
			return await convex.query(api.system.getConversationById, {
				internalKey,
				conversationId,
			});
		});

		if (!conversation) {
			throw new NonRetriableError(
				`[INNGEST BACKGROUND JOB INVOKE] Error, conversation by id of ${conversationId} does not exist.`,
			);
		}

		const recentMessages = await step.run("get-recent-messages", async () => {
			return await convex.query(api.system.getRecentMessages, {
				internalKey,
				conversationId,
				limit: 10, //10 latest messages
			});
		});

		//Build the system prompt with the retrieved conversation context

		let systemPrompt = CODING_AGENT_SYSTEM_PROMPT;

		//const creates an immutable binding between the variable and its reference object, so this prevents reassigning the variable to a new object or memory address. BUT! The child attributes of the object are still mutable.
		const context = recentMessages.filter(
			(msg) => msg._id !== messageId && msg.content.trim() !== "",
		);

		if (context.length > 0) {
			const historyText = context
				.map((message) => `${message.role.toUpperCase()}:${message.content}`)
				.join("\n\n");

			systemPrompt += `\n\n##Previous Conversation (for context only) - do 
                NOT repeat these responses):\n${historyText}\n\n## Current
                Request:\nRespond ONLY to the user's new message below. Do not repeat
                or reference your previous responses.`;
		}

		//Generate conversation title
		const shouldGenerateTitle =
			conversation.title === DEFAULT_CONVERSATION_TITLE;

		if (shouldGenerateTitle) {
			const titleAgent = createAgent({
				name: "title-generator",
				system: TITLE_GENERATOR_SYSTEM_PROMPT,
				model: anthropic({
					model: "claude-haiku-4-5-20251001", //need to be up to date with the latest news on models,
					//and make sure to not use retired ones! Else, will result in not_found_error
					//-> generic 404 error from Anthropic meaning that the api for that retired model
					//is no longer available.
					apiKey: process.env.ANTHROPIC_API_KEY,
					baseUrl: "https://api.anthropic.com/v1/",
					defaultParameters: { temperature: 0, max_tokens: 50 },
				}),
			});

			const { output } = await titleAgent.run(message, { step });
			const textMessage = output.find(
				(m) => m.type === "text" && m.role === "assistant",
			);
			if (textMessage?.type === "text") {
				const title =
					typeof textMessage.content === "string"
						? textMessage.content.trim()
						: textMessage.content
								.map((c) => c.text)
								.join("")
								.trim();
				if (title) {
					await step.run("update-conversation-title", async () => {
						await convex.mutation(api.system.updateConversatinTitle, {
							internalKey,
							conversationId,
							title,
						});
					});
				}
			}
		}

		const codingAgent = createAgent({
			name: "An exper AI coding assistant",
			system: CODING_AGENT_SYSTEM_PROMPT,
			model: anthropic({
				model: "claude-opus-4-8", //need to be up to date with the latest news on models,
				//and make sure to not use retired ones! Else, will result in not_found_error
				//-> generic 404 error from Anthropic meaning that the api for that retired model
				//is no longer available.
				apiKey: process.env.ANTHROPIC_API_KEY,
				baseUrl: "https://api.anthropic.com/v1/",
				defaultParameters: { max_tokens: 4096 },
			}),
			tools: [
				createReadFilesTool({ internalKey }),
				createListFilesTool({ internalKey, projectId }),
				createUpdateFileTool({ internalKey }),
				createCreateFilesTool({ internalKey, projectId }),
				createCreateFolderTool({ internalKey, projectId }),
				createRenameFileTool({ internalKey }),
				createDeleteFilesTool({ internalKey }),
				createScrapeUrlsTool(),
			],
		});

		//create the agent network here to define the thinking flow!
		const network = createNetwork({
			name: "cursor-clone-agent-network",
			agents: [codingAgent],
			maxIter: 20,
			router: ({ network }) => {
				const lastResult = network.state.results.at(-1);
				const hasTextResponse = lastResult?.output.some(
					(message) => message.type === "text" && message.role === "assistant",
				);
				const hasToolCalls = lastResult?.output.some(
					(message) => message.type === "tool_call",
				);
				//Anthropic model outputs both text and tool calls together
				if (hasTextResponse && !hasToolCalls) {
					return undefined;
				}
				return codingAgent;
			},
		});

		const result = await network.run(message);
		const lastResult = result.state.results.at(-1);
		const textMessage = lastResult?.output.find(
			(message) => message.type === "text" && message.role === "assistant",
		);

		let assistantResponse =
			"I processed your request. Let me know if you need anything else!";

		if (textMessage?.type === "text") {
			assistantResponse =
				typeof textMessage.content === "string"
					? textMessage.content
					: textMessage.content.map((c) => c.text).join("");
		}

		await step.run("update-assistant-message", async () => {
			await convex.mutation(api.system.updateMessageContent, {
				internalKey,
				messageId,
				content: assistantResponse,
			});
		});

		return {
			success: true,
			messageId: messageId,
			conversationId: conversationId,
		};
	},
);
