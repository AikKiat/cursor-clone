import { useMutation, useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";




//get a conversation from given conversationId
export const useConversation = (id: Id<"conversations"> | null) => {
    return useQuery(api.conversations.getById, id ? { id } : "skip");
};



//get all messages for a given conversation
export const useMessages = (conversationId: Id<"conversations"> | null) => {
    return useQuery(
        api.conversations.getMessages,
        conversationId ? { conversationId } : "skip"
    );
};


//get all conversations for a given project
export const useConversations = (projectId: Id<"projects">) => {
    return useQuery(api.conversations.getByProject, { projectId });
}

export const useCreateConversation = () => {
    return useMutation(api.conversations.create);
    //TODO: Add optimistic mutation
}
