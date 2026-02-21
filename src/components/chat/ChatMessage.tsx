'use client';

import { cn } from "@/lib/utils";
import type { AppUser, Message } from "@/types";
import { format } from 'date-fns';
import { MoreHorizontal, Smile, Trash2, Edit, X, Reply } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, memo } from "react";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "../ui/badge";
import { UserAvatar } from "../UserAvatar";
import { useFirestore } from "@/firebase";
import { doc, updateDoc, deleteField } from "firebase/firestore";

interface ChatMessageProps {
  message: Message;
  prevMessage: Message | undefined;
  isCurrentUser: boolean;
  currentUserId: string;
  chatId: string;
  onReply: (message: Message) => void;
  participants: { [key: string]: AppUser };
}

const EMOJIS = ['👍', '❤️', '😂', '😮'];

const ReplyPreview = ({ message, onCancelReply }: { message: Message; onCancelReply?: () => void }) => {
    
    const scrollToOriginal = () => {
        if(!message.replyTo?.messageId) return;
        const originalMessageEl = document.getElementById(message.replyTo.messageId);
        if (originalMessageEl) {
             originalMessageEl.scrollIntoView({ behavior: 'smooth' });
             originalMessageEl.classList.add('animate-pulse', 'bg-accent/50');
             setTimeout(() => originalMessageEl.classList.remove('animate-pulse', 'bg-accent/50'), 2000);
        }
    }

    return (
        <div 
          className={cn(
            "relative mb-1 cursor-pointer rounded-md bg-black/10 dark:bg-white/10 p-2 text-sm",
            onCancelReply && "pr-8"
          )}
          onClick={!onCancelReply ? scrollToOriginal : undefined}
        >
            <p className="font-semibold text-xs text-primary">{message.replyTo?.senderDisplayName}</p>
            <p className="truncate text-xs text-muted-foreground">{message.replyTo?.textPreview}</p>
            {onCancelReply && (
                 <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={onCancelReply}><X className="h-4 w-4"/></Button>
            )}
        </div>
    )
}

function ChatMessageComponent({ message, prevMessage, isCurrentUser, currentUserId, chatId, onReply, participants }: ChatMessageProps) {
    const { toast } = useToast();
    const db = useFirestore();
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(message.text);

    // Optimistic state for the message
    const [optimisticMessage, setOptimisticMessage] = useState(message);
    useEffect(() => {
        setOptimisticMessage(message);
    }, [message]);

    const messageRef = doc(db, 'chats', chatId, 'messages', message.id);

    const handleReaction = async (emoji: string) => {
        const currentReactions = optimisticMessage.reactions || {};
        const previousReactions = { ...currentReactions };
        const userHasReactedWithEmoji = currentReactions[currentUserId] === emoji;

        let newReactions = { ...currentReactions };
        if (userHasReactedWithEmoji) {
            delete newReactions[currentUserId];
        } else {
            newReactions[currentUserId] = emoji;
        }
        
        setOptimisticMessage(prev => ({ ...prev, reactions: newReactions }));

        try {
            if (userHasReactedWithEmoji) {
                await updateDoc(messageRef, { [`reactions.${currentUserId}`]: deleteField() });
            } else {
                await updateDoc(messageRef, { [`reactions.${currentUserId}`]: emoji });
            }
        } catch (error) {
            setOptimisticMessage(prev => ({ ...prev, reactions: previousReactions }));
            toast({ variant: 'destructive', title: 'Error', description: "Failed to apply reaction." });
        }
    };

    const handleSaveEdit = async () => {
        const previousText = message.text; // Use original prop for rollback
        if (editText.trim() === '' || editText === previousText) {
            setIsEditing(false);
            return;
        }

        setOptimisticMessage(prev => ({...prev, text: editText, edited: true}));
        setIsEditing(false);

        try {
            await updateDoc(messageRef, { text: editText, edited: true });
        } catch (error) {
            setOptimisticMessage(prev => ({...prev, text: previousText, edited: message.edited}));
            toast({ variant: 'destructive', title: 'Error', description: "Failed to edit message." });
        }
    };

    const handleDelete = async () => {
        const previousMessageState = { ...optimisticMessage };
        const deletedState = {
            ...optimisticMessage,
            text: "This message was deleted.",
            isDeleted: true,
            reactions: {}
        };
        
        setOptimisticMessage(deletedState);

        try {
            await updateDoc(messageRef, {
                text: "This message was deleted.",
                isDeleted: true,
                reactions: {}
            });
        } catch (error) {
            setOptimisticMessage(previousMessageState);
            toast({ variant: 'destructive', title: 'Error', description: "Failed to delete message." });
        }
    };

    const sender = participants[optimisticMessage.senderId];
    const reactions = optimisticMessage.reactions ? Object.entries(optimisticMessage.reactions) : [];
    const isConsecutive = prevMessage && prevMessage.senderId === optimisticMessage.senderId && optimisticMessage.createdAt && prevMessage.createdAt && (optimisticMessage.createdAt.toDate().getTime() - prevMessage.createdAt.toDate().getTime()) < 60000 * 3 && prevMessage.type !== 'system';

    if (optimisticMessage.type === 'system') {
        return (
            <div className="text-center text-xs text-muted-foreground my-4 italic">
                {optimisticMessage.text}
            </div>
        )
    }

  return (
    <div 
        id={optimisticMessage.id}
        className={cn(
            "group flex w-full items-start gap-3", 
            isCurrentUser ? "justify-end" : "justify-start",
            isConsecutive ? 'mt-1' : 'mt-4'
        )}
    >
        {!isCurrentUser && (
             <div className="flex-shrink-0 w-8 h-8">
                {(!isConsecutive && sender) && <UserAvatar user={sender} className="w-8 h-8"/>}
             </div>
        )}

        <div className={cn("flex items-center gap-1", isCurrentUser && "flex-row-reverse")}>
            <div className={cn("opacity-0 transition-opacity group-hover:opacity-100", isEditing && "opacity-0")}>
                 <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onReply(optimisticMessage)} disabled={optimisticMessage.isDeleted}>
                    <Reply className="h-4 w-4"/>
                </Button>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={optimisticMessage.isDeleted}><Smile className="h-4 w-4"/></Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-1">
                        <div className="flex gap-1">
                            {EMOJIS.map(emoji => (
                                <Button key={emoji} variant="ghost" size="icon" className="h-8 w-8 text-xl" onClick={() => handleReaction(emoji)}>
                                    {emoji}
                                </Button>
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>

                {isCurrentUser && !optimisticMessage.isDeleted && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4"/></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => { setIsEditing(true); setEditText(optimisticMessage.text) }}>
                                <Edit className="mr-2 h-4 w-4"/> Edit
                            </DropdownMenuItem>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4"/> Delete
                                    </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete your message.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            <div
                className={cn(
                "relative max-w-xs rounded-lg px-3 py-2 md:max-w-md lg:max-w-lg",
                isCurrentUser
                    ? "bg-primary text-primary-foreground"
                    : "bg-card",
                optimisticMessage.isDeleted && "bg-transparent italic text-muted-foreground border"
                )}
            >
                {optimisticMessage.replyTo && <ReplyPreview message={optimisticMessage} />}
                {isEditing ? (
                    <div className="space-y-2">
                        <Textarea value={editText} onChange={e => setEditText(e.target.value)} className="text-sm bg-background text-foreground" autoFocus onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) {e.preventDefault(); handleSaveEdit();} if (e.key === 'Escape') setIsEditing(false) }}/>
                        <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                            <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <p className="text-sm whitespace-pre-wrap">{optimisticMessage.text}</p>
                        <div className={cn(
                            "mt-1 flex items-center gap-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity", 
                            isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground"
                        )}>
                            {optimisticMessage.createdAt ? format(optimisticMessage.createdAt.toDate(), 'p') : ''}
                            {optimisticMessage.edited && !optimisticMessage.isDeleted && (
                                <span>(edited)</span>
                            )}
                        </div>
                    </>
                )}

                 {reactions.length > 0 && !isEditing && (
                    <div className="absolute -bottom-4 flex gap-0.5 rounded-full bg-card border px-1 py-0.5"
                         style={isCurrentUser ? { right: '10px' } : { left: '10px' }}>
                        {EMOJIS.map(emoji => {
                            const count = reactions.filter(([, e]) => e === emoji).length;
                            if (count === 0) return null;
                            return <Badge key={emoji} variant="secondary" className="h-5 px-1.5">{emoji} {count > 1 && <span className="text-xs ml-1">{count}</span>}</Badge>
                        })}
                    </div>
                )}
            </div>
        </div>

        {isCurrentUser && (
            <div className="flex-shrink-0 w-8 h-8"/> // Placeholder for avatar alignment
        )}

    </div>
  );
}

// Memoize the component to prevent re-renders when props haven't changed.
export const ChatMessage = memo(ChatMessageComponent);
