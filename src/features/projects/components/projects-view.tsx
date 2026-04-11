
"use client"

import { Poppins } from "next/font/google"

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { FaGithub } from "react-icons/fa";
import ProjectsList from "./projects-list";
import { useCreateProject } from "../hooks/use-projects";
import { uniqueNamesGenerator, adjectives, colors, animals } from 'unique-names-generator';
import { useState } from "react";
import { ProjectsCommandDialogue } from "./projects-command-dialogue";
import { GiMagnifyingGlass } from "react-icons/gi";

//We import the Poppins font and destructure the type to
//reassign the attributes of subsets and weight
//the reason why we are able to call font.className, is because Poppins inherits from the
//NextFont type where there is an attribute called className, and it is used for html markdown to
//reference this font class we have imported
//If we look at the definition of Poppins, it only inherits from NextFont type IF it is not detected to be 
//a child type of CssVariable type. So, Poppins is not CssVariable and is part of NextFonts.

const font = Poppins({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"]
})

export default function ProjectsView() {

    const createProject = useCreateProject();

    const [viewAll, setViewAll] = useState<boolean>(false);

    const [commandDialogueOpen, setCommandDialogueOpen] = useState<boolean>(false);

    return (
        <>
            <ProjectsCommandDialogue open={commandDialogueOpen} onOpenChange={setCommandDialogueOpen} />
            <div className="min-h-screen bg-sidebar flex flex-col items-center 
            justify-center p-6 md:p-16">
                <div className="w-full max-w-sm mx-auto flex flex-col gap-4 items-center">
                    <div className="flex justify-between gap-4 w-full items-center">
                        <div className="flex items-center gap-2 w-full group/logo">
                            <img src="/vercel.svg" alt="cursor-clone" className="size-[32px] md:size-[46px]" />
                            <h1 className={cn(
                                "text-4xl md:text-5xl font-semibold",
                                font.className
                            )}>
                                Cursor-Clone
                            </h1>
                        </div>
                    </div>
                    <div className="flex flex-col gap-4 w-full">
                        <Button
                            className="rounded-none w-full m-1 self-center"
                            variant="outline"
                            onClick={() => {
                                const projectName = uniqueNamesGenerator({
                                    dictionaries: [adjectives, animals, colors],
                                    separator: "-",
                                    length: 3
                                });
                                createProject({ name: projectName })
                            }}
                        >
                            Create Project
                        </Button>

                        <div className="flex flex-row w-full items justify-center items-center h-12">
                            <div className="flex flex-row w-1/2 h-full mr-1">
                                <Button className="flex flex-row w-full h-full bg-accent border items-center justify-center rounded-none p-2" variant="outline" onClick={() => setCommandDialogueOpen(true)}>
                                    <div className="flex flex-row w-full h-full gap-4 items-center justify-center pt-2 pb-2">
                                        <GiMagnifyingGlass className="size-4 w-fit" />
                                        <span className="text-sm">Projects Search</span>

                                    </div>
                                </Button>

                            </div>
                            <div className="flex flex-row w-1/2 h-full ml-1">
                                <Button variant="outline"
                                    onClick={() => { }}
                                    className="bg-background w-full h-full rounded-none">
                                    <div className="flex items-center justify-between w-full h-full">
                                        <FaGithub className="size-4" />
                                        <Kbd className="bg-accent border">
                                            CTRL+I
                                        </Kbd>
                                        <span className="text-sm">Import</span>
                                    </div>
                                </Button>
                            </div>
                        </div>
                        <ProjectsList onViewAll={setViewAll}></ProjectsList>
                        {viewAll === false ? <span className="text-sm flex justify-center">Ongoing Projects</span> :
                            <span className="text-sm flex justify-center">Click View All for projects</span>}
                    </div>
                </div>
            </div>
        </>
    )
}
