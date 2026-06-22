import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import CreateSecretPage from "./pages/CreateSecretPage";
import ViewSecretPage from "./pages/ViewSecretPage";
import EditSecretPage from "./pages/EditSecretPage";
import AdminPage from "./pages/AdminPage";
import MfaSetupPage from "./pages/MfaSetupPage";
import VaultLockBanner from "./components/VaultLockBanner";

// Protected Route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <VaultLockBanner />
      {children}
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/mfa"
            element={
              <ProtectedRoute>
                <MfaSetupPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/vault/create"
            element={
              <ProtectedRoute>
                <CreateSecretPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/vault/view/:id"
            element={
              <ProtectedRoute>
                <ViewSecretPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/vault/edit/:id"
            element={
              <ProtectedRoute>
                <EditSecretPage />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
