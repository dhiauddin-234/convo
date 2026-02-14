import { Timestamp } from 'firebase/firestore';

export interface AppUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  lastSeen: Timestamp;
  isOnline: boolean;
  pinnedChats?: string[];
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: Timestamp;
  isModerated?: boolean;
  reactions?: { [key: string]: string };
  edited?: boolean;
  isDeleted?: boolean;
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
}
