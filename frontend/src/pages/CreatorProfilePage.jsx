import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import {
  PhoneCall,
  Video,
  Star,
  CheckCircle2,
  Globe,
  Coins,
  Shield,
  ArrowLeft,
  Sparkles,
  ShieldAlert,
  Clock,
  Heart,
  MessageSquare,
} from 'lucide-react';

export function CreatorProfilePage() {
  const { id } = useParams();
  const [creator, setCreator] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fallbackMap = {
    c1: {
      _id: 'c1',
      displayName: 'Aaradhya Sen',
      category: 'Lifestyle & Chat',
      rating: 4.9,
      reviewsCount: 142,
      languages: ['English', 'Hindi', 'Bengali'],
      pricePerMinutePaise: 900,
      availabilityStatus: 'ONLINE',
      bio: 'Enthusiastic conversations, deep talks, and travel stories. I love connecting with open-minded individuals to discuss culture, personal growth, and daily passions.',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    },
    c2: {
      _id: 'c2',
      displayName: 'Priya Verma',
      category: 'Art & Voice Acting',
      rating: 5.0,
      reviewsCount: 219,
      languages: ['Hindi', 'English'],
      pricePerMinutePaise: 1200,
      availabilityStatus: 'ONLINE',
      bio: 'Professional voice artist and creative storyteller. Let us talk about cinema, books, voice modulation, and relaxing lifestyle banter.',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
    },
    c3: {
      _id: 'c3',
      displayName: 'Meera Kapoor',
      category: 'Music & Banter',
      rating: 4.8,
      reviewsCount: 98,
      languages: ['Punjabi', 'Hindi', 'English'],
      pricePerMinutePaise: 700,
      availabilityStatus: 'ONLINE',
      bio: 'Musician and coffee aficionado. Always happy to jump on a video call for fun banter, acoustic songs, and positive vibrations.',
      avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80',
    },
  };

  useEffect(() => {
    setLoading(true);
    api.get(`/creators/${id}`)
      .then((res) => {
        if (res.success && res.data?.creator) {
          setCreator(res.data.creator);
        } else if (fallbackMap[id]) {
          setCreator(fallbackMap[id]);
        } else {
          setError('Creator not found');
        }
      })
      .catch((err) => {
        if (fallbackMap[id]) {
          setCreator(fallbackMap[id]);
        } else {
          setError(err.message || 'Unable to load creator profile');
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-[#777387] text-sm bg-white">
        Loading creator profile...
      </div>
    );
  }

  if (error || !creator) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-[#F1EDFF] border border-[#E8E4F0] rounded-2xl text-center space-y-4">
        <h3 className="text-lg font-bold text-[#27243A]">Creator Not Found</h3>
        <p className="text-xs text-[#777387]">{error || 'This creator does not exist or is not verified.'}</p>
        <Link to="/discover">
          <Button variant="outline" size="sm" icon={ArrowLeft}>
            Back to Discover
          </Button>
        </Link>
      </div>
    );
  }

  const rateInRupees = (creator.pricePerMinutePaise / 100).toFixed(0);
  const isOnline = creator.availabilityStatus === 'ONLINE' || !creator.availabilityStatus;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6 flex-1 bg-white text-[#27243A]">
      <Link to="/discover" className="inline-flex items-center gap-1.5 text-xs text-[#777387] hover:text-[#7960D8] transition-colors font-medium">
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Discover</span>
      </Link>

      <Card className="p-6 md:p-8 space-y-6 bg-white border border-[#E8E4F0] shadow-card">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          {/* Avatar with Verified check */}
          <div className="relative shrink-0">
            {creator.avatarUrl ? (
              <img
                src={creator.avatarUrl}
                alt={creator.displayName}
                className="w-28 h-28 rounded-3xl object-cover border-2 border-[#E8E4F0] shadow-md"
              />
            ) : (
              <div className="w-28 h-28 rounded-3xl bg-[#7960D8] flex items-center justify-center text-white text-3xl font-black shadow-md shadow-[#7960D8]/20">
                {creator.displayName?.charAt(0).toUpperCase() || 'C'}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 p-1 bg-white rounded-full shadow-md">
              <CheckCircle2 className="w-5 h-5 text-[#218A58]" />
            </div>
          </div>

          {/* Core Info */}
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-2xl font-black text-[#27243A]">
                {creator.displayName}
              </h1>
              <Badge variant="verified">100% KYC VERIFIED</Badge>
              {isOnline ? (
                <Badge variant="live">
                  <span className="w-2 h-2 rounded-full bg-[#FF6347] animate-ping" />
                  ONLINE
                </Badge>
              ) : (
                <Badge variant="neutral">OFFLINE</Badge>
              )}
            </div>

            <p className="text-xs text-[#7960D8] font-bold">
              {creator.category || 'Creator & Host'}
            </p>

            <div className="flex items-center justify-center sm:justify-start gap-3 text-xs text-[#777387] pt-1">
              <div className="flex items-center gap-1 font-bold text-amber-500">
                <Star className="w-4 h-4 fill-current" />
                <span>{creator.rating || 4.9}</span>
                <span className="text-[#777387] font-normal">({creator.reviewsCount || 120} reviews)</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1 text-[#27243A]">
                <Clock className="w-3.5 h-3.5 text-[#7960D8]" />
                <span>Fast Acceptance (&lt; 30s)</span>
              </div>
            </div>

            <p className="text-xs text-[#777387] leading-relaxed pt-2">
              {creator.bio || 'Verified creator ready to connect for live video conversations.'}
            </p>
          </div>

          {/* Pricing & Call CTA Card */}
          <div className="w-full sm:w-60 p-4 rounded-2xl bg-[#F1EDFF] border border-[#E8E4F0] space-y-3 shrink-0 text-center">
            <div className="text-[11px] text-[#777387] font-medium">Per-Minute Rate</div>
            <div className="text-3xl font-black text-[#27243A] font-mono">
              ₹{rateInRupees}
              <span className="text-xs text-[#777387] font-sans font-normal"> / min</span>
            </div>

            <Link to="/queue" className="block w-full">
              <Button
                variant="primary"
                size="md"
                className="w-full shadow-tomato font-bold"
                icon={Video}
              >
                Start Video Call
              </Button>
            </Link>

            <p className="text-[10px] text-[#777387]">
              Encrypted 1-on-1 WebRTC video call with instant reservation hold release.
            </p>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#E8E4F0] text-xs">
          <div className="p-4 rounded-xl bg-[#F1EDFF]/60 border border-[#E8E4F0] space-y-2">
            <span className="font-bold text-[#27243A] block">Languages Spoken</span>
            <div className="flex flex-wrap gap-1.5">
              {(creator.languages || ['English', 'Hindi']).map((lang, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-white border border-[#E8E4F0] text-[11px] text-[#7960D8] font-medium"
                >
                  {lang}
                </span>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#F1EDFF]/60 border border-[#E8E4F0] space-y-2">
            <span className="font-bold text-[#27243A] block">Trust & Verification</span>
            <ul className="text-[#777387] space-y-1">
              <li className="flex items-center gap-1.5 text-[#218A58]">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Identity & Age Verified (18+)</span>
              </li>
              <li className="flex items-center gap-1.5 text-[#218A58]">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Consensual Communication Agreement Signed</span>
              </li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
