
'use client';

import { useState, useTransition } from 'react';
import type { AppUser } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserAvatar } from '@/components/UserAvatar';
import { createOrGetChat } from '@/app/actions';
import { useUser } from '@/firebase/provider';
import { useRouter } from 'next/navigation';
import { Loader2, MessageSquarePlus } from 'lucide-react';

interface UserListProps {
  initialUsers: AppUser[];
}

export function UserList({ initialUsers }: UserListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isPending, startTransition] = useTransition();
  const { user: currentUser } = useUser();
  const router = useRouter();

  const filteredUsers = initialUsers.filter(user =>
    user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleStartChat = async (otherUserId: string) => {
    if (!currentUser) return;
    startTransition(async () => {
        const chatId = await createOrGetChat(currentUser.uid, otherUserId);
        router.push(`/chat/${chatId}`);
    });
  };

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search for users..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="max-w-sm"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredUsers.map(user => (
          <Card key={user.uid}>
            <CardHeader className="items-center">
              <UserAvatar user={user} className="h-20 w-20"/>
            </CardHeader>
            <CardContent className="text-center">
              <CardTitle className="text-lg font-semibold">{user.displayName}</CardTitle>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={() => handleStartChat(user.uid)}
                disabled={isPending}
              >
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <MessageSquarePlus className="mr-2 h-4 w-4"/>}
                Chat
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
