import { useState } from "react";
import { Doc, Id } from "../../../../../convex/_generated/dataModel";
import { useCreateFile, useCreateFolder, useDeleteFile, useFolderContents, useRenameFile } from "../../hooks/use-files";
import { TreeItemWrapper } from "./tree-item-wrapper";

import { FileIcon, FolderIcon } from "@react-symbols/icons/utils";
import { ChevronRightIcon } from "lucide-react";
import LoadingRow from "./loading-row";
import { cn } from "@/lib/utils";
import { CreateInput } from "./create-input";
import { RenameInput } from "./rename-input";
import { useEditor } from "@/features/editor/hooks/use-editor";


//Tree.tsx represents the entire filesystem tree that we see!!!



export const Tree = ({
    item,
    level = 0,
    projectId
}: {
    item: Doc<"files">;
    level?: number;
    projectId: Id<"projects">;
}) => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [isRenaming, setIsRenaming] = useState<boolean>(false);
    const [creating, setCreating] = useState<"file" | "folder" | null>(null);



    const renameFile = useRenameFile();
    const deleteFile = useDeleteFile();
    const createFile = useCreateFile();
    const createFolder = useCreateFolder();

    const { openFile, closeTab, activeTabId } = useEditor(projectId);

    const handleCreate = (name: string) => {
        console.log(creating)
        if (creating === "file") {
            createFile({
                parentId: item._id,
                name: name,
                projectId: projectId,
                content: ""
            });
        }
        else if (creating === "folder") {
            createFolder({
                parentId: item._id,
                name: name,
                projectId: projectId
            });
        }
        else {
            throw new Error("[CLIENT - FILE TREE CREATE ITEM] Invalid item type to create. Only 'file' or 'folder'.");

        }
    }

    const handleRename = (newName: string) => {
        setIsRenaming(false);
        if (newName === item.name) {
            return;
        }
        renameFile({ id: item._id, newName });
    }

    const folderContents = useFolderContents({
        projectId,
        parentId: item._id,
        enabled: item.type === "folder" && isOpen,
    });

    const startCreating = (type: "file" | "folder") => {
        setIsOpen(true);
        setCreating(type);
    }


    if (item.type === "file") {
        const fileName = item.name;

        const isActive = activeTabId === item._id; //check whether the 
        //current active tab we are looking at, in the code editor, 
        //is === this current file id.


        if (isRenaming) {
            return (
                <RenameInput
                    type={"file"}
                    defaultValue={fileName}
                    level={level}
                    onSubmit={handleRename}
                    onCancel={() => setIsRenaming(false)} />
            );
        }

        return (
            <TreeItemWrapper
                item={item}
                level={level}
                isActive={isActive}
                onClick={() => openFile(item._id, { pinned: false })}
                onDoubleClick={() => openFile(item._id, { pinned: true })}
                onRename={() => setIsRenaming(true)}
                onDelete={() => {
                    closeTab(item._id);
                    deleteFile({ id: item._id })
                }}>
                <FileIcon
                    fileName={fileName}
                    autoAssign
                    className="size-4">
                </FileIcon>
                <span className="tuncate text-sm">{fileName}</span>
            </TreeItemWrapper>
        )
    }

    const folderName = item.name;

    if (isRenaming) {
        return (
            <RenameInput
                type={"folder"}
                defaultValue={folderName}
                level={level}
                onSubmit={handleRename}
                onCancel={() => setIsRenaming(false)} />
        );
    }



    const folderRender = (
        <>
            <div
                className="flex items-center gap-0.5">
                <ChevronRightIcon
                    className={cn(
                        "size-4 shrink-0 text-muted-foreground",
                        isOpen && "rotate-90"
                    )} />
                <FolderIcon folderName={folderName} className="size-4" />
            </div>
            <span className="truncate text-sm">{folderName}</span>
        </>
    )
    return (
        <>
            <TreeItemWrapper
                item={item}
                level={level}
                onClick={() => setIsOpen(prev => !prev)}
                onDoubleClick={() => { }}
                onRename={() => setIsRenaming(true)}
                onDelete={() => {
                    deleteFile({ id: item._id });
                }}
                onCreateFile={() => startCreating("file")}
                onCreateFolder={() => startCreating("folder")}
            >
                {folderRender}
            </TreeItemWrapper>
            {isOpen && (
                <>
                    {folderContents === undefined && <LoadingRow level={level + 1} />}
                    {creating &&
                        <CreateInput
                            type={creating}
                            level={level + 1}
                            onSubmit={handleCreate}
                            onCancel={() => setCreating(null)} />}
                    {folderContents?.map((subItem) => {
                        return (
                            <Tree
                                key={subItem._id}
                                item={subItem}
                                level={level + 1}
                                projectId={projectId}>
                            </Tree>
                        )
                    })}
                </>
            )}
        </>
    )

}
