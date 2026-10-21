import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Alert } from '../components/common/Alert';
import { Shield, Lock, ShieldCheck, Key } from 'lucide-react';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: 'admin@spotizan.com',
    password: 'Admin@Spotizan123!',
  });

  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const user = await login(formData.email, formData.password);
      if (user.role !== 'ADMIN') {
        setError('Access Denied: You do not possess platform administrator privileges.');
        return;
      }
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid administrator credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8 bg-white text-[#27243A]">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-[#7960D8] text-white flex items-center justify-center mx-auto shadow-md">
            <Shield className="w-7 h-7" />
          </div>
          <Badge variant="adult">ADMIN SECURITY GATEWAY</Badge>
          <h2 className="text-2xl font-black text-[#27243A] tracking-tight">Staff Moderation Console</h2>
          <p className="text-xs text-[#777387]">
            Authorized administrative personnel only. All access attempts are recorded in tamper-evident audit logs.
          </p>
        </div>

        <Card className="border border-[#E8E4F0] bg-white shadow-card p-6 space-y-5">
          {error && (
            <Alert type="error" title="Access Denied">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#27243A] mb-1.5">
                Staff Email Address
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E8E4F0] text-[#27243A] text-xs focus:outline-none focus:border-[#7960D8]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#27243A] mb-1.5">
                Master Password
              </label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, password: e.target.value }))
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E8E4F0] text-[#27243A] text-xs focus:outline-none focus:border-[#7960D8]"
              />
            </div>

            <div className="p-3 rounded-xl bg-[#F1EDFF] border border-[#B9A7F5]/50 text-xs text-[#7960D8] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 text-[#7960D8]" />
              <span className="font-medium text-[11px]">HTTP-Only cookie session authentication with RBAC enforcement</span>
            </div>

            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              className="w-full py-2.5 font-bold shadow-tomato bg-[#FF6347] hover:bg-[#FF6347]/90 text-white"
              icon={Key}
            >
              Authenticate as Administrator
            </Button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-[#E8E4F0]"></div>
              <span className="flex-shrink mx-3 text-[11px] text-[#777387] uppercase font-semibold">Demo Quick Access</span>
              <div className="flex-grow border-t border-[#E8E4F0]"></div>
            </div>

            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={async () => {
                setFormData({ email: 'admin@spotizan.com', password: 'Admin@Spotizan123!' });
                setIsLoading(true);
                setError(null);
                try {
                  const user = await login('admin@spotizan.com', 'Admin@Spotizan123!');
                  if (user.role !== 'ADMIN') {
                    setError('Access Denied: You do not possess platform administrator privileges.');
                    return;
                  }
                  navigate('/admin/dashboard');
                } catch (err) {
                  setError(err.message || 'Demo admin credentials failed to authenticate.');
                } finally {
                  setIsLoading(false);
                }
              }}
              className="w-full py-2.5 font-bold border-[#7960D8] text-[#7960D8] hover:bg-[#F1EDFF]"
              icon={ShieldCheck}
            >
              1-Click Instant Demo Admin Login
            </Button>
          </form>
        </Card>

        <div className="text-center">
          <Link
            to="/"
            className="text-xs text-[#7960D8] hover:underline font-semibold inline-flex items-center gap-1.5"
          >
            ← Return to Spotizan Main Site
          </Link>
        </div>
      </div>
    </div>
  );
}
