'use client';

import { useEffect, useMemo } from 'react';
import { notFound, useParams } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import type { Chat, AppUser } from "@/types";

import { ChatHeader } from "@/components/chat/ChatHeader";
import { MessageInput } from "@/components/chat/MessageInput";
import { MessageList } from "@/components/chat/MessageList";
import { Loader2 } from 'lucide-react';


export default function ChatRoomPage() {
    const params = useParams();
    const chatId = params.chatId as string;
    const { user: currentUser, isUserLoading } = useUser();
    const db = useFirestore();

    const chatRef = useMemoFirebase(() => db ? doc(db, 'chats', chatId) : null, [db, chatId]);
    const { data: chat, isLoading: isChatLoading } = useDoc<Chat>(chatRef);

    useEffect(() => {
        if (!chatRef || !currentUser || !chat) return;

        const lastMessage = chat.lastMessage;
        const userHasRead = lastMessage?.readBy?.includes(currentUser.uid);
        const userHasUnread = chat.unreadCounts?.[currentUser.uid] > 0;

        if (lastMessage && !userHasRead) {
            updateDoc(chatRef, {
                'lastMessage.readBy': arrayUnion(currentUser.uid)
            }).catch(err => console.error("Failed to mark chat as read:", err));
        }

        if (userHasUnread) {
            updateDoc(chatRef, {
                [`unreadCounts.${currentUser.uid}`]: 0
            }).catch(err => console.error("Failed to reset unread count:", err));
        }
    }, [chat, currentUser, chatRef]);

    const otherUser = useMemo<AppUser | null>(() => {
        if (!chat || !currentUser) return null;
        const otherUserId = chat.users.find(uid => uid !== currentUser.uid);
        return otherUserId ? chat.userDetails[otherUserId] : null;
    }, [chat, currentUser]);

    if (isUserLoading || isChatLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!chat || !otherUser) {
        return notFound();
    }
    
    const { uid: currentUserId } = currentUser;

    return (
        <div className="flex flex-col h-screen">
            <ChatHeader otherUser={otherUser} />
            <MessageList chatId={chatId} currentUserId={currentUserId} />
            <MessageInput chatId={chatId} senderId={currentUserId} />
        </div>
    );
}
