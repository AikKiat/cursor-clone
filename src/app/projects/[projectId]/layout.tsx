

import { ProjectIdLayout } from "@/features/projects/components/project-id-layout";
//layout is also a reserve filename

import {Id} from "@/../convex/_generated/dataModel";
import React from "react";

const Layout = async ({ children, params }: { children: React.ReactNode, params: Promise<{ projectId: Id<"projects"> }> }) => {

    const { projectId } = await params;
    return (
        <ProjectIdLayout
            projectId={projectId}
        >
            {children}
        </ProjectIdLayout>
    )
}

export default Layout;
