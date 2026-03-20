export const appRoutes = {
  landing: "/",
  dashboard: "/dashboard",
  dashboardRequests: "/dashboard/requests",
  dashboardNewRequest: "/dashboard/requests/new",
  dashboardMe: "/dashboard/me"
} as const;

export function dashboardRequestDetailPath(requestId: string) {
  return `${appRoutes.dashboardRequests}/${requestId}`;
}
