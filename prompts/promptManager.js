import { getSummaryPrompts } from './summaryPrompts.js';
import { getQuestionPrompts } from './questionPrompts.js';

const SUMMARY_TYPES = ['내용 요약_기본 요약', '내용 요약_핵심 요약', '내용 요약_주제 요약', '내용 요약_목차 요약', '내용 요약_키워드 요약'];
const QUESTION_TYPES = ['문제 생성_n지 선다형', '문제 생성_순서 배열형', '문제 생성_참거짓형', '문제 생성_빈칸 채우기형', '문제 생성_단답형', '문제 생성_서술형'];

/**
 * @param {string} typeName - 요약/문제 타입 이름
 * @param {string} content  - 문서 내용
 * @param {Object} params   - 각종 파라미터
 * @returns {{ system: string, user: string }}
 */
// 타입에 따라 요약 또는 문제 생성 프롬프트 반환
export const getPrompt = (typeName, content, params = {}) => {
  const {
    field           = '공학',
    summaryLevel    = '전공자',
    questionLevel   = '전공자',
    sentenceCount   = 500,
    topicCount      = 2,
    keywords        = [],
    questionCount   = 3,
    choiceCount     = 4,
    choiceFormat    = '문장형',
    arrayChoiceCount = 3,
    blankCount      = 1,
  } = params;

  const keywordStr = Array.isArray(keywords) ? keywords.join(',') : keywords;

  if (SUMMARY_TYPES.includes(typeName)) {
    const prompts = getSummaryPrompts(field, summaryLevel, sentenceCount, topicCount, keywordStr, content);
    return prompts[typeName] || { system: '', user: '' };
  }

  if (QUESTION_TYPES.includes(typeName)) {
    const prompts = getQuestionPrompts(field, questionLevel, questionCount, choiceCount, choiceFormat, arrayChoiceCount, blankCount, content);
    return prompts[typeName] || { system: '', user: '' };
  }

  return { system: '', user: '' };
};