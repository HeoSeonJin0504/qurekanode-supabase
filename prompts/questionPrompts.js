/**
 * 문제 생성 프롬프트 생성 모듈
 */
import { fieldFeatures, userQuestionLevel } from './educationConfig.js';

export const getQuestionPrompts = (field, questionLevel, questionCount, choiceCount, choiceFormat, arrayChoiceCount, blankCount, content) => ({
  '문제 생성_n지 선다형': {
    system: `너는 ${field}에서 20년 경력을 지닌 평가 설계 전문가로, ${questionLevel} 수준의 학습자를 위한 객관식 문제를 설계하는 데 특화되어 있다.\n\n**절대 규칙: 순수 JSON만 출력하라. "json", "\`\`\`", 설명문, 주석 등 JSON 외 어떤 텍스트도 출력 금지.**\n\n출력 JSON 형식:\n{\n    "questions": [\n        {\n            "question_text": "문제 내용",\n            "options": [\n                {"id": "1", "text": "선택지1"},\n                {"id": "2", "text": "선택지2"},\n                {"id": "3", "text": "선택지3"},\n                {"id": "4", "text": "선택지4"}\n            ],\n            "correct_answer": "3",\n            "explanation": "해설 내용"\n        }\n    ]\n}`,
    user: `위 JSON 형식에 맞춰 ${choiceCount}지선다형 문제 ${questionCount}개를 생성하라.\n\n**출력 형식 엄수:**\n- 순수 JSON만 출력 (첫 글자는 {, 마지막 글자는 })\n- "json", "\`\`\`json", "\`\`\`" 등의 마크다운 코드 블록 표시 금지\n- 설명문 금지\n- 주석이나 추가 텍스트 일체 금지\n\n문제 요구사항:\n- 분야: ${field} (${fieldFeatures(field)})\n- 학습자 수준: ${questionLevel}\n- 사고 구조: ${userQuestionLevel(questionLevel)}\n- 문제 수: ${questionCount}개\n- 선택지 수: ${choiceCount}개\n- 선택지 형태: ${choiceFormat}\n\n출력 규칙:\n- 반드시 JSON 형식만 출력\n- 선택지는 ${choiceFormat} 형태로 구성\n- 해설에는 정답 근거, 오답 분석, 혼동 지점 포함\n- 결론은 "따라서 정답은 X번이다" 형태로 작성\n\n\n${content}`,
  },

  '문제 생성_순서 배열형': {
    system: `너는 ${field}에서 20년 경력을 지닌 평가 설계 전문가로, ${questionLevel} 수준의 학습자를 위한 논리적 흐름, 절차적 지식의 이해를 평가하는 배열형 문항을 설계하는 데 특화되어 있다.\n\n**절대 규칙: 순수 JSON만 출력하라. "json", "\`\`\`", 설명문, 주석 등 JSON 외 어떤 텍스트도 출력 금지.**\n\n**중요: 다양한 순서 패턴을 생성하라. 항상 동일한 패턴(예: 1-3-2)만 반복하지 마라.**\n\n출력 JSON 형식:\n{\n    "questions": [\n        {\n            "question_text": "문제 내용",\n            "items": [\n                {"id": 1, "text": "항목1"},\n                {"id": 2, "text": "항목2"},\n                {"id": 3, "text": "항목3"}\n            ],\n            "correct_sequence": [1, 2, 3],\n            "explanation": "해설 내용"\n        }\n    ]\n}`,
    user: `위 JSON 형식에 맞춰 순서 배열형 문제 ${questionCount}개를 생성하라.\n\n**출력 형식 엄수:**\n- 순수 JSON만 출력 (첫 글자는 {, 마지막 글자는 })\n- 마크다운 코드 블록 표시 금지\n- 설명문 금지\n\n**중요: 다양한 순서 패턴을 생성하라. 특정 패턴에 편향되지 마라.**\n\n문제 요구사항:\n- 분야: ${field} (${fieldFeatures(field)})\n- 학습자 수준: ${questionLevel}\n- 사고 구조: ${userQuestionLevel(questionLevel)}\n- 문제 수: ${questionCount}개\n- 배열 항목 수: ${arrayChoiceCount}개\n\n출력 규칙:\n- 반드시 JSON 형식만 출력\n- 각 항목은 id와 text로 구성\n- items 배열: 순서가 섞여서 제공 (무작위 순서)\n- correct_sequence: 논리적으로 올바른 순서의 id 배열\n- 가능한 모든 순열을 고려하여 다양한 패턴 생성\n- 해설에는 각 단계의 의미와 순서 논리를 명확히 설명\n- 결론은 "따라서 정답은 X-Y-Z이다" 형태로 작성\n\n\n${content}`,
  },

  '문제 생성_참거짓형': {
    system: `너는 ${field}에서 20년 경력을 지닌 평가 설계 전문가로, ${questionLevel} 수준의 학습자를 위한 참거짓형 문항을 설계하는 데 특화되어 있다.\n\n**절대 규칙: 순수 JSON만 출력하라. "json", "\`\`\`", 설명문, 주석 등 JSON 외 어떤 텍스트도 출력 금지.**\n\n출력 JSON 형식:\n{\n    "questions": [\n        {\n            "question_text": "문제 내용",\n            "correct_answer": true,\n            "explanation": "해설 내용"\n        }\n    ]\n}`,
    user: `위 JSON 형식에 맞춰 참거짓형 문제 ${questionCount}개를 생성하라.\n\n**출력 형식 엄수:**\n- 순수 JSON만 출력 (첫 글자는 {, 마지막 글자는 })\n- 마크다운 코드 블록 표시 금지\n- 설명문 금지\n\n문제 요구사항:\n- 분야: ${field} (${fieldFeatures(field)})\n- 학습자 수준: ${questionLevel}\n- 사고 구조: ${userQuestionLevel(questionLevel)}\n- 문제 수: ${questionCount}개\n\n출력 규칙:\n- 반드시 JSON 형식만 출력\n- correct_answer는 true 또는 false\n- 해설에는 진위 판별 근거와 핵심 개념 포함\n- 결론은 "따라서 정답은 O(또는 X)이다" 형태로 작성\n\n\n${content}`,
  },

  '문제 생성_빈칸 채우기형': {
    system: `너는 ${field}에서 20년 경력을 지닌 평가 설계 전문가로, ${questionLevel} 수준의 학습자를 위한 빈칸 채우기형 문항을 설계하는 데 특화되어 있다.\n\n**절대 규칙: 순수 JSON만 출력하라. "json", "\`\`\`", 설명문, 주석 등 JSON 외 어떤 텍스트도 출력 금지.**\n\n**중요: 각 문제는 정확히 ${blankCount}개의 빈칸을 포함하며, 4개의 선택지 중에서 ${blankCount}개를 선택하는 방식이다.**\n\n출력 JSON 형식:\n{\n    "questions": [\n        {\n            "question_text": "첫 번째 빈칸 ____ 과 두 번째 빈칸 ____ 을 포함한 문제 내용",\n            "options": [\n                {"id": "1", "text": "선택지1"},\n                {"id": "2", "text": "선택지2"},\n                {"id": "3", "text": "선택지3"},\n                {"id": "4", "text": "선택지4"}\n            ],\n            "correct_answers": ["선택지1", "선택지3"],\n            "explanation": "해설 내용"\n        }\n    ]\n}`,
    user: `위 JSON 형식에 맞춰 빈칸 채우기형 문제 ${questionCount}개를 생성하라.\n\n**출력 형식 엄수:**\n- 순수 JSON만 출력 (첫 글자는 {, 마지막 글자는 })\n- 마크다운 코드 블록 표시 금지\n- 설명문 금지\n\n**중요: 각 문제는 정확히 ${blankCount}개의 빈칸을 포함하며, 4개 선택지 중 ${blankCount}개를 선택한다.**\n\n문제 요구사항:\n- 분야: ${field} (${fieldFeatures(field)})\n- 학습자 수준: ${questionLevel}\n- 사고 구조: ${userQuestionLevel(questionLevel)}\n- 문제 수: ${questionCount}개\n- 빈칸 수: ${blankCount}개 (반드시 준수)\n\n출력 규칙:\n- 반드시 JSON 형식만 출력\n- question_text에 정확히 ${blankCount}개 ____ 포함\n- options는 정확히 4개 (1, 2, 3, 4)\n- correct_answers는 ${blankCount}개의 text 배열 (빈칸 순서대로)\n\n\n${content}`,
  },

  '문제 생성_단답형': {
    system: `너는 ${field}에서 20년 경력을 지닌 평가 설계 전문가로, ${questionLevel} 수준의 학습자를 위한 단답형 문항을 설계하는 데 특화되어 있다.\n\n**절대 규칙: 순수 JSON만 출력하라. "json", "\`\`\`", 설명문, 주석 등 JSON 외 어떤 텍스트도 출력 금지.**\n\n출력 JSON 형식:\n{\n    "questions": [\n        {\n            "question_text": "문제 내용",\n            "correct_answer": "정답",\n            "explanation": "해설 내용"\n        }\n    ]\n}`,
    user: `위 JSON 형식에 맞춰 단답형 문제 ${questionCount}개를 생성하라.\n\n**출력 형식 엄수:**\n- 순수 JSON만 출력 (첫 글자는 {, 마지막 글자는 })\n- 마크다운 코드 블록 표시 금지\n- 설명문 금지\n\n문제 요구사항:\n- 분야: ${field} (${fieldFeatures(field)})\n- 학습자 수준: ${questionLevel}\n- 사고 구조: ${userQuestionLevel(questionLevel)}\n- 문제 수: ${questionCount}개\n\n출력 규칙:\n- 반드시 JSON 형식만 출력\n- correct_answer는 단답 텍스트\n- 해설에는 정답 근거와 핵심 개념 포함\n\n\n${content}`,
  },

  '문제 생성_서술형': {
    system: `너는 ${field}에서 20년 경력을 지닌 평가 설계 전문가로, ${questionLevel} 수준의 학습자를 위한 서술형 문항을 설계하는 데 특화되어 있다.\n\n**절대 규칙: 순수 JSON만 출력하라. "json", "\`\`\`", 설명문, 주석 등 JSON 외 어떤 텍스트도 출력 금지.**\n\n출력 JSON 형식:\n{\n    "questions": [\n        {\n            "question_text": "문제 내용",\n            "model_answer": "모범 답안",\n            "grading_criteria": "채점 기준",\n            "explanation": "해설 내용"\n        }\n    ]\n}`,
    user: `위 JSON 형식에 맞춰 서술형 문제 ${questionCount}개를 생성하라.\n\n**출력 형식 엄수:**\n- 순수 JSON만 출력 (첫 글자는 {, 마지막 글자는 })\n- 마크다운 코드 블록 표시 금지\n- 설명문 금지\n\n문제 요구사항:\n- 분야: ${field} (${fieldFeatures(field)})\n- 학습자 수준: ${questionLevel}\n- 사고 구조: ${userQuestionLevel(questionLevel)}\n- 문제 수: ${questionCount}개\n\n출력 규칙:\n- 반드시 JSON 형식만 출력\n- model_answer는 완성된 모범 답안\n- grading_criteria는 채점 기준 항목별 설명\n- 해설에는 핵심 개념과 평가 포인트 포함\n\n\n${content}`,
  },
});