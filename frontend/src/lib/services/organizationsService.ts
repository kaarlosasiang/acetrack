import createAPIService from "./apiClient";

const apiClient = createAPIService();

export interface Organization {
  id: number;
  organization_name: string;
  organization_type: string;
  contact_email: string;
  contact_phone?: string;
  address?: string;
  website?: string;
  description?: string;
  logo_url?: string;
  status: "active" | "pending" | "suspended" | "inactive";
  subscription_status: "active" | "expired" | "pending_verification" | "none";
  subscription_end_date?: string;
  created_at: string;
  updated_at: string;
  member_count?: number;
  admin_user?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface OrganizationFilters {
  search?: string;
  status?: string;
  organization_type?: string;
  subscription_status?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface OrganizationResponse {
  success: boolean;
  data: {
    organizations: Organization[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
  message?: string;
}

export interface OrganizationDetailResponse {
  success: boolean;
  data: Organization;
  message?: string;
}

export interface UpdateOrganizationData {
  status?: "active" | "pending" | "suspended" | "inactive";
  organization_name?: string;
  organization_type?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  website?: string;
  description?: string;
}

class OrganizationsService {
  /**
   * Get all organizations with optional filters
   */
  async getOrganizations(
    filters: OrganizationFilters = {}
  ): Promise<OrganizationResponse> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.append(key, value.toString());
      }
    });

    const queryString = params.toString();
    const url = queryString
      ? `/api/admin/organizations?${queryString}`
      : "/api/admin/organizations";

    const response = await apiClient.get(url);
    return response.data;
  }

  /**
   * Get organizations by status
   */
  async getOrganizationsByStatus(
    status: string,
    filters: Omit<OrganizationFilters, "status"> = {}
  ): Promise<OrganizationResponse> {
    return this.getOrganizations({ ...filters, status });
  }

  /**
   * Get a specific organization by ID
   */
  async getOrganizationById(id: number): Promise<OrganizationDetailResponse> {
    const response = await apiClient.get(`/api/admin/organizations/${id}`);
    return response.data;
  }

  /**
   * Update organization details
   */
  async updateOrganization(
    id: number,
    data: UpdateOrganizationData
  ): Promise<OrganizationDetailResponse> {
    const response = await apiClient.put(
      data,
      `/api/admin/organizations/${id}`
    );
    return response.data;
  }

  /**
   * Update organization status using specific activation/deactivation endpoints
   */
  async updateOrganizationStatus(
    id: number,
    status: "active" | "inactive"
  ): Promise<{ success: boolean; message: string }> {
    const endpoint =
      status === "active"
        ? `/api/admin/organizations/${id}/activate`
        : `/api/admin/organizations/${id}/deactivate`;

    const response = await apiClient.post({}, endpoint);
    return response.data;
  }

  /**
   * Activate organization
   */
  async activateOrganization(
    id: number
  ): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(
      {},
      `/api/admin/organizations/${id}/activate`
    );
    return response.data;
  }

  /**
   * Deactivate organization
   */
  async deactivateOrganization(
    id: number
  ): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(
      {},
      `/api/admin/organizations/${id}/deactivate`
    );
    return response.data;
  }

  /**
   * Bulk update organization status (manual implementation since backend doesn't have bulk endpoint)
   */
  async bulkUpdateStatus(
    organizationIds: number[],
    status: "active" | "inactive"
  ): Promise<{
    success: boolean;
    message: string;
    updated_count: number;
  }> {
    const results = await Promise.allSettled(
      organizationIds.map(id => this.updateOrganizationStatus(id, status))
    );

    const successful = results.filter(
      result => result.status === "fulfilled"
    ).length;

    return {
      success: successful > 0,
      message: `Updated ${successful} out of ${organizationIds.length} organizations`,
      updated_count: successful,
    };
  }

  /**
   * Delete organization (uses RESTful DELETE endpoint)
   */
  async deleteOrganization(
    id: number
  ): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.remove(`/api/admin/organizations/${id}`);
    return response.data;
  }

  /**
   * Bulk delete organizations (manual implementation since backend doesn't have bulk endpoint)
   */
  async bulkDeleteOrganizations(organizationIds: number[]): Promise<{
    success: boolean;
    message: string;
    deleted_count: number;
  }> {
    const results = await Promise.allSettled(
      organizationIds.map(id => this.deleteOrganization(id))
    );

    const successful = results.filter(
      result => result.status === "fulfilled"
    ).length;

    return {
      success: successful > 0,
      message: `Deleted ${successful} out of ${organizationIds.length} organizations`,
      deleted_count: successful,
    };
  }

  /**
   * Get organization statistics
   */
  async getOrganizationStats(): Promise<{
    success: boolean;
    data: {
      total: number;
      active: number;
      pending: number;
      suspended: number;
      inactive: number;
      with_active_subscription: number;
      with_expired_subscription: number;
      growth_rate: number;
    };
  }> {
    const response = await apiClient.get("/api/admin/stats/organizations");
    return response.data;
  }

  /**
   * Export organizations data
   */
  async exportOrganizations(
    filters: OrganizationFilters = {},
    format: "csv" | "xlsx" = "csv"
  ): Promise<Blob> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.append(key, value.toString());
      }
    });

    params.append("format", format);

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/organizations/export?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Export failed");
    }

    return response.blob();
  }
}

export const organizationsService = new OrganizationsService();
