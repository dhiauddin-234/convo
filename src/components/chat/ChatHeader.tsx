'use client';

import { UserAvatar } from "@/components/UserAvatar";
import { initializeFirebase } from "@/firebase";
import type { AppUser } from "@/types";
import { doc, onSnapshot, FirestoreError } from "firebase/firestore";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from 'date-fns';
import { SidebarTrigger } from "../ui/sidebar";
import { useToast } from "@/hooks/use-toast";

const { firestore: db } = initializeFirebase();

interface ChatHeaderProps {
    otherUser: AppUser;
    isTyping: boolean;
}

export function ChatHeader({ otherUser: initialOtherUser, isTyping }: ChatHeaderProps) {
    const [otherUser, setOtherUser] = useState(initialOtherUser);
    const { toast } = useToast();

    useEffect(() => {
        if (!initialOtherUser.uid) return;

        const unsub = onSnapshot(doc(db, "users", initialOtherUser.uid), 
            (doc) => {
                if (doc.exists()){
                    setOtherUser(doc.data() as AppUser);
                }
            },
            (error: FirestoreError) => {
                console.error("ChatHeader listener error:", error);
                toast({
                    variant: "destructive",
                    title: "Connection problem",
                    description: "Could not get user status updates.",
                });
            }
        );
        return () => unsub();
    }, [initialOtherUser.uid, toast]);

    return (
        <header className="flex items-center gap-2 sm:gap-4 border-b p-3 sm:p-4 bg-background sticky top-0 z-10 h-16 sm:h-auto">
            <SidebarTrigger className="md:hidden"/>
            <UserAvatar user={otherUser} className="h-8 w-8 sm:h-10 sm:w-10" />
            <div className="flex-1 min-w-0">
                <p className="font-semibold font-headline text-base sm:text-lg truncate">{otherUser.displayName}</p>
                <div className="text-[10px] sm:text-xs text-muted-foreground h-4 truncate">
                    {isTyping ? <span className="text-primary animate-pulse">typing...</span> :
                    (otherUser.isOnline ? <span className="text-online">Online</span> : 
                    (otherUser.lastSeen ? `Last seen ${formatDistanceToNow(otherUser.lastSeen.toDate(), { addSuffix: true })}` : 'Offline'))}
                </div>
            </div>
        </header>
    );
}
