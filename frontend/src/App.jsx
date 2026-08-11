import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from 'sonner';

import ProtectedRoute from './components/common/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';

// Student Portal Pages
import Dashboard from './pages/Dashboard';
import UploadResume from './pages/UploadResume';
import SkillAnalysis from './pages/SkillAnalysis';
import JobListings from './pages/JobListings';
import DSATracker from './pages/DSATracker';
import JobNews from './pages/JobNews';
import CareerTest from './pages/CareerTest';
import CareerResults from './pages/CareerResults';
import ProfilePage from './pages/ProfilePage';

// Recruiter Portal Pages
import RecruiterDashboard from './pages/recruiter/Dashboard';
import JobsManagement from './pages/recruiter/JobsManagement';
import CandidateSearch from './pages/recruiter/CandidateSearch';

// Admin Portal Pages
import AdminDashboard from './pages/admin/Dashboard';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Toaster richColors position="top-right" />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />

            {/* Student Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/upload-resume"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <UploadResume />
                </ProtectedRoute>
              }
            />
            <Route
              path="/skill-analysis"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <SkillAnalysis />
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <JobListings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dsa-tracker"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <DSATracker />
                </ProtectedRoute>
              }
            />
            <Route
              path="/news"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <JobNews />
                </ProtectedRoute>
              }
            />
            <Route
              path="/career-test"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <CareerTest />
                </ProtectedRoute>
              }
            />
            <Route
              path="/career-results"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <CareerResults />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />

            {/* Recruiter Protected Routes */}
            <Route
              path="/recruiter/dashboard"
              element={
                <ProtectedRoute allowedRoles={['recruiter']}>
                  <RecruiterDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/recruiter/jobs"
              element={
                <ProtectedRoute allowedRoles={['recruiter']}>
                  <JobsManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/recruiter/jobs/:jobId/candidates"
              element={
                <ProtectedRoute allowedRoles={['recruiter']}>
                  <CandidateSearch />
                </ProtectedRoute>
              }
            />

            {/* Admin Protected Routes */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Fallback Route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
