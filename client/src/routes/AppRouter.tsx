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

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/lecturer" element={<Dashboard />} />
        <Route path="/dashboard/admin" element={<Dashboard />} />
        <Route path="/dashboard/student" element={<StudentDashboardLayout />}>
          <Route index element={<StudentOverviewPage />} />
          <Route path="exams" element={<StudentExamsPage />} />
          <Route path="results" element={<StudentResultsPage />} />
          <Route path="profile" element={<StudentProfileFaceIdPage />} />
          <Route path="settings" element={<StudentSettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
