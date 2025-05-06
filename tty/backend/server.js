// 1. Load Environment & Dependencies
require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const multer    = require('multer');
const cloudinary = require('cloudinary').v2;
const mongoose  = require('mongoose');
const fs        = require('fs');
const path      = require('path');

// 2. App Init
const app = express();
app.use(cors());
app.use(express.json());

// 3. Determine Environment
const isProduction = process.env.NODE_ENV === 'production';

// 4. Debug Info
console.log('▶️  Environment:', process.env.NODE_ENV || 'development');
console.log('▶️  Using Cloudinary:', !!process.env.CLOUDINARY_NAME);

// 5. Configure Cloudinary (only needs your creds; usage gated below)
if (process.env.CLOUDINARY_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key:    process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET,
    secure:     true
  });
}

// 6. MongoDB Schema
const videoSchema = new mongoose.Schema({
  filename:     String,
  path:         String,        // local URL
  cloudinaryUrl:String,        // remote URL
  uploadDate:   { type: Date, default: Date.now },
  size:         Number,
  duration:     Number
});
const Video = mongoose.model('Video', videoSchema);

// 7. Paths
const staticPath  = path.join(__dirname, '../frontend');
const uploadsPath = path.join(__dirname, 'public/uploads');
fs.mkdirSync(uploadsPath, { recursive: true });

// 8. Serve Static
if (fs.existsSync(path.join(staticPath, 'index.html'))) {
  app.use(express.static(staticPath));
}
app.use('/uploads', express.static(uploadsPath));

// 9. Multer Setup
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsPath),
  filename:    (_req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

// 10. Connect to MongoDB
async function connectDB() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI missing in .env');
    process.exit(1);
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB error:', err.message);
    process.exit(1);
  }
}
mongoose.connection
  .on('error', err => console.error('Mongo error:', err))
  .on('disconnected', () => console.log('Mongo disconnected'));

// 11. Routes

// Health & Info
app.get('/health', (_req, res) => {
  res.json({
    env: process.env.NODE_ENV || 'development',
    db:  mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    cloudinary: !!process.env.CLOUDINARY_NAME
  });
});

// Homepage or API Info
app.get('/', (req, res) => {
  const html = path.join(staticPath, 'index.html');
  if (fs.existsSync(html)) return res.sendFile(html);
  res.json({ status: 'running', endpoints: ['POST /upload', 'GET /videos'] });
});

// Upload Endpoint
app.post('/upload', upload.single('video'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  let cloudinaryUrl = null, duration = null;
  const localPath = `/uploads/${req.file.filename}`;

  // Only upload to Cloudinary in production *and* if configured
  if (isProduction && process.env.CLOUDINARY_NAME) {
    try {
      console.log('📤 Uploading to Cloudinary...');
      const result = await cloudinary.uploader.upload(req.file.path, {
        resource_type: 'video',
        folder:        'videos'
      });
      cloudinaryUrl = result.secure_url;
      duration      = result.duration;
      console.log('✅ Cloudinary URL:', cloudinaryUrl);

      // Delete local copy only on success
      fs.unlinkSync(req.file.path);
      console.log('🗑️  Local file removed');
    } catch (err) {
      console.error('❌ Cloudinary upload failed:', err.message);
      // keep local file
    }
  }

  // Save metadata
  const video = new Video({
    filename:     req.file.originalname,
    path:         localPath,
    cloudinaryUrl,
    size:         req.file.size,
    duration
  });
  await video.save();

  // Return the URL to use
  res.json({
    status: 'success',
    video: {
      id:       video._id,
      url:      cloudinaryUrl || localPath,
      filename: video.filename,
      duration
    }
  });
});

// List Videos
app.get('/videos', async (_req, res) => {
  const list = await Video.find().sort({ uploadDate: -1 });
  res.json(list);
});

// Get Single Video
app.get('/videos/:id', async (req, res) => {
  const video = await Video.findById(req.params.id);
  if (!video) return res.status(404).json({ error: 'Not found' });
  res.json(video);
});

// 12. Start Server
(async () => {
  await connectDB();
  const PORT = process.env.PORT || 10000;
  app.listen(PORT, () => {
    console.log(`🚀 Server listening on http://localhost:${PORT}`);
  });
})();
