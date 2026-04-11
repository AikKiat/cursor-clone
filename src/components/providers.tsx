"use client";

import { ClerkProvider, Show, UserButton, useAuth } from "@clerk/nextjs";
import { Authenticated, AuthLoading, ConvexReactClient, Unauthenticated } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ThemeProvider } from "./theme-provider";
import UnauthenticatedView from "@/features/auth/components/unauthenticated-view";
import AuthLoadingView from "@/features/auth/components/auth-loading-view";


const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!); //exclamation mark denotes a MUST have. Cannot be undefined.

export const Providers = ({ children }: { children: React.ReactNode }) => {
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange>

            <ClerkProvider>
                <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
                    <Authenticated>
                        <Show when="signed-in">
                            <UserButton />
                        </Show>
                        {children}
                    </Authenticated>
                    <Unauthenticated>
                        <UnauthenticatedView />
                    </Unauthenticated>
                    <AuthLoading>
                        <AuthLoadingView />
                    </AuthLoading>
                </ConvexProviderWithClerk>
            </ClerkProvider>
        </ThemeProvider>
    )
}
