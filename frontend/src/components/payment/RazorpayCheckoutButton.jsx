import React, { useState } from 'react';
import { CreditCard, ShieldCheck, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

/**
 * Loads Razorpay checkout script if not already present on page.
 */
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Standard Razorpay Web Checkout Button Component
 *
 * @param {Object} props
 * @param {number} props.amount - Amount in paise (minimum 100 paise = ₹1.00)
 * @param {string} [props.currency='INR'] - Currency code
 * @param {string} [props.receipt] - Custom receipt identifier
 * @param {string} [props.buttonText] - Text on button
 * @param {string} [props.className] - Custom button styling classes
 * @param {Object} [props.notes] - Custom metadata
 * @param {Function} [props.onSuccess] - Callback when payment is verified
 * @param {Function} [props.onFailure] - Callback on payment failure or cancellation
 */
export function RazorpayCheckoutButton({
  amount = 10000, // 10000 paise = ₹100
  currency = 'INR',
  receipt,
  buttonText,
  className = '',
  notes = {},
  onSuccess,
  onFailure,
}) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const displayRupees = (amount / 100).toFixed(0);

  const handleCheckout = async () => {
    setError(null);
    setSuccess(false);

    if (!amount || amount < 100) {
      setError('Minimum payment amount is 100 paise (₹1.00).');
      return;
    }

    try {
      setLoading(true);

      // 1. Ensure Razorpay checkout.js script is loaded
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
      }

      // 2. Call backend order creation endpoint (STEP 1: POST /api/create-order)
      const orderPayload = {
        amount,
        currency,
        receipt: receipt || `rcpt_${Date.now()}`,
        notes: {
          ...notes,
          platform: 'Spotizan',
        },
      };

      const orderRes = await api.post('/create-order', orderPayload);

      if (!orderRes.success && !orderRes.order_id) {
        throw new Error(orderRes.error || orderRes.message || 'Failed to initialize Razorpay order');
      }

      const orderId = orderRes.order_id || orderRes.data?.order_id;
      const keyId =
        orderRes.key_id ||
        orderRes.data?.key_id ||
        import.meta.env.VITE_RAZORPAY_KEY_ID;

      // 3. STEP 2: Configure & open Razorpay standard checkout modal
      const options = {
        key: keyId,
        amount: orderRes.amount || amount,
        currency: orderRes.currency || currency,
        name: 'Spotizan 18+ Live Video Call',
        description: `Wallet Re-charge: ₹${displayRupees}`,
        order_id: orderId,
        handler: async function (response) {
          try {
            setLoading(true);

            // 4. STEP 3: Verify payment signature with backend (POST /api/verify-payment)
            const verifyPayload = {
              order_id: response.razorpay_order_id,
              payment_id: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              amount,
            };

            const verifyRes = await api.post('/verify-payment', verifyPayload);

            if (verifyRes.success && verifyRes.isPaid !== false) {
              setSuccess(true);
              if (onSuccess) onSuccess(verifyRes);
            } else {
              const failMsg = verifyRes.error || verifyRes.message || 'Payment signature verification failed.';
              setError(failMsg);
              if (onFailure) onFailure(new Error(failMsg));
            }
          } catch (verifyErr) {
            const errText = verifyErr.message || 'Payment verification endpoint failed.';
            setError(errText);
            if (onFailure) onFailure(verifyErr);
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: user?.displayName || '',
          email: user?.email || '',
        },
        theme: {
          color: '#6366f1',
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
            setError('Payment cancelled by user.');
            if (onFailure) onFailure(new Error('User closed payment modal'));
          },
        },
      };

      const rzpInstance = new window.Razorpay(options);

      // Handle payment.failed event
      rzpInstance.on('payment.failed', function (failResponse) {
        setLoading(false);
        const reason =
          failResponse.error?.description ||
          failResponse.error?.reason ||
          'Payment failed. Please try another payment method.';
        setError(`Payment Failed: ${reason}`);
        if (onFailure) onFailure(failResponse.error);
      });

      rzpInstance.open();
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Failed to initiate checkout.');
      if (onFailure) onFailure(err);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleCheckout}
        disabled={loading}
        className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:pointer-events-none bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-500/25 ${className}`}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-white" />
            <span>Processing with Razorpay...</span>
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4" />
            <span>{buttonText || `Pay ₹${displayRupees} via Razorpay`}</span>
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-200" />
          </>
        )}
      </button>

      {error && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Payment verified successfully! Balance credited.</span>
        </div>
      )}
    </div>
  );
}
