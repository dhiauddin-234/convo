'use client';

import { cn } from "@/lib/utils";
import type { Message } from "@/types";
import { format } from 'date-fns';
import { MoreHorizontal, Smile, Trash2, Edit, X, Reply } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { reactToMessage, editMessage, deleteMessage } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { useState, useTransition, memo } from "react";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "../ui/badge";

interface ChatMessageProps {
  message: Message;
  prevMessage: Message | undefined;
  isCurrentUser: boolean;
  currentUserId: string;
  chatId: string;
  onReply: (message: Message) => void;
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

function ChatMessageComponent({ message, prevMessage, isCurrentUser, currentUserId, chatId, onReply }: ChatMessageProps) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(message.text);

    const handleReaction = (emoji: string) => {
        startTransition(async () => {
            const result = await reactToMessage(chatId, message.id, currentUserId, emoji);
            if(result?.error) {
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            }
        });
    }

    const handleSaveEdit = () => {
        if (editText.trim() === '' || editText === message.text) {
            setIsEditing(false);
            return;
        }
        startTransition(async () => {
            const result = await editMessage(chatId, message.id, editText);
            if(result?.error) {
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            } else {
                setIsEditing(false);
            }
        });
    }

    const handleDelete = () => {
        startTransition(async () => {
            const result = await deleteMessage(chatId, message.id);
            if(result?.error) {
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            }
        });
    }

    const reactions = message.reactions ? Object.entries(message.reactions) : [];
    const isConsecutive = prevMessage && prevMessage.senderId === message.senderId && message.createdAt && prevMessage.createdAt && (message.createdAt.toDate().getTime() - prevMessage.createdAt.toDate().getTime()) < 60000 * 3;

  return (
    <div 
        id={message.id}
        className={cn(
            "group flex w-full items-start gap-3", 
            isCurrentUser ? "justify-end" : "justify-start",
            isConsecutive ? 'mt-1' : 'mt-4'
        )}
    >
        {!isCurrentUser && (
             <div className="flex-shrink-0 w-8 h-8">
                {/* {!isConsecutive && <UserAvatar user={...} />}  Avatar would go here */}
             </div>
        )}

        <div className={cn("flex items-center gap-1", isCurrentUser && "flex-row-reverse")}>
            <div className={cn("opacity-0 transition-opacity group-hover:opacity-100", isEditing && "opacity-0")}>
                 <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onReply(message)} disabled={message.isDeleted}>
                    <Reply className="h-4 w-4"/>
                </Button>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={message.isDeleted}><Smile className="h-4 w-4"/></Button>
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

                {isCurrentUser && !message.isDeleted && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4"/></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => { setIsEditing(true); setEditText(message.text) }}>
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
                message.isDeleted && "bg-transparent italic text-muted-foreground border"
                )}
            >
                {message.replyTo && <ReplyPreview message={message} />}
                {isEditing ? (
                    <div className="space-y-2">
                        <Textarea value={editText} onChange={e => setEditText(e.target.value)} className="text-sm bg-background text-foreground" autoFocus onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) {e.preventDefault(); handleSaveEdit();} if (e.key === 'Escape') setIsEditing(false) }}/>
                        <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                            <Button size="sm" onClick={handleSaveEdit} disabled={isPending}>Save</Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                        <div className={cn(
                            "mt-1 flex items-center gap-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity", 
                            isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground"
                        )}>
                            {message.createdAt ? format(message.createdAt.toDate(), 'p') : ''}
                            {message.edited && !message.isDeleted && (
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
