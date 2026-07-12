import { HistoryIcon, LoaderIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Id } from "@/../../convex/_generated/dataModel";
import {
	Conversation,
	ConversationContent,
	ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
	Message,
	MessageAction,
	MessageActions,
	MessageContent,
	MessageResponse,
} from "@/components/ai-elements/message";
import {
	PromptInput,
	PromptInputBody,
	PromptInputFooter,
	type PromptInputMessage,
	PromptInputSubmit,
	PromptInputTextarea,
	PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import { DEFAULT_CONVERSATION_TITLE } from "../../../../convex/constants";
import {
	useConversation,
	useConversations,
	useCreateConversation,
	useMessages,
} from "../hooks/use-conversations";
import { PastConversationsDialog } from "./past-conversations-dialog";

interface ConversationSideBarProps {
	projectId: Id<"projects">;
}

export const ConversationSidebar = ({
	projectId,
}: ConversationSideBarProps) => {
	const [userInput, setUserInput] = useState<string>("");

	const [selectedConversationId, setSelectedConversationId] =
		useState<Id<"conversations"> | null>(null);

	const [pastConversationsOpen, setPastConversationsOpen] =
		useState<boolean>(false);

	const createConversation = useCreateConversation();
	const conversations = useConversations(projectId); //get all conversations

	//either the current selected convo id, or the first ever conversation from all conversations under this project, or if both are null, then return null
	const activeConversationId =
		selectedConversationId ?? conversations?.[0]?._id ?? null;

	const activeConversation = useConversation(activeConversationId);

	const conversationMessages = useMessages(activeConversationId);

	const isProcessing = conversationMessages?.some(
		(msg) => msg.status === "processing",
	);

	const handleCancel = async () => {
		try {
			await fetch("/api/messages/cancel", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					projectId: projectId,
				}),
			});
		} catch (error) {
			toast.error(
				"[NEXTJS CLIENT SIDE] AI Conversation Compoenent: Error, unable to send call to backend to cancel the message request.",
			);
		}
	};

	const handleCreateConversation = async () => {
		try {
			const conversationId = await createConversation({
				projectId,
				title: DEFAULT_CONVERSATION_TITLE,
			});

			setSelectedConversationId(conversationId);
			return conversationId;
		} catch {
			toast.error(
				"[NEXTJS CLIENT SIDE] AI conversation component: Error, unable to create new conversation",
			);
			return null;
		}
	};

	const handleSubmit = async (message: PromptInputMessage) => {
		if (isProcessing && !message.text) {
			await handleCancel();
			setUserInput("");
			return;
		}

		let conversationId = activeConversationId;

		//case where the user just types out of nowhere without creating a conversation
		//beforehand, then we automatically create a conversation to store + record down
		//this instance.
		if (!conversationId) {
			conversationId = await handleCreateConversation();
			if (!conversationId) {
				return;
			}
		}

		try {
			const aiResponseResult = await fetch("/api/messages", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					conversationId,
					message: message.text,
				}),
			});

			if (!aiResponseResult.ok) {
				throw new Error(
					`[AI CONVERSATION RESPONSE FETCH] Failed to get response from AI service: ${aiResponseResult.statusText}`,
				);
			}

			console.log("aiResponseResult", aiResponseResult);

			if (aiResponseResult == null) {
				throw new Error(
					`[AI CONVERSATION RESPONSE FETCH] Failed to get response from AI service: aiResponseResult is null`,
				);
			}

			const aiResponseJSON = await aiResponseResult.json(); //.json() returns a Promise<Object> object, so have to await it to obtain the actual object!
		} catch {
			toast.error(
				"[NEXT JS CLIENT SIDE] AI Response HTTP POST fetch: Error, failed to get AI response after sending frontend message",
			);
		}
	};

	return (
		//We declare h-full here to make the parent element have 100% height = full
		//screen height, then split the amount of height allocated to its children by ratio through the flex-1 or flex-2 tailwind css properties!
		<>
			<PastConversationsDialog
				projectId={projectId}
				open={pastConversationsOpen}
				onOpenChange={setPastConversationsOpen}
				onSelect={setSelectedConversationId}
			></PastConversationsDialog>
			<div className="flex flex-col justify-between h-full bg-sidebar">
				<div className="h-8.75 flex flex-row items-center justify-between border-b">
					<div className="text-sm tuncate pl-3">
						{activeConversation?.title ?? DEFAULT_CONVERSATION_TITLE}
					</div>
					<div className="flex items-center px-1 gap-1">
						<Button
							size="icon-xs"
							variant="outline"
							onClick={() => setPastConversationsOpen(true)}
						>
							<HistoryIcon className="size-3.5" />
						</Button>
						<Button
							size="icon-xs"
							variant="outline"
							onClick={handleCreateConversation}
						>
							<PlusIcon className="size-3.5" />
						</Button>
					</div>
				</div>
				{/* flex-2 means occupy 2 parts of the space of the height occupied by parent element */}
				<Conversation className="flex-2">
					<ConversationContent>
						{conversationMessages?.map((message, messageIndex) => {
							console.log(message);
							return (
								<Message key={message._id} from={message.role}>
									<MessageContent>
										{/* Over here, we are rendering ALL of the contents in the conversationMessages array. Basically, becuase role="user"
                                    messages have no status, they are immediately triggering the other conditional path of rendering
                                    MessageResponse<{message.content}>. On the other hand, the AI response with role="assistant" has a status. If its
                                        status is processing, then the "thinking icon will show. Otherwise, once done processing then its actual message will be shown 
                                    whether completed --> valid message response or some error --> when the status is "cancelled" ---> all these made possible from the Inngest bacground job 
                                    invokation of the actual AI service.*/}

										{message.status === "processing" ? (
											<div className="flex items-center gap-2 text-muted-foreground">
												<LoaderIcon className="size-4 animate-spin" />
												<span>Thinking...</span>
											</div>
										) : message.status === "cancelled" ? (
											<span className="text-muted-foreground italic">
												Request Cancelled
											</span>
										) : (
											<MessageResponse>{message.content}</MessageResponse>
										)}
									</MessageContent>
									{/* Do additional if message comes from the AI, vs the human user. 
                                        If its from the AI --> message.role ==="assistant", 
                                        then we can additionally choose to copy the message to clipboard 
                                    via window.navigator.clipboard 
                                    - >Also , if it is the last message in the entire messages array 
                                        (ascending order of scan from convex db platform query).
                                    */}
									{message.role === "assistant" &&
										message.status === "completed" &&
										messageIndex === (conversationMessages.length ?? 0) - 1 && (
											<MessageActions>
												<MessageAction
													onClick={() => {
														navigator.clipboard.writeText(message.content);
													}}
													label="Copy"
												></MessageAction>
											</MessageActions>
										)}
								</Message>
							);
						})}
					</ConversationContent>
					<ConversationScrollButton />
				</Conversation>
				{/* flex-1 means occupy 2 parts of the space of the height occupied by parent element */}
				<div className="p-3 w-full flex flex-1 flex-col justify-around">
					<PromptInput onSubmit={handleSubmit} className="mt-2">
						<PromptInputBody>
							<PromptInputTextarea
								placeholder="Ask me anything!"
								onChange={(e) => setUserInput(e.target.value)}
								value={userInput}
								disabled={isProcessing}
							/>
						</PromptInputBody>
						<PromptInputFooter>
							<PromptInputTools />
							<PromptInputSubmit
								// these fields here change the icon in the prompt input submit button.
								// Like arrow to send, then big black box when AI is streaming response
								// hence the status = streaming when isProcessing is true, and isProcessing is true when any one
								// of the messages are of "processing" status via .some() method
								disabled={isProcessing ? false : !userInput}
								status={isProcessing ? "streaming" : undefined}
							/>
						</PromptInputFooter>
					</PromptInput>
				</div>
			</div>
		</>
	);
};
