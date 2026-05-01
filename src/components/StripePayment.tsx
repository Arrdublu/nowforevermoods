import * as React from 'react';
import { useState, useEffect, FormEvent } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  PaymentElement,
  Elements,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

function CheckoutForm({ amount, currency, onTableSuccess }: { amount: number, currency: string, onTableSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/booking/success`,
      },
      redirect: 'if_required', // Attempt to stay in app
    });

    if (error) {
      setErrorMessage(error.message || 'An unexpected error occurred.');
      setLoading(false);
    } else {
      // Payment succeeded or requires dynamic action that didn't trigger redirect
      setSuccess(true);
      setLoading(false);
      onTableSuccess();
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
        <CheckCircle2 className="w-16 h-16 text-emerald-500 animate-bounce" />
        <h3 className="font-serif text-2xl text-brand-black italic">Payment Authorized</h3>
        <p className="text-sm text-brand-muted uppercase tracking-[0.2em] font-bold">Session Telemetry Secured</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement className="mb-6" />
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-100 flex items-center gap-3 text-red-600 text-xs font-bold uppercase tracking-widest">
          <AlertCircle size={16} />
          {errorMessage}
        </div>
      )}
      <Button 
        type="submit" 
        disabled={!stripe || loading} 
        className="w-full bg-brand-black text-white hover:bg-zinc-800 rounded-none h-16 uppercase tracking-[0.4em] text-[10px] font-bold shadow-lg"
      >
        {loading ? <Loader2 className="animate-spin" /> : `Authorize ${currency.toUpperCase()} ${amount.toLocaleString()}`}
      </Button>
    </form>
  );
}

export function StripePayment({ amount, currency, bookingId, userId, onSuccess, prefetchedClientSecret }: { amount: number, currency: string, bookingId: string, userId: string, onSuccess: () => void, prefetchedClientSecret?: string }) {
  const [clientSecret, setClientSecret] = useState<string | null>(prefetchedClientSecret || null);

  useEffect(() => {
    if (prefetchedClientSecret) return;
    
    // Create PaymentIntent as soon as the component mounts if not prefetched
    fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, userId }),
    })
      .then((res) => res.json())
      .then((data) => setClientSecret(data.clientSecret));
  }, [amount, currency, bookingId, userId]);

  const appearance = {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#000000',
      colorBackground: '#ffffff',
      colorText: '#000000',
      colorDanger: '#df1b41',
      fontFamily: 'Inter, system-ui, sans-serif',
      spacingUnit: '4px',
      borderRadius: '0px',
    },
  };

  const options = {
    clientSecret,
    appearance,
  };

  if (!clientSecret) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-brand-muted" />
        <p className="text-[10px] uppercase tracking-widest font-bold text-brand-muted">Initializing Secure Terminal...</p>
      </div>
    );
  }

  return (
    <div className="p-2">
      <Elements stripe={stripePromise} options={options}>
        <CheckoutForm amount={amount / 100} currency={currency} onTableSuccess={onSuccess} />
      </Elements>
    </div>
  );
}
