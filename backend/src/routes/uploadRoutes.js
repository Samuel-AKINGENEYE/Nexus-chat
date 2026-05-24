const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Returns a signed upload signature so the browser can upload directly to Cloudinary
router.post('/sign', authenticate, (req, res) => {
  try {
    const timestamp = Math.round(Date.now() / 1000);
    const params = { timestamp, folder: 'nexus' };
    const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET);
    res.json({
      timestamp,
      signature,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      folder: 'nexus'
    });
  } catch {
    res.status(500).json({ error: 'Failed to generate upload signature' });
  }
});

module.exports = router;
