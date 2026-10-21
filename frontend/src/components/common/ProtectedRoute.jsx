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
