import { MutationCtx, QueryCtx } from "./_generated/server";


export const verifyAuthentication = async (ctx: QueryCtx | MutationCtx) => {
    const userIdentity = await ctx.auth.getUserIdentity(); //Related to convex user authentication and management via Clerk, using JWT.
    if (!userIdentity) {
        throw new Error("[CONVEX CLIENT - USER AUTH] Unauthorised user, unable to fetch data from schema projects")
    }

    return userIdentity;

}
