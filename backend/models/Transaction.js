const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['deposit', 'withdraw', 'transfer'], required: true },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  reference: { type: String } // e.g., Stripe PaymentIntent ID
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
