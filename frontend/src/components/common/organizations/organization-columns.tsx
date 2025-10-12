"use client";

import { DataTableColumnHeader } from "@/components/common/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Organization } from "@/lib/services/organizationsService";
import { ColumnDef } from "@tanstack/react-table";
import { formatDistanceToNow } from "date-fns";
import {
  Building2,
  CalendarDays,
  Mail,
  MoreHorizontal,
  Phone,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800 hover:bg-green-100";
    case "pending":
      return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
    case "suspended":
      return "bg-red-100 text-red-800 hover:bg-red-100";
    case "inactive":
      return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-100";
  }
};

const getSubscriptionStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800 hover:bg-green-100";
    case "expired":
      return "bg-red-100 text-red-800 hover:bg-red-100";
    case "pending_verification":
      return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
    case "none":
      return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-100";
  }
};

export const organizationColumns: ColumnDef<Organization>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={value => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "organization_name",
    accessorKey: "organization_name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Organization" />
    ),
    cell: ({ row }) => {
      const organization = row.original;
      return (
        <div className="flex items-center space-x-2">
          {organization.logo_url ? (
            <Image
              src={organization.logo_url}
              alt={organization.organization_name}
              width={32}
              height={32}
              className="rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
              <Building2 className="h-4 w-4" />
            </div>
          )}
          <div className="flex flex-col">
            <Link
              href={`/super-admin/organizations/${organization.id}`}
              className="font-medium hover:underline"
            >
              {organization.organization_name}
            </Link>
            <span className="text-sm text-muted-foreground">
              {organization.organization_type}
            </span>
          </div>
        </div>
      );
    },
    meta: {
      label: "Organization",
      placeholder: "Search organizations...",
      variant: "text",
      icon: Building2,
    },
    enableColumnFilter: true,
  },
  {
    id: "status",
    accessorKey: "status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <Badge variant="secondary" className={getStatusColor(status)}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      );
    },
    meta: {
      label: "Status",
      variant: "select",
      options: [
        { label: "Active", value: "active", count: 0 },
        { label: "Pending", value: "pending", count: 0 },
        { label: "Suspended", value: "suspended", count: 0 },
        { label: "Inactive", value: "inactive", count: 0 },
      ],
    },
    enableColumnFilter: true,
  },
  {
    id: "subscription_status",
    accessorKey: "subscription_status",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Subscription" />
    ),
    cell: ({ row }) => {
      const status = row.getValue("subscription_status") as string;
      const endDate = row.original.subscription_end_date;

      return (
        <div className="flex flex-col space-y-1">
          <Badge
            variant="secondary"
            className={getSubscriptionStatusColor(status)}
          >
            {status === "pending_verification"
              ? "Pending"
              : status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
          {endDate && (
            <span className="text-xs text-muted-foreground">
              Until {new Date(endDate).toLocaleDateString()}
            </span>
          )}
        </div>
      );
    },
    meta: {
      label: "Subscription Status",
      variant: "select",
      options: [
        { label: "Active", value: "active", count: 0 },
        { label: "Expired", value: "expired", count: 0 },
        {
          label: "Pending Verification",
          value: "pending_verification",
          count: 0,
        },
        { label: "None", value: "none", count: 0 },
      ],
    },
    enableColumnFilter: true,
  },
  {
    id: "contact_email",
    accessorKey: "contact_email",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Contact" />
    ),
    cell: ({ row }) => {
      const organization = row.original;
      return (
        <div className="flex flex-col space-y-1">
          <div className="flex items-center space-x-2">
            <Mail className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm">{organization.contact_email}</span>
          </div>
          {organization.contact_phone && (
            <div className="flex items-center space-x-2">
              <Phone className="h-3 w-3 text-muted-foreground" />
              <span className="text-sm">{organization.contact_phone}</span>
            </div>
          )}
        </div>
      );
    },
    meta: {
      label: "Contact Email",
      placeholder: "Search by email...",
      variant: "text",
      icon: Mail,
    },
    enableColumnFilter: true,
  },
  {
    id: "admin_user",
    accessorFn: row =>
      row.admin_user
        ? `${row.admin_user.first_name} ${row.admin_user.last_name}`
        : "No Admin",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Admin" />
    ),
    cell: ({ row }) => {
      const admin = row.original.admin_user;
      if (!admin) {
        return <span className="text-muted-foreground">No Admin</span>;
      }
      return (
        <div className="flex flex-col">
          <span className="font-medium">
            {admin.first_name} {admin.last_name}
          </span>
          <span className="text-sm text-muted-foreground">{admin.email}</span>
        </div>
      );
    },
    meta: {
      label: "Admin User",
      placeholder: "Search admin...",
      variant: "text",
      icon: Users,
    },
    enableColumnFilter: true,
  },
  {
    id: "member_count",
    accessorKey: "member_count",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Members" />
    ),
    cell: ({ row }) => {
      const count = row.getValue("member_count") as number;
      return (
        <div className="flex items-center space-x-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>{count || 0}</span>
        </div>
      );
    },
    meta: {
      label: "Member Count",
      variant: "number",
      icon: Users,
    },
    enableColumnFilter: true,
  },
  {
    id: "created_at",
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Created" />
    ),
    cell: ({ row }) => {
      const date = row.getValue("created_at") as string;
      return (
        <div className="flex items-center space-x-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {formatDistanceToNow(new Date(date), { addSuffix: true })}
          </span>
        </div>
      );
    },
    meta: {
      label: "Created Date",
      variant: "date",
      icon: CalendarDays,
    },
    enableColumnFilter: true,
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const organization = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() =>
                navigator.clipboard.writeText(organization.id.toString())
              }
            >
              Copy organization ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/super-admin/organizations/${organization.id}`}>
                View details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/super-admin/organizations/${organization.id}/edit`}>
                Edit organization
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                // Handle status update
                console.log("Update status for", organization.id);
              }}
            >
              Update status
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                // Handle delete
                console.log("Delete organization", organization.id);
              }}
            >
              Delete organization
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
