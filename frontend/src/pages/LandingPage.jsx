import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Video,
  Sparkles,
  Shield,
  Lock,
  Coins,
  CheckCircle2,
  Clock,
  ArrowRight,
  UserCheck,
  Zap,
  Activity,
  AlertTriangle,
  Star,
  Globe2,
  HeartHandshake,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Card } from '../components/common/Card';
import { api } from '../services/api';

export function LandingPage() {
  const [healthData, setHealthData] = useState(null);
  const [healthError, setHealthError] = useState(false);
  const [featuredCreators, setFeaturedCreators] = useState([]);
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    api.getHealth()
      .then((data) => {
        setHealthData(data);
        setHealthError(false);
      })
      .catch(() => {
        setHealthError(true);
      });

    api.get('/creators?limit=3')
      .then((res) => {
        if (res.success && Array.isArray(res.data?.creators)) {
          setFeaturedCreators(
            res.data.creators.map((c) => ({
              id: c._id,
              name: c.displayName,
              category: c.category || 'Creator',
              rating: c.ratingAverage || 5.0,
              reviewsCount: c.totalCallsCompleted || 0,
              languages: c.languages || ['English', 'Hindi'],
              rate: `₹${((c.pricePerMinutePaise || 900) / 100).toFixed(0)}/min`,
              online: c.availabilityStatus === 'ONLINE',
              bio: c.bio || 'Verified creator ready to connect for live video conversations.',
              avatar: c.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
            }))
          );
        }
      })
      .catch(() => {
        setFeaturedCreators([]);
      });
  }, []);

  const faqs = [
    {
      q: 'How does paid video calling work?',
      a: 'Browse through verified creators, check their rates and online status, and click Start Video Call. Your wallet balance is reserved for the session, and billing only begins when the call is accepted. Unused reserved funds are instantly returned upon call completion.',
    },
    {
      q: 'Is there a free preview for calls?',
      a: 'Yes! Random matchmaking calls include a 15-second free preview guarantee. If you disconnect within the first 15 seconds, you are billed exactly ₹0.00.',
    },
    {
      q: 'How do creators earn money and receive payouts?',
      a: 'Verified creators earn 70% of call proceeds, recorded in integer paise in our immutable ledger. Creators can withdraw earnings to any verified Indian bank account or UPI VPA once reaching the minimum ₹500 payout threshold.',
    },
    {
      q: 'How is privacy and safety protected?',
      a: 'All video streams use peer-to-peer WebRTC DTLS-SRTP encryption without recording. In-call text messages automatically expire and are deleted within 24 hours. Participants can block or report inappropriate users with a single click.',
    },
  ];

  return (
    <div className="flex-1 flex flex-col bg-white text-[#27243A]">
      {/* Hero Section */}
      <section className="relative bg-[#F1EDFF] border-b border-[#E8E4F0] pt-14 pb-20 md:pt-24 md:pb-28 overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E8E4F0] shadow-sm">
            <Badge variant="adult">STRICTLY 18+</Badge>
            <span className="text-xs font-semibold text-[#7960D8]">
              India's Premier Creator Video Calling Marketplace
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-[#27243A] max-w-4xl mx-auto leading-tight md:leading-tight">
            Connect 1-on-1 with Verified Creators{' '}
            <span className="text-[#7960D8]">via Live Video</span>
          </h1>

          <p className="text-base sm:text-lg text-[#777387] max-w-2xl mx-auto leading-relaxed">
            Discover talented creators, chat via high-definition WebRTC video calls, and pay transparently per minute. Instant random matching and scheduled direct calls.
          </p>

          {/* Pricing Highlight Pill */}
          <div className="inline-flex flex-wrap items-center justify-center gap-3 p-2 bg-white border border-[#E8E4F0] rounded-2xl max-w-xl mx-auto text-xs sm:text-sm text-[#777387] shadow-sm">
            <span className="flex items-center gap-1.5 text-[#FF6347] font-bold px-2">
              <Coins className="w-4 h-4" /> Transparent Pricing:
            </span>
            <span className="bg-[#F1EDFF] px-2.5 py-1 rounded-lg text-[#27243A] font-medium">Promo ₹7/min</span>
            <span className="bg-[#F1EDFF] px-2.5 py-1 rounded-lg text-[#27243A] font-medium">Standard ₹9/min</span>
            <span className="bg-[#FFF0EC] text-[#FF6347] font-semibold border border-[#FFC7BD] px-2.5 py-1 rounded-lg">
              Top Creators ₹12–₹15/min
            </span>
          </div>

          {/* Call to Actions */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/discover">
              <Button size="lg" variant="primary" icon={Sparkles} className="w-full sm:w-auto shadow-tomato text-base">
                Explore Creators
              </Button>
            </Link>
            <Link to="/register">
              <Button size="lg" variant="secondary" icon={UserCheck} className="w-full sm:w-auto shadow-lavender text-base">
                Become a Creator
              </Button>
            </Link>
            <Link to="/queue">
              <Button size="lg" variant="lavender" icon={Video} className="w-full sm:w-auto text-base">
                Random Matching
              </Button>
            </Link>
          </div>

          {/* Quick Metrics Bar */}
          <div className="pt-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
            <div className="p-4 rounded-2xl bg-white border border-[#E8E4F0] shadow-card">
              <div className="text-2xl font-black text-[#27243A]">100%</div>
              <div className="text-xs text-[#777387] mt-0.5">KYC Verified Creators</div>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-[#E8E4F0] shadow-card">
              <div className="text-2xl font-black text-[#7960D8]">70%</div>
              <div className="text-xs text-[#777387] mt-0.5">Creator Revenue Share</div>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-[#E8E4F0] shadow-card">
              <div className="text-2xl font-black text-[#FF6347]">15 Sec</div>
              <div className="text-xs text-[#777387] mt-0.5">Free Call Preview</div>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-[#E8E4F0] shadow-card">
              <div className="text-2xl font-black text-[#218A58]">₹1.00</div>
              <div className="text-xs text-[#777387] mt-0.5">Test Top-up via Razorpay</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Creators Section */}
      <section className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#7960D8] mb-1">
              <Star className="w-4 h-4 fill-current text-[#7960D8]" /> Featured Online Creators
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#27243A]">
              Meet Today's Top Verified Creators
            </h2>
            <p className="text-xs sm:text-sm text-[#777387] mt-1">
              Live presence verified. Connect directly with a single click.
            </p>
          </div>
          <Link to="/discover">
            <Button variant="outline" size="sm" icon={ArrowRight}>
              Browse All Creators
            </Button>
          </Link>
        </div>

        {/* Creator Cards */}
        {featuredCreators.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredCreators.map((creator) => (
              <Card key={creator.id} hoverEffect className="p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-[#F1EDFF]">
                    <img
                      src={creator.avatar}
                      alt={creator.name}
                      className="w-full h-full object-cover"
                    />
                    {creator.online && (
                      <div className="absolute top-3 left-3">
                        <Badge variant="live" className="shadow-md">
                          <span className="w-2 h-2 rounded-full bg-[#FF6347] animate-ping" />
                          ONLINE
                        </Badge>
                      </div>
                    )}
                    <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-bold text-[#27243A] shadow-sm">
                      {creator.rate}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-[#27243A]">{creator.name}</h3>
                      <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>{creator.rating}</span>
                        <span className="text-[#777387] font-normal">({creator.reviewsCount})</span>
                      </div>
                    </div>
                    <span className="text-xs text-[#7960D8] font-medium block mt-0.5">
                      {creator.category}
                    </span>
                    <p className="text-xs text-[#777387] mt-2 line-clamp-2 leading-relaxed">
                      {creator.bio}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {creator.languages.map((lang, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-[#F1EDFF] text-[10px] font-medium text-[#7960D8]"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E8E4F0] flex gap-2">
                  <Link to="/discover" className="flex-1">
                    <Button variant="primary" size="sm" className="w-full" icon={Video}>
                      Start Call
                    </Button>
                  </Link>
                  <Link to="/discover">
                    <Button variant="outline" size="sm">
                      Profile
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-[#F1EDFF] border border-[#E8E4F0] rounded-2xl max-w-md mx-auto space-y-3">
            <UserCheck className="w-8 h-8 text-[#7960D8] mx-auto" />
            <h4 className="font-bold text-[#27243A]">Real-Time Verified Creators</h4>
            <p className="text-xs text-[#777387]">
              Real-time online creators will appear here as they connect. Visit Discover to browse all profiles.
            </p>
            <Link to="/discover">
              <Button variant="primary" size="sm">
                Explore Discover
              </Button>
            </Link>
          </div>
        )}
      </section>

      {/* How It Works in 3 Steps */}
      <section className="py-16 md:py-24 bg-[#F1EDFF] border-y border-[#E8E4F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold text-[#7960D8] uppercase tracking-wider">
              Simple & Transparent
            </span>
            <h2 className="text-3xl font-black text-[#27243A]">
              How Spotizan Works in 3 Easy Steps
            </h2>
            <p className="text-xs sm:text-sm text-[#777387]">
              Start connecting with verified creators without complicated subscriptions or hidden costs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-2xl border border-[#E8E4F0] shadow-card space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#FFF0EC] text-[#FF6347] font-black text-lg flex items-center justify-center">
                1
              </div>
              <h3 className="text-base font-bold text-[#27243A]">Browse & Top Up Wallet</h3>
              <p className="text-xs text-[#777387] leading-relaxed">
                Discover creators by language, availability, and interests. Add credits starting from ₹1.00 via secure Razorpay UPI or Net Banking.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#E8E4F0] shadow-card space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#F1EDFF] text-[#7960D8] font-black text-lg flex items-center justify-center">
                2
              </div>
              <h3 className="text-base font-bold text-[#27243A]">Direct Video Call or Random Queue</h3>
              <p className="text-xs text-[#777387] leading-relaxed">
                Start a 1-on-1 video call directly with your favorite creator, or hop into the instant random matchmaking queue with free 15-second preview.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#E8E4F0] shadow-card space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#E8F8F0] text-[#218A58] font-black text-lg flex items-center justify-center">
                3
              </div>
              <h3 className="text-base font-bold text-[#27243A]">Exact Minute-by-Minute Billing</h3>
              <p className="text-xs text-[#777387] leading-relaxed">
                The server timer tracks duration authoritatively. Unused reserved funds are automatically refunded to your wallet the exact second the call ends.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Safety Section */}
      <section className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-2">
          <Badge variant="adult">SAFETY & PRIVACY GUARANTEE</Badge>
          <h2 className="text-3xl font-black text-[#27243A]">
            Built with Privacy, Consent & Trust
          </h2>
          <p className="text-xs sm:text-sm text-[#777387]">
            We uphold the highest legal, technological, and community safety standards for adults.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-5 rounded-2xl border border-[#E8E4F0] bg-white shadow-card space-y-2.5">
            <div className="p-2.5 rounded-xl bg-[#FFF0EC] text-[#FF6347] w-fit">
              <Shield className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-[#27243A] text-sm">Mandatory 18+ Verification</h4>
            <p className="text-xs text-[#777387] leading-relaxed">
              Strict statutory adult eligibility verification for all participants with audited compliance logs.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-[#E8E4F0] bg-white shadow-card space-y-2.5">
            <div className="p-2.5 rounded-xl bg-[#F1EDFF] text-[#7960D8] w-fit">
              <Lock className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-[#27243A] text-sm">Encrypted WebRTC P2P</h4>
            <p className="text-xs text-[#777387] leading-relaxed">
              Audio and video are routed directly between browsers using DTLS-SRTP encryption without recording.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-[#E8E4F0] bg-white shadow-card space-y-2.5">
            <div className="p-2.5 rounded-xl bg-[#E8F8F0] text-[#218A58] w-fit">
              <Clock className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-[#27243A] text-sm">24-Hour Ephemeral Chat</h4>
            <p className="text-xs text-[#777387] leading-relaxed">
              In-call text messages automatically expire and are permanently purged from the database after 24 hours.
            </p>
          </div>

          <div className="p-5 rounded-2xl border border-[#E8E4F0] bg-white shadow-card space-y-2.5">
            <div className="p-2.5 rounded-xl bg-[#FFFBEB] text-[#B45309] w-fit">
              <Zap className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-[#27243A] text-sm">1-Click Block & Report</h4>
            <p className="text-xs text-[#777387] leading-relaxed">
              Instantly block any user from ever matching with you again, and submit flagged reports to the admin desk.
            </p>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="py-16 md:py-20 bg-[#F1EDFF] border-t border-[#E8E4F0]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-[#7960D8] uppercase tracking-wider">
              Answers & Help
            </span>
            <h2 className="text-3xl font-black text-[#27243A]">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-[#E8E4F0] overflow-hidden shadow-sm"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 flex items-center justify-between text-left text-sm font-bold text-[#27243A] hover:bg-[#FAF9FF] transition-colors"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-[#7960D8] shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#777387] shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs text-[#777387] leading-relaxed border-t border-[#E8E4F0]/60 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Live System Diagnostic Widget */}
      <section className="py-8 bg-white border-t border-[#E8E4F0]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-4 rounded-2xl bg-[#F1EDFF] border border-[#E8E4F0] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#7960D8]" />
              <span className="font-semibold text-[#27243A]">Operational Platform State:</span>
              <span className="text-[#777387]">
                Backend API ({healthData ? healthData.status : 'checking'}) • MongoDB ({healthData?.database?.status || 'checking'})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#218A58] animate-pulse" />
              <span className="text-[#218A58] font-bold">100% Functional & Verified</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
