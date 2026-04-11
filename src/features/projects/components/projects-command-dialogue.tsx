

import { useRouter } from "next/navigation";
import { FaGithub } from "react-icons/fa";
import {
    AlertCircleIcon,
    Loader2Icon
} from "lucide-react";

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList
} from "@/components/ui/command";

import { Doc } from "@/../../convex/_generated/dataModel";

import { useProjectsFull } from "../hooks/use-projects";
import { FiAirplay } from "react-icons/fi";


const getProjectIcon = (project: Doc<"projects">) => {
    if (project.importStatus === "completed") {
        return (<FaGithub className="size-4 text-muted-foreground"></FaGithub>)
    }

    if (project.importStatus === "failed") {
        return (
            <AlertCircleIcon className="size-4."></AlertCircleIcon>
        )
    }

    if (project.importStatus === "importing") {
        return (
            <Loader2Icon className="size-4 text-muted-foreground"></Loader2Icon>
        )
    }
    return (<FiAirplay className="size-4"></FiAirplay>)
}


interface ProjectsCommandDialogueProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}



export const ProjectsCommandDialogue = ({
    open, onOpenChange,
}: ProjectsCommandDialogueProps) => {
    const router = useRouter();
    console.log(router);
    const projects = useProjectsFull();

    const handleSelect = (projectId: string) => {
        router.push(`/projects/${projectId}`);
        onOpenChange(false);
    }


    return (
        <CommandDialog
            open={open}
            onOpenChange={onOpenChange}
            title="Search Projects"
            description="Search and Navifate to projects"
        >
            {/* <CommandInput placeholder="Search projects..." /> */}
            <CommandList>
                <CommandEmpty>No projects found</CommandEmpty>
                {/* <CommandGroup heading="Projects"> */}
                {/*     {projects?.map((project) => { */}
                {/*         return ( */}
                {/*             <CommandItem */}
                {/*                 key={project._id} */}
                {/*                 value={`${project.name}-${project._id}`} */}
                {/*                 onSelect={() => handleSelect(project._id)} */}
                {/*             > */}
                {/*                 {getProjectIcon(project)} */}
                {/*                 <span>{project.name}</span> */}
                {/*             </CommandItem> */}
                {/*         ) */}
                {/*     })} */}
                {/* </CommandGroup> */}
            </CommandList>
        </CommandDialog>
    )
}
