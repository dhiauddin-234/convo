'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, query, onSnapshot, orderBy, FirestoreError, limit, startAfter, getDocs, QueryDocumentSnapshot } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import type { Message, AppUser } from '@/types';
import { ChatMessage } from './ChatMessage';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Loader2, MessageSquare, ChevronDown } from 'lucide-react';

const { firestore: db } = initializeFirebase();
const MESSAGES_PER_PAGE = 25;

interface MessageListProps {
  chatId: string;
  currentUserId: string;
  onReply: (message: Message) => void;
  participants: { [key: string]: AppUser };
}

export function MessageList({ chatId, currentUserId, onReply, participants }: MessageListProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const topLoaderRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = useCallback((behavior: 'smooth' | 'auto' = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // Initial messages listener
  useEffect(() => {
    if (!chatId || !currentUserId) {
      setLoadingInitial(false);
      return;
    }

    setMessages([]);
    setLastDoc(null);
    setHasMore(true);
    setLoadingInitial(true);

    const messagesQuery = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(MESSAGES_PER_PAGE)
    );

    const unsubscribe = onSnapshot(messagesQuery, 
      (querySnapshot) => {
        if(querySnapshot.metadata.hasPendingWrites) return;
        
        const messagesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
        setMessages(messagesData.reverse()); // Reverse to show oldest first
        
        const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
        setLastDoc(lastVisible);
        
        setHasMore(querySnapshot.docs.length === MESSAGES_PER_PAGE);
        setLoadingInitial(false);
      },
      (error: FirestoreError) => {
        console.error("MessageList listener error:", error);
        toast({
            variant: "destructive",
            title: "Error loading messages",
            description: "You may not have permission to view this chat.",
        });
        setLoadingInitial(false);
      }
    );

    return () => unsubscribe();
  }, [chatId, currentUserId, toast]);
  
  const loadMoreMessages = useCallback(async () => {
    if (!hasMore || loadingMore || !lastDoc) return;
    
    setLoadingMore(true);
    
    const moreMessagesQuery = query(
        collection(db, 'chats', chatId, 'messages'),
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(MESSAGES_PER_PAGE)
    );

    try {
        const documentSnapshots = await getDocs(moreMessagesQuery);
        const newMessagesData = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
        
        setMessages(prev => [...newMessagesData.reverse(), ...prev]);

        const lastVisible = documentSnapshots.docs[documentSnapshots.docs.length - 1];
        setLastDoc(lastVisible);
        setHasMore(documentSnapshots.docs.length === MESSAGES_PER_PAGE);

    } catch (error) {
        console.error("Failed to load more messages", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not load older messages.'
        });
    } finally {
        setLoadingMore(false);
    }
  }, [chatId, hasMore, lastDoc, loadingMore, toast]);


  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
        (entries) => {
            if (entries[0].isIntersecting) {
                loadMoreMessages();
            }
        },
        { root: chatContainerRef.current, threshold: 1 }
    );

    const topEl = topLoaderRef.current;
    if (topEl) {
        observer.observe(topEl);
    }

    return () => {
        if (topEl) {
            observer.unobserve(topEl);
        }
    };
  }, [loadMoreMessages]);


  // Scroll to bottom only on new message or if user is near bottom
  const prevMessagesLength = useRef(messages.length);
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 300;
    const isNewMessage = messages.length > prevMessagesLength.current;
    const isInitialLoad = prevMessagesLength.current === 0 && messages.length > 0;
    
    if (isInitialLoad) {
        scrollToBottom('auto');
    } else if (isNewMessage && isNearBottom) {
        scrollToBottom('smooth');
    }

    prevMessagesLength.current = messages.length;
  }, [messages, currentUserId, scrollToBottom]);

  // Listener for showing jump-to-latest button
  const handleScroll = useCallback(() => {
    const container = chatContainerRef.current;
    if (container) {
      const isScrolledUp = container.scrollHeight - container.scrollTop > container.clientHeight + 200;
      setShowJumpToLatest(isScrolledUp);
    }
  }, []);

  useEffect(() => {
    const container = chatContainerRef.current;
    container?.addEventListener('scroll', handleScroll);
    return () => container?.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);


  if (loadingInitial) {
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

  if (messages.length === 0 && !loadingInitial) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 p-4 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground" />
            <h3 className="text-xl font-semibold font-headline">No messages yet</h3>
            <p className="text-muted-foreground">Be the first to say something!</p>
        </div>
    );
  }

  return (
    <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 relative">
       <div ref={topLoaderRef} className="h-1 w-full">
            {loadingMore && (
                <div className="flex justify-center my-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            )}
            {!hasMore && messages.length >= MESSAGES_PER_PAGE && (
                <div className="text-center text-xs text-muted-foreground my-4 p-2 rounded-full bg-muted w-fit mx-auto">
                    Conversation started
                </div>
            )}
       </div>
      <div className='space-y-0.5'>
      {messages.map((message, index) => (
          <ChatMessage 
              key={message.id} 
              message={message} 
              prevMessage={messages[index-1]}
              isCurrentUser={message.senderId === currentUserId} 
              currentUserId={currentUserId} 
              chatId={chatId}
              onReply={onReply}
              participants={participants}
          />
        ))
      }
      </div>
      {showJumpToLatest && (
        <Button
            onClick={() => scrollToBottom('smooth')}
            size="icon"
            className="absolute bottom-4 right-4 z-10 rounded-full h-10 w-10 animate-fade-in shadow-lg"
        >
            <ChevronDown className="h-5 w-5" />
            <span className="sr-only">Jump to latest</span>
        </Button>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
