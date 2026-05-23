

import { EditorState, StateEffect, StateField } from "@codemirror/state";
import { Tooltip, showTooltip, keymap, EditorView } from "@codemirror/view";
import { aiQuickEditResponseFetcher } from "./fetcher";



export const showQuickEditEffect = StateEffect.define<boolean>();

let editorView: EditorView | null = null;
let currentAbortController: AbortController | null = null;

export const quickEditState = StateField.define<boolean>({
    create() {
        return false;
    },

    update(value, transaction) {
        for (const effect of transaction.effects) {
            if (effect.is(showQuickEditEffect)) {
                return effect.value;
            }
        }
        if (transaction.selection) {
            const selection = transaction.state.selection.main;
            if (selection.empty) {
                return false;
            }
        }
        return value;
    }
});

const createQuickEditTooltip = (state: EditorState): readonly Tooltip[] => {
    const selection = state.selection.main; //get currently selected line

    if (selection.empty) {
        return [];
    }

    const isQuickEditActive = state.field(quickEditState);
    if (!isQuickEditActive) {
        return [];
    }

    return [
        {
            pos: selection.to,
            above: false,
            strictSide: false,

            create() {

                //create a new DOM element that represents all of these AI suggested Quick edits, 
                //rendered on screen in the frontend!
                //Basically an additional popup that is rendered on top (z-index), and serves to contain code suggestions based off AI knowledge and webscrapped inf
                //Like VSCode lightbulb, Cursor as well.
                //ONLY DONE IF things are SELECTED --> hence state.selection.main null check before all this!

                const dom = document.createElement("div");
                dom.className = "bg-popover text-popover-foreground z-50 rounded-sm border\
                border-input p-2 shadow-md flex flex-col gap-2 text-sm";

                const form = document.createElement("form");
                form.className = "flex flex-col gap-2";

                const input = document.createElement("input");
                input.type = "text";
                input.placeholder = "Edit selected code";
                input.className = "bg-transparent border-none outline-none px-2 py-1 font-sans w-100";
                input.autofocus = true;

                const buttonContainer = document.createElement("div");
                buttonContainer.className = "flex items-center justify-between gap-2";

                const cancelButton = document.createElement("button");
                cancelButton.type = "button";
                cancelButton.textContent = "Cancel";
                cancelButton.className = "font-sans p-1 px-2 text-muted-foreground hover:text-foreground\
                    hover:bg-foreground/10 rounded-sm";
                cancelButton.onclick = () => {
                    if (currentAbortController) {
                        currentAbortController.abort();
                        currentAbortController = null;
                    }
                    if (editorView) {
                        editorView.dispatch({
                            effects: showQuickEditEffect.of(false),
                        });
                    }
                }

                const submitButton = document.createElement("button");
                submitButton.type = "submit";
                submitButton.textContent = "Submit";
                submitButton.className = "font-sans p-1 px-2 text-muted-foreground hover:text-foreground\
                    hover:bg-foreground/10 rounded-sm";

                form.onsubmit = async (e) => {
                    e.preventDefault();
                    if (!editorView) return;
                    const instruction = input.value.trim();
                    const selection = editorView.state.selection.main;
                    const selectedCode = editorView.state.doc.sliceString(
                        selection.from,
                        selection.to);
                    const fullCode = editorView.state.doc.toString();

                    currentAbortController = new AbortController();
                    const editedCode = await aiQuickEditResponseFetcher({
                        selectedCode,
                        fullCode,
                        instruction
                    }
                    );

                    if (editedCode) {
                        editorView.dispatch({
                            changes: {
                                from: selection.from,
                                to: selection.to,
                                insert: editedCode,
                            },
                            selection: { anchor: selection.from + editedCode.length },
                            effects: showQuickEditEffect.of(false),
                        });
                    } else {
                        submitButton.disabled = false;
                        submitButton.textContent = "Submit";
                    }

                    currentAbortController = null; //set back to null

                };

                buttonContainer.appendChild(cancelButton);
                buttonContainer.appendChild(submitButton);

                form.appendChild(input);
                form.appendChild(buttonContainer);

                dom.appendChild(form);

                setTimeout(() => {
                    input.focus();
                }, 0);

                return { dom };

            }
        }
    ]
}

const quickEditTooltipField = StateField.define<readonly Tooltip[]>({
    create(state) {
        return createQuickEditTooltip(state);
    },

    update(tooltips, transaction) {
        if (transaction.docChanged || transaction.selection) {
            return createQuickEditTooltip(transaction.state);
        }
        for (const effect of transaction.effects) {
            if (effect.is(showQuickEditEffect)) {
                return createQuickEditTooltip(transaction.state);
            }
        }
        return tooltips;
    },
    provide: (field) => showTooltip.computeN(
        [field],
        (state) => state.field(field),
    ),
});

const quickEditKeymap = keymap.of([
    {
        key: "Mod-k",
        run: (view) => {
            const selection = view.state.selection.main;
            if (selection.empty) {
                return false;
            }
            view.dispatch({
                effects: showQuickEditEffect.of(true),
            });
            return true
        },
    },
]);

export const captureViewExtension = EditorView.updateListener.of((update) => {
    editorView = update.view; //update the current EditorView state
})

export const quickEdit = () => [
    quickEditState,
    quickEditTooltipField,
    quickEditKeymap,
    captureViewExtension
]
