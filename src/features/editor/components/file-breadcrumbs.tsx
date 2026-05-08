

import { Id } from "@/../convex/_generated/dataModel";
import { useEditor } from "../hooks/use-editor";
import { useFilePath } from "@/features/projects/hooks/use-files";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { FileIcon } from "@react-symbols/icons/utils";
import React from "react";

export default function FileBreadcrumbs({ projectId }: { projectId: Id<"projects"> }) {

    const { activeTabId } = useEditor(projectId);
    const filePath = useFilePath(activeTabId); //get the file path of the current active tab which displays file of id===fileId!
    //returns the array of ancestors / parents, all the way to root source folder.

    if (filePath == undefined || !activeTabId) {
        //return a placeholder jsx
        return (
            <div className="p-2 bg-background pl-4 border-b">
                <Breadcrumb>
                    <BreadcrumbList className="sm:gap-0.5 gap-0.5">
                        <BreadcrumbItem className="text-sm" />
                        <BreadcrumbPage>&nbsp;</BreadcrumbPage> {/*empty string line*/}
                    </BreadcrumbList>
                </Breadcrumb>
            </div>
        );
    }

    return (
        <div className="p-2 bg-background pl-4 border-b">
            <Breadcrumb>
                <BreadcrumbList className="sm:gap-0.5 gap-0.5">
                    {filePath.map((item, index) => {
                        const isLastItem = index === filePath.length - 1;
                        return (
                            <React.Fragment key={item._id}>
                                <BreadcrumbItem className="text-sm">
                                    {isLastItem ? (
                                        <BreadcrumbPage className="flex items-center gap-1">
                                            <FileIcon
                                                fileName={item.name}
                                                autoAssign
                                                className="size-4">
                                            </FileIcon>
                                            <span>{item.name}</span>
                                        </BreadcrumbPage>
                                    ) : (
                                        <BreadcrumbLink href="#">{item.name}</BreadcrumbLink>
                                    )}
                                </BreadcrumbItem>
                                {!isLastItem && <BreadcrumbSeparator />}
                            </React.Fragment>
                        )
                    })}
                </BreadcrumbList>
            </Breadcrumb>
        </div> 
    )
}
