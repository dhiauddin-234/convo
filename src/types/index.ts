import { Timestamp } from 'firebase/firestore';

export interface AppUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  lastSeen: Timestamp;
  isOnline: boolean;
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: Timestamp;
}

export interface Chat {
  id: string;
  users: string[];
  userDetails: {
    [key: string]: AppUser;
  }
  lastMessage?: {
    text: string;
    createdAt: Timestamp;
  } | null;
  createdAt: Timestamp;
}
