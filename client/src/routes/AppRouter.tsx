import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import SignupPage from "../pages/SignupPage.tsx";
import Dashboard from "../pages/Dashboard.tsx";
import StudentDashboardLayout from "../pages/student/StudentDashboardLayout";
import StudentOverviewPage from "../pages/student/StudentOverviewPage";
import StudentExamsPage from "../pages/student/StudentExamsPage";
import StudentResultsPage from "../pages/student/StudentResultsPage";
import StudentProfileFaceIdPage from "../pages/student/StudentProfileFaceIdPage";
import StudentSettingsPage from "../pages/student/StudentSettingsPage";
import LecturerDashboardLayout from "../pages/lecturer/LecturerDashboardLayout";
import LecturerOverviewPage from "../pages/lecturer/LecturerOverviewPage";
import LecturerCreateExamPage from "../pages/lecturer/LecturerCreateExamPage";
import LecturerMyExamsPage from "../pages/lecturer/LecturerMyExamsPage";
import LecturerLiveMonitoringPage from "../pages/lecturer/LecturerLiveMonitoringPage";
import LecturerReportsPage from "../pages/lecturer/LecturerReportsPage";
import LecturerStudentsPage from "../pages/lecturer/LecturerStudentsPage";
import AdminDashboardLayout from "../pages/admin/AdminDashboardLayout";
import AdminOverviewPage from "../pages/admin/AdminOverviewPage";
import AdminUsersPage from "../pages/admin/AdminUsersPage";
import AdminInstitutionsPage from "../pages/admin/AdminInstitutionsPage";
import AdminSystemLogsPage from "../pages/admin/AdminSystemLogsPage";
import AdminAnalyticsPage from "../pages/admin/AdminAnalyticsPage";
import AdminSettingsPage from "../pages/admin/AdminSettingsPage";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/admin" element={<AdminDashboardLayout />}>
          <Route index element={<AdminOverviewPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="institutions" element={<AdminInstitutionsPage />} />
          <Route path="system-logs" element={<AdminSystemLogsPage />} />
          <Route path="analytics" element={<AdminAnalyticsPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>
        <Route path="/dashboard/student" element={<StudentDashboardLayout />}>
          <Route index element={<StudentOverviewPage />} />
          <Route path="exams" element={<StudentExamsPage />} />
          <Route path="results" element={<StudentResultsPage />} />
          <Route path="profile" element={<StudentProfileFaceIdPage />} />
          <Route path="settings" element={<StudentSettingsPage />} />
        </Route>
        <Route path="/dashboard/lecturer" element={<LecturerDashboardLayout />}>
          <Route index element={<LecturerOverviewPage />} />
          <Route path="create-exam" element={<LecturerCreateExamPage />} />
          <Route path="my-exams" element={<LecturerMyExamsPage />} />
          <Route path="live-monitoring" element={<LecturerLiveMonitoringPage />} />
          <Route path="reports" element={<LecturerReportsPage />} />
          <Route path="students" element={<LecturerStudentsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
