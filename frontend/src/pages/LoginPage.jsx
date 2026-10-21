import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Alert } from '../components/common/Alert';
import { Lock, Mail, ShieldCheck, User, Sparkles, CheckCircle2, Shield } from 'lucide-react';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [genderChoice, setGenderChoice] = useState('MALE'); // 'MALE' | 'FEMALE'
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const user = await login(formData.email, formData.password);
      const defaultDest =
        user.role === 'ADMIN'
          ? '/admin/dashboard'
          : user.role === 'CREATOR'
          ? '/creator/dashboard'
          : '/queue';
      const destination = location.state?.from?.pathname || defaultDest;
      navigate(destination);
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <Badge variant="adult">18+ ADULT PLATFORM</Badge>
          <h2 className="text-3xl font-black text-[#27243A] tracking-tight">Welcome Back</h2>
          <p className="text-xs text-[#777387]">
            Sign in to access your Spotizan wallet, creator dashboard, and live video calls
          </p>
        </div>

        {/* Gender Selection Cards (Side-by-side on desktop, stacked on mobile) */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-[#27243A] text-left">
            Select Account Experience
          </label>
          <div className="grid grid-cols-2 gap-3">
            {/* Female Selection Card */}
            <button
              type="button"
              onClick={() => setGenderChoice('FEMALE')}
              className={`p-3.5 rounded-2xl border-2 transition-all duration-200 text-left flex items-start gap-2.5 relative cursor-pointer transform hover:-translate-y-0.5 ${
                genderChoice === 'FEMALE'
                  ? 'border-[#FF6347] bg-[#FFF0EC] shadow-md shadow-[#FF6347]/10'
                  : 'border-[#E8E4F0] bg-white hover:border-[#B9A7F5] hover:bg-[#F1EDFF]/30'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  genderChoice === 'FEMALE'
                    ? 'bg-[#FF6347] text-white shadow-sm'
                    : 'bg-[#F1EDFF] text-[#7960D8]'
                }`}
              >
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#27243A]">Female</span>
                  {genderChoice === 'FEMALE' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#FF6347]" />
                  )}
                </div>
                <span className="text-[10px] text-[#777387] block">Creator / Peer</span>
              </div>
            </button>

            {/* Male Selection Card */}
            <button
              type="button"
              onClick={() => setGenderChoice('MALE')}
              className={`p-3.5 rounded-2xl border-2 transition-all duration-200 text-left flex items-start gap-2.5 relative cursor-pointer transform hover:-translate-y-0.5 ${
                genderChoice === 'MALE'
                  ? 'border-[#7960D8] bg-[#F1EDFF] shadow-md shadow-[#7960D8]/10'
                  : 'border-[#E8E4F0] bg-white hover:border-[#B9A7F5] hover:bg-[#F1EDFF]/30'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  genderChoice === 'MALE'
                    ? 'bg-[#7960D8] text-white shadow-sm'
                    : 'bg-[#F1EDFF] text-[#7960D8]'
                }`}
              >
                <User className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#27243A]">Male</span>
                  {genderChoice === 'MALE' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#7960D8]" />
                  )}
                </div>
                <span className="text-[10px] text-[#777387] block">Caller / Member</span>
              </div>
            </button>
          </div>
        </div>

        <Card className="border border-[#E8E4F0] bg-white shadow-card p-6 space-y-5">
          {error && (
            <Alert type="error" title="Sign In Error">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#27243A] mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="name@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E8E4F0] text-[#27243A] placeholder-[#777387]/60 text-xs focus:outline-none focus:border-[#7960D8] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#27243A] mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, password: e.target.value }))
                }
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E8E4F0] text-[#27243A] placeholder-[#777387]/60 text-xs focus:outline-none focus:border-[#7960D8] transition-colors"
              />
            </div>

            <div className="p-3 rounded-xl bg-[#F1EDFF] border border-[#B9A7F5]/50 text-xs text-[#7960D8] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 text-[#7960D8]" />
              <span className="font-medium text-[11px]">Signed HTTP-only cookie authentication active. No OTP required.</span>
            </div>

            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              className="w-full py-2.5 font-bold shadow-tomato"
            >
              Sign In as {genderChoice === 'FEMALE' ? 'Female Member' : 'Male Member'}
            </Button>
          </form>

          <div className="flex items-center justify-between pt-2 border-t border-[#E8E4F0] text-xs text-[#777387]">
            <Link to="/register" className="text-[#7960D8] hover:text-[#27243A] font-bold">
              Create an account (18+)
            </Link>
            <Link to="/admin/login" className="text-[#777387] hover:text-[#7960D8] font-medium flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" />
              <span>Staff Login</span>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
