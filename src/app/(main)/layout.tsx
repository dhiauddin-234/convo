
'use client';

import { useUser, useFirestore } from '@/firebase/provider';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { Loader2, LogOut, MessageSquare, User, Users } from 'lucide-react';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserAvatar } from '@/components/UserAvatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { signOut } from '@/app/actions';
import { SidebarChats } from '@/components/chat/SidebarChats';
import { ThemeToggle } from '@/components/ThemeToggle';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

/**
 * PresenceUpdater handles real-time online status and heartbeats.
 * Uses setDoc with merge to prevent 'No document to update' errors.
 */
function PresenceUpdater() {
  const { user } = useUser();
  const db = useFirestore();
  
  useEffect(() => {
    if (!user?.uid || !db) return;

    const userRef = doc(db, 'users', user.uid);
    
    const setStatus = async (isOnline: boolean) => {
      try {
        // CRITICAL: Using setDoc with merge: true to ensure the document exists
        await setDoc(userRef, {
          uid: user.uid,
          isOnline,
          lastSeen: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (error) {
        console.debug("Presence update failed (safe to ignore if logging out):", error);
      }
    };

    // Initial status
    setStatus(true);

    // Heartbeat every 2 minutes
    const heartbeat = setInterval(() => setStatus(true), 120000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') setStatus(true);
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(heartbeat);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      setStatus(false);
    };
  }, [user?.uid, db]);

  return null;
}

export default function MainLayout({ children }: { children: ReactNode }) {
  const { user, isUserLoading: loading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    if (user?.uid && db) {
      try {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
          isOnline: false,
          lastSeen: serverTimestamp(),
        }, { merge: true });
      } catch (e) {
        console.debug("Logout presence update failed:", e);
      }
    }
    await signOut();
  };

  if (loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
        <PresenceUpdater />
        <Sidebar>
            <SidebarHeader>
                 <div className="flex items-center gap-2 text-xl font-headline font-semibold text-primary p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7"><path d="M12 22a10 10 0 0 0 10-10h-2a8 8 0 0 1-8 8v2Z" /><path d="M22 12a10 10 0 0 0-10-10v2a8 8 0 0 1 8 8h2Z" /><path d="M12 2a10 10 0 0 0-10 10h2a8 8 0 0 1 8-8V2Z" /></svg>
                    <span className="group-data-[collapsed=icon]:hidden">Convo</span>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={pathname.startsWith('/chat')} tooltip="Chats">
                            <Link href="/chat">
                                <MessageSquare />
                                <span className="truncate">Chats</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={pathname === '/users'} tooltip="Discover">
                            <Link href="/users">
                                <Users />
                                <span className="truncate">Discover</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
                <div className="mt-4 px-2 group-data-[collapsed=icon]:hidden overflow-hidden">
                    <SidebarChats currentUser={user} />
                </div>
            </SidebarContent>
            <SidebarFooter>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                         <Button variant="ghost" className="h-12 w-full justify-start gap-2 px-2 overflow-hidden">
                             <UserAvatar user={user as any} className="h-8 w-8 shrink-0"/>
                             <div className="flex flex-col items-start group-data-[collapsed=icon]:hidden min-w-0">
                                <span className="font-medium truncate w-full">{user.displayName || 'User'}</span>
                                <span className="text-xs text-muted-foreground truncate w-full">{user.email}</span>
                             </div>
                         </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start" className="w-56">
                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link href="/profile"><User className="mr-2 h-4 w-4" />Profile</Link>
                        </DropdownMenuItem>
                        <ThemeToggle />
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout}>
                            <LogOut className="mr-2 h-4 w-4" />Logout
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarFooter>
        </Sidebar>
        <main className="flex-1 bg-background overflow-hidden relative">
            {children}
        </main>
    </SidebarProvider>
  );
}
