import {
  callChatGpt,
  extractTextFromPdf,
  extractTextFromPptx,
  truncateByTokens,
} from "../utils/openaiService.js";
import { getPrompt } from "../prompts/promptManager.js";
import logger from "../utils/logger.js";

// 프론트에서 다양한 형태로 전달되는 문제 타입을 백엔드 내부 키로 정규화
const QUESTION_TYPE_NORMALIZE_MAP = {
  // 단축형 (기존)
  n지선다: "n지선다",
  순서배열: "순서배열",
  참거짓: "참거짓",
  빈칸채우기: "빈칸채우기",
  단답: "단답",
  서술: "서술",
  // 한국어 전체형
  "n지 선다형": "n지선다",
  n지선다형: "n지선다",
  "순서 배열형": "순서배열",
  순서배열형: "순서배열",
  "참/거짓형": "참거짓",
  참거짓형: "참거짓",
  "빈칸 채우기형": "빈칸채우기",
  빈칸채우기형: "빈칸채우기",
  단답형: "단답",
  서술형: "서술",
  // DB/영문 타입
  multiple_choice: "n지선다",
  sequence: "순서배열",
  true_false: "참거짓",
  fill_in_the_blank: "빈칸채우기",
  short_answer: "단답",
  descriptive: "서술",
};

const VALID_TYPES = [
  "n지선다",
  "순서배열",
  "참거짓",
  "빈칸채우기",
  "단답",
  "서술",
];

const QUESTION_TYPE_TO_PROMPT_KEY = {
  n지선다: "문제 생성_n지 선다형",
  순서배열: "문제 생성_순서 배열형",
  참거짓: "문제 생성_참거짓형",
  빈칸채우기: "문제 생성_빈칸 채우기형",
  단답: "문제 생성_단답형",
  서술: "문제 생성_서술형",
};

const aiController = {
  /**
   * 파일 업로드 후 텍스트 요약 생성
   * POST /api/ai/summarize
   */
  async summarize(req, res) {
    try {
      const file = req.file;
      const {
        summaryType = "기본 요약",
        level = "비전공자",
        field = "일반",
        language = "ko",
      } = req.body;

      if (!file) {
        return res.status(400).json({
          success: false,
          message: "파일이 필요합니다. (PDF 또는 PPTX)",
        });
      }

      // 파일 타입별 텍스트 추출
      let extractedText = "";
      const mimeType = file.mimetype;

      // 파일명 한글 출력
      const decodedOriginalname = Buffer.from(
        file.originalname,
        "latin1",
      ).toString("utf8");
      file.originalname = decodedOriginalname;

      const originalName = file.originalname.toLowerCase();

      if (mimeType === "application/pdf" || originalName.endsWith(".pdf")) {
        logger.info(`PDF 텍스트 추출 시작: ${file.originalname}`);
        extractedText = await extractTextFromPdf(file.buffer);
      } else if (
        mimeType ===
          "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
        originalName.endsWith(".pptx")
      ) {
        logger.info(`PPTX 텍스트 추출 시작: ${file.originalname}`);
        extractedText = await extractTextFromPptx(file.buffer);
      } else {
        return res.status(400).json({
          success: false,
          message: "PDF 또는 PPTX 파일만 지원합니다.",
        });
      }

      if (!extractedText || extractedText.trim().length < 50) {
        return res.status(422).json({
          success: false,
          message:
            "파일에서 충분한 텍스트를 추출하지 못했습니다. 텍스트가 포함된 파일인지 확인해주세요.",
        });
      }

      // 토큰 제한 적용
      const truncatedText = truncateByTokens(extractedText, 6000);

      // 프롬프트 생성
      // SUMMARY_TYPES 형식: '내용 요약_기본 요약' — 프론트에서 단축형으로 올 경우 전체 키로 변환
      const summaryTypeKey = summaryType.includes("_")
        ? summaryType
        : `내용 요약_${summaryType}`;
      const { system: systemMessage, user: userMessage } = getPrompt(
        summaryTypeKey,
        truncatedText,
        {
          summaryLevel: level,
          field,
        },
      );

      if (!systemMessage) {
        logger.warn(`알 수 없는 요약 타입: ${summaryTypeKey}`);
        return res
          .status(400)
          .json({
            success: false,
            message: `지원하지 않는 요약 타입입니다: ${summaryType}`,
          });
      }

      logger.info(
        `요약 생성 시작 - 타입: ${summaryTypeKey}, 레벨: ${level}, 분야: ${field}`,
      );

      // OpenAI 호출
      const { result: summaryResult } = await callChatGpt(
        systemMessage,
        userMessage,
      );

      logger.info(`요약 생성 완료 - 파일: ${file.originalname}`);

      return res.status(200).json({
        success: true,
        fileName: file.originalname,
        summaryType,
        level,
        field,
        summary: summaryResult,
      });
    } catch (error) {
      logger.error("요약 생성 오류:", error);

      if (error.message?.includes("OpenAI")) {
        return res.status(502).json({
          success: false,
          message: "AI 서비스 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
          error: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: "서버 오류가 발생했습니다.",
        error: error.message,
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
        questionType = "n지선다",
        questionCount = 5,
        level = "비전공자",
        field = "일반",
        language = "ko",
      } = req.body;

      if (!summaryText || summaryText.trim().length < 30) {
        return res.status(400).json({
          success: false,
          message: "문제 생성을 위한 텍스트가 필요합니다. (최소 30자 이상)",
        });
      }

      // 프론트에서 다양한 형식으로 올 수 있는 questionType을 내부 키로 정규화
      const normalizedType = QUESTION_TYPE_NORMALIZE_MAP[questionType];

      if (!normalizedType) {
        logger.warn(`유효하지 않은 문제 타입 수신: "${questionType}"`);
        return res.status(400).json({
          success: false,
          message: `유효하지 않은 문제 타입입니다. 가능한 타입: ${VALID_TYPES.join(", ")}`,
          receivedType: questionType,
        });
      }

      // 문제 개수 제한
      const count = Math.min(Math.max(parseInt(questionCount) || 5, 1), 20);

      // 토큰 제한 적용
      const truncatedText = truncateByTokens(summaryText, 5000);

      // 프롬프트 키 변환
      const questionTypeKey = QUESTION_TYPE_TO_PROMPT_KEY[normalizedType];
      const { system: systemMessage, user: userMessage } = getPrompt(
        questionTypeKey,
        truncatedText,
        {
          questionLevel: level,
          questionCount: count,
          field,
        },
      );

      if (!systemMessage) {
        logger.warn(`알 수 없는 문제 타입: ${questionTypeKey}`);
        return res
          .status(400)
          .json({
            success: false,
            message: `지원하지 않는 문제 타입입니다: ${questionType}`,
          });
      }

      logger.info(
        `문제 생성 시작 - 원본타입: ${questionType}, 정규화: ${normalizedType}, 개수: ${count}, 레벨: ${level}`,
      );

      // OpenAI 호출
      const { result: rawResult } = await callChatGpt(
        systemMessage,
        userMessage,
      );

      // JSON 파싱 시도
      let parsedData;
      try {
        // JSON 코드블록 제거 후 파싱
        const cleaned = rawResult.replace(/```json\n?|\n?```/g, "").trim();
        parsedData = JSON.parse(cleaned);
      } catch (parseError) {
        logger.warn("JSON 파싱 실패, 원본 텍스트 반환:", parseError.message);
        return res.status(200).json({
          success: true,
          questionType: normalizedType,
          count,
          level,
          field,
          questions: rawResult,
          parsed: false,
        });
      }

      // GPT는 { "questions": [...] } 형태로 응답 → questions 배열만 추출
      const questionsArray = Array.isArray(parsedData)
        ? parsedData
        : (parsedData.questions ?? []);

      logger.info(
        `문제 생성 완료 - 타입: ${normalizedType}, 개수: ${questionsArray.length}`,
      );

      return res.status(200).json({
        success: true,
        questionType: normalizedType,
        count,
        level,
        field,
        questions: questionsArray,
        parsed: true,
      });
    } catch (error) {
      logger.error("문제 생성 오류:", error);

      if (error.message?.includes("OpenAI")) {
        return res.status(502).json({
          success: false,
          message: "AI 서비스 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
          error: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: "서버 오류가 발생했습니다.",
        error: error.message,
      });
    }
  },
};

export default aiController;
