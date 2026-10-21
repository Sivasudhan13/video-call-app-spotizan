import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import App from '../src/App';
import * as apiModule from '../src/services/api';

const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('Spotizan Frontend App - Phase 3 Creator Discovery & Profiles', () => {
  beforeEach(() => {
    vi.spyOn(apiModule.api, 'getHealth').mockResolvedValue({
      success: true,
      status: 'healthy',
      uptimeSeconds: 120,
      database: { status: 'connected', target: 'mongodb' },
    });

    vi.spyOn(apiModule.api, 'get').mockImplementation((endpoint) => {
      if (endpoint === '/auth/me') {
        return Promise.resolve({ success: false, data: { user: null } });
      }
      if (endpoint.startsWith('/creators')) {
        return Promise.resolve({
          success: true,
          data: {
            creators: [
              {
                _id: 'creator-test-1',
                displayName: 'Priya Sharma',
                bio: 'Bilingual lifestyle creator and artist.',
                pricePerMinutePaise: 900,
                pricingTier: 'STANDARD',
                availabilityStatus: 'ONLINE',
                ratingAverage: 5.0,
                totalCallsCompleted: 12,
                languages: ['English', 'Hindi'],
                isVerified: true,
              },
            ],
            pagination: { totalCount: 1, currentPage: 1, totalPages: 1 },
          },
        });
      }
      return Promise.resolve({ success: true, data: {} });
    });
  });

  it('renders brand title, 18+ warning badges, and pricing rates', async () => {
    window.localStorage.setItem('spotizan_age_consent', 'true');

    await act(async () => {
      render(<App />);
    });

    expect(screen.getAllByText(/Spotizan/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/18\+/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Promo ₹7\/min/i)).toBeInTheDocument();
  });

  it('renders navigation links including Discover and Pricing', async () => {
    window.localStorage.setItem('spotizan_age_consent', 'true');

    await act(async () => {
      render(<App />);
    });

    expect(screen.getAllByText(/Discover/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Random Queue/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Pricing & Rates/i).length).toBeGreaterThan(0);
  });
});
