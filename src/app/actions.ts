
'use server';

import { z } from 'zod';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';
import { redirect } from 'next/navigation';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  serverTimestamp,
  addDoc,
  query,
  where,
  Timestamp,
  orderBy,
  limit,
  updateDoc,
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { moderateChatMessage } from '@/ai/flows/moderate-chat-message';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const signUpSchema = z
  .object({
    displayName: z.string().min(3, 'Display name must be at least 3 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export async function signUp(prevState: any, formData: FormData) {
  const validatedFields = signUpSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Error: Please check the form fields.',
    };
  }

  const { email, password, displayName } = validatedFields.data;

  try {
    if (!auth) {
      throw new Error("Authentication service is not initialized.");
    }
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const randomAvatar = PlaceHolderImages[Math.floor(Math.random() * PlaceHolderImages.length)];

    await updateProfile(user, {
      displayName,
      photoURL: randomAvatar.imageUrl,
    });

    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      displayName,
      email,
      photoURL: randomAvatar.imageUrl,
      lastSeen: serverTimestamp(),
      isOnline: true,
    });

  } catch (error: any) {
    return {
      message: error.code === 'auth/email-already-in-use' ? 'This email is already registered.' : 'An error occurred during sign up.',
    };
  }

  redirect('/chat');
}


const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export async function login(prevState: any, formData: FormData) {
  const validatedFields = loginSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Error: Please check the form fields.',
    };
  }

  const { email, password } = validatedFields.data;

  try {
    if (!auth) {
      throw new Error("Authentication service is not initialized.");
    }
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error: any) {
    if (error.code === 'auth/invalid-credential') {
      return { message: 'Invalid email or password.' };
    }
    return { message: 'An error occurred during login.' };
  }

  redirect('/chat');
}

export async function signOut() {
  if (!auth) {
    throw new Error("Authentication service is not initialized.");
  }
  const uid = auth.currentUser?.uid;
  if(uid) {
    await updateDoc(doc(db, 'users', uid), {
      isOnline: false,
      lastSeen: serverTimestamp(),
    });
  }
  await firebaseSignOut(auth);
  redirect('/login');
}

export async function createOrGetChat(currentUserId: string, otherUserId: string) {
  const chatMembers = [currentUserId, otherUserId].sort();
  const chatId = chatMembers.join('_');

  const chatRef = doc(db, 'chats', chatId);
  const chatDoc = await getDoc(chatRef);

  if (!chatDoc.exists()) {
    const currentUserDoc = await getDoc(doc(db, 'users', currentUserId));
    const otherUserDoc = await getDoc(doc(db, 'users', otherUserId));

    if (!currentUserDoc.exists() || !otherUserDoc.exists()) {
      throw new Error("One or both users do not exist.");
    }
    
    await setDoc(chatRef, {
      users: chatMembers,
      userDetails: {
        [currentUserId]: currentUserDoc.data(),
        [otherUserId]: otherUserDoc.data(),
      },
      lastMessage: null,
      createdAt: serverTimestamp(),
    });
  }

  return chatId;
}


const messageSchema = z.object({
  text: z.string().min(1).max(1000),
  chatId: z.string(),
  senderId: z.string(),
});

export async function sendMessage(formData: FormData) {
  const validatedFields = messageSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return { error: 'Invalid message data' };
  }
  
  const { text, chatId, senderId } = validatedFields.data;

  try {
    const moderationResult = await moderateChatMessage({ text });

    if (moderationResult.isHarmful) {
      return { error: `Message not sent. Reason: ${moderationResult.reason}` };
    }

    const chatRef = doc(db, 'chats', chatId);
    const messagesColRef = collection(chatRef, 'messages');
    
    const messageData = {
      text,
      senderId,
      createdAt: serverTimestamp() as Timestamp,
    };

    await addDoc(messagesColRef, messageData);
    
    await updateDoc(chatRef, {
      lastMessage: {
        text,
        createdAt: serverTimestamp(),
      }
    });

    revalidatePath(`/chat/${chatId}`);
    return { success: true };

  } catch (e) {
    return { error: 'Failed to send message.' };
  }
}

export async function updateUserPresence(userId: string, isOnline: boolean) {
  if (!userId) return;
  const userRef = doc(db, 'users', userId);
  try {
    await updateDoc(userRef, {
      isOnline,
      lastSeen: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating user presence:", error);
  }
}
