"use client";

import {
    Edit,
    Key,
    MoreVertical,
    Search,
    Trash2,
    UserCheck,
    UserX,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, type SelectOption } from "@/components/ui/select";
import type { AdminUser } from "@/lib/api/admin-users";

interface UserTableProps {
  users: AdminUser[];
  currentUserId: string;
  onEdit: (user: AdminUser) => void;
  onResetPassword: (user: AdminUser) => void;
  onDeactivate: (user: AdminUser) => void;
  onReactivate: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
}

const roleOptions: SelectOption[] = [
  { value: "all", label: "All Roles" },
  { value: "admin", label: "Admin" },
  { value: "user", label: "User" },
];

const statusOptions: SelectOption[] = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export function UserTable({
  users,
  currentUserId,
  onEdit,
  onResetPassword,
  onDeactivate,
  onReactivate,
  onDelete,
}: UserTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        !query ||
        user.full_name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query);
      const matchesRole =
        roleFilter === "all" || user.role === roleFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && user.is_active) ||
        (statusFilter === "inactive" && !user.is_active);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  function formatUserType(user: AdminUser): string {
    if (user.role === "admin") return "\u2014";
    if (user.user_type === "trainer") return "Trainer";
    if (user.user_type === "agent") return "Agent";
    return "\u2014";
  }

  function toggleMenu(userId: string) {
    setOpenMenuId((prev) => (prev === userId ? null : userId));
  }

  return (
    <div className="space-y-4">
      {/* Search and filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email..."
            aria-label="Search users by name or email"
            className="w-full rounded-lg border border-border bg-card py-2 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="flex gap-2">
          <Select
            value={roleFilter}
            onChange={setRoleFilter}
            options={roleOptions}
            ariaLabel="Filter by role"
            size="sm"
            className="w-36"
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={statusOptions}
            ariaLabel="Filter by status"
            size="sm"
            className="w-40"
          />
        </div>
      </div>

      {/* Table */}
      {filteredUsers.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No users match the current filters
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Full Name
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Email
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Role
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  User Type
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Created
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-border last:border-b-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-3 font-medium text-foreground">
                    {user.full_name}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {user.email}
                  </td>
                  <td className="px-4 py-3 capitalize text-foreground">
                    {user.role}
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {formatUserType(user)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={user.is_active ? "success" : "destructive"}>
                      {user.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="relative px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Actions for ${user.full_name}`}
                      onClick={() => toggleMenu(user.id)}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                    {openMenuId === user.id && (
                      <div
                        ref={menuRef}
                        className="absolute right-4 top-full z-50 mt-1 w-48 rounded-lg border border-border bg-card py-1 shadow-lg"
                        onMouseLeave={() => setOpenMenuId(null)}
                      >
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                          onClick={() => {
                            onEdit(user);
                            setOpenMenuId(null);
                          }}
                        >
                          <Edit className="h-4 w-4" aria-hidden="true" />
                          Edit
                        </button>
                        {user.auth_provider === "local" && (
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                            onClick={() => {
                              onResetPassword(user);
                              setOpenMenuId(null);
                            }}
                          >
                            <Key className="h-4 w-4" aria-hidden="true" />
                            Reset Password
                          </button>
                        )}
                        {user.id !== currentUserId && (
                          <>
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                              onClick={() => {
                                if (user.is_active) {
                                  onDeactivate(user);
                                } else {
                                  onReactivate(user);
                                }
                                setOpenMenuId(null);
                              }}
                            >
                              {user.is_active ? (
                                <>
                                  <UserX className="h-4 w-4" aria-hidden="true" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-4 w-4" aria-hidden="true" />
                                  Reactivate
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-destructive hover:bg-muted"
                              onClick={() => {
                                onDelete(user);
                                setOpenMenuId(null);
                              }}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
