
'use client';

import { UserAvatar } from "@/components/UserAvatar";
import { initializeFirebase } from "@/firebase";
import type { AppUser } from "@/types";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from 'date-fns';
import { SidebarTrigger } from "../ui/sidebar";

const { firestore: db } = initializeFirebase();

interface ChatHeaderProps {
    otherUser: AppUser;
}

export function ChatHeader({ otherUser: initialOtherUser }: ChatHeaderProps) {
    const [otherUser, setOtherUser] = useState(initialOtherUser);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, "users", initialOtherUser.uid), (doc) => {
            setOtherUser(doc.data() as AppUser);
        });
        return () => unsub();
    }, [initialOtherUser.uid]);

    return (
        <header className="flex items-center gap-4 border-b p-4">
            <SidebarTrigger className="md:hidden"/>
            <UserAvatar user={otherUser} />
            <div className="flex-1">
                <p className="font-semibold font-headline text-lg">{otherUser.displayName}</p>
                <p className="text-sm text-muted-foreground">
                    {otherUser.isOnline ? <span className="text-online">Online</span> : 
                    (otherUser.lastSeen ? `Last seen ${formatDistanceToNow(otherUser.lastSeen.toDate(), { addSuffix: true })}` : 'Offline')}
                </p>
            </div>
        </header>
    );
}
