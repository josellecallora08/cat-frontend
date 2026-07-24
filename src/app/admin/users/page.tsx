"use client";

import { useState } from "react";
import { Plus, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageContent } from "@/components/page-content";
import { PageEmpty } from "@/components/page-empty";
import { PageError } from "@/components/page-error";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/page-skeleton";
import { PasswordResetDialog } from "@/components/admin/password-reset-dialog";
import { UserCreateDialog } from "@/components/admin/user-create-dialog";
import { UserDeleteDialog } from "@/components/admin/user-delete-dialog";
import { UserEditDialog } from "@/components/admin/user-edit-dialog";
import { UserTable } from "@/components/admin/user-table";
import { useAdminUsers, useUpdateAdminUserStatus } from "@/hooks/use-admin-users";
import type { AdminUser } from "@/lib/api/admin-users";
import { useAuthStore } from "@/stores/auth-store";

export default function AdminUsersPage() {
  const { data: users, isLoading, isError, refetch } = useAdminUsers();
  const updateStatus = useUpdateAdminUserStatus();
  const currentUser = useAuthStore((s) => s.user);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  function handleEdit(user: AdminUser) {
    setSelectedUser(user);
    setEditDialogOpen(true);
  }

  function handleResetPassword(user: AdminUser) {
    setSelectedUser(user);
    setPasswordDialogOpen(true);
  }

  function handleDeactivate(user: AdminUser) {
    const confirmed = window.confirm(
      `Are you sure you want to deactivate ${user.full_name}? They will no longer be able to log in.`
    );
    if (confirmed) {
      updateStatus.mutate({ userId: user.id, data: { is_active: false } });
    }
  }

  function handleReactivate(user: AdminUser) {
    updateStatus.mutate({ userId: user.id, data: { is_active: true } });
  }

  function handleDelete(user: AdminUser) {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  }

  if (isLoading) {
    return (
      <PageContent>
        <PageSkeleton variant="list" count={6} />
      </PageContent>
    );
  }

  if (isError) {
    return (
      <PageContent>
        <PageError
          title="Failed to load users"
          message="We couldn't load the user list. Please try again."
          onRetry={refetch}
        />
      </PageContent>
    );
  }

  return (
    <PageContent>
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <span>Admin</span>
        <span className="mx-1.5">&gt;</span>
        <span className="text-foreground font-medium">Users</span>
      </nav>

      <PageHeader
        title="User Management"
        subtitle="Manage user accounts, roles, and access"
        actions={
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create User
          </Button>
        }
      />

      {users && users.length === 0 ? (
        <PageEmpty
          icon={Users}
          title="No users found"
          description="Get started by creating the first user account."
          actionLabel="Create User"
          onAction={() => setCreateDialogOpen(true)}
        />
      ) : (
        <UserTable
          users={users ?? []}
          currentUserId={currentUser?.id ?? ""}
          onEdit={handleEdit}
          onResetPassword={handleResetPassword}
          onDeactivate={handleDeactivate}
          onReactivate={handleReactivate}
          onDelete={handleDelete}
        />
      )}

      <UserCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      <UserEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        user={selectedUser}
      />

      <UserDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        user={selectedUser}
      />

      <PasswordResetDialog
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
        user={selectedUser}
      />
    </PageContent>
  );
}
