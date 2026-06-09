const express = require('express');
const router = express.Router();
const multer = require('multer');
const Document = require('../models/Document');
const auth = require('../middleware/auth');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure memory storage to allow processing the file buffer dynamically
const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Helper function to handle Cloudinary upload stream
const uploadToCloudinary = (fileBuffer, folderName) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: folderName,
        resource_type: 'auto',
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result.secure_url);
        }
      }
    );
    stream.end(fileBuffer);
  });
};

// Helper function to save file locally as a fallback
const saveLocally = (fileBuffer, originalname) => {
  const dir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const filename = Date.now() + '-' + (originalname || 'document');
  const fullPath = path.join(dir, filename);
  fs.writeFileSync(fullPath, fileBuffer);
  return `/uploads/${filename}`;
};

// @route   POST /api/documents
// @desc    Upload a document
// @access  Private
router.post('/', [auth, upload.single('document')], async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ msg: 'No file uploaded' });
  }

  try {
    let filePath = '';
    let uploadSuccess = false;

    // Only try Cloudinary if credentials look somewhat configured
    if (
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET &&
      process.env.CLOUDINARY_API_KEY !== 'placeholder'
    ) {
      try {
        filePath = await uploadToCloudinary(req.file.buffer, 'nexus_documents');
        uploadSuccess = true;
      } catch (cloudErr) {
        console.warn('Cloudinary upload failed (possibly invalid keys). Falling back to local storage:', cloudErr.message);
      }
    }

    if (!uploadSuccess) {
      filePath = saveLocally(req.file.buffer, req.file.originalname);
    }

    const newDoc = new Document({
      title: req.body.title || req.file.originalname || 'Untitled Document',
      uploader: req.user.id,
      filePath: filePath
    });

    const doc = await newDoc.save();
    const populated = await Document.findById(doc._id).populate('uploader', 'name email');
    res.json(populated);
  } catch (err) {
    console.error('Document upload endpoint error:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/documents
// @desc    Get all documents for user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const docs = await Document.find({ uploader: req.user.id })
      .populate('uploader', 'name email')
      .sort({ createdAt: -1 });
    res.json(docs);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/documents/:id/sign
// @desc    Add e-signature to document
// @access  Private
router.post('/:id/sign', [auth, upload.single('signature')], async (req, res) => {
  try {
    let doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ msg: 'Document not found' });

    let signaturePath = null;

    if (req.file) {
      let uploadSuccess = false;
      if (
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET &&
        process.env.CLOUDINARY_API_KEY !== 'placeholder'
      ) {
        try {
          signaturePath = await uploadToCloudinary(req.file.buffer, 'nexus_signatures');
          uploadSuccess = true;
        } catch (cloudErr) {
          console.warn('Cloudinary signature upload failed. Falling back to local storage:', cloudErr.message);
        }
      }

      if (!uploadSuccess) {
        signaturePath = saveLocally(req.file.buffer, 'signature.png');
      }
    }

    doc.status = 'signed';
    if (signaturePath) doc.signaturePath = signaturePath;

    await doc.save();

    const populated = await Document.findById(doc._id).populate('uploader', 'name email');
    res.json(populated);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
