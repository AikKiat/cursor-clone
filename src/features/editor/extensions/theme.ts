import { EditorView } from "codemirror";


export const customTheme = EditorView.theme({
    "&": {
        outline: "none !important",
        height: "100%",
    },
    ".cm-content": {
        fontFamily: "var(--font-jetbrains-mono), monospace",
        fontSize: "14px",
    },
    ".cm-scrollbar": {
        scrollbarWidth: "thin",
        scrollbarColor: "#3f3f46 transparent",
    },
})
