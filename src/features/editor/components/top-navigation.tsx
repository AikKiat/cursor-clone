import { Id } from "@/../convex/_generated/dataModel"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { useEditor } from "../hooks/use-editor"
import { Tab } from "./tab";


export const TopNavigation = ({ projectId }: { projectId: Id<"projects"> }) => {

    const { openTabs } = useEditor(projectId);

    return (
        <ScrollArea className="flex-1">
            <nav className="bg-sidebar flex items-center h-8.75 border-b">
                {openTabs.map((fileId, index) => {
                    return (
                        <Tab
                            key={fileId}
                            fileId={fileId}
                            isFirst={index === 0}
                            projectId={projectId}
                        ></Tab>
                    )
                })}
            </nav>
            <ScrollBar orientation="horizontal"></ScrollBar>
        </ScrollArea>
    )
}
