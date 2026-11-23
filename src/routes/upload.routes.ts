import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AuthRequest, verifyToken, verifyNotBlocked } from '../middlewares/auth.js';

const router = Router();

// Configure local upload storage fallback
const uploadsDir = path.resolve('public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed.'));
    }
  },
});

// POST /api/upload - Upload service image or profile image
router.post('/', verifyToken, verifyNotBlocked, upload.single('image'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'Please select an image file to upload.' });
      return;
    }

    const imgbbApiKey = process.env.IMGBB_API_KEY;

    if (imgbbApiKey && imgbbApiKey.trim() !== '') {
      // Upload to ImgBB
      const fileBuffer = fs.readFileSync(req.file.path);
      const base64Image = fileBuffer.toString('base64');

      const formData = new URLSearchParams();
      formData.append('image', base64Image);

      const response = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
        method: 'POST',
        body: formData,
      });

      const data: any = await response.json();

      // Clean up local file after uploading to ImgBB
      fs.unlinkSync(req.file.path);

      if (data.success) {
        res.json({
          success: true,
          url: data.data.url,
          display_url: data.data.display_url,
        });
        return;
      }
    }

    // Fallback: Serve local static file
    const publicUrl = process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || 5000}`;
    const fileUrl = `${publicUrl}/uploads/${req.file.filename}`;

    res.json({
      success: true,
      url: fileUrl,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Image upload failed.' });
  }
});

export default router;
