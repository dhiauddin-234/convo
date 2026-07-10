
import { Timestamp } from 'firebase/firestore';

export interface UserSettings {
  notificationsEnabled: boolean;
  readReceipts: boolean;
}

export interface AppUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  bio?: string;
  status?: string;
  lastSeen: Timestamp;
  isOnline: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  theme?: 'light' | 'dark' | 'system';
  settings?: UserSettings;
  pinnedChats?: string[];
  mutedChats?: string[];
  archivedChats?: string[];
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: Timestamp;
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
  id: string;
  users: string[];
  isGroup?: boolean;
  name?: string;
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
