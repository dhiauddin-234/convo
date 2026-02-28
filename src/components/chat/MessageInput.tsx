'use client';

import { sendMessage, updateTypingStatus } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, X } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import type { Message, AppUser } from "@/types";
import { useDebouncedCallback } from 'use-debounce';
import { cn } from "@/lib/utils";

interface MessageInputProps {
  chatId: string;
  senderId: string;
  replyToMessage: Message | null;
  onCancelReply: () => void;
  participants: { [key: string]: AppUser };
}

function SubmitButton({ disabled }: { disabled?: boolean }) {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" size="icon" disabled={pending || disabled} className="h-10 w-10 sm:h-10 sm:w-10">
            {pending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4" />}
            <span className="sr-only">Send Message</span>
        </Button>
    )
}

const ReplyPreview = ({ message, onCancel, participants }: { message: Message, onCancel: () => void, participants: { [key: string]: AppUser } }) => {
    const sender = participants[message.senderId];
    return (
        <div className="relative rounded-t-lg bg-muted p-2 border-b">
            <p className="text-[10px] sm:text-xs font-semibold text-primary">Replying to {sender?.displayName || 'User'}</p>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{message.text}</p>
            <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={onCancel}><X className="h-4 w-4"/></Button>
        </div>
    )
}


export function MessageInput({ chatId, senderId, replyToMessage, onCancelReply, participants }: MessageInputProps) {
    const formRef = useRef<HTMLFormElement>(null);
    const [inputValue, setInputValue] = useState('');
    const { toast } = useToast();

    // Load draft from local storage
    useEffect(() => {
        const draft = localStorage.getItem(`draft_${chatId}`);
        if (draft) {
            setInputValue(draft);
        }
    }, [chatId]);

    // Save draft to local storage on change
    useEffect(() => {
        if (inputValue) {
            localStorage.setItem(`draft_${chatId}`, inputValue);
        } else {
            localStorage.removeItem(`draft_${chatId}`);
        }
    }, [inputValue, chatId]);


    const debouncedTyping = useDebouncedCallback(
        (typing: boolean) => {
            updateTypingStatus(chatId, senderId, typing);
        }, 3000, { leading: true, trailing: true }
    );

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
        debouncedTyping(true);
    };

    async function formAction(formData: FormData) {
        const currentInput = inputValue;
        if (!currentInput.trim()) return;

        setInputValue(''); 
        onCancelReply();
        localStorage.removeItem(`draft_${chatId}`);
        updateTypingStatus(chatId, senderId, false);

        if (replyToMessage) {
            const senderDisplayName = participants[replyToMessage.senderId]?.displayName || 'Unknown User';
            const replyTo = {
                messageId: replyToMessage.id,
                senderId: replyToMessage.senderId,
                textPreview: replyToMessage.text.substring(0, 100),
                senderDisplayName: senderDisplayName,
            }
            formData.set('replyTo', JSON.stringify(replyTo));
        }

        const result = await sendMessage(formData);

        if(result?.error) {
            toast({
                variant: 'destructive',
                title: 'Message Error',
                description: result.error,
            });
            setInputValue(currentInput); 
            localStorage.setItem(`draft_${chatId}`, currentInput);
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
    <div className="border-t p-3 sm:p-4 pt-2 bg-background sticky bottom-0 z-10">
      {replyToMessage && <ReplyPreview message={replyToMessage} onCancel={onCancelReply} participants={participants} />}
      <form ref={formRef} action={formAction} className="flex items-center gap-2">
        <Input 
            id="message-input"
            name="text" 
            placeholder="Type a message..." 
            autoComplete="off" 
            required 
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className={cn(
                "h-10 sm:h-10 text-base sm:text-sm", 
                replyToMessage && "rounded-t-none border-t-0 focus-visible:ring-offset-0"
            )}
        />
        <input type="hidden" name="chatId" value={chatId} />
        <input type="hidden" name="senderId" value={senderId} />
        <SubmitButton disabled={inputValue.trim() === ''} />
      </form>
    </div>
  );
}
