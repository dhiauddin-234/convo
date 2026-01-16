'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { Loader2, LogOut, MessageSquare, Users } from 'lucide-react';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserAvatar } from '@/components/UserAvatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { signOut, updateUserPresence } from '@/app/actions';
import { SidebarChats } from '@/components/chat/SidebarChats';

function PresenceUpdater() {
  const { user } = useAuth();
  
  useEffect(() => {
    if (user?.uid) {
      updateUserPresence(user.uid, true);
      
      const handleBeforeUnload = () => {
        updateUserPresence(user.uid, false);
      };

      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        updateUserPresence(user.uid, false);
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [user?.uid]);

  return null;
}


export default function MainLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

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
                 <div className="flex items-center gap-2 text-xl font-headline font-semibold text-primary">
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
                <div className="mt-4 px-2 group-data-[collapsed=icon]:hidden">
                    <h2 className="mb-2 px-2 text-lg font-semibold font-headline tracking-tight">
                        Recent
                    </h2>
                    <SidebarChats currentUser={user} />
                </div>
            </SidebarContent>
            <SidebarFooter>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                         <Button variant="ghost" className="h-12 w-full justify-start gap-2 px-2">
                             <UserAvatar user={user} className="h-8 w-8"/>
                             <div className="flex flex-col items-start group-data-[collapsed=icon]:hidden">
                                <span className="font-medium">{user.displayName}</span>
                                <span className="text-xs text-muted-foreground">{user.email}</span>
                             </div>
                         </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start" className="w-56">
                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <form action={signOut}>
                            <DropdownMenuItem asChild>
                                <button className="w-full" type="submit"><LogOut className="mr-2 h-4 w-4" />Logout</button>
                            </DropdownMenuItem>
                        </form>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarFooter>
        </Sidebar>
        <main className="flex-1 bg-background">{children}</main>
    </SidebarProvider>
  );
}
