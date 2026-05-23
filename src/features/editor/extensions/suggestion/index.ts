import { StateEffect, StateField } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView, keymap, ViewPlugin, ViewUpdate, WidgetType } from "@codemirror/view";
import { aiResponseFetcher } from "./fetcher";



//StateEffect: a way to send messages to update state
//define one effect type for setting the suggestion text
const setSuggestionEffect = StateEffect.define<string | null>();


//StateField: holds our suggestion state in the editor
//-create() method --> returns the initial value when the editor loads
//-update() method: called on every transaction (keystroke, etc) to potentially update the value

const suggestionState = StateField.define<string | null>({
    //State management plugin
    create() {
        // return "TODO: Implement This";
        //render this ghost text suggestion, as a default fallback case! 
        //So, on every cursor hover we can potentially render this ghost text.
        return null
    },
    update(value, transaction) {
        //check each effect in this transaction
        //if we find our setSuggestionEffect, return its new value
        //otherwise keep the current values unchanged and just return the original value
        for (const effect of transaction.effects) {
            if (effect.is(setSuggestionEffect)) {
                return effect.value; //return this new as value
            }
        }
        return value;
    },
});


//WidgetType: Creates the custom DOM elements to display in the editor, represented by a span.
//toDOM() --> called by CodeMirror, and creates the actual HTMLElement
class SuggestionWidget extends WidgetType {
    constructor(readonly text: string) {
        super();
    }

    toDOM(): HTMLElement {
        const span = document.createElement("span"); //create the span element which will hold the code suggestion
        span.textContent = this.text;
        span.style.opacity = "0.4";
        span.style.pointerEvents = "none";
        return span;
    }
}

let debounceTimer: number | null = null;
let isWaitingForSuggestion = false;
const DEBOUNCE_DELAY = 300;

let currentAbortController: AbortController | null = null;

//mock function to demonstrate how the suggestions are generated and seen
//WORKS!!!
// const generateFakeSuggestion = (textBeforeCursor: string): string => {
//     const trimmed = textBeforeCursor.trimEnd();
//     if (trimmed.endsWith("const")) return " myVariable= ";
//     return "A mock suggestion";
// }

//Actual function to invoke AI service suggestion response
const generatePayload = (view: EditorView, fileName: string) => {
    const code = view.state.doc.toString();
    if (!code || code.trim().length === 0) return null;
    const cursorPosition = view.state.selection.main.head;
    const currentLine = view.state.doc.lineAt(cursorPosition);
    const cursorInLine = cursorPosition - currentLine.from;

    const previousLines: string[] = [];
    const previousLinesToFetch = Math.min(5, currentLine.number - 1);

    for (let i = previousLinesToFetch; i >= 1; i--) {
        previousLines.push(view.state.doc.line(currentLine.number - i).text);
    }

    const nextLines: string[] = [];
    const totalLines = view.state.doc.lines;
    const linesToFetch = Math.min(5, totalLines - currentLine.number);

    for (let i = 1; i <= linesToFetch; i++) {
        nextLines.push(view.state.doc.line(currentLine.number + i).text);
    }

    //Return an object of these attributes...
    return {
        fileName,
        code,
        currentLine: currentLine.text,
        previousLines: previousLines.join("\n"),
        textBeforeCursor: currentLine.text.slice(0, cursorInLine),
        textAfterCursor: currentLine.text.slice(cursorInLine),
        nextLines: nextLines.join("\n"),
        lineNumber: currentLine.number,
    }


}

const createDebouncePlugin = (fileName: string) => {
    return ViewPlugin.fromClass(
        class {
            constructor(view: EditorView) {
                this.triggerSuggestion(view);
            }

            update(update: ViewUpdate) {
                if (update.docChanged || update.selectionSet) {
                    this.triggerSuggestion(update.view);
                }
            }

            triggerSuggestion(view: EditorView) {
                if (debounceTimer !== null) {
                    clearTimeout(debounceTimer);
                }

                if(currentAbortController !== null){
                   currentAbortController.abort(); 
                }

                isWaitingForSuggestion = true;

                debounceTimer = window.setTimeout(async () => {
                    const payload = generatePayload(view, fileName);

                    if(!payload){
                        isWaitingForSuggestion = false;
                        view.dispatch({
                            effects: setSuggestionEffect.of(null)
                        });
                        return; //return early 
                    }

                    currentAbortController = new AbortController();
                    const suggestion = await aiResponseFetcher(payload);

                    isWaitingForSuggestion = false;
                    view.dispatch({
                        //dispath a state change update that will be detected
                        effects: setSuggestionEffect.of(suggestion),
                    });
                }, DEBOUNCE_DELAY)
            }

            destroy() {
                if (debounceTimer != null) {
                    clearTimeout(debounceTimer);
                }
                if(currentAbortController !== null){
                    currentAbortController.abort(); //abort and teardown this controller as well to avoid memory leaks
                }
            }
        }
    )
}

const renderPlugin = ViewPlugin.fromClass(
    //render plugin
    class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
            this.decorations = this.build(view);
        }

        update(update: ViewUpdate) {
            //Rebuild decorations if doc changed, cursor moved or suggestion changed!

            //Scan for all transactions, then for all effects under transaction
            const suggestionChanged = update.transactions.some((transaction) => {
                return transaction.effects.some((effect) => {
                    return effect.is(setSuggestionEffect);
                });
            });

            const shouldRebuild = update.docChanged || update.selectionSet || suggestionChanged;
            if (shouldRebuild) {
                this.decorations = this.build(update.view);
            }
        }

        build(view: EditorView) {

            if (isWaitingForSuggestion) {
                return Decoration.none; //if still waiting for suggestion, then dont render anything
            }

            const suggestion = view.state.field(suggestionState);
            if (!suggestion) {
                return Decoration.none;
            }

            //Create a widget decoration at the cursor position
            const cursor = view.state.selection.main.head;
            return Decoration.set([
                Decoration.widget({
                    widget: new SuggestionWidget(suggestion),
                    side: 1, //render this after the cursor (side =1) not before, which would be -1!
                }).range(cursor),
            ]);
        }
    },
    { decorations: (plugin) => plugin.decorations } //Tell CodeMirror to use our decorations!
)

const acceptSuggestionKeymap = keymap.of([
    {
        key: "Tab",
        run: (view) => {
            const suggestion = view.state.field(suggestionState);
            if (!suggestion) {
                return false; //no suggestion, then Tab key does its normal functions --> aka indent code.
            }

            const cursor = view.state.selection.main.head;
            view.dispatch({
                changes: { from: cursor, insert: suggestion }, //insert the suggestion
                selection: { anchor: cursor + suggestion.length }, //move cursor to the end of the suggested text
                effects: setSuggestionEffect.of(null), //clear the suggestion on pressing tab (the ghost text)           
            });

            return true; //Tab has been handled for suggestions, so override the usual keymap indent!
        }
    }
])

export const suggestion = (fileName: string) => [
    suggestionState, //our state storage
    renderPlugin, //render the ghost text suggestions
    acceptSuggestionKeymap, //Tab functionality override to accept the ghost text suggestions, and render into DOM.
    createDebouncePlugin(fileName)
]
