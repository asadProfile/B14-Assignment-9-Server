import { Router, Response } from 'express';
import multer from 'multer';
import { AuthRequest, verifyToken, verifyNotBlocked } from '../middlewares/auth.js';

const router = Router();

// In serverless environments (e.g. Vercel), local filesystem is read-only.
// Using multer memoryStorage keeps the file in memory buffer for cloud upload.
const storage = multer.memoryStorage();

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
      const base64Image = req.file.buffer.toString('base64');

      const formData = new URLSearchParams();
      formData.append('image', base64Image);

      const response = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, {
        method: 'POST',
        body: formData,
      });

      const data: any = await response.json();

      if (data.success) {
        res.json({
          success: true,
          url: data.data.url,
          display_url: data.data.display_url,
        });
        return;
      }
    }

    // Fallback: If no ImgBB API key, return a data URI representation
    const base64Data = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    res.json({
      success: true,
      url: base64Data,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Image upload failed.' });
  }
});

export default router;
