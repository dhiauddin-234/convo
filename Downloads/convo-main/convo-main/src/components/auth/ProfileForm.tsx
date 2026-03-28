'use client';

import { useState, useTransition, type ChangeEvent, type FormEvent, useEffect } from 'react';
import { useUser, useStorage } from '@/firebase/provider';
import { updateUserProfile } from '@/app/actions';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export function ProfileForm() {
  const { user, isUserLoading } = useUser();
  const storage = useStorage();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.photoURL ?? '');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName ?? '');
      setAvatarPreview(user.photoURL ?? '');
    }
  }, [user]);

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !storage) return;

    if (displayName.length < 3) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Display name must be at least 3 characters.',
      });
      return;
    }

    startTransition(async () => {
      try {
        let photoURL = user.photoURL;

        if (avatarFile) {
          const fileRef = ref(storage, `avatars/${user.uid}/${avatarFile.name}`);
          const uploadResult = await uploadBytes(fileRef, avatarFile);
          photoURL = await getDownloadURL(uploadResult.ref);
        }

        const result = await updateUserProfile({
          displayName,
          photoURL: photoURL ?? '',
        });
        
        if (result.error) {
            throw new Error(result.error);
        }

        toast({
          title: 'Profile Updated',
          description: 'Your profile has been successfully updated.',
        });
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Update Failed',
          description: error.message || 'An unexpected error occurred.',
        });
      }
    });
  };

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <Card className="border-0 sm:border shadow-none sm:shadow-sm">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle>Edit Profile</CardTitle>
          <CardDescription>Update your public profile information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <Avatar className="h-24 w-24 sm:h-20 sm:w-20">
              <AvatarImage src={avatarPreview} />
              <AvatarFallback className="text-xl">
                {displayName?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="grid gap-2 w-full text-center sm:text-left">
                <Label htmlFor="avatar-upload" className="text-base sm:text-sm">Profile Picture</Label>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                    <Input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarChange} className="hidden"/>
                    <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full sm:w-auto h-11 sm:h-9"
                        onClick={() => document.getElementById('avatar-upload')?.click()}
                    >
                        <Upload className="mr-2 h-4 w-4"/>
                        {avatarFile ? "Change photo" : "Upload photo"}
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground">Recommended size: 400x400px. Max 5MB.</p>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="displayName" className="text-base sm:text-sm">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              minLength={3}
              className="h-11 sm:h-10 text-base sm:text-sm"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email" className="text-base sm:text-sm">Email</Label>
            <Input id="email" value={user?.email ?? ''} disabled className="h-11 sm:h-10 text-base sm:text-sm bg-muted/50" />
             <p className="text-xs text-muted-foreground">Email address cannot be changed.</p>
          </div>
        </CardContent>
        <CardFooter className="px-4 sm:px-6">
          <Button type="submit" disabled={isPending} className="w-full sm:w-auto h-11 sm:h-10">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
