import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { AppUser } from "@/types";

interface UserAvatarProps {
  user: AppUser;
  className?: string;
}

export function UserAvatar({ user, className }: UserAvatarProps) {
  return (
    <div className="relative">
      <Avatar className={className}>
        <AvatarImage src={user.photoURL} alt={user.displayName} />
        <AvatarFallback>
          {user.displayName
            ?.split(" ")
            .map((n) => n[0])
            .join("")}
        </AvatarFallback>
      </Avatar>
      {user.isOnline && (
        <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background" />
      )}
    </div>
  );
}
