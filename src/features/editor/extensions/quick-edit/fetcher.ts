
import { NextResponse } from "next/server";
import { z } from "zod";
import { toast } from "sonner";

const editRequestSchema = z.object({
    selectedCode: z.string(),
    fullCode: z.string(),
    instruction: z.string()
});

const editResponseSchema = z.object({
    editedCode: z.string(),
});

type EditRequest = z.infer<typeof editRequestSchema>;
type EditResponse = z.infer<typeof editResponseSchema>;


export const aiQuickEditResponseFetcher = async (payload: EditRequest): Promise<string | null> => {
    try {

        const validatedPayload = editRequestSchema.parse(payload);
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

        const validatedResponse: EditResponse = editResponseSchema.parse(responseJSON);

        return validatedResponse.editedCode;

    } catch (error) {
        console.error(`[AI QUICK EDIT SERVICE FETCHER] Failed to get response from AI service: ${error}`)
        NextResponse.json(
            { error: `[AI QUICK EDIT SERVICE FETCHER] Failed to get response from AI service: ${error}` },
            { status: 500 });
        toast.error("Failed to fetch AI quick edits") //send toast message to the frontend
        return null;
    }
}
