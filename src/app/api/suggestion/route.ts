
import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

// import { google } from "@ai-sdk/google";

import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";



const suggestionSchema = z.object({
    suggestion: z.string().
        describe(
            "The code to insert at cursor, or empty string if no completion needed."
        )
});

const SUGGESTION_PROMPT = `You are a code suggestion assistant.

    <context>
    <file_name>{fileName}</file_name>
    <previous_lines>
    {previousLines}
    </previous_lines>
    <current_line number="{lineNumber}">{currentLine}</current_line>
    <before_cursor>{textBeforeCursor}</before_cursor>
    <after_cursor>{textAfterCursor}</after_cursor>
    <next_lines>
    {nextLines}
    </next_lines>
    <full_code>
    {code}
    </full_code>
    </context>

    <instructions>
    Follow these steps IN ORDER:

    1. First, look at next_lines. If next_lines contains ANY code, check if it continues from where the cursor is. If it does, return empty string immediately - the code is already written.

    2. Check if before_cursor ends with a complete statement (;, }, )). If yes, return empty string.

    3. Only if steps 1 and 2 don't apply: suggest what should be typed at the cursor position, using context from full_code.

    Your suggestion is inserted immediately after the cursor, so never suggest code that's already in the file.
    </instructions>`;

export async function POST(request: Request) {
    try {

        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json(
                { error: "[AI GHOST-TEXT SUGGESTION POST RESPONSE] Unauthorised. UserId is invalid." },
                { status: 403 }
            );

            //put this here so we absolutely make sure that we only invoke the AI 
            //if there is a valid userID. 
            //So non-malicious actors cannot access our NextJS app and call the AI. Needs to be the signed in user.
        }

        const requestBody = await request.json();

        console.log(requestBody);

        const {
            fileName,
            code,
            currentLine,
            previousLines,
            textBeforeCursor,
            textAfterCursor,
            nextLines,
            lineNumber
        } = requestBody;

        if (!code) {
            return NextResponse.json(
                { error: "[AI GHOST-TEXT SUGGESTION POST RESPONSE] Code is required" },
                { status: 400 }
            )
        }
        const prompt = SUGGESTION_PROMPT
            .replace("{fileName}", fileName)
            .replace("{code}", code)
            .replace("{currentLine}", currentLine)
            .replace("{previousLines}", previousLines || "")
            .replace("{textBeforeCursor}", textBeforeCursor)
            .replace("{textAfterCursor}", textAfterCursor)
            .replace("{nextLines}", nextLines || "")
            .replace("{lineNumber}", lineNumber.toString());

        const { output } = await generateText({
            // model: google("gemini-2.5-flash"),
            model: anthropic("claude-haiku-4-5"), //use Claude performs better!
            output: Output.object({ schema: suggestionSchema }),
            prompt,
        });

        console.log(output.suggestion);

        return NextResponse.json({ suggestion: output.suggestion }, { status: 200 });

    } catch (error) {
        console.error("[AI GHOST-TEXT SUGGESTION POST RESPONSE] Suggestion error:", error);
        return NextResponse.json(
            { error: `[AI GHOST-TEXT SUGGESTION POST RESPONSE] Failed to generate suggestion ghost text:${error}` },
            { status: 500 });
    }
}
