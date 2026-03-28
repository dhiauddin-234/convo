"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuth, useFirestore } from "@/firebase/provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export function SignUpForm() {
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errors, setErrors] = useState<{[key: string]: string}>({});
    const [loading, setLoading] = useState(false);
    
    const auth = useAuth();
    const db = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const validateForm = () => {
        const newErrors: {[key: string]: string} = {};
        if (displayName.length < 3) {
            newErrors.displayName = 'Display name must be at least 3 characters';
        }
        if (!/^\S+@\S+\.\S+$/.test(email)) {
            newErrors.email = 'Invalid email address';
        }
        if (password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }
        if (password !== confirmPassword) {
            newErrors.confirmPassword = "Passwords don't match";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!validateForm()) {
            return;
        }

        setLoading(true);
        setErrors({});

        if (!auth || !db) {
            toast({
                variant: "destructive",
                title: "Sign Up Failed",
                description: "Firebase services are not available.",
            });
            setLoading(false);
            return;
        }

        try {
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

            router.push('/chat');

        } catch (error: any) {
            let errorMessage = 'An error occurred during sign up.';
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'This email is already registered.';
                setErrors({ email: errorMessage });
            } else {
                 setErrors({ general: errorMessage });
            }
             toast({
                variant: "destructive",
                title: "Sign Up Failed",
                description: errorMessage,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-sm">
            <CardHeader>
                <CardTitle className="text-2xl font-headline">Sign Up</CardTitle>
                <CardDescription>
                Enter your information to create an account.
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
                <CardContent className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="displayName">Display Name</Label>
                        <Input 
                            id="displayName" 
                            name="displayName" 
                            placeholder="Max Robinson" 
                            required 
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                        />
                        {errors.displayName && <p className="text-sm text-destructive">{errors.displayName}</p>}
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input 
                            id="email" 
                            name="email" 
                            type="email" 
                            placeholder="m@example.com" 
                            required 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                         {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="password">Password</Label>
                        <Input 
                            id="password" 
                            name="password" 
                            type="password" 
                            required 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                         {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <Input 
                            id="confirmPassword" 
                            name="confirmPassword" 
                            type="password" 
                            required 
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                         {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
                    </div>
                    {errors.general && <p className="text-sm text-destructive">{errors.general}</p>}
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button className="w-full" type="submit" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create account
                    </Button>
                    <div className="text-center text-sm">
                        Already have an account?{" "}
                        <Link href="/login" className="underline text-primary">
                        Login
                        </Link>
                    </div>
                </CardFooter>
            </form>
        </Card>
    );
}
