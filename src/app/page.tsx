"use client"

import { useQuery } from "convex/react";

import { api } from "../../convex/_generated/api";

export default function Home() {

    const projects = useQuery(api.projects.get);
    if (!projects) return;
    return (
        <main className="absolute top-20 w-full flex flex-col gap-2 p-4">
            {/*one unit of top is 0.5rem */}
            {projects.map((project) => (
                <div className="border rounded p-2 flex flex-col">
                    <p>Owner Id: {`${project.name}`}</p>
                    <p>Name: {`${project.ownerId}`}</p>
                    <p>Import Status: {`${project.importStatus}`}</p>
                </div>
            ))}
        </main>
    );
}
