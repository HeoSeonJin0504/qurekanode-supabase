import { Router } from 'express';
import multer from 'multer';
import aiController from '../controllers/aiController.js';
import { aiGenerationLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

// multer: 메모리 스토리지 (파일을 버퍼로 처리)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB 제한
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];
    const allowedExts = ['.pdf', '.pptx'];
    const ext = '.' + file.originalname.split('.').pop().toLowerCase();

    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('PDF 또는 PPTX 파일만 업로드 가능합니다.'), false);
    }
  }
});

// 파일 업로드 에러 핸들러
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: '파일 크기는 20MB를 초과할 수 없습니다.'
      });
    }
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
};

// POST /api/ai/summarize - 파일 업로드 후 요약 생성
router.post(
  '/summarize',
  aiGenerationLimiter,
  upload.single('file'),
  handleUploadError,
  aiController.summarize
);

// POST /api/ai/generate - 요약 텍스트로 문제 생성
router.post('/generate', aiGenerationLimiter, aiController.generateQuestions);

export default router;