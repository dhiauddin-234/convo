
import { cn } from "@/lib/utils";
import type { Message } from "@/types";
import { format } from 'date-fns';

interface ChatMessageProps {
  message: Message;
  isCurrentUser: boolean;
}

export function ChatMessage({ message, isCurrentUser }: ChatMessageProps) {
  return (
    <div className={cn("flex items-end gap-2", isCurrentUser && "justify-end")}>
      <div
        className={cn(
          "max-w-xs md:max-w-md lg:max-w-lg rounded-lg px-4 py-2",
          isCurrentUser
            ? "bg-primary text-primary-foreground"
            : "bg-card"
        )}
      >
        <p className="text-sm">{message.text}</p>
         <p className={cn("text-xs mt-1", isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground")}>
            {message.createdAt ? format(message.createdAt.toDate(), 'p') : ''}
        </p>
      </div>
    </div>
  );
}
