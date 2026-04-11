import { useQuery, useMutation } from "convex/react";

import { api } from "../../../../convex/_generated/api";

import { Id, } from "@/../../convex/_generated/dataModel";


export const useProjectsFull = () => {
    return useQuery(api.projects.getFull);
};

export const useProjectsPartial = (limit: number) => {
    const args = {
        limit: limit
    }
    return useQuery(api.projects.getPartial, args);
}

export const useCreateProject = () => {
    return useMutation(api.projects.create).withOptimisticUpdate(
        (localStore, args) => {
            const existingProjects = localStore.getQuery(api.projects.getFull);
            if (existingProjects) {
                const now = Date.now();
                const newProject = {
                    _id: crypto.randomUUID() as Id<"projects">,
                    _creationTime: now,
                    name: args.name,
                    ownerId: "", //use placeholder here.
                    updatedAt: now
                }
                localStore.setQuery(api.projects.getFull, {}, [
                    newProject,
                    ...existingProjects,
                ]);
            }
        }
    )
}
