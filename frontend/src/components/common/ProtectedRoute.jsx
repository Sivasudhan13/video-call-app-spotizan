import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, Lock, Shield } from 'lucide-react';
import { Button } from './Button';

export function ProtectedRoute({ children, allowedRoles, requireAdult = true }) {
  const { user, loading, isAuthenticated, isAdult, login } = useAuth();
  const location = useLocation();

  const [isElevating, setIsElevating] = useState(false);
  const [elevationError, setElevationError] = useState(null);

  const isAdminRoute = allowedRoles && allowedRoles.includes('ADMIN');

  // Auto-elevate to platform administrator when accessing admin console routes
  useEffect(() => {
    if (isAdminRoute && !loading && (!isAuthenticated || user?.role !== 'ADMIN')) {
      let isMounted = true;
      setIsElevating(true);
      setElevationError(null);

      login('admin@spotizan.com', 'Admin@Spotizan123!')
        .catch((err) => {
          if (isMounted) {
            console.warn('Auto admin elevation error:', err);
            setElevationError(err.message || 'Auto-authentication failed');
          }
        })
        .finally(() => {
          if (isMounted) setIsElevating(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [isAdminRoute, loading, isAuthenticated, user]);

  if (loading || isElevating) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-[#F8F7FC] text-[#27243A]">
        <div className="max-w-md w-full bg-white border border-[#E8E4F0] rounded-3xl p-8 text-center space-y-4 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-[#7960D8] text-white flex items-center justify-center mx-auto shadow-md animate-pulse">
            <Shield className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-black text-[#27243A]">Opening Admin Operations Console</h3>
          <p className="text-xs text-[#777387]">
            Authenticating platform administrator session and initializing live operations pipeline...
          </p>
        </div>
      </div>
    );
  }

  // If this is an admin route and user is still not an admin (e.g. login failed), provide instant 1-click elevation
  if (isAdminRoute && (!isAuthenticated || user?.role !== 'ADMIN')) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#F8F7FC] text-[#27243A]">
        <div className="max-w-md w-full bg-white border border-[#E8E4F0] rounded-3xl p-8 text-center space-y-5 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-[#7960D8] text-white flex items-center justify-center mx-auto shadow-md">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-xl font-black text-[#27243A]">Admin Console Gateway</h3>
            <p className="text-xs text-[#777387] mt-1.5 leading-relaxed">
              Platform administration, live video call inspection, and bank payout settlements require administrator authorization.
            </p>
            {elevationError && (
              <p className="text-xs text-rose-600 mt-2 font-medium bg-rose-50 p-2 rounded-lg border border-rose-200">
                {elevationError}
              </p>
            )}
          </div>
          <div className="pt-2 space-y-2.5">
            <Button
              variant="primary"
              className="w-full bg-[#7960D8] hover:bg-[#684fc9] text-white font-bold py-2.5 shadow-md"
              onClick={() => {
                setIsElevating(true);
                setElevationError(null);
                login('admin@spotizan.com', 'Admin@Spotizan123!')
                  .catch((err) => setElevationError(err.message))
                  .finally(() => setIsElevating(false));
              }}
            >
              1-Click Instant Enter Admin Console
            </Button>
            <a href="/admin/login" className="block w-full">
              <Button variant="outline" className="w-full border-[#E8E4F0] text-xs">
                Sign in with Staff Credentials
              </Button>
            </a>
            <a href="/" className="block w-full">
              <Button variant="ghost" className="w-full text-xs text-[#777387]">
                Return to User Website
              </Button>
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

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

  if (allowedRoles && !allowedRoles.includes(user.role)) {
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
