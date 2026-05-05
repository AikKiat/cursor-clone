import { ChevronRightIcon } from "lucide-react"
import { FileIcon, FolderIcon } from "@react-symbols/icons/utils";
import { useState } from "react";
import { getItemPadding } from "./constants";
import { cn } from "@/lib/utils";

export const RenameInput = ({
    type,
    level,
    defaultValue,
    isOpen,
    onSubmit,
    onCancel
}: {
    type: "file" | "folder" | null,
    level: number,
    defaultValue: string,
    isOpen?: boolean,
    onSubmit: (name: string) => void,
    onCancel: () => void,
}) => {
    const [value, setValue] = useState<string>(defaultValue);
    const handleSubmit = () => {
        const trimmedValue = value.trim() || defaultValue;
        onSubmit(trimmedValue);
    }
    return (
        <div
            className="w-full flex items-center h-5.5 bg-accent/30"
            style={{ paddingLeft: getItemPadding(level, type === "file") }}
        >
            <div className="flex items-center gap-0.5">
                {type === "folder" && (
                    <ChevronRightIcon className={cn("size-4 shrink-0 text-muted-foreground",
                        isOpen && "rotate-90")} />
                )}
                {type === "file" && (
                    <FileIcon fileName={value} autoAssign className="size-4"></FileIcon>
                )}
                {type === "folder" && (
                    <FolderIcon className="size-4" folderName={value}></FolderIcon>
                )}
            </div>
            <input
                autoFocus
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none focus:ring-1 focus:ring-inset
                focus:ring-ring"
                onBlur={handleSubmit}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        handleSubmit();
                        onCancel();
                    }
                    if (e.key === "Escape") {
                        onCancel();
                    }
                }}
                onFocus={(e) => {
                    //onFocus is the text highlight that appears when we select multiple characters! 
                    //So here, we only want to select up till the dot '.', 
                    //then when we press delete we will not remove everything 
                    //and can preserve the file extension
                    //Highlights until extension!
                    if (type === "folder") {
                        e.currentTarget.select();
                    } else {
                        const value = e.currentTarget.value;
                        const lastDotIndex = value.lastIndexOf(".");
                        if (lastDotIndex > 0) {
                            e.currentTarget.setSelectionRange(0, lastDotIndex);
                        } else {
                            e.currentTarget.select();
                        }
                    }
                }}
            >
            </input>
        </div>
    )
}
