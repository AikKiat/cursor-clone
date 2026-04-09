//setup an inngest client so this application can interface with inngest

import { Inngest } from "inngest";
import { sentryMiddleware } from "@inngest/middleware-sentry";

export const inngest = new Inngest({ id: "cursor-clone", middleware: [sentryMiddleware()] })
