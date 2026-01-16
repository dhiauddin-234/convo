
'use client';

import { sendMessage } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send } from "lucide-react";
import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";

interface MessageInputProps {
  chatId: string;
  senderId: string;
}

function SubmitButton({ disabled }: { disabled?: boolean }) {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" size="icon" disabled={pending || disabled}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4" />}
            <span className="sr-only">Send Message</span>
        </Button>
    )
}

export function MessageInput({ chatId, senderId }: MessageInputProps) {
    const formRef = useRef<HTMLFormElement>(null);
    const [inputValue, setInputValue] = useState('');
    const { toast } = useToast();

    async function formAction(formData: FormData) {
        const currentInput = inputValue;
        setInputValue(''); // Optimistically clear input

        const result = await sendMessage(formData);
        if(result?.error) {
            toast({
                variant: 'destructive',
                title: 'Message Moderated',
                description: result.error,
            });
            setInputValue(currentInput); // Restore on error
        }
    }

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            if (inputValue.trim()) {
                formRef.current?.requestSubmit();
            }
        }
    };

  return (
    <div className="border-t p-4">
      <form ref={formRef} action={formAction} className="flex items-center gap-2">
        <Input 
            name="text" 
            placeholder="Type a message..." 
            autoComplete="off" 
            required 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
        />
        <input type="hidden" name="chatId" value={chatId} />
        <input type="hidden" name="senderId" value={senderId} />
        <SubmitButton disabled={inputValue.trim() === ''} />
      </form>
    </div>
  );
}
