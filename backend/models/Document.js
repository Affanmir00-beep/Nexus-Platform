const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  filePath: { type: String, required: true },
  status: { type: String, enum: ['pending', 'signed', 'draft'], default: 'pending' },
  version: { type: Number, default: 1 },
  signaturePath: { type: String } // e-signature image path
}, { timestamps: true });

module.exports = mongoose.model('Document', documentSchema);
