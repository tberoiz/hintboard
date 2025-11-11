"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@hintboard/ui/component";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@hintboard/ui/component";
import { Button } from "@hintboard/ui/component";
import { Input } from "@hintboard/ui/component";
import { toast } from "sonner";
import { UserService } from "@hintboard/supabase/services";
import { AvatarUpload } from "@/shared/avatar-upload";

// Simplified schema - only profile information
const formSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  avatar: z.instanceof(File).optional(),
});

export function SetupAccountForm() {
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
    },
  });
  const isSubmitting = form.formState.isSubmitting;

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      // Update user profile
      await UserService.updateProfile({ full_name: values.fullName }, "client");

      // Upload avatar if provided
      if (values.avatar) {
        await UserService.uploadAvatar(values.avatar, "client");
      }

      toast.success("Profile created successfully!");

      // Redirect to /organizations page
      router.push("/organizations");
      router.refresh();
    } catch (error: any) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create profile",
      );
    }
  };

  return (
    <Card className="w-full max-w-md animate-in fade-in">
      <CardHeader className="space-y-4 text-center">
        <CardTitle>Set up your profile</CardTitle>
        <CardDescription className="mt-2">
          Let's start by adding your profile information
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            {/* Avatar Upload (centered) */}
            <div className="flex justify-center">
              <FormField
                control={form.control}
                name="avatar"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <AvatarUpload
                        value={field.value}
                        onChange={field.onChange}
                        size="xl"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Full Name */}
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="John Doe"
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current rounded-full animate-spin border-t-transparent" />
                  <span>Creating profile...</span>
                </div>
              ) : (
                "Continue"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
