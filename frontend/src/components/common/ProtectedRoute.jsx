import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, Lock } from 'lucide-react';
import { Button } from './Button';

export function ProtectedRoute({ children, allowedRoles, requireAdult = true }) {
  const { user, loading, isAuthenticated, isAdult } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-slate-400 text-sm animate-pulse flex items-center gap-2">
          <Lock className="w-4 h-4 text-indigo-400" />
          <span>Verifying security credentials...</span>
        </div>
      </div>
    );
  }

  const isAdminRoute = allowedRoles && allowedRoles.includes('ADMIN');

  // If unauthenticated: redirect admin routes to /admin/login, customer routes to /login
  if (!isAuthenticated) {
    if (isAdminRoute) {
      return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Statutory 18+ verification check (except admin)
  if (requireAdult && !isAdult && user?.role !== 'ADMIN') {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md bg-rose-950/40 border border-rose-800/80 rounded-2xl p-6 text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-rose-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">Age Verification Required</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Spotizan is strictly 18+. You must complete the statutory age eligibility verification before accessing this feature.
          </p>
          <Button variant="danger" size="sm" onClick={() => window.location.reload()}>
            Re-verify Age
          </Button>
        </div>
      </div>
    );
  }

  // Strict Role check: Admin console is strictly accessible ONLY to users with ADMIN role
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (isAdminRoute) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#F8F7FC] text-[#27243A]">
          <div className="max-w-md w-full bg-white border border-[#E8E4F0] rounded-3xl p-8 text-center space-y-5 shadow-xl">
            <div className="w-14 h-14 rounded-2xl bg-[#D92D20] text-white flex items-center justify-center mx-auto shadow-md">
              <Lock className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-black text-[#27243A]">Administrator Access Only</h3>
              <p className="text-xs text-[#777387] mt-1.5 leading-relaxed">
                The Spotizan Moderation Console and Financial Settlement pipeline is restricted strictly to platform administrators. Your current account (<strong className="text-[#27243A]">{user?.displayName}</strong>, role: <strong className="text-[#7960D8]">{user?.role}</strong>) does not have administrator privileges.
              </p>
            </div>
            <div className="pt-2 space-y-2.5">
              <a href="/admin/login" className="block w-full">
                <Button variant="primary" className="w-full bg-[#7960D8] hover:bg-[#684fc9] text-white font-bold py-2.5 shadow-md">
                  Sign in with Administrator Account
                </Button>
              </a>
              <a href="/" className="block w-full">
                <Button variant="outline" className="w-full border-[#E8E4F0] text-xs">
                  Return to Main Website
                </Button>
              </a>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4">
          <Lock className="w-12 h-12 text-amber-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">Access Restricted</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your role (<span className="text-indigo-400 font-semibold">{user.role}</span>) does not have authorization to view this section.
          </p>
        </div>
      </div>
    );
  }

  return children;
}
