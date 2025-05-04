// 1. Environment and Dependencies (MUST BE AT TOP)
require('dotenv').config({ debug: true });
const express = require('express');
const cors = require('cors'); // Moved up with other requires
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// 2. Initialize App
const app = express();

// 3. Middleware Setup (MUST COME AFTER app INITIALIZATION)
app.use(cors()); // Now correctly placed
app.use(express.json());

// Debug logs
console.log('Current directory:', process.cwd());
console.log('Trying to load .env from:', path.resolve('.env'));

// 4. Cloudinary Configuration (optional)
if (process.env.CLOUDINARY_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET,
    secure: true
  });
}

// 5. MongoDB Connection (optional)
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB connection error:', err));
}

// 6. Configure Static Files
app.use(express.static(path.join(__dirname, '../../frontend'))); // Frontend
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads'))); // Videos

// 7. Multer Configuration
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

// 8. Upload Endpoint
app.post('/upload', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const response = {
      status: "success",
      message: "Video saved successfully",
      path: `/uploads/${req.file.filename}`,
      filename: req.file.filename
    };

    if (process.env.CLOUDINARY_NAME) {
      const cloudResult = await cloudinary.uploader.upload(req.file.path, {
        resource_type: "video",
        folder: "videos"
      });
      response.cloudinary = {
        url: cloudResult.secure_url,
        duration: cloudResult.duration
      };
      fs.unlinkSync(req.file.path); // Remove local file after Cloudinary upload
    }

    res.json(response);

  } catch (err) {
    console.error('Upload Error:', err);
    res.status(500).json({ 
      error: "Upload failed",
      details: err.message
    });
  }
});

// 9. Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
✅ Server running on port ${PORT}
📌 Upload endpoint: POST http://localhost:${PORT}/upload
📁 Local storage: ${path.join(__dirname, 'public/uploads')}
🌐 Frontend: ${path.join(__dirname, '../../frontend')}
  `);
});