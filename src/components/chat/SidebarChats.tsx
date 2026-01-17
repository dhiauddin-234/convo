
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
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg px-2 py-1.5">
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
      return <p className="p-2 text-sm text-muted-foreground">No recent chats. Find users to start a conversation!</p>
  }

  return (
    <div className="space-y-1">
      {chats.map(chat => {
        if (!currentUser?.uid) return null;
        const otherUserId = chat.users.find(uid => uid !== currentUser.uid);
        if (!otherUserId || !chat.userDetails[otherUserId]) return null;
        
        const otherUser = chat.userDetails[otherUserId];
        const isActive = pathname === `/chat/${chat.id}`;

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
              <p className="font-semibold">{otherUser.displayName}</p>
              <p className="text-sm truncate">
                {chat.lastMessage?.text || "No messages yet"}
              </p>
            </div>
             {chat.lastMessage?.createdAt && (
                <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(chat.lastMessage.createdAt.toDate(), { addSuffix: true })}
                </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
