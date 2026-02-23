import { callChatGpt, extractTextFromPdf, extractTextFromPptx, truncateByTokens } from '../utils/openaiService.js';
import { getPrompt } from '../prompts/promptManager.js';
import logger from '../utils/logger.js';

const aiController = {
  /**
   * 파일 업로드 후 텍스트 요약 생성
   * POST /api/ai/summarize
   */
  async summarize(req, res) {
    try {
      const file = req.file;
      const {
        summaryType = '기본 요약',
        level = '비전공자',
        field = '일반',
        language = 'ko'
      } = req.body;

      if (!file) {
        return res.status(400).json({
          success: false,
          message: '파일이 필요합니다. (PDF 또는 PPTX)'
        });
      }

      // 파일 타입별 텍스트 추출
      let extractedText = '';
      const mimeType = file.mimetype;
      const originalName = file.originalname.toLowerCase();

      if (mimeType === 'application/pdf' || originalName.endsWith('.pdf')) {
        logger.info(`PDF 텍스트 추출 시작: ${file.originalname}`);
        extractedText = await extractTextFromPdf(file.buffer);
      } else if (
        mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
        originalName.endsWith('.pptx')
      ) {
        logger.info(`PPTX 텍스트 추출 시작: ${file.originalname}`);
        extractedText = await extractTextFromPptx(file.buffer);
      } else {
        return res.status(400).json({
          success: false,
          message: 'PDF 또는 PPTX 파일만 지원합니다.'
        });
      }

      if (!extractedText || extractedText.trim().length < 50) {
        return res.status(422).json({
          success: false,
          message: '파일에서 충분한 텍스트를 추출하지 못했습니다. 텍스트가 포함된 파일인지 확인해주세요.'
        });
      }

      // 토큰 제한 적용
      const truncatedText = truncateByTokens(extractedText, 6000);

      // 프롬프트 생성
      const { systemMessage, userMessage } = getPrompt('summary', summaryType, truncatedText, {
        level,
        field,
        language
      });

      logger.info(`요약 생성 시작 - 타입: ${summaryType}, 레벨: ${level}, 분야: ${field}`);

      // OpenAI 호출
      const summaryResult = await callChatGpt(systemMessage, userMessage);

      logger.info(`요약 생성 완료 - 파일: ${file.originalname}`);

      return res.status(200).json({
        success: true,
        fileName: file.originalname,
        summaryType,
        level,
        field,
        summary: summaryResult
      });
    } catch (error) {
      logger.error('요약 생성 오류:', error);

      if (error.message?.includes('OpenAI')) {
        return res.status(502).json({
          success: false,
          message: 'AI 서비스 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
          error: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.',
        error: error.message
      });
    }
  },

  /**
   * 요약 텍스트로 문제 생성
   * POST /api/ai/generate
   */
  async generateQuestions(req, res) {
    try {
      const {
        summaryText,
        questionType = 'n지선다',
        questionCount = 5,
        level = '비전공자',
        field = '일반',
        language = 'ko'
      } = req.body;

      if (!summaryText || summaryText.trim().length < 30) {
        return res.status(400).json({
          success: false,
          message: '문제 생성을 위한 텍스트가 필요합니다. (최소 30자 이상)'
        });
      }

      // 유효한 문제 타입 검증
      const validTypes = ['n지선다', '순서배열', '참거짓', '빈칸채우기', '단답', '서술'];
      if (!validTypes.includes(questionType)) {
        return res.status(400).json({
          success: false,
          message: `유효하지 않은 문제 타입입니다. 가능한 타입: ${validTypes.join(', ')}`
        });
      }

      // 문제 개수 제한
      const count = Math.min(Math.max(parseInt(questionCount) || 5, 1), 20);

      // 토큰 제한 적용
      const truncatedText = truncateByTokens(summaryText, 5000);

      // 프롬프트 생성
      const { systemMessage, userMessage } = getPrompt('question', questionType, truncatedText, {
        questionCount: count,
        level,
        field,
        language
      });

      logger.info(`문제 생성 시작 - 타입: ${questionType}, 개수: ${count}, 레벨: ${level}`);

      // OpenAI 호출
      const rawResult = await callChatGpt(systemMessage, userMessage);

      // JSON 파싱 시도
      let questions;
      try {
        // JSON 코드블록 제거 후 파싱
        const cleaned = rawResult.replace(/```json\n?|\n?```/g, '').trim();
        questions = JSON.parse(cleaned);
      } catch (parseError) {
        logger.warn('JSON 파싱 실패, 원본 텍스트 반환:', parseError.message);
        return res.status(200).json({
          success: true,
          questionType,
          count,
          level,
          field,
          questions: rawResult,
          parsed: false
        });
      }

      logger.info(`문제 생성 완료 - 타입: ${questionType}, 개수: ${count}`);

      return res.status(200).json({
        success: true,
        questionType,
        count,
        level,
        field,
        questions,
        parsed: true
      });
    } catch (error) {
      logger.error('문제 생성 오류:', error);

      if (error.message?.includes('OpenAI')) {
        return res.status(502).json({
          success: false,
          message: 'AI 서비스 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
          error: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.',
        error: error.message
      });
    }
  }
};

export default aiController;