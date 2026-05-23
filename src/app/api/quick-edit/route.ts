import { firecrawl } from "@/lib/firecrawl";
import { anthropic } from "@ai-sdk/anthropic";
import { auth } from "@clerk/nextjs/server";
import { generateText, Output } from "ai";
import { NextResponse } from "next/server";
import z from "zod";



const quickEditSchema = z.object({
    editedCode: z.string().describe(
        "The edited version of the selected code based on the instruction"
    ),
});

const URL_REGEX = /https?:\/\/[^\s)>\]]+/g; //url regex to check if url is valid url scheme


const QUICK_EDIT_PROMPT = `You are a code editing assistant. Edit the selected code based on the user's instruction.
    <context>
    <selected_code>
    {selectedCode}
    </selected_code>
    <full_code_context>
    {fullCode}
    </full_code_context>
    </context>

    {documentation}

    <instruction>
    {instruction}
    </instruction>

    <instructions>
    Return ONLY the edited version of the selected code.
    Maintain the same indentation level as the original.
    Do not include any explanations or comments unless requested.
    If the instruction is unclear or cannot be applied, return the original code unchanged.
    </instructions>`;


export async function POST(request: Request) {
    try {
        const { userId } = await auth();
        const { selectedCode, fullCode, instruction } = await request.json();

        if (!userId) {
            return NextResponse.json(
                { error: "[QUICK EDIT ROUTE] (UNAUTHORISED) userId is invalid. Unauthorised to invoke AI quick edits." },
                { status: 403 }
            );
        }

        if (!selectedCode) {
            return NextResponse.json(
                { error: "[QUICK EDIT ROUTE] (BAD REQUEST) selectedCode variable is required and cannot be null/undefined." },
                { status: 400 }
            );
        }

        const urls: string[] = instruction.match(URL_REGEX) || [];

        let documentationContext = "";

        if (urls.length > 0) {
            const scrapedResults = await Promise.all(
                urls.map(async (url) => {
                    try {
                        const result = await firecrawl.scrape(url, {
                            formats: ["markdown"],
                        });
                        if (result.markdown) {
                            return `<doc url="${url}">\n${result.markdown}\n</doc>`;
                        }
                        return null;
                    } catch {
                        return null;
                    }
                }));
            const validResults = scrapedResults.filter(Boolean); //So either a value (true), or null (false)

            if (validResults.length > 0) {
                documentationContext = `<documentation>\n${validResults.join("\n\n")}\n</documentation>`;
            }
        }

        //replace the placeholders with the actual derived argument values to be inside the prompt now!!!
        const prompt = QUICK_EDIT_PROMPT
            .replace("{selectedCode}", selectedCode)
            .replace("{fullCode}", fullCode || "")
            .replace("{instruction}", instruction)
            .replace("{documentation}", documentationContext);

        const { output } = await generateText({
            model: anthropic("claude-haiku-4-5"), //use a cheap model for now(free one)
            output: Output.object({ schema: quickEditSchema }),
            prompt,
        });

        return NextResponse.json({
            editedCode: output.editedCode
        });
    }
    catch (error) {
        console.error("Edit error:", error);
        return NextResponse.json(
            { error: "[QUICK EDIT ROUTE] (Internal Server Error) Failed to generate AI assisted edits based off knowledge and webscraped data." },
            { status: 500 }
        );
    }
}
