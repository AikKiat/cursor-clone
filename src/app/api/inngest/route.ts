
import {serve} from "inngest/next";
import {inngest} from "@/ingest/client"; //@ automatically goes to root of project folder. Dont need to chain `../`


export const {GET, POST, PUT} = serve({
    client: inngest,
    functions: [],
})
