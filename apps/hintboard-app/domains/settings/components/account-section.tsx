import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  Button,
  Label,
  Alert,
  AlertDescription,
} from "@hintboard/ui/component";

import { User, AlertCircle, Mail } from "lucide-react";
import { toast } from "sonner";

interface AnonymousAccountConversionProps {
  userInfo: any;
}

export function AnonymousAccountConversion({
  userInfo,
}: AnonymousAccountConversionProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const queryClient = useQueryClient();

  // Set initial name for anonymous users
  useEffect(() => {
    if (userInfo?.fullName) {
      setName(userInfo.fullName);
    }
  }, [userInfo]);

  // Convert anonymous account by adding email
  const convertMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/convert-anonymous", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          fullName: name.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update account");
      }

      return response.json();
    },
    onSuccess: () => {
      setEmailSent(true);
      toast.success("Verification email sent!");
    },
    onError: (error: any) => {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update account";
      toast.error(errorMessage);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    convertMutation.mutate();
  };

  if (emailSent) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Check Your Email
            </CardTitle>
            <CardDescription>
              We've sent a verification link to {email}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                Click the link in your email to verify your account and complete
                the conversion. Once verified, you can sign in with your email.
              </AlertDescription>
            </Alert>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• Check your spam folder if you don't see the email</p>
              <p>• The link will expire in 24 hours</p>
              <p>• You can close this page</p>
            </div>

            <Button
              variant="outline"
              onClick={() => setEmailSent(false)}
              className="w-full"
            >
              Try a Different Email
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create Your Account
        </h1>
        <p className="text-muted-foreground mt-1">
          You're currently browsing as a guest. Add your email to save your
          account permanently.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Account Information
          </CardTitle>
          <CardDescription>
            We'll send you a verification link to confirm your email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                disabled={convertMutation.isPending}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={convertMutation.isPending}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                We'll send you a verification link
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={
                !name.trim() || !email.trim() || convertMutation.isPending
              }
            >
              {convertMutation.isPending ? "Sending..." : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Alert className="mt-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <p className="font-medium mb-1">All your data will be preserved</p>
          <p className="text-sm">
            Your votes, comments, and activity will remain linked to your new
            account.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
}
