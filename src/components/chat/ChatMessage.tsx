
'use client';

import { cn } from "@/lib/utils";
import type { Message } from "@/types";
import { format } from 'date-fns';
import { MoreHorizontal, Smile, ThumbsUp, Heart, Trash2, Edit, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { reactToMessage, editMessage, deleteMessage } from "@/app/actions";
import { useToast } from "@/hooks/use-toast";
import { useState, useTransition } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface ChatMessageProps {
  message: Message;
  isCurrentUser: boolean;
  currentUserId: string;
  chatId: string;
}

const EMOJIS = ['👍', '❤️', '😂', '😮'];

export function ChatMessage({ message, isCurrentUser, currentUserId, chatId }: ChatMessageProps) {
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

  return (
    <div className={cn("group flex w-full items-start gap-2", isCurrentUser ? "justify-end" : "justify-start")}>
        {!isCurrentUser && (
             <div className="flex-shrink-0 w-8 h-8"/> // Placeholder for avatar alignment
        )}

        <div className={cn("flex items-center gap-1", isCurrentUser && "flex-row-reverse")}>
            <div className={cn("opacity-0 transition-opacity group-hover:opacity-100", isEditing && "opacity-0")}>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7"><Smile className="h-4 w-4"/></Button>
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

                {isCurrentUser && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4"/></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => { setIsEditing(true); setEditText(message.text) }} disabled={message.isDeleted}>
                                <Edit className="mr-2 h-4 w-4"/> Edit
                            </DropdownMenuItem>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive" disabled={message.isDeleted}>
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
                "relative max-w-xs rounded-lg px-4 py-2 md:max-w-md lg:max-w-lg",
                isCurrentUser
                    ? "bg-primary text-primary-foreground"
                    : "bg-card",
                message.isDeleted && "bg-transparent italic text-muted-foreground border"
                )}
            >
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
                        <div className={cn("mt-1 flex items-center gap-2 text-xs", isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground")}>
                            {message.createdAt ? format(message.createdAt.toDate(), 'p') : ''}
                            {message.edited && !message.isDeleted && (
                                <span>(edited)</span>
                            )}
                        </div>
                    </>
                )}

                 {reactions.length > 0 && !isEditing && (
                    <div className="absolute -bottom-4 flex gap-1 rounded-full bg-card border px-1 py-0.5"
                         style={isCurrentUser ? { right: '10px' } : { left: '10px' }}>
                        {EMOJIS.map(emoji => {
                            const count = reactions.filter(([, e]) => e === emoji).length;
                            if (count === 0) return null;
                            return <span key={emoji} className="text-xs">{emoji} {count}</span>
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
