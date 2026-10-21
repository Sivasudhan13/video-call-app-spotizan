import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Video, Sparkles, Menu, X, LogOut, User as UserIcon, Wallet, Plus, Coins } from 'lucide-react';
import { Button } from './Button';
import { Badge } from './Badge';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useWallet } from '../../context/WalletContext';

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [systemStatus, setSystemStatus] = useState('checking');
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { wallet, openWalletModal } = useWallet();

  const isFemale = user?.gender === 'FEMALE';

  useEffect(() => {
    let isMounted = true;
    api.getHealth()
      .then((res) => {
        if (isMounted) setSystemStatus(res.status === 'healthy' ? 'online' : 'degraded');
      })
      .catch(() => {
        if (isMounted) setSystemStatus('offline');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const navLinks = [
    { name: 'Discover', href: '/discover' },
    { name: 'Random Queue', href: '/queue' },
    ...(!isFemale
      ? [
          { name: 'Premium', href: '/premium' },
          { name: 'Pricing & Rates', href: '/pricing' },
        ]
      : []),
    ...(isFemale
      ? [
          { name: 'Receive Calls (Free)', href: '/receive-calls', isHighlight: true },
          { name: 'My Earnings', href: '/earnings', isEarnings: true },
          { name: 'Creator Studio', href: '/creator/dashboard' },
        ]
      : []),
    ...(user?.role === 'CREATOR' && !isFemale ? [{ name: 'Creator Studio', href: '/creator/dashboard' }] : []),
    ...(user?.role === 'ADMIN' ? [{ name: 'Admin Console', href: '/admin' }] : []),
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-40 w-full glass-nav bg-white/95 border-b border-[#E8E4F0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & 18+ Tag */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-[#7960D8] flex items-center justify-center text-white shadow-md shadow-[#7960D8]/20 group-hover:scale-105 transition-transform">
                <Video className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tight text-[#27243A]">
                  Spotizan
                </span>
                <span className="text-[10px] text-[#7960D8] font-bold tracking-wider -mt-1">
                  CREATOR VIDEO CALLS
                </span>
              </div>
            </Link>

            <Badge variant="adult" className="hidden sm:inline-flex text-[11px] py-0.5">
              18+ ONLY
            </Badge>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  isActive(link.href)
                    ? 'text-[#7960D8] bg-[#F1EDFF] font-semibold'
                    : link.isHighlight
                    ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-bold border border-emerald-200 shadow-sm'
                    : 'text-[#777387] hover:text-[#27243A] hover:bg-[#F1EDFF]'
                }`}
              >
                {link.isHighlight && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                {link.name}
              </Link>
            ))}
          </div>

          {/* Right Action Controls */}
          <div className="hidden md:flex items-center gap-3">
            {/* Live API Health indicator */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F1EDFF] border border-[#E8E4F0] text-[11px] text-[#777387]"
              title={`API Backend: ${systemStatus}`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  systemStatus === 'online'
                    ? 'bg-[#218A58] animate-pulse'
                    : systemStatus === 'checking'
                    ? 'bg-amber-400'
                    : 'bg-[#D92D20]'
                }`}
              />
              <span className="capitalize font-medium text-[#27243A]">{systemStatus === 'online' ? 'Live System' : systemStatus}</span>
            </div>

            {isAuthenticated ? (
              <div className="flex items-center gap-2.5">
                {/* Female Users: Display Payable Earnings Pill linking to /earnings */}
                {isFemale ? (
                  <Link
                    to="/earnings"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#F1EDFF] to-emerald-50 border border-emerald-300 hover:border-emerald-500 hover:bg-emerald-100 transition-all text-xs font-semibold group cursor-pointer shadow-sm"
                    title="Click to view My Earnings, Bank Details & Withdrawals"
                  >
                    <div className="w-5 h-5 rounded-md bg-emerald-500 text-white flex items-center justify-center">
                      <Coins className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-[10px] text-emerald-800 leading-none font-bold">Earned</span>
                      <span className="text-[#218A58] font-black leading-tight">
                        ₹{(wallet.creatorPayablePaise / 100).toFixed(2)}
                      </span>
                    </div>
                  </Link>
                ) : (
                  /* Male / Customer Users: Display Wallet Balance with Top Up button */
                  <button
                    onClick={openWalletModal}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F1EDFF] border border-[#E8E4F0] hover:border-[#B9A7F5] hover:bg-[#e7e0ff] transition-all text-xs font-semibold group cursor-pointer"
                    title="Click to view Spotizan Wallet & Top Up"
                  >
                    <div className="w-5 h-5 rounded-md bg-[#FFF0EC] text-[#FF6347] flex items-center justify-center">
                      <Wallet className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-[10px] text-[#777387] leading-none">Wallet</span>
                      <span className="text-[#27243A] font-bold leading-tight">
                        ₹{(wallet.balancePaise / 100).toFixed(0)}
                      </span>
                    </div>
                    <div className="w-4 h-4 rounded-full bg-[#7960D8] text-white flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Plus className="w-3 h-3" />
                    </div>
                  </button>
                )}

                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#F1EDFF] border border-[#E8E4F0] hover:border-[#B9A7F5] rounded-xl transition-all cursor-pointer group"
                  title="View Profile, Call History & Settings"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#7960D8] text-white flex items-center justify-center text-xs font-bold group-hover:scale-105 transition-transform">
                    {user.displayName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-semibold text-[#27243A] leading-none group-hover:text-[#7960D8] transition-colors">
                      {user.displayName}
                    </span>
                    <span className="text-[10px] text-[#7960D8] font-medium leading-none mt-1">
                      {user.role}
                    </span>
                  </div>
                </Link>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  icon={LogOut}
                  title="Sign Out"
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Log In
                  </Button>
                </Link>

                <Link to="/register">
                  <Button variant="primary" size="sm" icon={Sparkles}>
                    Join Platform
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            <Badge variant="adult" className="text-[10px] py-0 px-2">
              18+
            </Badge>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-[#777387] hover:text-[#27243A] hover:bg-[#F1EDFF] focus:outline-none"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#E8E4F0] bg-white px-4 pt-2 pb-6 space-y-3 shadow-lg">
          <div className="space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-base font-medium flex items-center gap-2 ${
                  isActive(link.href)
                    ? 'text-[#7960D8] bg-[#F1EDFF] font-semibold'
                    : link.isHighlight
                    ? 'text-emerald-700 bg-emerald-50 font-bold border border-emerald-200'
                    : 'text-[#777387] hover:text-[#27243A] hover:bg-[#F1EDFF]'
                }`}
              >
                {link.isHighlight && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                {link.name}
              </Link>
            ))}
          </div>

          <div className="pt-4 border-t border-[#E8E4F0] flex flex-col gap-2">
            {isAuthenticated ? (
              <div className="space-y-2">
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 p-2 bg-[#F1EDFF] rounded-xl hover:bg-[#e7e0ff] transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#7960D8] text-white flex items-center justify-center text-xs font-bold">
                    {user.displayName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#27243A]">{user.displayName}</div>
                    <div className="text-xs text-[#7960D8]">{user.email} • {user.role} (View Profile & History)</div>
                  </div>
                </Link>
                <Button
                  variant="outline"
                  size="md"
                  className="w-full"
                  icon={LogOut}
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" size="md" className="w-full">
                    Log In
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" size="md" className="w-full" icon={Sparkles}>
                    Create Account (18+)
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
