
import {serve} from "inngest/next";
import {inngest} from "@/ingest/client"; //@ automatically goes to root of project folder. Dont need to chain `../`
import { processMessage } from "@/features/conversations/inngest/process-message";


export const {GET, POST, PUT} = serve({
    client: inngest,
    functions: [
        processMessage
    ],
});



