import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { RegisterPage } from '../src/pages/RegisterPage';
import { LoginPage } from '../src/pages/LoginPage';
import { ProfilePage } from '../src/pages/ProfilePage';
import { AuthProvider } from '../src/context/AuthContext';
import { WalletProvider } from '../src/context/WalletContext';
import * as apiModule from '../src/services/api';

describe('Gender Selection, Registration & User Profile UI Suite', () => {
  beforeEach(() => {
    vi.spyOn(apiModule.api, 'get').mockImplementation((endpoint) => {
      if (endpoint === '/auth/me') {
        return Promise.resolve({
          success: true,
          data: {
            user: {
              _id: 'user-test-123',
              displayName: 'Aarav Kumar',
              email: 'aarav@example.com',
              role: 'CUSTOMER',
              gender: 'MALE',
              genderPreference: 'FEMALE',
              isAdult: true,
              bio: 'Tech enthusiast',
              languages: ['English', 'Hindi'],
            },
          },
        });
      }
      if (endpoint === '/wallet/me') {
        return Promise.resolve({
          success: true,
          data: {
            wallet: {
              balancePaise: 50000,
              reservedPaise: 0,
              creatorPayablePaise: 0,
            },
          },
        });
      }
      if (endpoint.startsWith('/calls/history')) {
        return Promise.resolve({
          success: true,
          data: {
            calls: [
              {
                _id: 'call-1',
                sessionId: 'sess-1',
                callerId: { _id: 'user-test-123', displayName: 'Aarav Kumar' },
                receiverId: { _id: 'user-456', displayName: 'Priya Sharma' },
                callType: 'RANDOM_QUEUE',
                status: 'COMPLETED',
                durationSeconds: 110,
                isFreeCall: true,
                ratePerMinutePaise: 700,
                createdAt: new Date().toISOString(),
              },
            ],
            pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
          },
        });
      }
      if (endpoint.startsWith('/wallet/ledger')) {
        return Promise.resolve({
          success: true,
          data: {
            entries: [
              {
                _id: 'tx-1',
                category: 'TOPUP',
                entryType: 'CREDIT',
                amountPaise: 50000,
                balanceAfterPaise: 50000,
                description: 'Razorpay top-up',
                createdAt: new Date().toISOString(),
              },
            ],
          },
        });
      }
      return Promise.resolve({ success: true, data: {} });
    });
  });

  it('renders Male and Female selection cards on Registration Page', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <BrowserRouter>
            <RegisterPage />
          </BrowserRouter>
        </AuthProvider>
      );
    });

    // Check for Male and Female cards
    expect(screen.getAllByText('Male').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Female').length).toBeGreaterThan(0);
    expect(screen.getByText(/Video Chat Matching Preference/i)).toBeInTheDocument();
    expect(screen.getByText(/Statutory 18\+ Age & Terms Affirmation/i)).toBeInTheDocument();
    expect(screen.getByText(/Voluntarily Apply for Creator Program/i)).toBeInTheDocument();
  });

  it('renders experience selection cards and admin login link on Login Page', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <BrowserRouter>
            <LoginPage />
          </BrowserRouter>
        </AuthProvider>
      );
    });

    expect(screen.getAllByText('Male').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Female').length).toBeGreaterThan(0);
    expect(screen.getByText(/Staff Login/i)).toBeInTheDocument();
    expect(screen.getByText(/Signed HTTP-only cookie authentication active/i)).toBeInTheDocument();
  });

  it('renders User Profile with genuine call history and payment ledger tabs', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <WalletProvider>
            <BrowserRouter>
              <ProfilePage />
            </BrowserRouter>
          </WalletProvider>
        </AuthProvider>
      );
    });

    expect(screen.getByText(/Profile & Preferences/i)).toBeInTheDocument();
    expect(screen.getByText(/Call History/i)).toBeInTheDocument();
    expect(screen.getByText(/Payment History/i)).toBeInTheDocument();

    // Switch to Call History tab
    await act(async () => {
      fireEvent.click(screen.getByText(/Call History/i));
    });

    expect(await screen.findByText(/Call Session History/i)).toBeInTheDocument();
    expect(await screen.findByText(/FREE CALL/i)).toBeInTheDocument();

    // Switch to Payment History tab
    await act(async () => {
      fireEvent.click(screen.getByText(/Payment History/i));
    });

    expect(await screen.findByText(/Wallet & Payment Ledger/i)).toBeInTheDocument();
    expect(await screen.findByText(/Razorpay top-up/i)).toBeInTheDocument();
  });
});
