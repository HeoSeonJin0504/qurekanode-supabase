/**
 * OpenAI 서비스
 */
import OpenAI from 'openai';
import config from '../config/env.js';
import logger from '../utils/logger.js';

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
    `(원본 ${text.length}자 → ${truncated.length}자)`
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
      { role: 'system', content: systemMessage },
      { role: 'user',   content: userMessage },
    ],
    temperature: 0.7,
  });

  const result = completion.choices[0].message.content;
  const usage  = completion.usage;

  logger.debug(`OpenAI 호출 완료 - tokens: ${usage.total_tokens}`);
  return { result, usage };
};

/**
 * PDF 텍스트 추출 (pdfjs-dist legacy 사용 - 한글 CIDFont 지원)
 * pdf-parse 내장 구버전(2.x) 대신 pdfjs-dist 최신 버전을 직접 사용해
 * 한글/CJK PDF의 ToUnicode CMap을 올바르게 처리
 * @param {Buffer} buffer - PDF 파일 버퍼
 * @returns {Promise<string>}
 */
export const extractTextFromPdf = async (buffer) => {
  try {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

    // Node.js 환경: 실제 worker 파일 경로를 지정해야 fake-worker 오류 방지
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      '../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
      import.meta.url
    ).href;

    const uint8Array = new Uint8Array(buffer);
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array,
      // 표준 CMap 경로 – 한글 등 CJK ToUnicode 매핑에 필요
      cMapUrl: new URL('../node_modules/pdfjs-dist/cmaps/', import.meta.url).href,
      cMapPacked: true,
      // 표준 Adobe 폰트 데이터 경로
      standardFontDataUrl: new URL('../node_modules/pdfjs-dist/standard_fonts/', import.meta.url).href,
      useSystemFonts: false,
      disableFontFace: true,
      verbosity: 0,
    });

    const pdfDocument = await loadingTask.promise;
    const totalPages = pdfDocument.numPages;
    logger.debug(`PDF 총 페이지 수: ${totalPages}`);

    let fullText = '';

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();

      // 각 텍스트 항목을 개행 기준으로 이어 붙임
      const pageText = textContent.items
        .map(item => ('str' in item ? item.str : ''))
        .join(' ')
        .trim();

      if (pageText) fullText += pageText + '\n';
      page.cleanup();
    }

    await pdfDocument.destroy();

    const extracted = fullText.trim();
    logger.debug(`PDF 텍스트 추출 완료 - 문자 수: ${extracted.length}`);

    if (extracted.length < 50) {
      logger.warn('PDF에서 추출된 텍스트가 너무 짧습니다. 이미지 기반(스캔) PDF이거나 인코딩 문제일 수 있습니다.');
    }

    return extracted;
  } catch (error) {
    logger.error('PDF 텍스트 추출 오류: ' + error.message);
    throw new Error('PDF 텍스트 추출에 실패했습니다.');
  }
};

/**
 * PPTX 텍스트 추출 (zip 내 XML 파싱)
 * @param {Buffer} buffer - PPTX 파일 버퍼
 * @returns {Promise<string>}
 */
export const extractTextFromPptx = async (buffer) => {
  try {
    const AdmZip = (await import('adm-zip')).default;
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();
    let text = '';

    for (const entry of zipEntries) {
      if (entry.entryName.startsWith('ppt/slides/slide') && entry.entryName.endsWith('.xml')) {
        const xml = entry.getData().toString('utf8');
        // XML 태그 제거 후 텍스트 추출
        const cleaned = xml
          .replace(/<a:t>/g, ' ')
          .replace(/<\/a:t>/g, '\n')
          .replace(/<[^>]+>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");
        text += cleaned + '\n';
      }
    }
    return text.trim();
  } catch (error) {
    logger.error('PPTX 텍스트 추출 오류: ' + error.message);
    throw new Error('PPTX 텍스트 추출에 실패했습니다.');
  }
};