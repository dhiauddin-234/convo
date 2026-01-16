import { type ReactNode } from 'react';
import Image from 'next/image';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-4">
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
      <div className="mb-8 flex items-center gap-2 text-2xl font-headline font-semibold text-primary">
         <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-8 w-8"
          >
            <path d="M12 22a10 10 0 0 0 10-10h-2a8 8 0 0 1-8 8v2Z" />
            <path d="M22 12a10 10 0 0 0-10-10v2a8 8 0 0 1 8 8h2Z" />
            <path d="M12 2a10 10 0 0 0-10 10h2a8 8 0 0 1 8-8V2Z" />
          </svg>
          Convo
      </div>
      <main>{children}</main>
    </div>
  );
}
