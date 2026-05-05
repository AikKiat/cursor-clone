

import { Id } from "@/../convex/_generated/dataModel";


import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Poppins } from "next/font/google";

import mainLogo from "@/../public/coding_2.svg";
import { UserButton } from "@clerk/nextjs";
import { useProject, useRenameProject } from "../hooks/use-projects";
import { useState } from "react";

const font = Poppins({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"]
})

import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { CloudCheckIcon, LoaderIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";




export const NavBar = ({
    projectId
}: {
    projectId: Id<"projects">
}) => {
    const project = useProject(projectId);
    const renameProject = useRenameProject(projectId);


    const [isRenaming, setIsRenaming] = useState<boolean>(false);
    const [name, setName] = useState<string>("");

    function handleStartRename() {
        if (!project) return;
        setName(project.name);
        setIsRenaming(true);
    }

    function handleRenameSubmit() {
        if (!project) return;

        setIsRenaming(false);

        const trimmedName = name.trim();

        if (!trimmedName || trimmedName === project.name) return;
        renameProject({ id: projectId, name: trimmedName });
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === "Enter") {
            handleRenameSubmit();
        } else if (e.key === "Escape") {
            setIsRenaming(false); //complete renaming process, signify completion by turning this bool back to false.
        }
    }

    return (
        <div className="flex justify-between items-center gap-x-2 p-2 bg-sidebar border-b">
            <div className="flex items-center gap-x-2">
                <Breadcrumb>
                    <BreadcrumbList className="gap-0">
                        <BreadcrumbItem>
                            <BreadcrumbLink
                                className="flex items-center gap-1.5 group/logo"
                                asChild={true}
                            >
                                <Button
                                    variant={"ghost"}
                                    className="w-fit! p-1.5! h-7!"
                                    asChild
                                >
                                    <Link href="/">
                                        <Image src={mainLogo}
                                            alt="Logo"
                                            width={40}
                                            height={40} />
                                        <span className={cn("text-sm font-medium", font.className)}>
                                            Cursor Clone
                                        </span>
                                    </Link>
                                </Button>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator className="ml-0! mr-1!" />
                        <BreadcrumbItem>
                            {isRenaming ? (
                                <input
                                    autoFocus
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    onFocus={(e) => e.currentTarget.select()}
                                    onBlur={handleRenameSubmit}
                                    onKeyDown={handleKeyDown}
                                    className="text-sm bg-transparent text-foreground outline-none
                                focus:ring-1 focus:ring-inset focus:ring-ring font-medium max-w-40 truncate"
                                />
                            ) : (
                                <BreadcrumbPage
                                    onClick={handleStartRename}
                                    className="text-sm cursor-pointer hover:text-primary font-medium max-w-40 truncate">
                                    {project?.name ?? "Loading..."}
                                </BreadcrumbPage>
                            )}
                        </BreadcrumbItem>

                    </BreadcrumbList>
                </Breadcrumb>
                <TooltipProvider>
                    {project?.importStatus === "importing" ? (
                        <Tooltip>
                            <TooltipTrigger
                                asChild={true}
                            >
                                <LoaderIcon className="size-4 text-muted-foreground animate-spin" />
                            </TooltipTrigger>
                            <TooltipContent>Importing...</TooltipContent>
                        </Tooltip>
                    ) : (
                        project?.updatedAt && (
                            <Tooltip>
                                <TooltipTrigger
                                    asChild={true}
                                >
                                    <CloudCheckIcon className="size-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>Saved:{" "}{formatDistanceToNow(project.updatedAt, { addSuffix: true })}</TooltipContent>
                            </Tooltip>
                        ) 
                    )}
                </TooltipProvider>
            </div>
            <div className="flex items-center gap-2">
                <UserButton />
            </div>
        </div>
    )
}
