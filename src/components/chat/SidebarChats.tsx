
'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, FirestoreError } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import type { AppUser, Chat } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/UserAvatar';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import type { User } from 'firebase/auth';
import { Button } from '../ui/button';
import { MessageSquarePlus } from 'lucide-react';

const { firestore: db } = initializeFirebase();

interface SidebarChatsProps {
  currentUser: User | null;
}

export function SidebarChats({ currentUser }: SidebarChatsProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    if (!currentUser?.uid) {
        setLoading(false);
        return;
    }

    const chatsQuery = query(
      collection(db, 'chats'),
      where('users', 'array-contains', currentUser.uid),
      orderBy('lastMessage.createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(chatsQuery, 
      (querySnapshot) => {
        const chatsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
        setChats(chatsData);
        setLoading(false);
      },
      (error: FirestoreError) => {
        console.error("SidebarChats listener error:", error);
        toast({
            variant: "destructive",
            title: "Error loading chats",
            description: "There was a problem fetching your recent conversations.",
        });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid, toast]);

  if (loading) {
    return (
      <div className="space-y-2 px-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg py-1.5">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (chats.length === 0) {
      return (
        <div className="p-4 text-center">
            <p className="text-sm text-muted-foreground mb-4">No recent chats yet.</p>
            <Button asChild variant="outline" size="sm">
                <Link href="/users">
                    <MessageSquarePlus className="mr-2 h-4 w-4" />
                    Start a Chat
                </Link>
            </Button>
        </div>
      )
  }

  return (
    <div className="space-y-1">
      {chats.map(chat => {
        if (!currentUser?.uid) return null;
        const otherUserId = chat.users.find(uid => uid !== currentUser.uid);
        if (!otherUserId || !chat.userDetails[otherUserId]) return null;
        
        const otherUser = chat.userDetails[otherUserId];
        const isActive = pathname === `/chat/${chat.id}`;
        const lastMessage = chat.lastMessage;
        const isUnread = lastMessage && lastMessage.readBy && !lastMessage.readBy.includes(currentUser.uid);

        return (
          <Link
            key={chat.id}
            href={`/chat/${chat.id}`}
            className={cn(
              "flex items-center gap-3 rounded-lg px-2 py-1.5 text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground",
              isActive && "bg-accent text-accent-foreground"
            )}
          >
            <UserAvatar user={otherUser} className="h-10 w-10" />
            <div className="flex-1 truncate">
              <p className={cn("font-semibold", isUnread && "font-bold text-foreground")}>{otherUser.displayName}</p>
              <p className={cn("text-sm truncate", isUnread && "text-foreground")}>
                {lastMessage?.text || "No messages yet"}
              </p>
            </div>
             <div className="flex flex-col items-end gap-1 text-xs">
                {lastMessage?.createdAt && (
                    <div className="text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(lastMessage.createdAt.toDate(), { addSuffix: true })}
                    </div>
                )}
                {isUnread && (
                    <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                )}
             </div>
          </Link>
        );
      })}
    </div>
  );
}
