import { useState, useEffect } from 'react';
import { CreditCard, DollarSign, ArrowUpRight, ArrowDownLeft, Activity, AlertCircle, CheckCircle, Lock } from 'lucide-react';
import { api } from '../context/AuthContext';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

interface Transaction {
  _id: string;
  type: string;
  amount: number;
  status: string;
  reference: string;
  createdAt: string;
}

// Subcomponent for the Real Stripe Payment Form
function StripeCheckoutForm({
  amount,
  clientSecret,
  onSuccess,
  onCancel,
  onError
}: {
  amount: number;
  clientSecret: string;
  onSuccess: (refId: string) => void;
  onCancel: () => void;
  onError: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error('Card input not found');

      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (result.error) {
        onError(result.error.message || 'Payment failed');
      } else if (result.paymentIntent && result.paymentIntent.status === 'succeeded') {
        onSuccess(result.paymentIntent.id);
      }
    } catch (err: any) {
      onError(err.message || 'Payment execution failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <CardElement options={{
          style: {
            base: {
              fontSize: '16px',
              color: '#ffffff',
              '::placeholder': { color: '#a0aec0' },
            },
            invalid: { color: '#ef4444' },
          }
        }} />
      </div>
      <div className="flex gap-2" style={{ justifyContent: 'flex-end', marginTop: '0.5rem' }}>
        <button type="button" className="btn" onClick={onCancel} disabled={processing} style={{ background: 'var(--surface-hover)' }}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={!stripe || processing} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Lock size={16} /> {processing ? 'Processing...' : `Pay $${amount.toLocaleString()}`}
        </button>
      </div>
    </form>
  );
}

export default function PaymentSection() {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Stripe Flow State
  const [showCheckout, setShowCheckout] = useState(false);
  const [stripePromise, setStripePromise] = useState<any>(null);
  const [clientSecret, setClientSecret] = useState('');
  const [isMockPayment, setIsMockPayment] = useState(true);

  // Mock Card Input State
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/payments/history');
      setTransactions(res.data);
    } catch (err) {
      console.error('Failed to fetch payment history:', err);
    } finally {
      setFetchLoading(false);
    }
  };

  const handleStartDeposit = async () => {
    const parsedAmount = parseFloat(amount);
    if (!amount || parsedAmount <= 0) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.post('/payments/create-intent', { amount: parsedAmount });
      setIsMockPayment(res.data.isMock);
      setClientSecret(res.data.clientSecret);

      if (!res.data.isMock && res.data.publishableKey) {
        setStripePromise(loadStripe(res.data.publishableKey));
      }
      setShowCheckout(true);
    } catch (err: any) {
      setError(err.response?.data?.msg || 'Failed to initialize deposit.');
    } finally {
      setLoading(false);
    }
  };

  const handleStripeSuccess = async (refId: string) => {
    try {
      setLoading(true);
      const res = await api.post('/payments/confirm', {
        amount: parseFloat(amount),
        paymentIntentId: refId,
        isMock: false
      });
      setTransactions(prev => [res.data, ...prev]);
      setSuccess(`Successfully deposited $${parseFloat(amount).toLocaleString()}`);
      resetPaymentState();
    } catch (err: any) {
      setError(err.response?.data?.msg || 'Verification failed but payment was completed on Stripe.');
    } finally {
      setLoading(false);
    }
  };

  const handleMockSuccess = async () => {
    if (!cardNumber || !cardExpiry || !cardCvc) {
      setError('Please fill out all card details');
      return;
    }

    setLoading(true);
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      const res = await api.post('/payments/confirm', {
        amount: parseFloat(amount),
        paymentIntentId: 'mock_stripe_intent_' + Math.random().toString(36).substring(7),
        isMock: true
      });
      setTransactions(prev => [res.data, ...prev]);
      setSuccess(`Successfully deposited $${parseFloat(amount).toLocaleString()} (Sandbox)`);
      resetPaymentState();
    } catch (err: any) {
      setError('Mock confirmation failed.');
    } finally {
      setLoading(false);
    }
  };

  const resetPaymentState = () => {
    setShowCheckout(false);
    setAmount('');
    setCardNumber('');
    setCardExpiry('');
    setCardCvc('');
    setTimeout(() => setSuccess(''), 4000);
  };

  const totalBalance = transactions.reduce((acc, t) => acc + t.amount, 0);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
      <div className="flex flex-col gap-4" style={{ flex: '1 1 350px' }}>
        {/* Balance Card */}
        <div className="card" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #a855f7 50%, #ec4899 100%)', color: 'white', border: 'none', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ position: 'absolute', bottom: '-30px', left: '-30px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 500, opacity: 0.9 }}>Available Balance</h3>
              <CreditCard size={24} style={{ opacity: 0.8 }} />
            </div>
            <p style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              ${totalBalance.toLocaleString()}
            </p>
            <p style={{ fontSize: '0.85rem', opacity: 0.75 }}>Nexus Secure Wallet</p>
          </div>
        </div>

        {/* Deposit/Checkout Card */}
        <div className="card">
          {!showCheckout ? (
            <>
              <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <DollarSign size={18} style={{ color: 'var(--primary)' }} /> Deposit Funds
              </h3>
              <div className="flex gap-2">
                <div style={{ position: 'relative', flex: 1 }}>
                  <DollarSign size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="number"
                    className="form-input"
                    placeholder="10,000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    style={{ width: '100%', paddingLeft: '2.5rem' }}
                    min="1"
                  />
                </div>
                <button className="btn btn-primary" onClick={handleStartDeposit} disabled={loading || !amount}>
                  {loading ? 'Initializing...' : 'Deposit'}
                </button>
              </div>
            </>
          ) : (
            <div>
              <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CreditCard size={18} style={{ color: 'var(--primary)' }} /> Payment Details
              </h3>
              
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Amount:</span>
                  <span style={{ fontWeight: 'bold', color: 'white' }}>${parseFloat(amount).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Gateway:</span>
                  <span style={{ color: isMockPayment ? 'var(--warning)' : 'var(--success)' }}>
                    {isMockPayment ? 'Sandbox Simulator' : 'Stripe Real Payments'}
                  </span>
                </div>
              </div>

              {isMockPayment ? (
                /* Mock credit card form */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Card Number (e.g. 4242 4242 4242 4242)"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    maxLength={19}
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="form-input"
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      maxLength={5}
                      style={{ flex: 1 }}
                    />
                    <input
                      type="password"
                      className="form-input"
                      placeholder="CVC"
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value)}
                      maxLength={4}
                      style={{ flex: 1 }}
                    />
                  </div>
                  <div className="flex gap-2" style={{ justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <button className="btn" onClick={() => setShowCheckout(false)} disabled={loading} style={{ background: 'var(--surface-hover)' }}>
                      Cancel
                    </button>
                    <button className="btn btn-primary" onClick={handleMockSuccess} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Lock size={16} /> {loading ? 'Processing...' : `Pay $${parseFloat(amount).toLocaleString()}`}
                    </button>
                  </div>
                </div>
              ) : (
                /* Real Stripe Elements Form */
                stripePromise && clientSecret ? (
                  <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <StripeCheckoutForm
                      amount={parseFloat(amount)}
                      clientSecret={clientSecret}
                      onSuccess={handleStripeSuccess}
                      onCancel={() => setShowCheckout(false)}
                      onError={(msg) => setError(msg)}
                    />
                  </Elements>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Initializing Stripe...</p>
                )
              )}
            </div>
          )}

          {success && (
            <div style={{ marginTop: '0.75rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
              <CheckCircle size={16} /> {success}
            </div>
          )}
          {error && (
            <div style={{ marginTop: '0.75rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Lock size={12} /> Transactions are encrypted & secured by Stripe.
          </p>
        </div>
      </div>

      {/* Transaction History */}
      <div className="card" style={{ flex: '2 1 400px' }}>
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={20} style={{ color: 'var(--primary)' }} /> Transaction History
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: 'auto' }}>
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
          </span>
        </h2>

        {fetchLoading ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Loading transactions...</p>
        ) : transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            <Activity size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p>No transactions yet.</p>
            <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Make your first deposit to get started!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {transactions.map(t => (
              <div key={t._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--surface-hover)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    padding: '0.5rem',
                    borderRadius: '50%',
                    background: t.type === 'deposit' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                    color: t.type === 'deposit' ? 'var(--success)' : '#f59e0b'
                  }}>
                    {t.type === 'deposit' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                  </div>
                  <div>
                    <p style={{ fontWeight: 500, textTransform: 'capitalize' }}>{t.type}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatDate(t.createdAt)}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: 'bold', fontSize: '1.125rem', color: t.type === 'deposit' ? 'var(--success)' : 'var(--text-main)' }}>
                    {t.type === 'deposit' ? '+' : '-'}${Math.abs(t.amount).toLocaleString()}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{t.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
