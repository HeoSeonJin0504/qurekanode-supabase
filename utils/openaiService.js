/**
 * OpenAI 서비스
 */
import OpenAI from "openai";
import config from "../config/env.js";
import logger from "../utils/logger.js";

// OpenAI 클라이언트
const openai = new OpenAI({ apiKey: config.openai.apiKey });

/**
 * 텍스트를 토큰 수 기준으로 자르는 유틸 함수
 * - 호출부(aiController)에서 content를 프롬프트에 넣기 전에 사용
 * - callChatGpt 내부에서는 더 이상 호출하지 않음
 *
 * 한국어 포함 문서 근사 기준:
 *   영어  1 token ≈ 4 chars
 *   한국어 1 token ≈ 1.5 chars
 *   → 혼합 문서 보수적 적용: 1 token ≈ 1.5 chars
 */
export const truncateByTokens = (text, maxTokens) => {
  const maxChars = Math.floor(maxTokens * 1.5);
  if (text.length <= maxChars) return text;

  const truncated = text.slice(0, maxChars);
  logger.warn(
    `텍스트가 ${maxTokens} 토큰 한도를 초과하여 앞부분 ${maxChars}자로 잘렸습니다. ` +
      `(원본 ${text.length}자 → ${truncated.length}자)`,
  );
  return truncated;
};

/**
 * ChatGPT 호출
 * - truncate는 호출부에서 완료된 것으로 간주하여 여기서는 하지 않음
 * @param {string} systemMessage
 * @param {string} userMessage
 * @returns {Promise<{result: string, usage: object}>}
 */
export const callChatGpt = async (systemMessage, userMessage) => {
  const completion = await openai.chat.completions.create({
    model: config.openai.model,
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage },
    ],
    temperature: 0.7,
  });

  const result = completion.choices[0].message.content;
  const usage = completion.usage;

  logger.debug(`OpenAI 호출 완료 - tokens: ${usage.total_tokens}`);
  return { result, usage };
};

/**
 * [1차] pdfjs-dist로 PDF 텍스트 추출
 * - 한글/CJK CIDFont 처리에 강점 (CMap 지원)
 * - Node.js 서버 환경에서 disableWorker: true로 worker 비활성화
 * @param {Buffer} buffer
 * @returns {Promise<string>}
 */
const extractWithPdfjs = async (buffer) => {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  // createRequire로 실제 설치 경로를 동적으로 확인 (통합 프로젝트 대응)
  const { createRequire } = await import("module");
  const require = createRequire(import.meta.url);
  const pdfjsRoot = require
    .resolve("pdfjs-dist/package.json")
    .replace(/package\.json$/, "");

  const uint8Array = new Uint8Array(buffer);
  const loadingTask = pdfjsLib.getDocument({
    data: uint8Array,
    cMapUrl: `${pdfjsRoot}cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${pdfjsRoot}standard_fonts/`,
    useSystemFonts: false,
    disableFontFace: true,
    disableWorker: true, // Node.js 환경에서 worker 완전 비활성화
    verbosity: 0,
  });

  const pdfDocument = await loadingTask.promise;
  const totalPages = pdfDocument.numPages;
  logger.debug(`[pdfjs] PDF 총 페이지 수: ${totalPages}`);

  let fullText = "";
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .trim();
    if (pageText) fullText += pageText + "\n";
    page.cleanup();
  }

  await pdfDocument.destroy();
  return fullText.trim();
};

/**
 * [2차] pdf-parse로 PDF 텍스트 추출 (fallback)
 * - 영문 위주 PDF나 pdfjs가 텍스트를 충분히 추출하지 못할 때 보완
 * @param {Buffer} buffer
 * @returns {Promise<string>}
 */
const extractWithPdfParse = async (buffer) => {
  const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
  const result = await pdfParse(buffer);
  return result.text.trim();
};

/**
 * PDF 텍스트 추출
 * - 1차: pdfjs-dist (한글 CMap 처리 강점)
 * - 2차: pdf-parse fallback (pdfjs 추출 결과가 부족할 때)
 * @param {Buffer} buffer - PDF 파일 버퍼
 * @returns {Promise<string>}
 */
export const extractTextFromPdf = async (buffer) => {
  // 1차 시도: pdfjs-dist
  let extracted = "";
  try {
    extracted = await extractWithPdfjs(buffer);
    logger.debug(`[pdfjs] 텍스트 추출 완료 - 문자 수: ${extracted.length}`);
  } catch (pdfjsError) {
    logger.warn(`[pdfjs] 추출 실패, pdf-parse로 fallback 시도: ${pdfjsError.message}`);
  }

  // pdfjs 추출 결과가 부족하면 pdf-parse로 fallback
  if (extracted.length < 50) {
    try {
      logger.info("[pdf-parse] fallback 추출 시작");
      extracted = await extractWithPdfParse(buffer);
      logger.debug(`[pdf-parse] 텍스트 추출 완료 - 문자 수: ${extracted.length}`);
    } catch (parseError) {
      logger.error(`[pdf-parse] fallback 추출 실패: ${parseError.message}`);
    }
  }

  if (extracted.length < 50) {
    logger.warn(
      "PDF에서 충분한 텍스트를 추출하지 못했습니다. 이미지 기반(스캔) PDF이거나 인코딩 문제일 수 있습니다.",
    );
    throw new Error("PDF 텍스트 추출에 실패했습니다.");
  }

  return extracted;
};

/**
 * PPTX 텍스트 추출 (zip 내 XML 파싱)
 * @param {Buffer} buffer - PPTX 파일 버퍼
 * @returns {Promise<string>}
 */
export const extractTextFromPptx = async (buffer) => {
  try {
    const AdmZip = (await import("adm-zip")).default;
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();
    let text = "";

    for (const entry of zipEntries) {
      if (
        entry.entryName.startsWith("ppt/slides/slide") &&
        entry.entryName.endsWith(".xml")
      ) {
        const xml = entry.getData().toString("utf8");
        // XML 태그 제거 후 텍스트 추출
        const cleaned = xml
          .replace(/<a:t>/g, " ")
          .replace(/<\/a:t>/g, "\n")
          .replace(/<[^>]+>/g, "")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");
        text += cleaned + "\n";
      }
    }
    return text.trim();
  } catch (error) {
    logger.error("PPTX 텍스트 추출 오류: " + error.message);
    throw new Error("PPTX 텍스트 추출에 실패했습니다.");
  }
};