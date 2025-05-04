// 1. Environment and Dependencies
require('dotenv').config({ debug: true });
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// 2. Initialize App
const app = express();

// 3. Middleware
app.use(cors());
app.use(express.json());

// Debug logs
console.log('Current directory:', process.cwd());
console.log('Trying to load .env from:', path.resolve('.env'));

// 4. Cloudinary Configuration
if (process.env.CLOUDINARY_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET,
    secure: true
  });
}

// 5. MongoDB Connection
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB connection error:', err));
}

// 6. Configure Static Files
const getStaticPath = () => {
  const basePath = path.join(__dirname, '../../tty/frontend');
  const renderPath = path.join(__dirname, '../../../tty/frontend'); // For Render
  
  if (process.env.NODE_ENV === 'production' && fs.existsSync(renderPath)) {
    console.log('Using Render-compatible frontend path');
    return renderPath;
  }
  return basePath;
};

const staticPath = getStaticPath();
const uploadsPath = path.join(__dirname, 'public/uploads');

// Ensure directories exist
[uploadsPath].forEach(dir => {
  if (!fs.existsSync(dir)) {
    console.log(`Creating directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Serve static files with fallback
if (fs.existsSync(path.join(staticPath, 'index.html'))) {
  app.use(express.static(staticPath));
  console.log(`✅ Serving frontend from: ${staticPath}`);
} else {
  console.warn(`⚠️ Frontend not found at: ${staticPath}`);
}

// 7. Multer Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }
});

// 8. Routes
app.get('/', (req, res) => {
  const indexPath = path.join(staticPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).json({
      status: 'running',
      message: 'Video Upload API is operational',
      endpoints: {
        upload: 'POST /upload'
      }
    });
  }
});

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
      fs.unlinkSync(req.file.path);
    }

    res.json(response);

  } catch (err) {
    console.error('Upload Error:', err);
    res.status(500).json({ 
      error: "Upload failed",
      details: err.message,
      solution: "Check file size (<100MB) and format (MP4, MOV, etc.)"
    });
  }
});

// 9. Start Server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`
✅ Server running on port ${PORT}
📌 Upload endpoint: POST http://localhost:${PORT}/upload
📁 Local storage: ${uploadsPath}
🌐 Frontend: ${staticPath}
🔍 Environment: ${process.env.NODE_ENV || 'development'}
  `);
});