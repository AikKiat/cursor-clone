
//"use client" //must make sure to include this to define that ProjectIdPage is a React component!!!
//However, if we declare the functional component as async then we cannot add this header on top.

import { ProjectIdView } from "@/features/projects/components/project-id-view";
import { Id } from "@/../convex/_generated/dataModel";


const ProjectIdPage = async ({ params }: { params: Promise<{ projectId: Id<"projects"> }> }) => {
    const { projectId } = await params;
    return (
        <div className="h-full">
            <ProjectIdView projectId={projectId}></ProjectIdView>
        </div>
    )
}

export default ProjectIdPage;


