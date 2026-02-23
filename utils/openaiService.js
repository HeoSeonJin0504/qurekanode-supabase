/**
 * OpenAI 서비스
 */
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import config from '../config/env.js';
import logger from '../utils/logger.js';

// OpenAI 클라이언트
const openai = new OpenAI({ apiKey: config.openai.apiKey });

/**
 * 텍스트 토큰 수 제한 
 * 한국어 포함 문서의 경우 문자 수 기준으로 근사
 */
export const truncateByTokens = (text, maxTokens = config.openai.maxTokens) => {
  // 영어 기준 1 token ~ 4 chars, 한국어 기준 1 token ~ 1.5 chars
  // 1 token ~ 2 chars 적용
  const maxChars = maxTokens * 2;
  return text.length > maxChars ? text.slice(0, maxChars) : text;
};

/**
 * ChatGPT 요약/생성 실행
 * @param {string} systemMessage
 * @param {string} userMessage
 * @returns {Promise<{result: string, usage: object}>}
 */
export const callChatGpt = async (systemMessage, userMessage) => {
  const truncatedUser = truncateByTokens(userMessage);

  const completion = await openai.chat.completions.create({
    model: config.openai.model,
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user',   content: truncatedUser },
    ],
    temperature: 0.7,
  });

  const result = completion.choices[0].message.content;
  const usage  = completion.usage;

  logger.debug(`OpenAI 호출 완료 - tokens: ${usage.total_tokens}`);
  return { result, usage };
};

/**
 * PDF 텍스트 추출 (pdf-parse 사용)
 * @param {Buffer} buffer - PDF 파일 버퍼
 * @returns {Promise<string>}
 */
export const extractTextFromPdf = async (buffer) => {
  try {
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(buffer);
    return data.text;
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