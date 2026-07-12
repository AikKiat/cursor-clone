import { formatDistanceToNow } from "date-fns";
import {
	CommandDialog,
	CommandEmpty,
	CommandInput,
	CommandList,
    CommandGroup,
    CommandItem
} from "@/components/ui/command";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useConversations } from "../hooks/use-conversations";

interface PastConversationDialogProps {
	projectId: Id<"projects">;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSelect?: (conversationId: Id<"conversations">) => void;
}

export const PastConversationsDialog = ({
	projectId,
	open,
	onOpenChange,
	onSelect,
}: PastConversationDialogProps) => {
	const conversations = useConversations(projectId);
	const handleSelect = (conversationId: Id<"conversations">) => {
		onSelect?.(conversationId);
		onOpenChange(false);
	};

	return (
		<CommandDialog
			open={open}
			onOpenChange={onOpenChange}
			title="Past Conversations"
			description={"Search and select a past conversation"}
		>
			<CommandInput placeholder="Search conversations..." />
			<CommandList>
				<CommandEmpty>No conversations found.</CommandEmpty>
				<CommandGroup heading="Conversations">
					{conversations?.map((conversation) => ( //only if conversations is not undefined, then map out and render!
						<CommandItem
							key={conversation._id}
							value={`${conversation.title}-${conversation._id}`}
							onSelect={() => handleSelect(conversation._id)}
						>
							<div className="flex flex-col gap-0.5">
								<span>{conversation.title}</span>
								<span className="text-xs text-muted-foreground">
									{formatDistanceToNow(conversation._creationTime, {
										addSuffix: true,
									})}
								</span>
							</div>
						</CommandItem>
					))}
				</CommandGroup>
			</CommandList>
		</CommandDialog>
	);
};
