import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Alert } from '../components/common/Alert';
import { ShieldAlert, Sparkles, CheckCircle2, User, Heart } from 'lucide-react';

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
    dateOfBirth: '',
    gender: 'MALE', // 'MALE' | 'FEMALE'
    genderPreference: 'ANY', // 'ANY' | 'FEMALE' | 'MALE'
    wantToBeCreator: false,
    ageAffirmation: false,
  });

  const [calculatedAge, setCalculatedAge] = useState(null);
  const [isUnderage, setIsUnderage] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Calculate age dynamically as user picks birthdate
  const handleDateChange = (e) => {
    const dobValue = e.target.value;
    setFormData((prev) => ({ ...prev, dateOfBirth: dobValue }));
    setError(null);

    if (!dobValue) {
      setCalculatedAge(null);
      setIsUnderage(false);
      return;
    }

    const dob = new Date(dobValue);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    setCalculatedAge(age);
    setIsUnderage(age < 18);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.displayName.trim()) {
      setError('Please provide your full display name.');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please verify both password fields.');
      return;
    }

    if (!formData.dateOfBirth) {
      setError('Please provide your date of birth.');
      return;
    }

    if (calculatedAge < 18) {
      setError('Underage Registration Prohibited: You must be at least 18 years old to join Spotizan.');
      return;
    }

    if (!formData.ageAffirmation) {
      setError('You must legally affirm that you are at least 18 years old under penalty of perjury.');
      return;
    }

    setIsLoading(true);

    try {
      const finalRole = formData.wantToBeCreator ? 'CREATOR' : 'CUSTOMER';
      await register({
        displayName: formData.displayName,
        email: formData.email,
        password: formData.password,
        gender: formData.gender,
        genderPreference: formData.genderPreference,
        role: finalRole,
        dateOfBirth: formData.dateOfBirth,
        ageAffirmation: formData.ageAffirmation,
      });

      navigate(finalRole === 'CREATOR' ? '/creator/dashboard' : '/queue');
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your inputs.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <Badge variant="adult">18+ AGE RESTRICTION</Badge>
          <h2 className="text-3xl font-black text-[#27243A] tracking-tight">
            Create Your Account
          </h2>
          <p className="text-xs text-[#777387]">
            Join Spotizan to discover verified creators, match 1-on-1 in live video calls, and earn rewards.
          </p>
        </div>

        {/* Gender Selection Cards (Side-by-side on desktop, stacked on mobile) */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-[#27243A] text-left">
            Select Your Gender
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Female Selection Card */}
            <button
              type="button"
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  gender: 'FEMALE',
                }))
              }
              className={`p-4 rounded-2xl border-2 transition-all duration-200 text-left flex items-start gap-3 relative cursor-pointer transform hover:-translate-y-0.5 ${
                formData.gender === 'FEMALE'
                  ? 'border-[#FF6347] bg-[#FFF0EC] shadow-md shadow-[#FF6347]/10'
                  : 'border-[#E8E4F0] bg-white hover:border-[#B9A7F5] hover:bg-[#F1EDFF]/30'
              }`}
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  formData.gender === 'FEMALE'
                    ? 'bg-[#FF6347] text-white shadow-sm'
                    : 'bg-[#F1EDFF] text-[#7960D8]'
                }`}
              >
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-bold text-sm text-[#27243A]">Female</span>
                  {formData.gender === 'FEMALE' && (
                    <CheckCircle2 className="w-4 h-4 text-[#FF6347]" />
                  )}
                </div>
                <p className="text-[11px] text-[#777387] leading-relaxed">
                  Discover peers & eligible to apply for verified Creator earnings.
                </p>
              </div>
            </button>

            {/* Male Selection Card */}
            <button
              type="button"
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  gender: 'MALE',
                }))
              }
              className={`p-4 rounded-2xl border-2 transition-all duration-200 text-left flex items-start gap-3 relative cursor-pointer transform hover:-translate-y-0.5 ${
                formData.gender === 'MALE'
                  ? 'border-[#7960D8] bg-[#F1EDFF] shadow-md shadow-[#7960D8]/10'
                  : 'border-[#E8E4F0] bg-white hover:border-[#B9A7F5] hover:bg-[#F1EDFF]/30'
              }`}
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  formData.gender === 'MALE'
                    ? 'bg-[#7960D8] text-white shadow-sm'
                    : 'bg-[#F1EDFF] text-[#7960D8]'
                }`}
              >
                <User className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-bold text-sm text-[#27243A]">Male</span>
                  {formData.gender === 'MALE' && (
                    <CheckCircle2 className="w-4 h-4 text-[#7960D8]" />
                  )}
                </div>
                <p className="text-[11px] text-[#777387] leading-relaxed">
                  Browse verified creators & match in real-time video chat.
                </p>
              </div>
            </button>
          </div>
        </div>

        <Card className="border border-[#E8E4F0] bg-white shadow-card p-6 space-y-5">
          {error && (
            <Alert type="error" title="Registration Error">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#27243A] mb-1.5">
                Full Name / Nickname
              </label>
              <input
                type="text"
                required
                value={formData.displayName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, displayName: e.target.value }))
                }
                placeholder="e.g. Priya Sharma or Rahul Roy"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E8E4F0] text-[#27243A] placeholder-[#777387]/60 text-xs focus:outline-none focus:border-[#7960D8] transition-colors"
              />
            </div>

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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#27243A] mb-1.5">
                  Password (min. 8 chars)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, password: e.target.value }))
                  }
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E8E4F0] text-[#27243A] placeholder-[#777387]/60 text-xs focus:outline-none focus:border-[#7960D8] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#27243A] mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                  }
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E8E4F0] text-[#27243A] placeholder-[#777387]/60 text-xs focus:outline-none focus:border-[#7960D8] transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-[#27243A]">
                  Date of Birth (Must be at least 18 years old)
                </label>
                {calculatedAge !== null && (
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      isUnderage
                        ? 'bg-[#FFF0EC] text-[#D92D20] border border-[#D92D20]/30'
                        : 'bg-[#E8F8F0] text-[#218A58] border border-[#218A58]/30'
                    }`}
                  >
                    Age: {calculatedAge} {isUnderage ? '(Underage)' : '(Eligible 18+)'}
                  </span>
                )}
              </div>
              <input
                type="date"
                required
                max={new Date().toISOString().split('T')[0]}
                value={formData.dateOfBirth}
                onChange={handleDateChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E8E4F0] text-[#27243A] text-xs focus:outline-none focus:border-[#7960D8] transition-colors"
              />
            </div>

            {/* Matching Preference Selection */}
            <div>
              <label className="block text-xs font-semibold text-[#27243A] mb-1.5">
                Video Chat Matching Preference
              </label>
              <select
                value={formData.genderPreference}
                onChange={(e) => setFormData((prev) => ({ ...prev, genderPreference: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#E8E4F0] text-xs text-[#27243A] focus:outline-none focus:border-[#7960D8]"
              >
                <option value="ANY">Anyone (Match with any adult)</option>
                <option value="FEMALE">Women (Filter for female peers/creators)</option>
                <option value="MALE">Men (Filter for male peers)</option>
              </select>
            </div>

            {/* Optional Creator Voluntary Application Checkbox */}
            <div className="p-3.5 rounded-xl bg-[#F1EDFF] border border-[#E8E4F0] space-y-2">
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="wantToBeCreator"
                  checked={formData.wantToBeCreator}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      wantToBeCreator: e.target.checked,
                    }))
                  }
                  className="mt-0.5 w-4 h-4 rounded border-[#E8E4F0] text-[#7960D8] cursor-pointer"
                />
                <label
                  htmlFor="wantToBeCreator"
                  className="text-xs text-[#27243A] cursor-pointer leading-relaxed select-none"
                >
                  <span className="font-bold text-[#7960D8] block">
                    Voluntarily Apply for Creator Program
                  </span>
                  Check this box if you wish to host paid 1-on-1 video calls and earn ₹7–₹15 per minute. Requires subsequent 18+ identity KYC verification.
                </label>
              </div>
            </div>

            {/* Mandatory Age Affirmation Box */}
            <div className="p-4 rounded-xl bg-[#FFF0EC] border border-[#FF6347]/30 space-y-3">
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="ageAffirmation"
                  required
                  checked={formData.ageAffirmation}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      ageAffirmation: e.target.checked,
                    }))
                  }
                  className="mt-1 w-4 h-4 rounded border-[#FF6347] bg-white text-[#FF6347] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <label
                  htmlFor="ageAffirmation"
                  className="text-xs text-[#27243A] cursor-pointer leading-relaxed select-none"
                >
                  <span className="font-bold text-[#D92D20] block mb-0.5">
                    Statutory 18+ Age & Terms Affirmation
                  </span>
                  I certify under penalty of perjury that I am at least 18 years of age. I agree to the <Link to="/terms" className="text-[#7960D8] underline">Terms of Service</Link>, <Link to="/privacy" className="text-[#7960D8] underline">Privacy Policy</Link>, and consensual adult standards. No phone or OTP verification required.
                </label>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              disabled={isUnderage || !formData.ageAffirmation}
              className="w-full py-2.5 font-bold shadow-tomato"
              icon={Sparkles}
            >
              Register as {formData.wantToBeCreator ? 'Creator (18+)' : 'Member (18+)'}
            </Button>
          </form>

          <div className="text-center pt-2 text-xs text-[#777387]">
            Already have an account?{' '}
            <Link to="/login" className="text-[#7960D8] hover:text-[#27243A] font-bold">
              Sign In
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
