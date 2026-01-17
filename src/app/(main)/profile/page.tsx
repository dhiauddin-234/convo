import { ProfileForm } from "@/components/auth/ProfileForm";

export default function ProfilePage() {
  return (
    <div className="h-full flex flex-col items-center p-4 sm:p-6 lg:p-8">
       <div className="w-full max-w-2xl">
        <header className="mb-6">
             <h1 className="text-3xl font-bold font-headline">Profile Settings</h1>
             <p className="text-muted-foreground">Manage your display name and profile picture.</p>
        </header>
        <main>
            <ProfileForm />
        </main>
       </div>
    </div>
  );
}
