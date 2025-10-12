"use client";

import { DataTable } from "@/components/common/data-table/data-table";
import { DataTableActionBar } from "@/components/common/data-table/data-table-action-bar";
import { DataTableAdvancedToolbar } from "@/components/common/data-table/data-table-advanced-toolbar";
import { DataTableFilterList } from "@/components/common/data-table/data-table-filter-list";
import { DataTableSortList } from "@/components/common/data-table/data-table-sort-list";
import { organizationColumns } from "@/components/common/organizations/organization-columns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDataTable } from "@/hooks/use-data-table";
import {
  Organization,
  OrganizationFilters,
  organizationsService,
} from "@/lib/services/organizationsService";
import {
  AlertCircle,
  Building2,
  CreditCard,
  Download,
  Plus,
  RefreshCw,
  Users,
} from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// Custom action bar for selected organizations
function OrganizationActionBar({ table }: { table: any }) {
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedOrganizations = selectedRows.map((row: any) => row.original);

  const handleBulkStatusUpdate = async (status: string) => {
    try {
      const ids = selectedOrganizations.map((org: Organization) => org.id);
      await organizationsService.bulkUpdateStatus(ids, status as any);
      toast.success(`Updated status for ${ids.length} organizations`);
      // Refresh table data
      window.location.reload();
    } catch (error) {
      toast.error("Failed to update organization status");
    }
  };

  const handleBulkDelete = async () => {
    if (
      !confirm("Are you sure you want to delete the selected organizations?")
    ) {
      return;
    }

    try {
      const ids = selectedOrganizations.map((org: Organization) => org.id);
      await organizationsService.bulkDeleteOrganizations(ids);
      toast.success(`Deleted ${ids.length} organizations`);
      // Refresh table data
      window.location.reload();
    } catch (error) {
      toast.error("Failed to delete organizations");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleBulkStatusUpdate("active")}
      >
        Mark Active
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleBulkStatusUpdate("suspended")}
      >
        Suspend
      </Button>
      <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
        Delete Selected
      </Button>
    </div>
  );
}

// Stats cards component
function OrganizationStats({ stats }: { stats: any }) {
  const statCards = [
    {
      title: "Total Organizations",
      value: stats?.total || 0,
      icon: Building2,
      color: "text-blue-600",
    },
    {
      title: "Active Organizations",
      value: stats?.active || 0,
      icon: Users,
      color: "text-green-600",
    },
    {
      title: "With Active Subscription",
      value: stats?.with_active_subscription || 0,
      icon: CreditCard,
      color: "text-purple-600",
    },
    {
      title: "Pending Approval",
      value: stats?.pending || 0,
      icon: AlertCircle,
      color: "text-yellow-600",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function OrganizationsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const status = params?.status as string;

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [stats, setStats] = useState<any>(null);

  // Extract search params for filtering
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const search = searchParams.get("search") || "";
  const sortBy = searchParams.get("sort_by") || "created_at";
  const sortOrder = (searchParams.get("sort_order") || "desc") as
    | "asc"
    | "desc";

  const { table } = useDataTable({
    data: organizations,
    columns: organizationColumns,
    pageCount,
    initialState: {
      pagination: { pageIndex: page - 1, pageSize: limit },
      sorting: [{ id: sortBy, desc: sortOrder === "desc" }],
    },
    getRowId: row => row.id.toString(),
  });

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: OrganizationFilters = {
        page,
        limit,
        search: search || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      };

      // Add status filter if not "all"
      if (status && status !== "all") {
        filters.status = status;
      }

      const response = await organizationsService.getOrganizations(filters);

      if (response.success) {
        setOrganizations(response.data.organizations);
        setPageCount(response.data.total_pages);
      } else {
        setError("Failed to fetch organizations");
      }
    } catch (err) {
      setError("An error occurred while fetching organizations");
      console.error("Error fetching organizations:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await organizationsService.getOrganizationStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  useEffect(() => {
    fetchOrganizations();
    fetchStats();
  }, [status, page, limit, search, sortBy, sortOrder]);

  const handleExport = async (format: "csv" | "xlsx" = "csv") => {
    try {
      const filters: OrganizationFilters = {
        search: search || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      };

      if (status && status !== "all") {
        filters.status = status;
      }

      const blob = await organizationsService.exportOrganizations(
        filters,
        format
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `organizations-${status}-${new Date().toISOString().split("T")[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Organizations exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error("Failed to export organizations");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      all: { label: "All Organizations", variant: "secondary" as const },
      active: { label: "Active", variant: "default" as const },
      pending: { label: "Pending Approval", variant: "secondary" as const },
      suspended: { label: "Suspended", variant: "destructive" as const },
      inactive: { label: "Inactive", variant: "outline" as const },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.all;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading && organizations.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
          <div className="flex items-center gap-2 mt-2">
            <p className="text-muted-foreground">
              Manage and monitor organization accounts
            </p>
            {getStatusBadge(status)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("csv")}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Organization
          </Button>
        </div>
      </div>

      {/* Stats */}
      <OrganizationStats stats={stats} />

      {/* Error State */}
      {error && (
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={fetchOrganizations}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      {!error && (
        <Card>
          <CardHeader>
            <CardTitle>Organizations</CardTitle>
            <CardDescription>
              {loading
                ? "Loading..."
                : `${organizations.length} organizations found`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              table={table}
              actionBar={
                <DataTableActionBar table={table}>
                  <OrganizationActionBar table={table} />
                </DataTableActionBar>
              }
            >
              <DataTableAdvancedToolbar table={table}>
                <DataTableFilterList table={table} />
                <DataTableSortList table={table} />
              </DataTableAdvancedToolbar>
            </DataTable>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
