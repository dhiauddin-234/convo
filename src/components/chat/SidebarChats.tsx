'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, orderBy, FirestoreError, doc, updateDoc, arrayRemove, arrayUnion } from 'firebase/firestore';
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
import { Archive, ArchiveX, BellOff, MessageSquarePlus, MoreHorizontal, Pin, PinOff, Volume2 } from 'lucide-react';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { TooltipProvider } from '../ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { useSidebar } from '@/components/ui/sidebar';

interface ChatItemProps {
    chat: Chat;
    currentUser: User;
    isPinned: boolean;
    isMuted: boolean;
    pathname: string;
    onToggleProperty: (chatId: string, property: 'pinned' | 'muted' | 'archived') => void;
}

function ChatItem({ chat, currentUser, isPinned, isMuted, pathname, onToggleProperty }: ChatItemProps) {
    const { setOpenMobile } = useSidebar();
    const otherUserId = chat.users.find(uid => uid !== currentUser.uid);

    if (!otherUserId || !chat.userDetails[otherUserId]) return null;
    
    const otherUser = chat.userDetails[otherUserId];
    const isActive = pathname === `/chat/${chat.id}`;
    const lastMessage = chat.lastMessage;
    const unreadCount = chat.unreadCounts?.[currentUser.uid] || 0;
    
    return (
        <TooltipProvider>
             <div className="relative group/chat-item">
                <Link
                    href={`/chat/${chat.id}`}
                    onClick={() => setOpenMobile(false)}
                    className={cn(
                    "flex items-center gap-3 rounded-lg px-2 py-2.5 sm:py-1.5 text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground",
                    isActive && "bg-accent text-accent-foreground"
                    )}
                >
                    <UserAvatar user={otherUser} className="h-10 w-10" />
                    <div className="flex-1 truncate group-data-[collapsed=icon]:hidden">
                        <div className='flex items-center gap-2'>
                           <p className={cn("font-semibold truncate", unreadCount > 0 && !isMuted && "font-bold text-foreground")}>{otherUser.displayName}</p>
                           {isPinned && <Pin className="h-3 w-3 text-primary" />}
                        </div>
                        <p className={cn("text-sm truncate", unreadCount > 0 && !isMuted && "text-foreground")}>
                            {lastMessage?.text || "No messages yet"}
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-xs group-data-[collapsed=icon]:hidden">
                        {lastMessage?.createdAt && (
                            <div className="text-muted-foreground whitespace-nowrap">
                                {formatDistanceToNow(lastMessage.createdAt.toDate(), { addSuffix: true })}
                            </div>
                        )}
                        {(unreadCount > 0 && !isMuted) && (
                            <Badge className="h-5 min-w-[1.25rem] justify-center rounded-full p-1 text-[10px]">{unreadCount}</Badge>
                        )}
                        {isMuted && <BellOff className="h-4 w-4 text-muted-foreground" />}
                    </div>
                </Link>
                <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/chat-item:opacity-100 group-data-[collapsed=icon]:hidden">
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4"/></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="right">
                             <DropdownMenuItem onClick={() => onToggleProperty(chat.id, 'pinned')}>
                                {isPinned ? <PinOff className="mr-2 h-4 w-4"/> : <Pin className="mr-2 h-4 w-4"/>}
                                {isPinned ? "Unpin" : "Pin"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onToggleProperty(chat.id, 'muted')}>
                                {isMuted ? <Volume2 className="mr-2 h-4 w-4"/> : <BellOff className="mr-2 h-4 w-4"/>}
                                {isMuted ? "Unmute" : "Mute"}
                            </DropdownMenuItem>
                             <DropdownMenuItem onClick={() => onToggleProperty(chat.id, 'archived')}>
                               <Archive className="mr-2 h-4 w-4"/> Archive
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                     </DropdownMenu>
                </div>
              </div>
        </TooltipProvider>
    )
}

interface SidebarChatsProps {
  currentUser: User | null;
}

type UserPrefs = {
    pinned: string[];
    muted: string[];
    archived: string[];
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
  
  const [optimisticPrefs, setOptimisticPrefs] = useState<UserPrefs>({ pinned: [], muted: [], archived: [] });

  useEffect(() => {
      if (userProfile) {
          setOptimisticPrefs({
              pinned: userProfile.pinnedChats || [],
              muted: userProfile.mutedChats || [],
              archived: userProfile.archivedChats || [],
          });
      }
  }, [userProfile]);


  useEffect(() => {
    if (!currentUser?.uid) {
        setLoading(false);
        return;
    }

    const chatsQuery = query(
      collection(db, 'chats'),
      where('users', 'array-contains', currentUser.uid)
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

  const handleToggleChatProperty = async (chatId: string, field: 'pinned' | 'muted' | 'archived') => {
    if (!userRef) return;
    
    const fieldMap = {
        pinned: 'pinnedChats',
        muted: 'mutedChats',
        archived: 'archivedChats'
    };
    const firestoreField = fieldMap[field];

    const previousPrefs = { ...optimisticPrefs };
    const currentArray = previousPrefs[field];
    const isCurrentlySet = currentArray.includes(chatId);
    
    const newArray = isCurrentlySet 
        ? currentArray.filter(id => id !== chatId)
        : [...currentArray, chatId];

    // Optimistic update
    setOptimisticPrefs(prev => ({ ...prev, [field]: newArray }));

    try {
        await updateDoc(userRef, {
            [firestoreField]: isCurrentlySet ? arrayRemove(chatId) : arrayUnion(chatId)
        });
    } catch (error) {
        // Rollback on error
        setOptimisticPrefs(previousPrefs);
        toast({ variant: 'destructive', title: 'Error', description: `Failed to update ${field} status.` });
    }
  };


  const { regularChats, archivedChats } = useMemo(() => {
    const filtered = chats
        .filter(chat => {
            if (!searchTerm) return true;
            const otherUserId = chat.users.find(uid => uid !== currentUser?.uid);
            if (!otherUserId) return false;
            const otherUser = chat.userDetails[otherUserId];
            return otherUser.displayName.toLowerCase().includes(searchTerm.toLowerCase());
        })
        .sort((a, b) => {
            const aIsPinned = optimisticPrefs.pinned.includes(a.id);
            const bIsPinned = optimisticPrefs.pinned.includes(b.id);
            if (aIsPinned && !bIsPinned) return -1;
            if (!aIsPinned && bIsPinned) return 1;
            
            const aTimestamp = a.lastMessage?.createdAt?.toDate() || a.createdAt.toDate() || new Date(0);
            const bTimestamp = b.lastMessage?.createdAt?.toDate() || b.createdAt.toDate() || new Date(0);
            return bTimestamp.getTime() - aTimestamp.getTime();
        });
    
    return {
        regularChats: filtered.filter(c => !optimisticPrefs.archived.includes(c.id)),
        archivedChats: filtered.filter(c => optimisticPrefs.archived.includes(c.id)),
    }
  }, [chats, searchTerm, currentUser, optimisticPrefs]);


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
    <>
      <div className="px-2 mb-2 group-data-[collapsed=icon]:hidden">
        <Input 
            placeholder="Search chats..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      {regularChats.length === 0 ? (
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
          {regularChats.map(chat => (
            <ChatItem 
                key={chat.id} 
                chat={chat} 
                currentUser={currentUser!}
                isPinned={optimisticPrefs.pinned.includes(chat.id)}
                isMuted={optimisticPrefs.muted.includes(chat.id)}
                pathname={pathname}
                onToggleProperty={handleToggleChatProperty}
            />
          ))}
        </div>
      )}

      {archivedChats.length > 0 && (
         <Accordion type="single" collapsible className="mt-4 group-data-[collapsed=icon]:hidden">
            <AccordionItem value="archived" className="border-none">
                <AccordionTrigger className="px-2 text-sm text-muted-foreground hover:no-underline">
                   <div className="flex items-center gap-2">
                     <ArchiveX className="h-4 w-4" /> Archived ({archivedChats.length})
                   </div>
                </AccordionTrigger>
                <AccordionContent className="pb-0">
                    <div className="space-y-1">
                        {archivedChats.map(chat => (
                             <ChatItem 
                                key={chat.id} 
                                chat={chat} 
                                currentUser={currentUser!}
                                isPinned={false} // Archived chats cannot be pinned
                                isMuted={optimisticPrefs.muted.includes(chat.id)}
                                pathname={pathname}
                                onToggleProperty={handleToggleChatProperty}
                            />
                        ))}
                    </div>
                </AccordionContent>
            </AccordionItem>
         </Accordion>
      )}
    </>
  );
}
