import { useEffect, useMemo, useRef } from "react";
import { basicSetup, EditorView } from "codemirror";
import { keymap } from "@codemirror/view";
import { vsCodeDark } from "@fsegurai/codemirror-theme-bundle";
import { getLanguageExtension } from "../extensions/language-extensions";


import { indentWithTab } from "@codemirror/commands";
import { customTheme } from "../extensions/theme";
import { minimap } from "../extensions/minimap";

import { indentationMarkers } from "@replit/codemirror-indentation-markers";
import { suggestion } from "../extensions/suggestion";
import { quickEdit } from "../extensions/quick-edit";
import { selectionTooltip } from "../extensions/selection-tooltip";


/*
Available Themes:
solarisedDark
abyss
oneDark
VScodeDark
--> any many more, all from the theme-bundle library...
*/

interface Props {
    fileName: string;
    initialValue: string;
    onChange: (value: string) => void;
}

export const CodeEditor = ({ fileName, initialValue, onChange }: Props) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);

    const languageExtension = useMemo(() => {
        return getLanguageExtension(fileName)
    }, [fileName]);



    useEffect(() => {
        if (editorRef.current == null) {
            return;
        }

        //Renders the out of the box, all ready code editor with a bit of intellisense, as provided by CodeMirror library! On component mount.
        const view = new EditorView({
            doc: initialValue,
            parent: editorRef.current,
            extensions:
                [
                    vsCodeDark,
                    customTheme,
                    basicSetup,
                    languageExtension,
                    suggestion(fileName),
                    quickEdit(),
                    selectionTooltip(),
                    keymap.of([indentWithTab]),
                    minimap(),
                    indentationMarkers(),
                    EditorView.updateListener.of((update) => {
                        if (update.docChanged) {
                            //if a change in the current EditorView component contents has been detected (document)...
                            //Call the onChange function, which is defined in the parent component and passed here as a prop!
                            //Classic passing of prop information from child to parents...
                            //update.state.doc.toString() means get all of the current contents in this document, convert to string syntax and pass it in as argument
                            //to the input onChange() method which this component accepts as a prop.
                            //The real actual method that is binded and represented by onChange(), as defined in the parent component, 
                            //hence runs with this argument value.
                            onChange(update.state.doc.toString());
                        }
                    })
                ]
        });

        viewRef.current = view;

        return () => {
            view.destroy();
        }
    }, [languageExtension])

    return (
        <div ref={editorRef} className="size-full pl-4 bg-background"></div>
    )
}
