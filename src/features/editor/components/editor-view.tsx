

import { Id } from "@/../convex/_generated/dataModel";
import { TopNavigation } from "./top-navigation";
import { useEditor } from "../hooks/use-editor";
import FileBreadcrumbs from "./file-breadcrumbs";
import { useFile, useUpdateFile } from "@/features/projects/hooks/use-files";

import mainLogo from "@/../public/coding_2.svg";
import Image from "next/image";
import { CodeEditor } from "./code-editor";
import { useRef } from "react";


export const EditorView = ({ projectId }: { projectId: Id<"projects"> }) => {

    const { activeTabId } = useEditor(projectId);
    const activeFile = useFile(activeTabId);
    const updateFile = useUpdateFile();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const isActiveBinary = activeFile && activeFile.storageId;
    const isActiveFileText = activeFile && !activeFile.storageId;

    const DEBOUNCE_MS = 1500;

    return (
        <div
            className="h-full flex flex-col"
        >
            <div
                className="flex items-center"
            >
                <TopNavigation projectId={projectId} />
            </div>
            {activeTabId && <FileBreadcrumbs projectId={projectId} />}
            <div className="flex-1 min-h-0 bg-background">
                {!activeFile && (
                    <div className="size-full flex items-center justify-center">
                        <Image
                            src={mainLogo}
                            alt="cursor-clone"
                            width={80}
                            height={80}
                            className="opacity-25" />
                    </div>
                )}
                {/* Basically, we only render out this component if the active file in question 
                    contains text info so it is a text file! Else, render binary preview instead. */}
                {isActiveFileText &&  (
                    <CodeEditor
                        key={activeFile._id}
                        fileName={activeFile.name}
                        initialValue={activeFile.content ?? ""}
                        onChange={(content: string) => {
                            if (timeoutRef.current) {
                                clearTimeout(timeoutRef.current);
                            }

                            timeoutRef.current = setTimeout(() => {
                                updateFile({ id: activeFile._id, content })
                            }, DEBOUNCE_MS);
                        }}
                    ></CodeEditor>
                )}
                {isActiveBinary && (
                    <p>TODO: implement the binary preview!</p>
                )}
            </div>
        </div>
    )
}   
