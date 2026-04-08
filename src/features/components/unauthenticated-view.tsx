import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";
import { ShieldAlertIcon } from "lucide-react";


export default function UnauthenticatedView() {
    return (
        <div className="flex items-center justify-center h-screen bg-background">
            <div className="w-full max-w-lg bg-muted">
                <Item variant="outline">
                    <ItemMedia variant="icon">
                        <ShieldAlertIcon />
                    </ItemMedia>
                    <ItemContent>
                        <ItemTitle>Unauthorised Access</ItemTitle>
                        <ItemDescription>You are Not Authorised to Access this Resource</ItemDescription>
                        <ItemActions>
                            <SignInButton>
                                <button className="px-3 py-1 rounded font-bold">
                                    Sign In
                                </button>
                            </SignInButton>
                            <SignUpButton>
                                <button className="px-3 py-1 rounded font-bold">
                                    Sign Up
                                </button>
                            </SignUpButton>
                        </ItemActions>
                    </ItemContent>
                </Item>
            </div>
        </div >
    )
}
