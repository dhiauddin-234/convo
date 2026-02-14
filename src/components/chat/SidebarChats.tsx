
'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, orderBy, FirestoreError, doc } from 'firebase/firestore';
import { useDoc, useMemoFirebase, useFirestore } from '@/firebase';
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
import { MessageSquarePlus, Pin, PinOff } from 'lucide-react';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { togglePinChat } from '@/app/actions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface SidebarChatsProps {
  currentUser: User | null;
}

export function SidebarChats({ currentUser }: SidebarChatsProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const pathname = usePathname();
  const { toast } = useToast();
  const db = useFirestore();

  const userRef = useMemoFirebase(() => (db && currentUser?.uid ? doc(db, 'users', currentUser.uid) : null), [db, currentUser?.uid]);
  const { data: userProfile } = useDoc<AppUser>(userRef);
  const pinnedChats = useMemo(() => userProfile?.pinnedChats || [], [userProfile]);

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
  }, [currentUser?.uid, toast, db]);

  const handlePinToggle = async (e: React.MouseEvent, chatId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser?.uid) return;
    
    toast({ title: 'Updating pin...' });
    const result = await togglePinChat(currentUser.uid, chatId);
    if(result.error) {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
    }
  };

  const filteredAndSortedChats = useMemo(() => {
    return chats
        .filter(chat => {
            if (!searchTerm) return true;
            const otherUserId = chat.users.find(uid => uid !== currentUser?.uid);
            if (!otherUserId) return false;
            const otherUser = chat.userDetails[otherUserId];
            return otherUser.displayName.toLowerCase().includes(searchTerm.toLowerCase());
        })
        .sort((a, b) => {
            const aIsPinned = pinnedChats.includes(a.id);
            const bIsPinned = pinnedChats.includes(b.id);
            if (aIsPinned && !bIsPinned) return -1;
            if (!aIsPinned && bIsPinned) return 1;
            
            const aTimestamp = a.lastMessage?.createdAt?.toDate() || new Date(0);
            const bTimestamp = b.lastMessage?.createdAt?.toDate() || new Date(0);
            return bTimestamp.getTime() - aTimestamp.getTime();
        });
  }, [chats, searchTerm, currentUser, pinnedChats]);


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

  return (
    <TooltipProvider>
      <div className="px-2 mb-2 group-data-[collapsed=icon]:hidden">
        <Input 
            placeholder="Search chats..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      {filteredAndSortedChats.length === 0 ? (
        <div className="p-4 text-center group-data-[collapsed=icon]:hidden">
            <p className="text-sm text-muted-foreground mb-4">No chats found.</p>
            <Button asChild variant="outline" size="sm">
                <Link href="/users">
                    <MessageSquarePlus className="mr-2 h-4 w-4" />
                    Start a Chat
                </Link>
            </Button>
        </div>
      ) : (
        <div className="space-y-1">
          {filteredAndSortedChats.map(chat => {
            if (!currentUser?.uid) return null;
            const otherUserId = chat.users.find(uid => uid !== currentUser.uid);
            if (!otherUserId || !chat.userDetails[otherUserId]) return null;
            
            const otherUser = chat.userDetails[otherUserId];
            const isActive = pathname === `/chat/${chat.id}`;
            const lastMessage = chat.lastMessage;
            const unreadCount = chat.unreadCounts?.[currentUser.uid] || 0;
            const isPinned = pinnedChats.includes(chat.id);

            return (
              <div key={chat.id} className="relative group/chat-item">
                <Link
                    href={`/chat/${chat.id}`}
                    className={cn(
                    "flex items-center gap-3 rounded-lg px-2 py-1.5 text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground",
                    isActive && "bg-accent text-accent-foreground"
                    )}
                >
                    <UserAvatar user={otherUser} className="h-10 w-10" />
                    <div className="flex-1 truncate group-data-[collapsed=icon]:hidden">
                        <p className={cn("font-semibold", unreadCount > 0 && "font-bold text-foreground")}>{otherUser.displayName}</p>
                        <p className={cn("text-sm truncate", unreadCount > 0 && "text-foreground")}>
                            {lastMessage?.text || "No messages yet"}
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-xs group-data-[collapsed=icon]:hidden">
                        {lastMessage?.createdAt && (
                            <div className="text-muted-foreground whitespace-nowrap">
                                {formatDistanceToNow(lastMessage.createdAt.toDate(), { addSuffix: true, includeSeconds: true })}
                            </div>
                        )}
                        {unreadCount > 0 && (
                            <Badge className="h-5 min-w-[1.25rem] justify-center rounded-full p-1 text-xs">{unreadCount}</Badge>
                        )}
                    </div>
                </Link>
                 <Tooltip>
                    <TooltipTrigger asChild>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 opacity-0 group-hover/chat-item:opacity-100 group-data-[collapsed=icon]:hidden"
                            onClick={(e) => handlePinToggle(e, chat.id)}
                        >
                            {isPinned ? <PinOff className="h-4 w-4 text-primary" /> : <Pin className="h-4 w-4" />}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                        <p>{isPinned ? "Unpin chat" : "Pin chat"}</p>
                    </TooltipContent>
                </Tooltip>
              </div>
            );
          })}
        </div>
      )}
    </TooltipProvider>
  );
}
