


import { Extension } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";



export const getLanguageExtension = (filename: string): Extension => {
    const fileExtension = filename.split(".").pop()?.toLowerCase();
    switch (fileExtension) {
        case "js":
            return javascript();
        case "jsx":
            return javascript({ jsx: true });
        case "ts":
            return javascript({ typescript: true });
        case "tsx":
            return javascript({ typescript: true, jsx: true });
        case "html":
            return html();
        case "css":
            return css();
        case "json":
            return json();
        case "python":
            return python();
        case "md":
        case "mdx":
            return markdown();
        default:
            return []

    }
}
