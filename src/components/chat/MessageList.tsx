
'use client';

import { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, orderBy, FirestoreError } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import type { Message } from '@/types';
import { ChatMessage } from './ChatMessage';
import { Skeleton } from '../ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare } from 'lucide-react';

const { firestore: db } = initializeFirebase();

interface MessageListProps {
  chatId: string;
  currentUserId: string;
}

export function MessageList({ chatId, currentUserId }: MessageListProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!chatId || !currentUserId) {
      setLoading(false);
      return;
    }

    const messagesQuery = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, 
      (querySnapshot) => {
        const messagesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
        setMessages(messagesData);
        setLoading(false);
      },
      (error: FirestoreError) => {
        console.error("MessageList listener error:", error);
        toast({
            variant: "destructive",
            title: "Error loading messages",
            description: "You may not have permission to view this chat.",
        });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [chatId, currentUserId, toast]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading) {
      return (
        <div className="flex-1 p-4 space-y-4">
            <div className="flex items-end gap-2">
                <Skeleton className="h-8 w-8 rounded-full"/>
                <Skeleton className="h-10 w-48 rounded-lg"/>
            </div>
            <div className="flex items-end justify-end gap-2">
                <Skeleton className="h-10 w-32 rounded-lg"/>
            </div>
             <div className="flex items-end gap-2">
                <Skeleton className="h-8 w-8 rounded-full"/>
                <Skeleton className="h-12 w-64 rounded-lg"/>
            </div>
        </div>
      );
  }

  if (messages.length === 0) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 p-4 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground" />
            <h3 className="text-xl font-semibold font-headline">No messages yet</h3>
            <p className="text-muted-foreground">Be the first to say something!</p>
        </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      {messages.map(message => (
          <ChatMessage key={message.id} message={message} isCurrentUser={message.senderId === currentUserId} currentUserId={currentUserId} chatId={chatId} />
        ))
      }
      <div ref={messagesEndRef} />
    </div>
  );
}
