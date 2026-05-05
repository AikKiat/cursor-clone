
"use client";

import React from "react";
import { NavBar } from "./navbar";
import { Id } from "@/../convex/_generated/dataModel";


import { Allotment } from "allotment";
import "allotment/dist/style.css";

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 800;
const DEFAULT_CONVERSATION_SIDEBAR_WIDTH = 400;
const DEFAULT_MAIN_SIZE = 800;



export const ProjectIdLayout = ({
    children,
    projectId
}: { children: React.ReactNode, projectId: Id<"projects"> }) => {
    return (
        <div className="w-full h-screen flex flex-col">
            <NavBar projectId={projectId} />
            <div className="flex-1 flex overflow-hidden">
                <Allotment
                    className="flex-1"
                    defaultSizes={[
                        DEFAULT_CONVERSATION_SIDEBAR_WIDTH,
                        DEFAULT_MAIN_SIZE
                    ]}
                >
                    <Allotment.Pane>
                        {children}
                    </Allotment.Pane>
                    <Allotment.Pane
                        snap
                        minSize={MIN_SIDEBAR_WIDTH}
                        maxSize={MAX_SIDEBAR_WIDTH}
                        preferredSize={DEFAULT_CONVERSATION_SIDEBAR_WIDTH}
                    >
                        <div>
                            Conversation sidebar
                        </div>
                    </Allotment.Pane>
                </Allotment>
            </div>
        </div>
    )
}
