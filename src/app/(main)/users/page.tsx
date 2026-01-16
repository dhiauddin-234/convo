
import { collection, getDocs, query, where } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { UserList } from '@/components/chat/UserList';
import type { AppUser } from '@/types';
import { getAuth } from "firebase/auth";

const { firestore: db } = initializeFirebase();

async function getUsers(currentUserId: string | undefined) {
    if(!currentUserId) return [];
    
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('uid', '!=', currentUserId));
    const querySnapshot = await getDocs(q);
    const users = querySnapshot.docs.map(doc => doc.data() as AppUser);
    return users;
}

export default async function UsersPage() {
    // This is a workaround to get current user on server.
    // In a real app, you would use a session management library.
    const auth = getAuth(initializeFirebase().firebaseApp);
    const currentUserId = auth.currentUser?.uid;
    const users = await getUsers(currentUserId);

  return (
    <div className="h-full flex flex-col">
        <header className="border-b p-4">
             <h1 className="text-2xl font-bold font-headline">Discover Users</h1>
             <p className="text-muted-foreground">Find and chat with other people on Convo.</p>
        </header>
        <div className="flex-1 overflow-y-auto p-4">
            <UserList initialUsers={users} />
        </div>
    </div>
  );
}
