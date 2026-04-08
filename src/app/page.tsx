"use client"

import { useQuery, useMutation } from "convex/react";

import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";

export default function Home() {

    const projects = useQuery(api.projects.get);

    const createProject = useMutation(api.projects.create);

    return (
        <main className="absolute top-20 w-full flex flex-col gap-2 p-4">
            {/*one unit of top is 0.5rem */}
            <Button onClick={() => createProject({
                name: "New Project"
            })}>
                Add a project
            </Button>
            {projects && projects.map((project) => (
                <div key={project._id} className="border rounded p-2 flex flex-col">
                    <p>Name: {`${project.name}`}</p>
                    <p>Owner Id: {`${project.ownerId}`}</p>
                </div>
            ))}
        </main>
    );
}
