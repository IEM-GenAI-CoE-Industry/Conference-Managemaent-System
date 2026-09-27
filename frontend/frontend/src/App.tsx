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
import BottleneckPage from "./pages/BottleneckPage";
import CertificateVerificationPage from "./pages/CertificateVerificationPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return localStorage.getItem("token") ? children : <Navigate replace to="/login" />;
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
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/conferences" element={<ConferencesPage />} />
        <Route path="/sessions" element={<SessionsPage />} />
        <Route path="/registrations" element={<RegistrationPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/submissions" element={<SubmissionsPage />} />
        <Route path="/organizer/submissions" element={<OrganizerSubmissionPage />} />
        <Route path="/reviews" element={<ReviewsPage />} />
        <Route path="/sponsors" element={<SponsorsPage />} />
        <Route path="/exhibitors" element={<ExhibitorsPage />} />
        <Route path="/forecast" element={<ForecastPage />} />
        <Route path="/content-management" element={<OrganizerSubmissionPage />} />
        <Route path="/announcements" element={<AnnouncementsPage />} />
        <Route path="/certificates" element={<CertificatesPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/feedback" element={<FeedbackPage />} />
        <Route path="/rooms" element={<RoomUtilizationPage />} />
        <Route path="/reviewer-workload" element={<ReviewerWorkloadPage />} />
        <Route path="/bottlenecks" element={<BottleneckPage />} />
      </Route>

      <Route path="/" element={<Navigate replace to="/dashboard" />} />
      <Route path="*" element={<Navigate replace to="/dashboard" />} />
    </Routes>
  );
}
