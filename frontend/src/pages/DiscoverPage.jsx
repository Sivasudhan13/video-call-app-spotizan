import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import {
  Search,
  SlidersHorizontal,
  Video,
  Globe,
  Star,
  CheckCircle2,
  Sparkles,
  PhoneCall,
  UserCheck,
} from 'lucide-react';

export function DiscoverPage() {
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [selectedTier, setSelectedTier] = useState('');
  const [onlineOnly, setOnlineOnly] = useState(false);
  const languagesList = ['English', 'Hindi', 'Punjabi', 'Bengali', 'Tamil', 'Telugu', 'Marathi'];

  const fetchCreators = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedLanguage) params.append('language', selectedLanguage);
      if (selectedTier) params.append('pricingTier', selectedTier);
      if (onlineOnly) params.append('availabilityStatus', 'ONLINE');

      const res = await api.get(`/creators?${params.toString()}`);
      if (res.success && Array.isArray(res.data?.creators)) {
        setCreators(res.data.creators);
      } else {
        setCreators([]);
      }
    } catch (err) {
      setCreators([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCreators();
    }, 250);

    // Live polling: keep real-time creator availability updated
    const interval = setInterval(fetchCreators, 10000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [search, selectedLanguage, selectedTier, onlineOnly]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 flex-1 bg-white text-[#27243A]">
      {/* Page Title & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-black text-[#27243A] tracking-tight">
              Verified Creator Marketplace
            </h1>
            <Badge variant="adult">18+</Badge>
          </div>
          <p className="text-xs sm:text-sm text-[#777387]">
            Connect directly with 100% KYC-verified creators. Transparent per-minute INR rates with live presence.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#777387] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, interests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#E8E4F0] text-xs text-[#27243A] placeholder-[#777387] focus:outline-none focus:border-[#7960D8] shadow-sm"
          />
        </div>
      </div>

      {/* Filter Controls Row */}
      <div className="p-4 rounded-2xl bg-[#F1EDFF] border border-[#E8E4F0] flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#7960D8] mr-2">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Filters:</span>
        </div>

        {/* Language Filter */}
        <select
          value={selectedLanguage}
          onChange={(e) => setSelectedLanguage(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-white border border-[#E8E4F0] text-xs text-[#27243A] font-medium focus:outline-none focus:border-[#7960D8]"
        >
          <option value="">All Languages</option>
          {languagesList.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>

        {/* Availability Toggle */}
        <button
          onClick={() => setOnlineOnly(!onlineOnly)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            onlineOnly
              ? 'bg-[#FFF0EC] text-[#FF6347] border-[#FFC7BD] font-bold'
              : 'bg-white text-[#777387] border-[#E8E4F0] hover:text-[#27243A]'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              onlineOnly ? 'bg-[#FF6347] animate-pulse' : 'bg-[#777387]'
            }`}
          />
          Online Only
        </button>

        {/* Pricing Tier */}
        <select
          value={selectedTier}
          onChange={(e) => setSelectedTier(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-white border border-[#E8E4F0] text-xs text-[#27243A] font-medium focus:outline-none focus:border-[#7960D8]"
        >
          <option value="">All Price Tiers</option>
          <option value="promo">Promo Tier (₹7/min)</option>
          <option value="standard">Standard Tier (₹9/min)</option>
          <option value="premium">Top Tier (₹12–₹15/min)</option>
        </select>

        {(search || selectedLanguage || selectedTier || onlineOnly) && (
          <button
            onClick={() => {
              setSearch('');
              setSelectedLanguage('');
              setSelectedTier('');
              setOnlineOnly(false);
            }}
            className="text-xs text-[#7960D8] hover:underline ml-auto font-bold"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Creator Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-72 rounded-2xl bg-[#F1EDFF] border border-[#E8E4F0] animate-pulse p-5 space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#E8E4F0] mx-auto" />
              <div className="h-4 bg-[#E8E4F0] rounded w-1/2 mx-auto" />
              <div className="h-3 bg-[#E8E4F0] rounded w-3/4 mx-auto" />
              <div className="h-8 bg-[#E8E4F0] rounded mt-6" />
            </div>
          ))}
        </div>
      ) : creators.length === 0 ? (
        <div className="p-12 text-center bg-[#F1EDFF] border border-[#E8E4F0] rounded-3xl space-y-4 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-white border border-[#E8E4F0] text-[#7960D8] mx-auto flex items-center justify-center shadow-card">
            <UserCheck className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-[#27243A]">No Creators Match Filters</h3>
          <p className="text-xs text-[#777387] leading-relaxed">
            Try adjusting your search query or clear the active language/status filters.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearch('');
              setSelectedLanguage('');
              setSelectedTier('');
              setOnlineOnly(false);
            }}
          >
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {creators.map((creator) => {
            const rateInRupees = (creator.pricePerMinutePaise / 100).toFixed(0);
            const isOnline = creator.availabilityStatus === 'ONLINE';

            return (
              <Card
                key={creator._id}
                hoverEffect
                className="flex flex-col justify-between space-y-4 border-[#E8E4F0] hover:border-[#B9A7F5] bg-white p-5"
              >
                <div>
                  {/* Status Banner & Price Tag */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        isOnline
                          ? 'bg-[#E8F8F0] text-[#218A58] border-[#A8E6C5]'
                          : 'bg-[#F1EDFF] text-[#777387] border-[#E8E4F0]'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isOnline ? 'bg-[#218A58] animate-pulse' : 'bg-[#777387]'
                        }`}
                      />
                      {creator.availabilityStatus || 'ONLINE'}
                    </span>

                    <span className="text-xs font-bold text-[#FF6347] px-2 py-0.5 rounded-lg bg-[#FFF0EC] border border-[#FFC7BD]">
                      ₹{rateInRupees}/min
                    </span>
                  </div>

                  {/* Creator Photo / Avatar & Name */}
                  <div className="text-center space-y-2 mb-3">
                    <div className="relative inline-block">
                      {creator.avatarUrl ? (
                        <img
                          src={creator.avatarUrl}
                          alt={creator.displayName}
                          className="w-20 h-20 rounded-2xl object-cover border-2 border-[#E8E4F0] mx-auto shadow-sm"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-2xl bg-[#7960D8] flex items-center justify-center text-white text-2xl font-black shadow-md shadow-[#7960D8]/20 mx-auto">
                          {creator.displayName?.charAt(0).toUpperCase() || 'C'}
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 p-0.5 bg-white rounded-full shadow">
                        <CheckCircle2 className="w-4 h-4 text-[#218A58]" />
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-[#27243A] text-base">
                        {creator.displayName}
                      </h3>
                      <p className="text-xs text-[#7960D8] font-medium">
                        {creator.category || 'Creator'}
                      </p>
                    </div>
                  </div>

                  {/* Creator Bio Snippet */}
                  <p className="text-xs text-[#777387] line-clamp-2 leading-relaxed text-center mb-3">
                    {creator.bio || 'Verified creator ready to connect for live video conversations.'}
                  </p>

                  {/* Language Badges */}
                  <div className="flex flex-wrap justify-center gap-1.5 mb-2">
                    {(creator.languages || ['English', 'Hindi']).slice(0, 3).map((lang, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-[#F1EDFF] text-[10px] text-[#7960D8] font-medium"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t border-[#E8E4F0] flex gap-2">
                  <Link to={`/creator/${creator._id}`} className="flex-1">
                    <Button variant="primary" size="sm" className="w-full" icon={Video}>
                      Start Call
                    </Button>
                  </Link>
                  <Link to={`/creator/${creator._id}`}>
                    <Button variant="outline" size="sm">
                      Profile
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
