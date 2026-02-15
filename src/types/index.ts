import { Timestamp } from 'firebase/firestore';

export interface AppUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  lastSeen: Timestamp;
  isOnline: boolean;
  pinnedChats?: string[];
  mutedChats?: string[];
  archivedChats?: string[];
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: Timestamp | any; // 'any' for serverTimestamp
  isModerated?: boolean;
  type?: 'user' | 'system';
  reactions?: { [key: string]: string };
  edited?: boolean;
  isDeleted?: boolean;
  replyTo?: {
    messageId: string;
    senderId: string;
    textPreview: string;
    senderDisplayName: string;
  }
}

export interface Chat {
  id:string;
  users: string[];
  userDetails: {
    [key: string]: AppUser;
  }
  lastMessage?: {
    text: string;
    createdAt: Timestamp;
    readBy: string[];
  } | null;
  createdAt: Timestamp;
  unreadCounts: {
    [key: string]: number;
  };
  typing?: {
    [key: string]: boolean;
  }
}
