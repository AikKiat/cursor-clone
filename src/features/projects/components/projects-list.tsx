import { Spinner } from "@/components/ui/spinner";
import { useProjectsPartial } from "../hooks/use-projects";
import { Kbd } from "@/components/ui/kbd";

import { Doc } from "@/../../convex/_generated/dataModel";
import Link from "next/link";
import { AlertCircleIcon, GlobeIcon, Loader2Icon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { FiAirplay } from "react-icons/fi";
import { FaGithub } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface ProjectsListProps {
    onViewAll: (bool : boolean) => void;
}

const formatTimeStamp = (timeStamp: number) => {
    return formatDistanceToNow(new Date(timeStamp), {
        addSuffix: true
    });
};

const getProjectIcon = (project: Doc<"projects">) => {
    if (project.importStatus === "completed") {
        return (<FaGithub className="size-3.5 text-muted-foreground"></FaGithub>)
    }

    if (project.importStatus === "failed") {
        return (
            <AlertCircleIcon className="size-3.5"></AlertCircleIcon>
        )
    }

    if (project.importStatus === "importing") {
        return (
            <Loader2Icon className="size-3.5 text-muted-foreground"></Loader2Icon>
        )
    }
    return (<FiAirplay className="size-3.5"></FiAirplay>)
}

//Get the document under the current default schema, named as projects.
//Cus although it is like a relation, in Convex we ingest the data as documents.
const ProjectItem = ({ data }: { data: Doc<"projects"> }) => {
    return (
        <Link
            href={`/projects/${data._id}`}
            className="text-sm text-foreground/60 font-medium
        hover:text-foreground py-1 flex items-center justify-between
        w-full group"
        >
            <div className="flex items-center gap-2">
                <GlobeIcon />
            </div>
            <span className="truncate">{data.name}</span>
            <span className="text-xs text-muted-foreground 
            group-hover:text-foreground/60 transition-colors">{formatTimeStamp(data.updatedAt)}</span>
        </Link>
    )
}

const ContinueLatestCard = ({data}: { data: Doc<"projects"> }) => {
    return (
        <div className="flex flex-col gap-2">
            <span className="text-xs text-muted-foreground">Last Updated</span>
            <Button
                variant="outline"
                asChild
                className="h-auto items-start justify-start p-4
            bg-background border rounded-none flex flex-col gap-2"
            >
                <Link href={`/projects/${data._id}`} className="group">
                    <div className="flex items-center gap-2">
                        {getProjectIcon(data)}
                        <span className="font-medium truncate">{data.name}</span>
                    </div>
                </Link>
            </Button>
        </div>
    )
}

export default function ProjectsList({onViewAll}: ProjectsListProps) {

    const projects = useProjectsPartial(6);
   
    const [viewAll, setViewAll] = useState<boolean>(false);

    if (projects == undefined) {
        return <Spinner className="size-4 text-ring"></Spinner>
    }

    const [mostRecent, ...rest] = projects; //use split syntax to extract the most recent project (index 0) from the rest

    return (
        <div className=" flex flex-col gap-4">
        { mostRecent && <ContinueLatestCard data={mostRecent}/>}
            {rest.length > 0 && rest.reverse() && (
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">
                            Recent Projects
                        </span>
                        <button className="flex items-center gap-2 text-muted-foreground
                        text-xs hover:text-foreground transition-colors"
                        onClick={ ()=>{
                            setViewAll(viewAll => !viewAll);
                            onViewAll(viewAll); 
                            }}>
                            {viewAll === false? <span>View All</span>: <span>Collapse All</span>}
                            <Kbd className="bg-accent border">
                                CTRL K
                            </Kbd>
                        </button>
                    </div>
                    <ul>
                        {viewAll && rest.map((project) => {
                            return (
                                <ProjectItem
                                    key={project._id}
                                    data={project} />
                            )
                        })}
                    </ul>
                </div>
            )}
        </div>
    )
}
