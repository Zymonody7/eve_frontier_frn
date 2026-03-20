import { lazy, Suspense } from "react";
import { Navigate, Outlet, Route, Routes, useParams } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { appRoutes, dashboardRequestDetailPath } from "./routes";

const LandingPage = lazy(() =>
  import("../pages/LandingPage").then((module) => ({ default: module.LandingPage }))
);
const DashboardOverviewPage = lazy(() =>
  import("../pages/DashboardOverviewPage").then((module) => ({
    default: module.DashboardOverviewPage
  }))
);
const MePage = lazy(() =>
  import("../pages/MePage").then((module) => ({ default: module.MePage }))
);
const NewRequestPage = lazy(() =>
  import("../pages/NewRequestPage").then((module) => ({ default: module.NewRequestPage }))
);
const NotFoundPage = lazy(() =>
  import("../pages/NotFoundPage").then((module) => ({ default: module.NotFoundPage }))
);
const RequestDetailPage = lazy(() =>
  import("../pages/RequestDetailPage").then((module) => ({
    default: module.RequestDetailPage
  }))
);
const RequestsPage = lazy(() =>
  import("../pages/RequestsPage").then((module) => ({ default: module.RequestsPage }))
);

function DashboardLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function LegacyRequestDetailRedirect() {
  const { requestId = "" } = useParams();

  return <Navigate replace to={dashboardRequestDetailPath(requestId)} />;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<section className="panel">Loading page...</section>}>
      <Routes>
        <Route path={appRoutes.landing} element={<LandingPage />} />
        <Route path={appRoutes.dashboard} element={<DashboardLayout />}>
          <Route index element={<DashboardOverviewPage />} />
          <Route path="requests" element={<RequestsPage />} />
          <Route path="requests/new" element={<NewRequestPage />} />
          <Route path="requests/:requestId" element={<RequestDetailPage />} />
          <Route path="me" element={<MePage />} />
        </Route>
        <Route path="/requests" element={<Navigate replace to={appRoutes.dashboardRequests} />} />
        <Route
          path="/requests/new"
          element={<Navigate replace to={appRoutes.dashboardNewRequest} />}
        />
        <Route path="/requests/:requestId" element={<LegacyRequestDetailRedirect />} />
        <Route path="/me" element={<Navigate replace to={appRoutes.dashboardMe} />} />
        <Route path="/home" element={<Navigate replace to={appRoutes.dashboard} />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
