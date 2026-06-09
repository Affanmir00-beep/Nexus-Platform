const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  participant: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  participantEmail: { type: String }, // For inviting by email when user ID is unknown
  title: { type: String, required: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected', 'completed'], default: 'pending' },
  roomId: { type: String } // For WebRTC
}, { timestamps: true });

module.exports = mongoose.model('Meeting', meetingSchema);
