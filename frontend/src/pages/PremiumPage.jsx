import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Alert } from '../components/common/Alert';
import { RazorpayCheckoutButton } from '../components/payment/RazorpayCheckoutButton';
import { useAuth } from '../context/AuthContext';
import {
  Crown,
  Sparkles,
  Zap,
  ShieldCheck,
  Check,
  X,
  Star,
  Clock,
  Globe2,
  Lock,
} from 'lucide-react';

export function PremiumPage() {
  const { user, isAuthenticated } = useAuth();

  // Female users do not view premium purchase packages
  if (user?.gender === 'FEMALE') {
    return <Navigate to="/earnings" replace />;
  }

  const [selectedPlan, setSelectedPlan] = useState('PREMIUM');
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const plans = [
    {
      id: 'FREE',
      name: 'Free Basic',
      price: '₹0',
      period: 'forever',
      amountPaise: 0,
      description: 'Standard random matching for registered 18+ consenting adults.',
      features: [
        'Standard random video matching queue',
        '15-second free preview on calls',
        '1-to-1 P2P encrypted video & audio',
        'Default language filter (English/Hindi)',
        'Basic in-call text chat',
      ],
      notIncluded: [
        'Priority matching queue bypass',
        'Advanced regional & dialect filters',
        'Ad-free experience',
        'VIP profile verification badge',
      ],
      popular: false,
    },
    {
      id: 'PREMIUM',
      name: 'Premium Member',
      price: '₹499',
      period: '/ month',
      amountPaise: 49900,
      description: 'Jump to the front of the queue with priority matching and custom filters.',
      features: [
        'Priority Matchmaking Queue (Faster pairings)',
        'Advanced Regional, State & Language Filters',
        '100% Ad-Free platform experience',
        'Verified Premium member badge',
        'Unlimited in-call live text chat with auto-expire',
        'High-definition WebRTC video bitrate',
      ],
      notIncluded: [
        'VIP golden ring badge & concierge support',
      ],
      popular: true,
    },
    {
      id: 'VIP',
      name: 'VIP Elite',
      price: '₹999',
      period: '/ month',
      amountPaise: 99900,
      description: 'The ultimate social discovery experience with absolute top priority.',
      features: [
        'Ultra Priority Queue (Instant connection priority)',
        'All regional, dialect and interest filters unlocked',
        'Exclusive Golden VIP Elite badge on calls',
        'Complimentary ₹100 call credit balance added to wallet',
        'Direct 24/7 priority concierge support',
        'Full privacy shielding options',
      ],
      notIncluded: [],
      popular: false,
    },
  ];

  return (
    <div className="flex-1 bg-white py-12 px-4 sm:px-6 lg:px-8 text-[#27243A]">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header Banner */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F1EDFF] border border-[#E8E4F0] text-xs text-[#7960D8] font-bold">
            <Crown className="w-3.5 h-3.5 text-amber-500" />
            <span>Spotizan Premium Memberships</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[#27243A]">
            Level Up Your Live Video Experience
          </h1>
          <p className="text-[#777387] text-sm sm:text-base leading-relaxed">
            Bypass waiting lines with priority queue matching, apply granular language and region filters, and enjoy seamless high-definition video connections.
          </p>
        </div>

        {paymentSuccess && (
          <Alert type="success" title="Membership Activated!">
            Your subscription has been verified and activated via Razorpay. Your account now has VIP priority matching enabled!
          </Alert>
        )}

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => {
            const isCurrent = user?.subscriptionTier === plan.id;
            return (
              <Card
                key={plan.id}
                className={`p-6 sm:p-8 flex flex-col justify-between relative transition-all duration-300 ${
                  plan.popular
                    ? 'border-[#7960D8] bg-gradient-to-b from-[#F1EDFF] to-white shadow-soft ring-2 ring-[#7960D8]/40 scale-100 md:scale-105'
                    : 'border-[#E8E4F0] bg-white shadow-card hover:border-[#B9A7F5]'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#7960D8] text-white font-bold text-[11px] shadow-md tracking-wide uppercase">
                    Most Popular
                  </div>
                )}

                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xl font-bold text-[#27243A]">{plan.name}</h3>
                      {plan.id === 'VIP' && <Crown className="w-5 h-5 text-amber-500" />}
                      {plan.id === 'PREMIUM' && <Zap className="w-5 h-5 text-[#7960D8]" />}
                    </div>
                    <p className="text-xs text-[#777387] min-h-[36px]">{plan.description}</p>
                  </div>

                  <div className="flex items-baseline gap-1 py-2 border-y border-[#E8E4F0]">
                    <span className="text-3xl sm:text-4xl font-black text-[#27243A] font-mono">
                      {plan.price}
                    </span>
                    <span className="text-xs text-[#777387]">{plan.period}</span>
                  </div>

                  {/* Feature Checklist */}
                  <div className="space-y-2.5 text-xs">
                    <span className="text-[11px] uppercase tracking-wider text-[#7960D8] font-bold block">
                      What's Included:
                    </span>
                    {plan.features.map((feat, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-[#27243A]">
                        <Check className="w-4 h-4 text-[#218A58] shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                    {plan.notIncluded.map((feat, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-[#777387] line-through">
                        <X className="w-4 h-4 text-[#777387] shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action CTA */}
                <div className="pt-6 mt-6 border-t border-[#E8E4F0]">
                  {isCurrent ? (
                    <Button variant="outline" size="md" className="w-full border-[#218A58] text-[#218A58] cursor-default font-bold" disabled>
                      Current Plan
                    </Button>
                  ) : plan.amountPaise === 0 ? (
                    <Button variant="outline" size="md" className="w-full font-bold" disabled>
                      Default Plan
                    </Button>
                  ) : (
                    <RazorpayCheckoutButton
                      amountPaise={plan.amountPaise}
                      planName={plan.name}
                      description={`Spotizan ${plan.name} 30-Day Pass`}
                      buttonText={`Upgrade to ${plan.name}`}
                      className="w-full bg-[#FF6347] hover:bg-[#e85338] text-white shadow-tomato font-bold py-2.5 rounded-xl"
                      onSuccess={() => setPaymentSuccess(true)}
                    />
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Benefits Comparison Grid */}
        <div className="pt-12 border-t border-[#E8E4F0] space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-[#27243A]">Why Upgrade to Spotizan Premium?</h2>
            <p className="text-[#777387] text-xs sm:text-sm mt-1">
              Transparent benefits engineered for privacy, speed, and genuine adult connection.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-[#F1EDFF] border border-[#E8E4F0] space-y-2">
              <div className="w-9 h-9 rounded-xl bg-white border border-[#E8E4F0] flex items-center justify-center text-[#7960D8] mb-3 shadow-sm">
                <Zap className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-[#27243A] text-sm">Front of the Queue Priority</h4>
              <p className="text-xs text-[#777387] leading-relaxed">
                Premium members jump ahead of regular waiting queues, guaranteeing immediate connections with available participants.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#F1EDFF] border border-[#E8E4F0] space-y-2">
              <div className="w-9 h-9 rounded-xl bg-white border border-[#E8E4F0] flex items-center justify-center text-[#7960D8] mb-3 shadow-sm">
                <Globe2 className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-[#27243A] text-sm">State & Language Targeting</h4>
              <p className="text-xs text-[#777387] leading-relaxed">
                Filter prospective matches by state, regional dialect, or shared interests to discover people who speak your preferred language.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#F1EDFF] border border-[#E8E4F0] space-y-2">
              <div className="w-9 h-9 rounded-xl bg-white border border-[#E8E4F0] flex items-center justify-center text-[#218A58] mb-3 shadow-sm">
                <Lock className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-[#27243A] text-sm">Encrypted & Ad-Free</h4>
              <p className="text-xs text-[#777387] leading-relaxed">
                Zero third-party trackers, zero banner ads, and complete peer-to-peer WebRTC cryptographic transport encryption.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
