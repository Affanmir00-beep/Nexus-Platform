const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');
const stripe = require('stripe')(
  process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'sk_test_mock_key_for_now'
    ? process.env.STRIPE_SECRET_KEY
    : 'sk_test_dummy' // dummy string to avoid stripe constructor crash if empty
);

// Check if Stripe is configured
const isStripeConfigured = () => {
  return process.env.STRIPE_SECRET_KEY && 
         process.env.STRIPE_SECRET_KEY.startsWith('sk_') && 
         process.env.STRIPE_SECRET_KEY !== 'sk_test_mock_key_for_now';
};

// @route   POST /api/payments/create-intent
// @desc    Create Stripe Payment Intent
// @access  Private
router.post('/create-intent', auth, async (req, res) => {
  const { amount } = req.body;

  if (!amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ msg: 'Please provide a valid amount' });
  }

  try {
    if (!isStripeConfigured()) {
      // Return a dummy client secret for frontend mock handling
      return res.json({
        clientSecret: 'mock_client_secret_' + Math.random().toString(36).substring(7),
        isMock: true,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || ''
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // convert to cents
      currency: 'usd',
      metadata: { userId: req.user.id }
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      isMock: false,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || ''
    });
  } catch (err) {
    console.error('Stripe Intent Error:', err.message);
    res.status(500).json({ msg: 'Failed to initialize payment gateway' });
  }
});

// @route   POST /api/payments/confirm
// @desc    Confirm and record Stripe or mock payment
// @access  Private
router.post('/confirm', auth, async (req, res) => {
  const { amount, paymentIntentId, isMock } = req.body;

  try {
    let finalStatus = 'completed';
    let reference = paymentIntentId || 'mock_stripe_intent_id';

    if (!isMock && isStripeConfigured() && paymentIntentId) {
      // Verify payment with Stripe directly
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({ msg: 'Payment verification failed' });
      }
      reference = paymentIntent.id;
    }

    const transaction = new Transaction({
      user: req.user.id,
      amount: parseFloat(amount),
      type: 'deposit',
      status: finalStatus,
      reference: reference
    });

    await transaction.save();
    res.json(transaction);
  } catch (err) {
    console.error('Payment Confirmation Error:', err.message);
    res.status(500).json({ msg: 'Payment confirmation failed' });
  }
});

// @route   POST /api/payments/deposit
// @desc    Mock deposit funds (retained for backward compatibility or simple debugging)
// @access  Private
router.post('/deposit', auth, async (req, res) => {
  const { amount } = req.body;

  try {
    const transaction = new Transaction({
      user: req.user.id,
      amount,
      type: 'deposit',
      status: 'completed',
      reference: 'mock_stripe_intent_id'
    });

    await transaction.save();
    res.json(transaction);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/payments/history
// @desc    Get user's transactions
// @access  Private
router.get('/history', auth, async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(transactions);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
