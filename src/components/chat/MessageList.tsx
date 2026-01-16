
'use client';

import { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import type { Message } from '@/types';
import { ChatMessage } from './ChatMessage';
import { Skeleton } from '../ui/skeleton';

const { firestore: db } = initializeFirebase();

interface MessageListProps {
  chatId: string;
  currentUserId: string;
}

export function MessageList({ chatId, currentUserId }: MessageListProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const messagesQuery = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (querySnapshot) => {
      const messagesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(messagesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {loading ? (
        <div className="space-y-4">
            <div className="flex items-end gap-2">
                <Skeleton className="h-8 w-8 rounded-full"/>
                <Skeleton className="h-10 w-48 rounded-lg"/>
            </div>
            <div className="flex items-end justify-end gap-2">
                <Skeleton className="h-10 w-32 rounded-lg"/>
                 <Skeleton className="h-8 w-8 rounded-full"/>
            </div>
             <div className="flex items-end gap-2">
                <Skeleton className="h-8 w-8 rounded-full"/>
                <Skeleton className="h-12 w-64 rounded-lg"/>
            </div>
        </div>
      ) : (
        messages.map(message => (
          <ChatMessage key={message.id} message={message} isCurrentUser={message.senderId === currentUserId} />
        ))
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
