import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import LandingPage from './src/pages/LandingPage';
import Login from './src/pages/Login';
import Pricing from './src/pages/Pricing';
import Dashboard from './src/pages/Dashboard';
import AdminDashboard from './src/pages/Admin';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0A0A0A]">
        <div className="w-8 h-8 rounded-full border-4 border-t-blue-500 border-gray-200 dark:border-[#222] animate-spin" />
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Login />} />
          <Route path="/planos" element={<Pricing />} />

          {/* Rota Privada: Admin */}
          <Route
            path="/admin"
            element={<AdminDashboard />}
          />

          {/* Rotas Privadas */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
