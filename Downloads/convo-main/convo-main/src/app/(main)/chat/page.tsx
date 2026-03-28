import { MessageSquare } from "lucide-react";

export default function ChatPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
       <div className="flex items-center gap-2 text-2xl font-headline font-semibold text-primary">
         <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-10 w-10"
          >
            <path d="M12 22a10 10 0 0 0 10-10h-2a8 8 0 0 1-8 8v2Z" />
            <path d="M22 12a10 10 0 0 0-10-10v2a8 8 0 0 1 8 8h2Z" />
            <path d="M12 2a10 10 0 0 0-10 10h2a8 8 0 0 1 8-8V2Z" />
          </svg>
          Convo
      </div>
      <h2 className="text-2xl font-bold font-headline">Welcome to Convo</h2>
      <p className="text-muted-foreground">
        Select a chat from the sidebar or find a user to start a new conversation.
      </p>
    </div>
  );
}
