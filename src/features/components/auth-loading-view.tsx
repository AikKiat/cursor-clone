import { Spinner } from "@/components/ui/spinner";



export default function AuthLoadingView(){
    return (
        <div className="flex items-center justify-center h-screen bg-background">
        <h1>Loading... </h1>
        <Spinner className="size-6 text-ring"/>
        </div>
    )
}
