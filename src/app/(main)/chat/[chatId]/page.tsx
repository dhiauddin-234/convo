'use client';

import { useEffect, useState } from 'react';
import { notFound, useParams } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase/provider';
import { doc, getDoc } from 'firebase/firestore';
import type { Chat, AppUser } from "@/types";

import { ChatHeader } from "@/components/chat/ChatHeader";
import { MessageInput } from "@/components/chat/MessageInput";
import { MessageList } from "@/components/chat/MessageList";
import { Loader2 } from 'lucide-react';


async function getChatDetails(db: any, chatId: string, currentUserId: string): Promise<{ chat: Chat; otherUser: AppUser } | null> {
    const chatRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatRef);

    if (!chatSnap.exists()) {
        return null;
    }

    const chat = { id: chatSnap.id, ...chatSnap.data() } as Chat;

    if (!chat.users.includes(currentUserId)) {
        return null;
    }

    const otherUserId = chat.users.find(uid => uid !== currentUserId);
    if (!otherUserId) {
        return null;
    }
    
    const otherUser = chat.userDetails[otherUserId];

    if (!otherUser) {
        const userRef = doc(db, 'users', otherUserId);
        const userSnap = await getDoc(userRef);
        if(!userSnap.exists()) return null;
        return { chat, otherUser: userSnap.data() as AppUser };
    }


    return { chat, otherUser };
}


export default function ChatRoomPage() {
    const params = useParams();
    const chatId = params.chatId as string;
    const { user: currentUser, isUserLoading } = useUser();
    const db = useFirestore();

    const [chatData, setChatData] = useState<{ chat: Chat; otherUser: AppUser } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isUserLoading || !db || !currentUser) {
            return;
        };

        setLoading(true);
        getChatDetails(db, chatId, currentUser.uid).then(data => {
            setChatData(data);
            setLoading(false);
        });

    }, [chatId, currentUser, isUserLoading, db]);

    if (loading || isUserLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!chatData) {
        return notFound();
    }
    
    const { otherUser } = chatData;
    const { uid: currentUserId } = currentUser;

    return (
        <div className="flex flex-col h-screen">
            <ChatHeader otherUser={otherUser} />
            <MessageList chatId={chatId} currentUserId={currentUserId} />
            <MessageInput chatId={chatId} senderId={currentUserId} />
        </div>
    );
}
