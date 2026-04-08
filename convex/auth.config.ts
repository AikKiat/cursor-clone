import { AuthConfig } from "convex/server";

export default {
    providers: [{
        domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
        applicationID:"convex", //the name of the JWT template created to 
        //interface Clerk Authentication + Authorization with Convex.
        //Clerk is the user management platform we are using,
        //and it issues the JWT via an ISSUER_DOMAIN name which is defined in process.env file
        //Hence, this environment variable must also be presently set in the convex dashboard for this cursor-clone project.

    }
    ]
} satisfies AuthConfig;
