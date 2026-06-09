const express = require('express');
const router = express.Router();
const Meeting = require('../models/Meeting');
const User = require('../models/User');
const auth = require('../middleware/auth');
const crypto = require('crypto');

// @route   POST /api/meetings
// @desc    Schedule a meeting
// @access  Private
router.post('/', auth, async (req, res) => {
  const { title, date, participant } = req.body;

  if (!title || !date) {
    return res.status(400).json({ msg: 'Title and date are required' });
  }

  try {
    const roomId = crypto.randomUUID();
    const meetingData = {
      requester: req.user.id,
      title,
      date: new Date(date),
      roomId
    };

    // If participant email is provided, look up user
    if (participant) {
      const participantUser = await User.findOne({ email: participant });
      if (participantUser) {
        // Conflict detection (ensure neither party is double-booked at this time)
        const existingMeeting = await Meeting.findOne({
          $or: [
            { requester: req.user.id },
            { participant: req.user.id },
            { requester: participantUser._id },
            { participant: participantUser._id }
          ],
          date: new Date(date),
          status: { $in: ['pending', 'accepted'] }
        });

        if (existingMeeting) {
          return res.status(400).json({ msg: 'Either you or the participant already has a meeting scheduled at this time' });
        }

        meetingData.participant = participantUser._id;
      } else {
        meetingData.participantEmail = participant;
      }
    }

    const newMeeting = new Meeting(meetingData);
    const meeting = await newMeeting.save();
    
    // Populate before returning
    const populated = await Meeting.findById(meeting._id)
      .populate('requester', 'name email role')
      .populate('participant', 'name email role');
    
    res.json(populated);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/meetings
// @desc    Get user's meetings
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const meetings = await Meeting.find({
      $or: [{ requester: req.user.id }, { participant: req.user.id }]
    })
      .populate('requester', 'name email role')
      .populate('participant', 'name email role')
      .sort({ date: -1 });

    res.json(meetings);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT /api/meetings/:id
// @desc    Accept/Reject meeting
// @access  Private
router.put('/:id', auth, async (req, res) => {
  const { status } = req.body; // 'accepted' or 'rejected'

  if (!['accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ msg: 'Status must be accepted or rejected' });
  }

  try {
    let meeting = await Meeting.findById(req.params.id);

    if (!meeting) return res.status(404).json({ msg: 'Meeting not found' });

    // Allow the participant OR the requester to update status
    meeting.status = status;
    await meeting.save();

    const populated = await Meeting.findById(meeting._id)
      .populate('requester', 'name email role')
      .populate('participant', 'name email role');

    res.json(populated);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
