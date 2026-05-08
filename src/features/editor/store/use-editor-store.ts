


import { create } from 'zustand';
import {Id} from "@/../convex/_generated/dataModel";

interface TabState {
    openTabs: Id<"files">[];
    activeTabId: Id<"files"> | null;
    previewTabId: Id<"files"> | null;
}

const defaultTabState: TabState = {
    openTabs: [],
    activeTabId: null,
    previewTabId: null
}

interface EditorStore {
    tabs: Map<Id<"projects">, TabState>;
    getTabState: (projectId: Id<"projects">) => TabState;

    openFile: (
        projectId: Id<"projects">,
        fileId: Id<"files">,
        options: { pinned: boolean }
    ) => void;

    closeTab: (projectId: Id<"projects">, fileId: Id<"files">) => void;
    closeAllTabs: (projectId: Id<"projects">) => void;
    setActiveTab: (projectId: Id<"projects">, fileId: Id<"files">) => void;
}




//hook here
//
//We declare the constant variable of type useEditorStore, which is of type EditorStore
export const useEditorStore = create<EditorStore>()((set, get) => ({

    //defined two functions using zustand -> set(), and get() (React State Management)
    //
    //From docs:
    //stateCreatorFn: A function that takes set function, get function and store as arguments. 
    //Usually, you will return an object with the methods you want to expose.
    //
    //create returns a React Hook with API utilities, setState, getState, getInitialState and subscribe, attached. 
    //It lets you return data that is based on current state, using a selector function. 
    //It should take a selector function as its only argument.
 
    tabs: new Map(),

    getTabState: (projectId) => {
        return get().tabs.get(projectId) ?? defaultTabState;
    },

    openFile: (projectId, fileId, { pinned }) => {
        const tabs = new Map(get().tabs);
        const state = tabs.get(projectId) ?? defaultTabState;
        const { openTabs, previewTabId } = state;
        const isOpen = openTabs.includes(fileId);

        //Case 1: open as preview but dont save this as a definite tab page.
        if (!isOpen && !pinned) {
            const newTabs = (previewTabId
                ? openTabs.map((id) => (id === previewTabId ? fileId : id))
                : [...openTabs, fileId]);

            tabs.set(projectId, {
                openTabs: newTabs,
                activeTabId: fileId,
                previewTabId: fileId
            });

            set({ tabs });
            return;
        }

        //Case 2: Opening a tab immediate ly and pinning it!
        //
        if (!isOpen && pinned) {
            tabs.set(projectId, {
                ...state,
                openTabs: [...openTabs, fileId],
                activeTabId: fileId,
                previewTabId: fileId
            });

            set({ tabs });
            return;
        }

        //Case 3: File already open just activate and pin if double click detected!

        const shouldPin = pinned && previewTabId === fileId;
        tabs.set(projectId, {
            ...state,
            activeTabId: fileId,
            previewTabId: shouldPin ? null : previewTabId
        });

        set({ tabs });
    },

    closeTab: (projectId, fileId) => {
        const tabs = new Map(get().tabs);
        const state = tabs.get(projectId) ?? defaultTabState;
        const { openTabs, activeTabId, previewTabId } = state;
        const tabIndex = openTabs.indexOf(fileId);

        if (tabIndex === -1) return;

        const newTabs = openTabs.filter((id) => id !== fileId);

        let newActiveTabId = activeTabId;
        if (activeTabId === fileId) {
            if (newTabs.length === 0) {
                newActiveTabId = null;
            } else if (tabIndex >= newTabs.length) {
                newActiveTabId = newTabs[newTabs.length - 1];
            } else {
                newActiveTabId = newTabs[tabIndex];
            }
        }

        tabs.set(projectId, {
            openTabs: newTabs,
            activeTabId: newActiveTabId,
            previewTabId: previewTabId === fileId ? null : previewTabId,
        });

        set({ tabs });
    },

    closeAllTabs: (projectId) => {
        const tabs = new Map(get().tabs);
        tabs.set(projectId, defaultTabState);
        set({ tabs });
    },

    setActiveTab: (projectId, fileId) => {
        const tabs = new Map(get().tabs);
        const state = tabs.get(projectId) ?? defaultTabState;
        tabs.set(projectId, {
            ...state,
            activeTabId: fileId
        });
        set({ tabs });
    },

}))


