


import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { WalletProvider } from './context/WalletContext';
import { WalletModal } from './components/wallet/WalletModal';
import { AppLayout } from './components/layout/AppLayout';
import { LandingPage } from './pages/LandingPage';
import { DiscoverPage } from './pages/DiscoverPage';
import { QueuePage } from './pages/QueuePage';
import { PricingPage } from './pages/PricingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { CreatorDashboardPage } from './pages/CreatorDashboardPage';
import { CreatorProfilePage } from './pages/CreatorProfilePage';
import { ReceiveCallsPage } from './pages/ReceiveCallsPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { PremiumPage } from './pages/PremiumPage';
import { SafetyPage } from './pages/SafetyPage';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { RefundPage } from './pages/RefundPage';
import { ProfilePage } from './pages/ProfilePage';
import { EarningsPage } from './pages/EarningsPage';
import { ProtectedRoute } from './components/common/ProtectedRoute';

export function App() {
  return (
    <AuthProvider>
      <WalletProvider>
        <BrowserRouter>
          <WalletModal />
          <Routes>
          <Route element={<AppLayout />}>
            {/* Interface A: User Website */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/home" element={<DiscoverPage />} />
            <Route path="/discover" element={<DiscoverPage />} />
            <Route path="/random-call" element={<QueuePage />} />
            <Route path="/queue" element={<QueuePage />} />
            <Route path="/call/:sessionId" element={<QueuePage />} />
            <Route
              path="/receive-calls"
              element={
                <ProtectedRoute>
                  <ReceiveCallsPage />
                </ProtectedRoute>
              }
            />
            <Route path="/profile/:id" element={<CreatorProfilePage />} />
            <Route path="/creator/:id" element={<CreatorProfilePage />} />
            <Route
              path="/wallet"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/creator/apply"
              element={
                <ProtectedRoute>
                  <CreatorDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/earnings"
              element={
                <ProtectedRoute>
                  <EarningsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/creator/earnings"
              element={
                <ProtectedRoute>
                  <EarningsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/creator/settings"
              element={
                <ProtectedRoute allowedRoles={['CREATOR', 'ADMIN']}>
                  <CreatorDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/creator/dashboard"
              element={
                <ProtectedRoute allowedRoles={['CREATOR', 'ADMIN']}>
                  <CreatorDashboardPage />
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
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route path="/history" element={<Navigate to="/profile" replace />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/premium" element={<PremiumPage />} />
            <Route path="/safety" element={<SafetyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/refund" element={<RefundPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* Interface B: Dedicated Standalone Admin Moderation & Operations Console */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/console"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin-console"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/creators"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/verifications"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/live-sessions"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/calls"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/payments"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/payouts"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audit-logs"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/safety"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Catch-all redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </WalletProvider>
    </AuthProvider>
  );
}

export default App;
