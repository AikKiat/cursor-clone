


import { NextResponse } from "next/server";
import { z } from "zod";
import { toast } from "sonner";

const suggestionRequestSchema = z.object({
    fileName: z.string(),
    code: z.string(),
    currentLine: z.string(),
    previousLines: z.string(),
    textBeforeCursor: z.string(),
    textAfterCursor: z.string(),
    nextLines: z.string(),
    lineNumber: z.number(),

});

const suggestionResponseSchema = z.object({
    suggestion: z.string(),
});

type SuggestionRequest = z.infer<typeof suggestionRequestSchema>;
type SuggestionResponse = z.infer<typeof suggestionResponseSchema>;


export const aiResponseFetcher = async (payload: SuggestionRequest): Promise<string | null> => {
    try {

        const validatedPayload = suggestionRequestSchema.parse(payload);
        console.log("validatedPayload", validatedPayload);


        const result = await fetch("/api/suggestion", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(validatedPayload),
        });

        console.log("result", result);

        if (!result.ok) {
            throw new Error(`[AI GHOST TEXT SUGGESTION SERVICE FETCHER] Failed to get response from AI service: ${result.statusText}`)
        };

        console.log("result", result);

        if (result == null) {
            throw new Error(`[AI GHOST TEXT SUGGESTION SERVICE FETCHER] Failed to get response from AI service: result is null`);
        }

        const responseJSON = await result.json();

        const validatedResponse: SuggestionResponse = suggestionResponseSchema.parse(responseJSON);

        return validatedResponse.suggestion;

    } catch (error) {
        console.error(`[AI GHOST TEXT SUGGESTION SERVICE FETCHER] Failed to get response from AI service: ${error}`)
        NextResponse.json(
            { error: `[AI GHOST TEXT SUGGESTION SERVICE FETCHER] Failed to get response from AI service: ${error}` },
            { status: 500 });
        toast.error("Failed to fetch AI completion") //send toast message to the frontend
        return null;
    }
}
