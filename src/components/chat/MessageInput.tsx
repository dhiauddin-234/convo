
'use client';

import { sendMessage } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send } from "lucide-react";
import { useRef } from "react";
import { useFormStatus } from "react-dom";

interface MessageInputProps {
  chatId: string;
  senderId: string;
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" size="icon" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4" />}
            <span className="sr-only">Send Message</span>
        </Button>
    )
}

export function MessageInput({ chatId, senderId }: MessageInputProps) {
    const formRef = useRef<HTMLFormElement>(null);
    const { toast } = useToast();

    async function formAction(formData: FormData) {
        const result = await sendMessage(formData);
        if(result?.error) {
            toast({
                variant: 'destructive',
                title: 'Message Moderated',
                description: result.error,
            })
        } else {
            formRef.current?.reset();
        }
    }

  return (
    <div className="border-t p-4">
      <form ref={formRef} action={formAction} className="flex items-center gap-2">
        <Input name="text" placeholder="Type a message..." autoComplete="off" required />
        <input type="hidden" name="chatId" value={chatId} />
        <input type="hidden" name="senderId" value={senderId} />
        <SubmitButton />
      </form>
    </div>
  );
}
