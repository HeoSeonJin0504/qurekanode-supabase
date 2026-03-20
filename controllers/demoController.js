import { callChatGpt, truncateByTokens } from '../utils/openaiService.js';
import { getPrompt } from '../prompts/promptManager.js';
import { DEMO_CONTENTS, getDemoTopics } from '../prompts/demoContent.js';
import logger from '../utils/logger.js';

const QUESTION_TYPE_NORMALIZE_MAP = {
  // 단축형
  n지선다: 'n지선다',
  순서배열: '순서배열',
  참거짓: '참거짓',
  빈칸채우기: '빈칸채우기',
  단답: '단답',
  서술: '서술',
  // 한국어 전체형
  'n지 선다형': 'n지선다',
  n지선다형: 'n지선다',
  '순서 배열형': '순서배열',
  순서배열형: '순서배열',
  '참/거짓형': '참거짓',
  참거짓형: '참거짓',
  '빈칸 채우기형': '빈칸채우기',
  빈칸채우기형: '빈칸채우기',
  단답형: '단답',
  서술형: '서술',
  // DB/영문 타입
  multiple_choice: 'n지선다',
  sequence: '순서배열',
  true_false: '참거짓',
  fill_in_the_blank: '빈칸채우기',
  short_answer: '단답',
  descriptive: '서술',
};

const QUESTION_TYPE_TO_PROMPT_KEY = {
  n지선다: '문제 생성_n지 선다형',
  순서배열: '문제 생성_순서 배열형',
  참거짓: '문제 생성_참거짓형',
  빈칸채우기: '문제 생성_빈칸 채우기형',
  단답: '문제 생성_단답형',
  서술: '문제 생성_서술형',
};

const MAX_CONTENT_TOKENS_SUMMARY  = 20000;
const MAX_CONTENT_TOKENS_QUESTION = 15000;

const demoController = {
  /**
   * 사용 가능한 데모 주제 목록 반환
   * GET /api/demo/topics
   */
  getTopics(_req, res) {
    return res.status(200).json({
      success: true,
      topics: getDemoTopics(),
    });
  },

  /**
   * 미리 정의된 텍스트로 즉시 요약 생성 (파일 업로드 불필요)
   * POST /api/demo/summarize
   * body: { topicKey, summaryType?, level?, field? }
   */
  async summarize(req, res) {
    try {
      const {
        topicKey,
        summaryType = '기본 요약',
        level = '비전공자',
        field = '일반',
      } = req.body;

      const topic = DEMO_CONTENTS[topicKey];
      if (!topic) {
        return res.status(400).json({
          success: false,
          message: `존재하지 않는 데모 주제입니다: "${topicKey}". 사용 가능한 주제는 GET /api/demo/topics 에서 확인하세요.`,
        });
      }

      const safeContent = truncateByTokens(topic.text, MAX_CONTENT_TOKENS_SUMMARY);

      const summaryTypeKey = summaryType.includes('_')
        ? summaryType
        : `내용 요약_${summaryType}`;

      const { system: systemMessage, user: userMessage } = getPrompt(
        summaryTypeKey,
        safeContent,
        { summaryLevel: level, field },
      );

      if (!systemMessage) {
        return res.status(400).json({
          success: false,
          message: `지원하지 않는 요약 타입입니다: ${summaryType}`,
        });
      }

      logger.info(`[DEMO] 요약 생성 시작 - 주제: ${topic.title}, 타입: ${summaryTypeKey}, 레벨: ${level}`);

      const { result: summaryResult } = await callChatGpt(systemMessage, userMessage);

      logger.info(`[DEMO] 요약 생성 완료 - 주제: ${topic.title}`);

      return res.status(200).json({
        success: true,
        topicKey,
        topicTitle: topic.title,
        summaryType,
        level,
        field,
        summary: summaryResult,
      });
    } catch (error) {
      logger.error('[DEMO] 요약 생성 오류:', error);

      if (error.message?.includes('OpenAI')) {
        return res.status(502).json({
          success: false,
          message: 'AI 서비스 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        });
      }

      return res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.',
        error: error.message,
      });
    }
  },

  /**
   * 미리 정의된 텍스트로 즉시 문제 생성 (파일 업로드 불필요)
   * POST /api/demo/generate
   * body: { topicKey, questionType?, questionCount?, level?, field?, choiceCount?, choiceFormat?, arrayChoiceCount?, blankCount? }
   */
  async generateQuestions(req, res) {
    try {
      const {
        topicKey,
        questionType = 'n지선다',
        questionCount = 5,
        level = '비전공자',
        field = '일반',
        choiceCount = 4,
        choiceFormat = '문장형',
        arrayChoiceCount = 3,
        blankCount = 1,
      } = req.body;

      const topic = DEMO_CONTENTS[topicKey];
      if (!topic) {
        return res.status(400).json({
          success: false,
          message: `존재하지 않는 데모 주제입니다: "${topicKey}". 사용 가능한 주제는 GET /api/demo/topics 에서 확인하세요.`,
        });
      }

      const normalizedType = QUESTION_TYPE_NORMALIZE_MAP[questionType];
      if (!normalizedType) {
        return res.status(400).json({
          success: false,
          message: `유효하지 않은 문제 타입입니다: ${questionType}`,
        });
      }

      const count = Math.min(Math.max(parseInt(questionCount) || 5, 1), 20);
      const safeContent = truncateByTokens(topic.text, MAX_CONTENT_TOKENS_QUESTION);

      const questionTypeKey = QUESTION_TYPE_TO_PROMPT_KEY[normalizedType];
      const { system: systemMessage, user: userMessage } = getPrompt(
        questionTypeKey,
        safeContent,
        {
          questionLevel: level,
          questionCount: count,
          field,
          choiceCount,
          choiceFormat,
          arrayChoiceCount,
          blankCount,
        },
      );

      if (!systemMessage) {
        return res.status(400).json({
          success: false,
          message: `지원하지 않는 문제 타입입니다: ${questionType}`,
        });
      }

      logger.info(`[DEMO] 문제 생성 시작 - 주제: ${topic.title}, 타입: ${normalizedType}, 개수: ${count}`);

      const { result: rawResult } = await callChatGpt(systemMessage, userMessage);

      let parsedData;
      try {
        const cleaned = rawResult.replace(/```json\n?|\n?```/g, '').trim();
        parsedData = JSON.parse(cleaned);
      } catch {
        logger.warn('[DEMO] JSON 파싱 실패, 원본 텍스트 반환');
        return res.status(200).json({
          success: true,
          topicKey,
          topicTitle: topic.title,
          questionType: normalizedType,
          count,
          level,
          field,
          questions: rawResult,
          parsed: false,
        });
      }

      const questionsArray = Array.isArray(parsedData)
        ? parsedData
        : (parsedData.questions ?? []);

      logger.info(`[DEMO] 문제 생성 완료 - 주제: ${topic.title}, 개수: ${questionsArray.length}`);

      return res.status(200).json({
        success: true,
        topicKey,
        topicTitle: topic.title,
        questionType: normalizedType,
        count,
        level,
        field,
        questions: questionsArray,
        parsed: true,
      });
    } catch (error) {
      logger.error('[DEMO] 문제 생성 오류:', error);

      if (error.message?.includes('OpenAI')) {
        return res.status(502).json({
          success: false,
          message: 'AI 서비스 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        });
      }

      return res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.',
        error: error.message,
      });
    }
  },
};

export default demoController;