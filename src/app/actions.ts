
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
  orderBy,
  limit,
  updateDoc,
  writeBatch,
  increment,
  arrayUnion,
  arrayRemove,
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
      pinnedChats: [],
      mutedChats: [],
      archivedChats: [],
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
    const { auth } = initializeFirebase();
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
  const { auth, firestore: db } = initializeFirebase();
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

     // Add a system message
    const messagesColRef = collection(db, 'chats', chatId, 'messages');
    const systemMessageData = {
        text: 'Conversation started.',
        senderId: 'system',
        createdAt: serverTimestamp(),
        type: 'system',
    };
    await addDoc(messagesColRef, systemMessageData);

  }

  return chatId;
}


const messageSchema = z.object({
  text: z.string().min(1).max(1000),
  chatId: z.string(),
  senderId: z.string(),
  replyTo: z.string().optional(), // JSON string of the replyTo object
});

export async function sendMessage(formData: FormData) {
  const validatedFields = messageSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return { error: 'Invalid message data' };
  }
  
  let { text, chatId, senderId, replyTo } = validatedFields.data;
  
  const replyToObject = replyTo ? JSON.parse(replyTo) : null;


  try {
    const moderationResult = await moderateChatMessage({ text });

    if (moderationResult.isHarmful) {
      return { error: `Message not sent. Reason: ${moderationResult.reason}` };
    }
    
    const { firestore: db } = initializeFirebase();
    const chatRef = doc(db, 'chats', chatId);
    const messagesColRef = collection(chatRef, 'messages');
    
    const messageData: Omit<Message, 'id'> = {
      text,
      senderId,
      createdAt: serverTimestamp() as Timestamp,
      type: 'user',
      reactions: {},
      edited: false,
      isDeleted: false,
      ...(replyToObject && { replyTo: replyToObject })
    };

    await addDoc(messagesColRef, messageData);
    
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

    revalidatePath(`/chat/${chatId}`);
    return { success: true };

  } catch (e) {
    console.error(e)
    return { error: 'Failed to send message.' };
  }
}

export async function updateUserPresence(userId: string, isOnline: boolean) {
  if (!userId) return;
  const { firestore: db } = initializeFirebase();
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

export async function updateUserProfile({ displayName, photoURL }: { displayName: string, photoURL?: string }) {
  const { auth, firestore: db } = initializeFirebase();
  const user = auth.currentUser;

  if (!user) {
    return { error: 'You must be logged in to update your profile.' };
  }

  try {
    const updatePayload: { displayName: string; photoURL?: string } = { displayName };
    if (photoURL) {
      updatePayload.photoURL = photoURL;
    }

    // 1. Update Firebase Auth user profile
    await updateProfile(user, updatePayload);

    // 2. Update user document in /users
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, updatePayload);
    
    // 3. Update denormalized user data in all relevant chats
    const chatsQuery = query(collection(db, 'chats'), where('users', 'array-contains', user.uid));
    const chatsSnapshot = await getDocs(chatsQuery);

    if (!chatsSnapshot.empty) {
        const batch = writeBatch(db);
        
        chatsSnapshot.forEach(chatDoc => {
            const chatRef = doc(db, 'chats', chatDoc.id);
            const currentChatData = chatDoc.data();
            const currentUserDetails = currentChatData.userDetails[user.uid];
            
            batch.update(chatRef, {
                [`userDetails.${user.uid}`]: { ...currentUserDetails, ...updatePayload }
            });
        });
        await batch.commit();
    }

    revalidatePath('/(main)', 'layout');
    return { success: true };

  } catch (error: any) {
    console.error("Error updating profile:", error);
    return { error: 'Failed to update profile: ' + error.message };
  }
}

export async function reactToMessage(chatId: string, messageId: string, userId: string, emoji: string) {
    const { firestore: db } = initializeFirebase();
    const messageRef = doc(db, 'chats', chatId, 'messages', messageId);

    try {
        const messageDoc = await getDoc(messageRef);
        if (!messageDoc.exists()) {
            return { error: "Message not found." };
        }
        
        const reactions = messageDoc.data().reactions || {};
        const fieldPath = `reactions.${userId}`;

        if (reactions[userId] === emoji) {
            // Un-react: field needs to be deleted, which is complex with dot notation.
            // It's easier to overwrite the map.
            delete reactions[userId];
            await updateDoc(messageRef, { reactions });
        } else {
             await updateDoc(messageRef, { [fieldPath]: emoji });
        }

        revalidatePath(`/chat/${chatId}`);
        return { success: true };

    } catch (e) {
        return { error: "Failed to react to message." };
    }
}

export async function editMessage(chatId: string, messageId: string, newText: string) {
    if (newText.trim() === '') return { error: "Message cannot be empty."};
    
    const { firestore: db } = initializeFirebase();
    const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
    
    try {
        await updateDoc(messageRef, {
            text: newText,
            edited: true,
        });
        revalidatePath(`/chat/${chatId}`);
        return { success: true };
    } catch(e) {
        return { error: "Failed to edit message." };
    }
}

export async function deleteMessage(chatId: string, messageId: string) {
    const { firestore: db } = initializeFirebase();
    const messageRef = doc(db, 'chats', chatId, 'messages', messageId);

    try {
        await updateDoc(messageRef, {
            text: "This message was deleted.",
            isDeleted: true,
            reactions: {} // Clear reactions on delete
        });
        revalidatePath(`/chat/${chatId}`);
        return { success: true };
    } catch(e) {
        return { error: "Failed to delete message." };
    }
}

async function toggleUserArrayField(userId: string, chatId: string, field: 'pinnedChats' | 'mutedChats' | 'archivedChats') {
    const { firestore: db } = initializeFirebase();
    const userRef = doc(db, 'users', userId);

    try {
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) {
            return { error: "User not found." };
        }
        
        const array = userDoc.data()[field] || [];
        if (array.includes(chatId)) {
            await updateDoc(userRef, { [field]: arrayRemove(chatId) });
        } else {
            await updateDoc(userRef, { [field]: arrayUnion(chatId) });
        }

        revalidatePath('/(main)', 'layout');
        return { success: true };

    } catch (e) {
        return { error: `Failed to update ${field}.` };
    }
}

export async function togglePinChat(userId: string, chatId: string) {
    return toggleUserArrayField(userId, chatId, 'pinnedChats');
}

export async function toggleMuteChat(userId: string, chatId: string) {
    return toggleUserArrayField(userId, chatId, 'mutedChats');
}

export async function toggleArchiveChat(userId: string, chatId: string) {
    return toggleUserArrayField(userId, chatId, 'archivedChats');
}


export async function updateTypingStatus(chatId: string, userId: string, isTyping: boolean) {
    if(!chatId || !userId) return;
    const { firestore: db } = initializeFirebase();
    const chatRef = doc(db, 'chats', chatId);
    try {
        await updateDoc(chatRef, {
            [`typing.${userId}`]: isTyping
        });
    } catch(e) {
        // Don't need to show error to user for this
        console.error("Failed to update typing status:", e);
    }
}
