import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const [wallet, setWallet] = useState({
    balancePaise: 0,
    reservedPaise: 0,
    creatorPayablePaise: 0,
    currency: 'INR',
    isActive: true,
  });
  const [loading, setLoading] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  const fetchWallet = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const res = await api.get('/wallet/me');
      if (res.success && res.data) {
        setWallet(res.data);
      }
    } catch (err) {
      console.warn('Failed to fetch wallet:', err.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchWallet();
    } else {
      setWallet({
        balancePaise: 0,
        reservedPaise: 0,
        creatorPayablePaise: 0,
        currency: 'INR',
        isActive: true,
      });
    }
  }, [isAuthenticated, fetchWallet]);

  const topupOrder = async (amountPaise) => {
    const res = await api.post('/wallet/topup/order', { amountPaise });
    return res.data;
  };

  const verifyTopup = async ({ razorpayOrderId, razorpayPaymentId, razorpaySignature, amountPaise }) => {
    const res = await api.post('/wallet/topup/verify', {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      amountPaise,
    });
    if (res.success && res.data?.wallet) {
      setWallet(res.data.wallet);
    }
    return res;
  };

  const requestPayout = async (payoutData) => {
    const res = await api.post('/wallet/payout/request', payoutData);
    if (res.success && res.data?.wallet) {
      setWallet(res.data.wallet);
    }
    return res.data;
  };

  const getLedger = async (page = 1, limit = 20) => {
    const res = await api.get(`/wallet/ledger?page=${page}&limit=${limit}`);
    return res.data;
  };

  const getCreatorEarnings = async () => {
    const res = await api.get('/wallet/creator-earnings');
    return res.data;
  };

  return (
    <WalletContext.Provider
      value={{
        wallet,
        loading,
        refreshWallet: fetchWallet,
        topupOrder,
        verifyTopup,
        requestPayout,
        getLedger,
        getCreatorEarnings,
        isWalletModalOpen,
        setIsWalletModalOpen,
        openWalletModal: () => setIsWalletModalOpen(true),
        closeWalletModal: () => setIsWalletModalOpen(false),
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
