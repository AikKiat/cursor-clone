import { useQuery, useMutation } from "convex/react";


import { Id, } from "@/../../convex/_generated/dataModel";
import { api } from "../../../../convex/_generated/api";



//Get one project via projectId
export const useProject = (projectId: Id<"projects">) => {
    return useQuery(api.projects.getById, { id: projectId });
}


//Get all projects related to the particular owner
export const useProjectsFull = () => {
    return useQuery(api.projects.getFull);
};

//Get n projects for this owner / signed in user.
export const useProjectsPartial = (limit: number) => {
    const args = {
        limit: limit
    }
    return useQuery(api.projects.getPartial, args);
}

//Create a project under this signed-in user (basically his/her account)
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


//Create a project under this signed-in user (basically his/her account)
export const useRenameProject = () => {
    return useMutation(api.projects.rename).withOptimisticUpdate(
        (localStore, args) => {
            const existingProject = localStore.getQuery(api.projects.getById, {id:args.id});
           
            //If project of project id exsits in convex db, then make sure we 
            //purport the changes to the local store first, which is the first layer for data 
            //fast data retrieval, cached in the browser session. 
            //Not linked to main database.
            
            if (existingProject && existingProject !== null) {
                localStore.setQuery(api.projects.getById, {id : args.id}, {
                    ...existingProject,
                    name : args.name,
                    updatedAt : Date.now()
                });
            }

            //Then, after the cache first reflects this rename, now we apply the changes to the main data persistence layer (database)
            const existingProjects = localStore.getQuery(api.projects.getFull);
            if (existingProjects){
                localStore.setQuery(api.projects.getFull, {}, existingProjects.map((project) =>{
                    return project._id === args.id ? {
                        ...project, name : args.name, updatedAt : Date.now()
                    } : project
                }));
            }
        }
    )
}
