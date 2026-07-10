
'use server';

import { z } from 'zod';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { initializeFirebase } from '@/firebase';
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
  updateDoc,
  writeBatch,
  increment,
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { moderateChatMessage } from '@/ai/flows/moderate-chat-message';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import type { Message } from '@/types';

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
    const { auth, firestore: db } = initializeFirebase();
    if (!auth) throw new Error("Authentication service is not initialized.");
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const randomAvatar = PlaceHolderImages[Math.floor(Math.random() * PlaceHolderImages.length)];

    await updateProfile(user, {
      displayName,
      photoURL: randomAvatar.imageUrl,
    });

    // CRITICAL: Using setDoc with merge to ensure document creation
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      displayName,
      email,
      photoURL: randomAvatar.imageUrl,
      bio: "Hello! I'm new to Convo.",
      status: "Available",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
      isOnline: true,
      theme: 'system',
      settings: {
        notificationsEnabled: true,
        readReceipts: true,
      },
      pinnedChats: [],
      mutedChats: [],
      archivedChats: [],
    }, { merge: true });

  } catch (error: any) {
    console.error("SignUp error:", error);
    return {
      message: error.code === 'auth/email-already-in-use' ? 'This email is already registered.' : 'An error occurred during sign up.',
    };
  }

  redirect('/chat');
}

export async function login(prevState: any, formData: FormData) {
  const { email, password } = Object.fromEntries(formData.entries()) as any;

  try {
    const { auth } = initializeFirebase();
    if (!auth) throw new Error("Authentication service not initialized.");
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error: any) {
    if (error.code === 'auth/invalid-credential') return { message: 'Invalid email or password.' };
    return { message: 'An error occurred during login.' };
  }

  redirect('/chat');
}

export async function signOut() {
  const { auth } = initializeFirebase();
  if (!auth) throw new Error("Authentication service not initialized.");
  await firebaseSignOut(auth);
  redirect('/login');
}

export async function createOrGetChat(currentUserId: string, otherUserId: string) {
  const { firestore: db } = initializeFirebase();
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
      isGroup: false,
      userDetails: {
        [currentUserId]: currentUserDoc.data(),
        [otherUserId]: otherUserDoc.data(),
      },
      lastMessage: null,
      createdAt: serverTimestamp(),
      unreadCounts: {
        [currentUserId]: 0,
        [otherUserId]: 0,
      },
      typing: {
        [currentUserId]: false,
        [otherUserId]: false,
      }
    });

    const messagesColRef = collection(db, 'chats', chatId, 'messages');
    await addDoc(messagesColRef, {
        text: 'Conversation started.',
        senderId: 'system',
        createdAt: serverTimestamp(),
        type: 'system',
    });
  }

  return chatId;
}

export async function sendMessage(formData: FormData) {
  const { text, chatId, senderId, replyTo } = Object.fromEntries(formData.entries()) as any;
  const replyToObject = replyTo ? JSON.parse(replyTo) : null;

  try {
    const moderationResult = await moderateChatMessage({ text });
    if (moderationResult.isHarmful) return { error: `Moderated: ${moderationResult.reason}` };
    
    const { firestore: db } = initializeFirebase();
    const chatRef = doc(db, 'chats', chatId);
    const messagesColRef = collection(chatRef, 'messages');
    
    await addDoc(messagesColRef, {
      text,
      senderId,
      createdAt: serverTimestamp(),
      type: 'user',
      reactions: {},
      edited: false,
      isDeleted: false,
      ...(replyToObject && { replyTo: replyToObject })
    });
    
    const chatDoc = await getDoc(chatRef);
    if(chatDoc.exists()) {
        const otherUserId = chatDoc.data().users.find((uid: string) => uid !== senderId);
        if (otherUserId) {
            await updateDoc(chatRef, {
                lastMessage: {
                    text,
                    createdAt: serverTimestamp(),
                    readBy: [senderId],
                },
                [`unreadCounts.${otherUserId}`]: increment(1)
            });
        }
    }
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: 'Failed to send message.' };
  }
}

export async function updateUserProfile(data: Partial<AppUser>) {
  const { auth, firestore: db } = initializeFirebase();
  const user = auth.currentUser;
  if (!user) return { error: 'Not authenticated' };

  try {
    const userRef = doc(db, 'users', user.uid);
    const updatePayload = {
        ...data,
        updatedAt: serverTimestamp(),
    };

    // Use setDoc with merge to ensure it never fails due to missing document
    await setDoc(userRef, updatePayload, { merge: true });

    if (data.displayName || data.photoURL) {
      await updateProfile(user, {
        displayName: data.displayName || user.displayName,
        photoURL: data.photoURL || user.photoURL
      });
    }

    revalidatePath('/(main)', 'layout');
    return { success: true };
  } catch (error: any) {
    console.error("Error updating profile:", error);
    return { error: 'Update failed: ' + error.message };
  }
}

export async function updateTypingStatus(chatId: string, userId: string, isTyping: boolean) {
    if(!chatId || !userId) return;
    const { firestore: db } = initializeFirebase();
    const chatRef = doc(db, 'chats', chatId);
    try {
        await updateDoc(chatRef, { [`typing.${userId}`]: isTyping });
    } catch(e) {
        // Silently fail for typing status
    }
}
