import { Navigate, Route, Routes } from "react-router-dom";

import Layout from "./Layout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import ConferencesPage from "./pages/ConferencesPage";
import SessionsPage from "./pages/SessionsPage";
import RegistrationPage from "./pages/RegistrationPage";
import { SubmissionsPage } from "./pages/SubmissionsPage";
import OrganizerSubmissionPage from "./pages/OrganizerSubmissionPage";
import { ReviewsPage } from "./pages/ReviewsPage";
import SponsorsPage from "./pages/SponsorsPage";
import ExhibitorsPage from "./pages/ExhibitorsPage";
import ForecastPage from "./pages/ForecastPage";
import AnnouncementsPage from "./pages/AnnouncementsPage";
import CertificatesPage from "./pages/CertificatesPage";
import { SearchPage } from "./pages/SearchBar";
import FeedbackPage from "./pages/FeedbackPage";
import RoomUtilizationPage from "./pages/RoomUtilizationPage";
import ReviewerWorkloadPage from "./pages/ReviewerWorkloadPage";
import PaymentsPage from "./pages/PaymentsPage";
import AttendancePage from "./pages/AttendancePage";
import BottleneckPage from "./pages/BottleneckPage.tsx";
import CertificateVerificationPage from "./pages/CertificateVerificationPage";
import ProfilePage from "./pages/ProfilePage";
import { type AppRole, roleHome, routeRoles } from "./access";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return localStorage.getItem("token") ? children : <Navigate replace to="/login" />;
}

function RoleRoute({ path, children }: { path: string; children: React.ReactNode }) {
  const role = localStorage.getItem("role");
  const allowedRoles = routeRoles[path];
  return allowedRoles?.includes(role as AppRole)
    ? children
    : <Navigate replace to={roleHome(role)} />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/certificates/verify" element={<CertificateVerificationPage />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/profile" element={<RoleRoute path="/profile"><ProfilePage /></RoleRoute>} />
        <Route path="/dashboard" element={<RoleRoute path="/dashboard"><DashboardPage /></RoleRoute>} />
        <Route path="/conferences" element={<RoleRoute path="/conferences"><ConferencesPage /></RoleRoute>} />
        <Route path="/sessions" element={<RoleRoute path="/sessions"><SessionsPage /></RoleRoute>} />
        <Route path="/registrations" element={<RoleRoute path="/registrations"><RegistrationPage /></RoleRoute>} />
        <Route path="/payments" element={<RoleRoute path="/payments"><PaymentsPage /></RoleRoute>} />
        <Route path="/attendance" element={<RoleRoute path="/attendance"><AttendancePage /></RoleRoute>} />
        <Route path="/submissions" element={<RoleRoute path="/submissions"><SubmissionsPage /></RoleRoute>} />
        <Route path="/organizer/submissions" element={<RoleRoute path="/organizer/submissions"><OrganizerSubmissionPage /></RoleRoute>} />
        <Route path="/reviews" element={<RoleRoute path="/reviews"><ReviewsPage /></RoleRoute>} />
        <Route path="/sponsors" element={<RoleRoute path="/sponsors"><SponsorsPage /></RoleRoute>} />
        <Route path="/exhibitors" element={<RoleRoute path="/exhibitors"><ExhibitorsPage /></RoleRoute>} />
        <Route path="/forecast" element={<RoleRoute path="/forecast"><ForecastPage /></RoleRoute>} />
        <Route path="/content-management" element={<RoleRoute path="/content-management"><OrganizerSubmissionPage /></RoleRoute>} />
        <Route path="/announcements" element={<RoleRoute path="/announcements"><AnnouncementsPage /></RoleRoute>} />
        <Route path="/certificates" element={<RoleRoute path="/certificates"><CertificatesPage /></RoleRoute>} />
        <Route path="/search" element={<RoleRoute path="/search"><SearchPage /></RoleRoute>} />
        <Route path="/feedback" element={<RoleRoute path="/feedback"><FeedbackPage /></RoleRoute>} />
        <Route path="/rooms" element={<RoleRoute path="/rooms"><RoomUtilizationPage /></RoleRoute>} />
        <Route path="/reviewer-workload" element={<RoleRoute path="/reviewer-workload"><ReviewerWorkloadPage /></RoleRoute>} />
        <Route path="/bottlenecks" element={<RoleRoute path="/bottlenecks"><BottleneckPage /></RoleRoute>} />
      </Route>

      <Route path="/" element={<Navigate replace to={localStorage.getItem("token") ? roleHome(localStorage.getItem("role")) : "/login"} />} />
      <Route path="*" element={<Navigate replace to={localStorage.getItem("token") ? roleHome(localStorage.getItem("role")) : "/login"} />} />
    </Routes>
  );
}
