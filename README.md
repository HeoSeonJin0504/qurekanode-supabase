# Qurekanode-Supabase

Qurekanode-Supabase는 강의 자료를 기반으로 요약본과 문제를 자동 생성하는 학습 플랫폼의 **백엔드 서버(Node.JS)**입니다.

## 프로젝트 개요

사용자가 강의자료(PDF, PPT)를 업로드하면 ChatGPT API가 이를 분석하여 요약본과 문제를 자동으로 생성합니다. 
사용자는 생성된 요약본과 문제를 저장하고, 문제를 풀어볼 수 있으며, 원하는 문제를 즐겨찾기에 추가하여 관리할 수 있습니다.

### 본 프로젝트 주요 기능

- **사용자 인증**: 회원가입, 로그인, JWT 기반 인증
- **요약본 관리**: 생성된 요약본 저장, 조회, 수정, 삭제
- **문제 관리**: 생성된 문제 저장, 조회, 수정, 삭제
- **즐겨찾기**: 문제 즐겨찾기 추가/제거, 폴더별 관리
- **보안**: SQL Injection 방어, Rate Limiting, 입력값 검증

## 🛠️ 기술 스택

### Core
- **Node.js** (v16+) - 서버 런타임
- **Express** (v4.18.2) - 웹 프레임워크

### Database & Authentication
- **Supabase** (v2.39.0) - PostgreSQL 기반 BaaS, 데이터베이스 및 실시간 기능
- **bcrypt** (v5.1.1) - 비밀번호 해싱
- **jsonwebtoken** (v9.0.2) - JWT 토큰 생성 및 검증

### Security & Middleware
- **cors** (v2.8.5) - Cross-Origin Resource Sharing 처리
- **express-rate-limit** (v7.5.1) - API 요청 제한 (DoS 공격 방어)
- **cookie-parser** (v1.4.6) - 쿠키 파싱

### Utilities
- **dotenv** (v16.3.1) - 환경 변수 관리
- **winston** (v3.11.0) - 로깅 시스템

### Development
- **nodemon** (v3.0.2) 
- **jest** (v29.7.0) 
- **supertest** (v7.1.3)

## 📁 프로젝트 구조

```
qurekanode-supabase/
├── config/              # 설정 파일
│   └── db.js           # Supabase 연결 설정
├── controllers/         # 요청 처리 로직
│   ├── authController.js           # 인증 관련 컨트롤러
│   ├── userController.js           # 사용자 관리
│   ├── summaryController.js        # 요약본 관리
│   ├── questionController.js       # 문제 관리
│   ├── favoriteController.js       # 즐겨찾기 관리
│   └── problemSummaryMetaController.js  # 메타데이터 조회
├── models/              # 데이터 모델 (데이터베이스 쿼리)
│   ├── userModel.js                # 사용자 모델
│   ├── tokenModel.js               # 토큰 모델
│   ├── summaryModel.js             # 요약본 모델
│   ├── questionModel.js            # 문제 모델
│   └── favoriteModel.js            # 즐겨찾기 모델
├── routes/              # API 라우트 정의
│   ├── authRoutes.js               # 인증 라우트
│   ├── userRoutes.js               # 사용자 라우트
│   ├── summaryRoutes.js            # 요약본 라우트
│   ├── questionRoutes.js           # 문제 라우트
│   ├── favoriteRoutes.js           # 즐겨찾기 라우트
│   └── problemSummaryMeta.js       # 메타데이터 라우트
├── middlewares/         # 미들웨어
│   └── authMiddleware.js           # JWT 토큰 검증
├── utils/               # 유틸리티 함수
│   ├── logger.js                   # Winston 로거 설정
│   ├── validation.js               # 입력값 검증
│   ├── formatUtil.js               # 데이터 포맷팅
│   ├── tokenUtil.js                # 토큰 생성 및 검증
│   └── requestLock.js              # 동시 요청 방지
├── logs/                # 로그 파일 (자동 생성)
├── .env                 # 환경 변수
├── app.js               # Express 앱 초기화 및 설정
├── package.json         # 프로젝트 의존성
└── nodemon.json         # Nodemon 설정
```

## API 엔드포인트

### 인증 (Authentication)
- `POST /api/users/register` - 회원가입
- `POST /api/users/login` - 로그인
- `POST /api/users/check-userid` - 아이디 중복 확인
- `POST /api/auth/refresh-token` - 토큰 갱신
- `POST /api/auth/logout` - 로그아웃
- `GET /api/auth/verify` - 토큰 검증

### 요약본 (Summaries)
- `POST /api/summaries` - 요약본 저장
- `GET /api/summaries/user/:userId` - 사용자별 요약본 목록 조회
- `GET /api/summaries/:id` - 요약본 상세 조회
- `PATCH /api/summaries/:id/name` - 요약본 이름 변경 (인증 필요)
- `DELETE /api/summaries/:id` - 요약본 삭제 (인증 필요)

### 문제 (Questions)
- `POST /api/questions` - 문제 저장
- `GET /api/questions/user/:userId` - 사용자별 문제 목록 조회
- `GET /api/questions/:id` - 문제 상세 조회
- `PATCH /api/questions/:id/name` - 문제 이름 변경 (인증 필요)
- `DELETE /api/questions/:id` - 문제 삭제 (인증 필요)

### 즐겨찾기 (Favorites)
#### 폴더 관리
- `GET /api/favorites/folders/:userId` - 사용자의 모든 폴더 조회
- `POST /api/favorites/folders` - 새 폴더 생성
- `GET /api/favorites/folders/default/:userId` - 기본 폴더 조회/생성
- `DELETE /api/favorites/folders/:folderId` - 폴더 삭제

#### 문제 관리
- `POST /api/favorites/questions` - 즐겨찾기에 문제 추가
- `DELETE /api/favorites/questions/:favoriteId` - 즐겨찾기에서 문제 제거
- `GET /api/favorites/check/:userId/:questionId` - 특정 문제 즐겨찾기 확인
- `POST /api/favorites/check-multiple/:userId` - 여러 문제 즐겨찾기 상태 확인
- `GET /api/favorites/questions/all/:userId` - 사용자의 모든 즐겨찾기 문제 조회
- `GET /api/favorites/folders/:folderId/questions/:userId` - 폴더별 문제 조회

### 메타데이터 (Metadata)
- `GET /api/problem-summary-meta` - 모든 문제 메타데이터 조회
- `GET /api/problem-summary-meta/:id` - 특정 문제 메타데이터 조회

## 데이터베이스 구조

### users (사용자)
```sql
userindex      SERIAL PRIMARY KEY
userid         VARCHAR(30) UNIQUE NOT NULL
password       TEXT NOT NULL
name           VARCHAR(50) NOT NULL
age            INT NOT NULL
gender         TEXT CHECK (gender IN ('male', 'female', 'other'))
phone          VARCHAR(15) UNIQUE NOT NULL
email          VARCHAR(100) UNIQUE
created_at     TIMESTAMP DEFAULT NOW()
updated_at     TIMESTAMP DEFAULT NOW()
```

### refresh_token (리프레시 토큰)
```sql
id             SERIAL PRIMARY KEY
user_id        INT NOT NULL REFERENCES users(userindex)
token          TEXT NOT NULL
expires_at     TIMESTAMP NOT NULL
created_at     TIMESTAMP DEFAULT NOW()
```

### user_summaries (요약)
```sql
selection_id   SERIAL PRIMARY KEY
user_id        INT NOT NULL REFERENCES users(userindex)
file_name      TEXT NOT NULL
summary_name   TEXT NOT NULL DEFAULT 'Untitled Summary'
summary_type   type TEXT CHECK (summary_type IN ('basic', 'key_points', 'topic', 'outline', 'keywords'))
summary_text   TEXT NOT NULL
created_at     TIMESTAMP DEFAULT NOW()
```

### user_questions (문제)
```sql
selection_id   SERIAL PRIMARY KEY
user_id        INT NOT NULL REFERENCES users(userindex)
file_name      TEXT NOT NULL
question_name  TEXT NOT NULL DEFAULT 'Untitled Question'
question_type  TEXT CHECK (question_type IN ('multiple_choice', 'sequence', 'true_false', 'fill_in_the_blank', 'short_answer', 'descriptive'))
question_data  JSONB NOT NULL
created_at     TIMESTAMP DEFAULT NOW()
```

### favorite_folders (즐겨찾기 폴더)
```sql
folder_id      SERIAL PRIMARY KEY
user_id        INT NOT NULL REFERENCES users(userindex) ON DELETE CASCADE
folder_name    TEXT NOT NULL
description    TEXT
created_at     TIMESTAMP DEFAULT NOW()
updated_at     TIMESTAMP DEFAULT NOW()
```

### favorite_questions (즐겨찾기 문제)
```sql
favorite_id    SERIAL PRIMARY KEY
user_id        INT NOT NULL REFERENCES users(userindex) ON DELETE CASCADE
folder_id      INT REFERENCES favorite_folders(folder_id) ON DELETE CASCADE
question_id    INT NOT NULL REFERENCES user_questions(selection_id) ON DELETE CASCADE
question_index INT NOT NULL DEFAULT 0
created_at     TIMESTAMP DEFAULT NOW()
UNIQUE(user_id, folder_id, question_id, question_index)
```

## 환경 변수 설정

`.env` 파일을 생성하고 다음 내용을 설정하세요:

```env
# Supabase 설정
SUPABASE_URL=Supabase_URL을_입력하세요
SUPABASE_KEY=Supabase_anon_key를_입력하세요

# JWT 토큰 설정
ACCESS_TOKEN_SECRET=Access_Token_비밀키를_입력하세요
REFRESH_TOKEN_SECRET=Refresh_Token_비밀키를_입력하세요

# 토큰 유효기간
ACCESS_TOKEN_EXPIRY=1h
REFRESH_TOKEN_EXPIRY=7d

# 환경 설정 (개발 환경이면 development, 운영 환경이면 production)
NODE_ENV=development

# 백엔드 서버가 실행될 포트 번호
PORT=3000

# API URL 설정 (개발 환경 기준)
BACKEND_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173

# CORS 설정 (모든 도메인을 허용하려면 true, 특정 도메인만 허용하려면 false)
ALLOW_ALL_ORIGINS=false
```

## 설치 및 실행

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
`.env` 파일을 생성하고 위의 환경 변수를 설정합니다.

### 4. Supabase 데이터베이스 설정
Supabase 프로젝트를 생성하고 위의 데이터베이스 구조에 맞게 테이블을 생성합니다.

### 5. 서버 실행

**개발 모드**
```bash
npm run dev
```

**프로덕션 모드**
```bash
npm start
```

## 📊 로깅

로그 파일은 `logs/` 디렉토리에 자동으로 생성됩니다:
- `error.log` - 에러 레벨 로그
- `combined.log` - 모든 레벨의 로그

## 🔒 보안 기능

- **SQL Injection 방어**: 입력값 검증 및 Supabase Prepared Statements 사용
- **비밀번호 보안**: bcrypt를 사용한 해싱
- **JWT 인증**: Access Token + Refresh Token
- **Rate Limiting**: 회원가입 API에 15분당 5회 제한
- **CORS 설정**: 허용된 도메인만 접근 가능
- **입력값 검증**: 아이디, 비밀번호, 이메일 등 형식 검증

## 개발
본 프로젝트는 **Claude Sonnet 3.7** AI를 활용하여 코드 리뷰, 리팩토링, 문서화 작업을 수행했습니다.

## 저장소
본 프로젝트는 3개의 저장소로 구성되어 있습니다:

- **백엔드 (Node.js)** - 현재 저장소
  - 사용자 인증, 데이터 관리, API 서버
  
- **프론트엔드 (React)** 
  - https://github.com/HeoSeonJin0504/qurekafront.git
  
- **AI 서버 (FastAPI)** - ChatGPT API 관련 기능
  - https://github.com/hanataba227/qureka-fastapi.git
