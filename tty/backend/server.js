// 1. Environment and Dependencies
require('dotenv').config({ debug: true });
const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Debug logs
console.log('Current directory:', process.cwd());
console.log('Trying to load .env from:', path.resolve('.env'));
// Add to server.js
const cors = require('cors');
app.use(cors());
// 2. Initialize App
const app = express();
app.use(express.json());

// 3. Cloudinary Configuration (optional)
if (process.env.CLOUDINARY_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET,
    secure: true
  });
}

// 4. MongoDB Connection (optional)
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB connection error:', err));
}

// 5. Configure Static Files
const staticDirs = [
  express.static(path.join(__dirname, '../frontend')), // Frontend files
  express.static(path.join(__dirname, 'public/uploads')) // Uploaded videos
];
app.use(staticDirs);

// 6. Multer Configuration for Local Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'public/uploads');
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

// 7. Upload Endpoint
app.post('/upload', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    // Local response
    const response = {
      status: "success",
      message: "Video saved locally",
      path: `/uploads/${req.file.filename}`,
      filename: req.file.filename
    };

    // Optional Cloudinary upload
    if (process.env.CLOUDINARY_NAME) {
      const cloudResult = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "video",
        folder: "videos"
      });
      response.cloudinary = {
        url: cloudResult.secure_url,
        duration: cloudResult.duration
      };
    }

    res.json(response);

  } catch (err) {
    console.error('Upload Error:', err);
    res.status(500).json({ 
      error: "Upload failed",
      details: err.message,
      fix: process.env.CLOUDINARY_NAME ? "Check Cloudinary config" : "Check upload directory permissions"
    });
  }
});

// 8. Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
✅ Server running on http://localhost:${PORT}
📌 Upload endpoint: POST http://localhost:${PORT}/upload
📁 Local storage: ${path.join(__dirname, 'public/uploads')}
🌐 Frontend: ${path.join(__dirname, '../frontend')}
  `);
});