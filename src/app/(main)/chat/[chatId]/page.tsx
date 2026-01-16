
import { ChatHeader } from "@/components/chat/ChatHeader";
import { MessageInput } from "@/components/chat/MessageInput";
import { MessageList } from "@/components/chat/MessageList";
import { initializeFirebase } from "@/firebase";
import type { Chat, AppUser } from "@/types";
import { doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { notFound } from "next/navigation";

const { firestore: db } = initializeFirebase();

async function getChatDetails(chatId: string, currentUserId: string): Promise<{ chat: Chat; otherUser: AppUser } | null> {
    const chatRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatRef);

    if (!chatSnap.exists()) {
        return null;
    }

    const chat = { id: chatSnap.id, ...chatSnap.data() } as Chat;

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


export default async function ChatRoomPage({ params }: { params: { chatId: string } }) {
    const auth = getAuth(initializeFirebase().firebaseApp);
    const currentUserId = auth.currentUser?.uid;
    if(!currentUserId) return notFound();

    const data = await getChatDetails(params.chatId, currentUserId);

    if(!data) {
        return notFound();
    }
    
    const { otherUser } = data;

    return (
        <div className="flex flex-col h-screen">
            <ChatHeader otherUser={otherUser} />
            <MessageList chatId={params.chatId} currentUserId={currentUserId} />
            <MessageInput chatId={params.chatId} senderId={currentUserId} />
        </div>
    );
}

