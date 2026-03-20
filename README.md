# Qureka (Backend - Node.js)

강의 자료(PDF, PPTX)를 업로드하면 OpenAI API가 이를 분석하여  
요약본과 문제를 자동으로 생성하는 학습 플랫폼의 **백엔드 서버**입니다.

---

## 주요 기능

- 사용자 회원가입 / 로그인 (JWT HttpOnly Cookie 인증)
- PDF · PPTX 파일 업로드 및 텍스트 추출 (한글 CIDFont 지원)
- OpenAI API 기반 요약본 자동 생성 (학습 수준 · 전공 분야 선택 가능)
- OpenAI API 기반 문제 자동 생성 (객관식, 순서 배열, 참/거짓, 빈칸 채우기, 단답형, 서술형)
- 요약본 · 문제 저장, 조회, 수정, 삭제
- 즐겨찾기 폴더별 문제 관리
- SQL Injection 방어, Rate Limiting, 입력값 검증

---

## 🛠️ 기술 스택

| 구분 | 기술 |
|------|------|
| Runtime | Node.js 18+ (ESM) |
| Framework | Express 5.x |
| Database | PostgreSQL (Supabase, `pg` 직접 연결) |
| Auth | JWT (HttpOnly Cookie) · bcrypt |
| File Upload | multer (메모리 스토리지) |
| PDF 파싱 | pdfjs-dist (한글 지원) · pdf-parse (폴백) |
| PPTX 파싱 | adm-zip (XML 직접 파싱) |
| Token 계산 | tiktoken |
| AI | OpenAI API (gpt-4o-mini) |
| Security | helmet · express-rate-limit · CORS |
| Logging | Winston |

---

## 📁 프로젝트 구조

```
src/
├── config/
│   ├── env.js                       # 환경 변수 로드 및 검증
│   ├── db.js                        # PostgreSQL Pool 연결
│   └── initDb.js                    # 서버 시작 시 테이블 자동 생성
├── controllers/
│   ├── aiController.js              # 파일 업로드 → 요약 / 문제 생성
│   ├── authController.js            # 토큰 갱신, 로그아웃
│   ├── userController.js            # 회원가입, 로그인, 아이디 중복 확인
│   ├── summaryController.js         # 요약본 CRUD
│   ├── questionController.js        # 문제 CRUD
│   ├── favoriteController.js        # 즐겨찾기 폴더 · 문제 관리
│   └── problemSummaryMetaController.js  # 문제·요약 메타데이터 조회
├── models/
│   ├── userModel.js
│   ├── tokenModel.js
│   ├── summaryModel.js
│   ├── questionModel.js
│   └── favoriteModel.js
├── routes/
│   ├── aiRoutes.js
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── summaryRoutes.js
│   ├── questionRoutes.js
│   ├── favoriteRoutes.js
│   └── problemSummaryMetaRoutes.js
├── middlewares/
│   ├── authMiddleware.js            # JWT 토큰 검증
│   ├── rateLimiter.js               # 엔드포인트별 Rate Limit 설정
│   └── errorHandler.js             # 전역 에러 핸들러
├── utils/
│   ├── openaiService.js             # ChatGPT 호출, PDF/PPTX 텍스트 추출
│   ├── promptManager.js             # 프롬프트 조합 관리
│   ├── tokenUtil.js                 # JWT 생성·검증·쿠키 설정
│   ├── tokenModel.js                # 토큰 DB 저장
│   ├── educationConfig.js           # 학습 수준 · 전공 분야 설정
│   ├── validation.js                # 입력값 형식 · 보안 검증
│   ├── formatUtil.js                # 데이터 포맷팅
│   ├── requestLock.js               # 동시 중복 요청 방지
│   └── logger.js                    # Winston 로거
└── app.js                           # Express 앱 초기화
```

---

## 📚 API 엔드포인트

### AI 생성
| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| POST | `/api/ai/summarize` | 파일(PDF·PPTX) 업로드 후 요약 생성 |
| POST | `/api/ai/generate` | 요약 텍스트 기반 문제 생성 |

### 인증 (Authentication)
| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| POST | `/api/users/register` | 회원가입 |
| POST | `/api/users/login` | 로그인 |
| POST | `/api/users/check-userid` | 아이디 중복 확인 |
| POST | `/api/auth/refresh-token` | 액세스 토큰 갱신 |
| POST | `/api/auth/logout` | 로그아웃 |
| GET | `/api/auth/verify` | 토큰 검증 |

### 요약본 (Summaries)
| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| POST | `/api/summaries` | 요약본 저장 |
| GET | `/api/summaries/user/:userId` | 사용자별 요약본 목록 조회 |
| GET | `/api/summaries/search/:userId` | 요약본 검색 |
| GET | `/api/summaries/user/:userId/meta` | 요약본 메타데이터 조회 |
| GET | `/api/summaries/:id` | 요약본 상세 조회 |
| PATCH | `/api/summaries/:id/name` | 요약본 이름 변경 (인증 필요) |
| DELETE | `/api/summaries/:id` | 요약본 삭제 (인증 필요) |

### 문제 (Questions)
| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| POST | `/api/questions` | 문제 저장 |
| GET | `/api/questions/user/:userId` | 사용자별 문제 목록 조회 |
| GET | `/api/questions/search/:userId` | 문제 검색 |
| GET | `/api/questions/:id` | 문제 상세 조회 |
| PATCH | `/api/questions/:id/name` | 문제 이름 변경 (인증 필요) |
| DELETE | `/api/questions/:id` | 문제 삭제 (인증 필요) |

### 즐겨찾기 (Favorites)
| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| GET | `/api/favorites/folders/:userId` | 사용자 폴더 목록 조회 |
| POST | `/api/favorites/folders` | 새 폴더 생성 |
| POST | `/api/favorites/folders/ensure-default` | 기본 폴더 보장 |
| GET | `/api/favorites/folders/default/:userId` | 기본 폴더 조회/생성 |
| DELETE | `/api/favorites/folders/:folderId` | 폴더 삭제 |
| POST | `/api/favorites/questions` | 즐겨찾기에 문제 추가 |
| DELETE | `/api/favorites/questions/:favoriteId` | 즐겨찾기에서 문제 제거 |
| GET | `/api/favorites/check/:userId/:questionId` | 특정 문제 즐겨찾기 확인 |
| POST | `/api/favorites/check-multiple/:userId` | 여러 문제 즐겨찾기 상태 확인 |
| GET | `/api/favorites/questions/all/:userId` | 모든 즐겨찾기 문제 조회 |
| GET | `/api/favorites/folders/:folderId/questions/:userId` | 폴더별 문제 조회 |

### 메타데이터 (Metadata)
| 메서드 | 엔드포인트 | 설명 |
|--------|-----------|------|
| GET | `/api/problem-summary-meta` | 전체 메타데이터 조회 |
| GET | `/api/problem-summary-meta/:id` | 특정 메타데이터 조회 |

---

## 🗄️ 데이터베이스 구조

> 서버 최초 실행 시 테이블이 자동으로 생성됩니다.

### users
```sql
userindex   SERIAL PRIMARY KEY
userid      VARCHAR(20)  UNIQUE NOT NULL
password    VARCHAR(255) NOT NULL
name        VARCHAR(50)  NOT NULL
age         SMALLINT     NOT NULL  CHECK (age BETWEEN 1 AND 150)
gender      VARCHAR(10)  NOT NULL  CHECK (gender IN ('male', 'female'))
phone       VARCHAR(20)  UNIQUE NOT NULL
email       VARCHAR(100) UNIQUE
created_at  TIMESTAMPTZ  DEFAULT NOW()
```

### refresh_token
```sql
id          SERIAL PRIMARY KEY
user_id     INTEGER      NOT NULL  REFERENCES users(userindex) ON DELETE CASCADE
token       VARCHAR(255) NOT NULL
expires_at  TIMESTAMPTZ  NOT NULL
created_at  TIMESTAMPTZ  DEFAULT NOW()
```

### user_summaries
```sql
selection_id  SERIAL PRIMARY KEY
user_id       INTEGER           NOT NULL  REFERENCES users(userindex) ON DELETE CASCADE
file_name     VARCHAR(255)      NOT NULL
summary_name  VARCHAR(255)      NOT NULL  DEFAULT 'Untitled Summary'
summary_type  summary_type_enum NOT NULL  -- basic | key_points | topic | outline | keywords
summary_text  TEXT              NOT NULL
created_at    TIMESTAMPTZ       DEFAULT NOW()
```

### user_questions
```sql
selection_id   SERIAL PRIMARY KEY
user_id        INTEGER              NOT NULL  REFERENCES users(userindex) ON DELETE CASCADE
file_name      VARCHAR(255)         NOT NULL
question_name  VARCHAR(255)         NOT NULL  DEFAULT 'Untitled Question'
question_type  question_type_enum   NOT NULL  -- multiple_choice | sequence | fill_in_the_blank | true_false | short_answer | descriptive
question_data  JSONB                NOT NULL  DEFAULT '{}'
created_at     TIMESTAMPTZ          DEFAULT NOW()
```

### favorite_folders
```sql
folder_id    SERIAL PRIMARY KEY
user_id      INTEGER      NOT NULL  REFERENCES users(userindex) ON DELETE CASCADE
folder_name  VARCHAR(100) NOT NULL
description  VARCHAR(255)
created_at   TIMESTAMPTZ  DEFAULT NOW()
UNIQUE (user_id, folder_name)
```

### favorite_questions
```sql
favorite_id     SERIAL PRIMARY KEY
user_id         INTEGER   NOT NULL  REFERENCES users(userindex)         ON DELETE CASCADE
folder_id       INTEGER   NOT NULL  REFERENCES favorite_folders(folder_id) ON DELETE CASCADE
question_id     INTEGER   NOT NULL  REFERENCES user_questions(selection_id) ON DELETE CASCADE
question_index  SMALLINT  NOT NULL  DEFAULT 0
created_at      TIMESTAMPTZ         DEFAULT NOW()
UNIQUE (user_id, question_id, question_index)
```

---

## ⚙️ 환경 변수 설정

`.env.example`을 복사하여 `.env` 파일을 생성합니다.

```bash
cp .env.example .env
```

| 환경변수 | 필수 | 설명 |
|---------|------|------|
| `DATABASE_URL` | ✅ | Supabase PostgreSQL 연결 URL |
| `ACCESS_TOKEN_SECRET` | ✅ | JWT 액세스 토큰 비밀키 (32자 이상) |
| `REFRESH_TOKEN_SECRET` | ✅ | JWT 리프레시 토큰 비밀키 (32자 이상) |
| `ACCESS_TOKEN_EXPIRES_IN` | | 액세스 토큰 만료 시간 (기본값: `1h`) |
| `REFRESH_TOKEN_EXPIRES_IN` | | 리프레시 토큰 만료 시간 (기본값: `7d`) |
| `OPENAI_API_KEY` | ✅ | OpenAI API 키 |
| `OPENAI_MODEL` | | 사용할 모델 (기본값: `gpt-4o-mini`) |
| `OPENAI_MAX_TOKENS` | | 최대 토큰 수 (기본값: `8000`) |
| `NODE_ENV` | | 실행 환경 (기본값: `development`) |
| `PORT` | | 서버 포트 (기본값: `3000`) |
| `BACKEND_URL` | | 백엔드 서버 URL |
| `FRONTEND_URL` | | CORS 허용 프론트엔드 URL (콤마로 복수 설정 가능) |
| `ALLOW_ALL_ORIGINS` | | 모든 도메인 허용 여부 — 운영 환경에서는 반드시 `false` |
| `TEST_USERID` | | 포맷 검사 생략 테스트 계정 ID |

---

## 🚀 설치 및 실행

### 1. 저장소 클론
```bash
git clone <repository-url>
cd qurekanode-supabase
```

### 2. 의존성 설치
```bash
npm install
```

### 3. 환경 변수 설정
```bash
cp .env.example .env
# .env 파일을 열어 각 값 입력
```

### 4. 서버 실행

**개발 모드**
```bash
npm run dev
```

**프로덕션 모드**
```bash
npm start
```

서버 실행 시 DB 연결을 확인하고 필요한 테이블을 자동으로 생성합니다.

---

## 📊 로깅

로그 파일은 `logs/` 디렉토리에 자동으로 생성됩니다.

| 파일 | 내용 |
|------|------|
| `error.log` | ERROR 레벨 로그 |
| `combined.log` | 전체 레벨 로그 |

---

## 🔒 보안

- **SQL Injection 방어**: 입력값 검증 및 pg Parameterized Query 사용
- **비밀번호 보안**: bcrypt 해싱
- **JWT 인증**: Access Token + Refresh Token (HttpOnly Cookie)
- **Rate Limiting**: 엔드포인트별 요청 횟수 제한
  - 회원가입 · 로그인: 15분당 5회
  - AI 생성: 30분당 10회
  - 저장: 10분당 10회
  - 토큰 갱신: 15분당 30회
  - 일반 API: 15분당 120회
- **CORS**: 허용된 도메인만 접근 가능
- **helmet**: 보안 HTTP 헤더 설정

---

## 저장소

본 프로젝트는 4개의 저장소로 구성되어 있습니다.

- **백엔드 (Node.js)** — 현재 저장소
- **프론트엔드 (React)** — https://github.com/HeoSeonJin0504/qurekafront.git
- **백엔드 (Spring Boot)** — https://github.com/HeoSeonJin0504/qurekaspring-supabase.git
- **AI 서버 (FastAPI)** — https://github.com/hanataba227/qureka-fastapi.git

> **백엔드는 Spring Boot 또는 Node.js 중 하나만 선택하여 사용하면 됩니다.**  
> 두 서버는 동일한 기능을 제공하며 프론트엔드와 독립적으로 연동됩니다.  
> FastAPI 서버는 OpenAI API 호출 및 프롬프트 처리 전용으로 구현되어 있으며,  
> 현재 Spring Boot / Node.js 백엔드에 해당 기능(FastAPI)이 통합되어 있어 **별도 실행 없이도 동작합니다.**