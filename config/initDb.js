import { query } from './db.js';
import logger from '../utils/logger.js';

// 서버 시작 시 필요한 테이블이 없으면 자동 생성
export async function initDb() {
  try {
    // ENUM 타입 생성 (이미 존재하면 무시)
    await query(`
      DO $$ BEGIN
        CREATE TYPE summary_type_enum AS ENUM ('basic', 'key_points', 'topic', 'outline', 'keywords');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await query(`
      DO $$ BEGIN
        CREATE TYPE question_type_enum AS ENUM (
          'multiple_choice', 'sequence', 'fill_in_the_blank',
          'true_false', 'short_answer', 'descriptive'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // users 테이블
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        userindex SERIAL PRIMARY KEY,
        userid    VARCHAR(20)  NOT NULL UNIQUE,
        password  VARCHAR(255) NOT NULL,
        name      VARCHAR(50)  NOT NULL,
        age       SMALLINT     NOT NULL CHECK (age >= 1 AND age <= 150),
        gender    VARCHAR(10)  NOT NULL CHECK (gender IN ('male', 'female')),
        phone     VARCHAR(20)  NOT NULL UNIQUE,
        email     VARCHAR(100) UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // refresh_token 테이블
    await query(`
      CREATE TABLE IF NOT EXISTS refresh_token (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER      NOT NULL REFERENCES users(userindex) ON DELETE CASCADE,
        token      VARCHAR(255) NOT NULL,
        expires_at TIMESTAMPTZ  NOT NULL,
        created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
    `);

    // user_summaries 테이블
    await query(`
      CREATE TABLE IF NOT EXISTS user_summaries (
        selection_id SERIAL PRIMARY KEY,
        user_id      INTEGER            NOT NULL REFERENCES users(userindex) ON DELETE CASCADE,
        file_name    VARCHAR(255)       NOT NULL,
        summary_name VARCHAR(255)       NOT NULL DEFAULT 'Untitled Summary',
        summary_type summary_type_enum  NOT NULL,
        summary_text TEXT               NOT NULL,
        created_at   TIMESTAMPTZ        NOT NULL DEFAULT NOW()
      );
    `);

    // user_questions 테이블
    await query(`
      CREATE TABLE IF NOT EXISTS user_questions (
        selection_id  SERIAL PRIMARY KEY,
        user_id       INTEGER              NOT NULL REFERENCES users(userindex) ON DELETE CASCADE,
        file_name     VARCHAR(255)         NOT NULL,
        question_name VARCHAR(255)         NOT NULL DEFAULT 'Untitled Question',
        question_type question_type_enum   NOT NULL,
        question_data JSONB                NOT NULL DEFAULT '{}',
        created_at    TIMESTAMPTZ          NOT NULL DEFAULT NOW()
      );
    `);

    // favorite_folders 테이블
    await query(`
      CREATE TABLE IF NOT EXISTS favorite_folders (
        folder_id   SERIAL PRIMARY KEY,
        user_id     INTEGER      NOT NULL REFERENCES users(userindex) ON DELETE CASCADE,
        folder_name VARCHAR(100) NOT NULL,
        description VARCHAR(255),
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, folder_name)
      );
    `);

    // favorite_questions 테이블
    await query(`
      CREATE TABLE IF NOT EXISTS favorite_questions (
        favorite_id    SERIAL PRIMARY KEY,
        user_id        INTEGER     NOT NULL REFERENCES users(userindex) ON DELETE CASCADE,
        folder_id      INTEGER     NOT NULL REFERENCES favorite_folders(folder_id) ON DELETE CASCADE,
        question_id    INTEGER     NOT NULL REFERENCES user_questions(selection_id) ON DELETE CASCADE,
        question_index SMALLINT    NOT NULL DEFAULT 0,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (user_id, question_id, question_index)
      );
    `);

    logger.info('DB 테이블 초기화 완료');
  } catch (err) {
    logger.error('DB 테이블 초기화 실패: ' + err.message);
    throw err;
  }
}
