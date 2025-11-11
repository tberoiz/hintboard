import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Input,
  Button,
  Label,
  Badge,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hintboard/ui/component";
import { Mail, Loader2, UserX, Users } from "lucide-react";
import { OrganizationService, UserService } from "@hintboard/supabase/services";
import { toast } from "sonner";

interface InviteUsersSectionProps {
  organizationId: string;
}

interface WorkspaceUser {
  user_id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  role: string;
}

export function InviteUsersSection({
  organizationId,
}: InviteUsersSectionProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "moderator" | "viewer" | "guest">(
    "moderator",
  );
  const queryClient = useQueryClient();

  // Fetch current user info
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => UserService.getUserInfo("client"),
  });

  // Fetch current user's role in this organization
  const { data: currentUserMembership } = useQuery({
    queryKey: ["current-user-membership", organizationId],
    queryFn: async () => {
      const users = await OrganizationService.getWorkspaceUsers(
        organizationId,
        "client",
      );
      return users.find((u: any) => u.user_id === currentUser?.id);
    },
    enabled: !!currentUser?.id,
  });

  const currentUserRole = currentUserMembership?.role;
  const isCurrentUserAdmin = currentUserRole?.toLowerCase() === "admin";

  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["workspace-users", organizationId],
    queryFn: () =>
      OrganizationService.getWorkspaceUsers(organizationId, "client"),
  });

  const inviteMutation = useMutation({
    mutationFn: ({
      email,
      role,
    }: {
      email: string;
      role: "admin" | "moderator" | "viewer" | "guest";
    }) => OrganizationService.inviteUser(organizationId, email, role, "client"),
    onSuccess: () => {
      setEmail("");
      toast.success("Invitation sent successfully!");
      queryClient.invalidateQueries({
        queryKey: ["workspace-users", organizationId],
      });
    },
    onError: (error: any) => {
      const errorMessage =
        error?.message || "Failed to send invitation. Please try again.";

      if (errorMessage.includes("already a member")) {
        toast.error("This user is already a member of this workspace");
      } else {
        toast.error(errorMessage);
      }
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, newRole }: { userId: string; newRole: string }) =>
      OrganizationService.updateMemberRole(
        organizationId,
        userId,
        newRole as "admin" | "moderator" | "viewer" | "guest",
        "client",
      ),
    onSuccess: () => {
      toast.success("Role updated successfully");
      queryClient.invalidateQueries({
        queryKey: ["workspace-users", organizationId],
      });
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to update role");
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) =>
      OrganizationService.removeMember(organizationId, userId, "client"),
    onSuccess: () => {
      toast.success("Member removed successfully");
      queryClient.invalidateQueries({
        queryKey: ["workspace-users", organizationId],
      });
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to remove member");
    },
  });

  const handleInvite = () => {
    if (!email) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    inviteMutation.mutate({ email, role });
  };

  const handleEmailKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleInvite();
    }
  };

  const handleRemoveMember = (userId: string, userName: string) => {
    if (
      confirm(
        `Are you sure you want to remove ${userName} from this workspace?`,
      )
    ) {
      removeMemberMutation.mutate(userId);
    }
  };

  const handleRoleChange = (userId: string, newRole: string) => {
    updateRoleMutation.mutate({ userId, newRole });
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isOwner = (userRole: string) => {
    return userRole?.toLowerCase() === "owner";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Invite New Users</CardTitle>
          <CardDescription>
            Add new team members to your workspace by sending them an invite
            link.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="Enter user's email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={handleEmailKeyPress}
                disabled={inviteMutation.isPending}
                className="mt-1"
              />
            </div>
            <div className="sm:w-32">
              <Label htmlFor="user-role">Role</Label>
              <Select
                value={role}
                onValueChange={(value) =>
                  setRole(value as "admin" | "moderator" | "viewer" | "guest")
                }
                disabled={inviteMutation.isPending}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="guest">Guest(view-only)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleInvite}
              disabled={!email || inviteMutation.isPending}
            >
              {inviteMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              Send Invite
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Workspace Members
              </CardTitle>
              <CardDescription>
                {users.length} {users.length === 1 ? "member" : "members"} in
                this workspace
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingUsers ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No members found
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user: WorkspaceUser) => {
                const userIsOwner = isOwner(user.role);
                const isCurrentUser = user.user_id === currentUser?.id;
                const canModifyRole =
                  isCurrentUserAdmin && !userIsOwner && !isCurrentUser;

                return (
                  <div
                    key={user.user_id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={user.avatar_url}
                          alt={user.full_name}
                        />
                        <AvatarFallback>
                          {getInitials(user.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        {user.full_name && (
                          <p className="font-medium">{user.full_name}</p>
                        )}
                        <p
                          className={
                            user.full_name
                              ? "text-sm text-muted-foreground"
                              : "font-medium"
                          }
                        >
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {userIsOwner ? (
                        <Badge variant="default" className="capitalize">
                          Owner
                        </Badge>
                      ) : canModifyRole ? (
                        <Select
                          value={user.role}
                          onValueChange={(newRole) =>
                            handleRoleChange(user.user_id, newRole)
                          }
                          disabled={updateRoleMutation.isPending}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue className="capitalize" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="moderator">Moderator</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                            <SelectItem value="guest">
                              Guest(read-only)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="secondary" className="capitalize">
                          {user.role}
                        </Badge>
                      )}

                      {canModifyRole && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleRemoveMember(user.user_id, user.full_name)
                          }
                          disabled={removeMemberMutation.isPending}
                        >
                          <UserX className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
