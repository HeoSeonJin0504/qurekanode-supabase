import { query } from '../config/db.js';
import bcrypt from 'bcrypt';

class User {
  // 비밀번호를 bcrypt로 해싱하여 사용자 생성
  static async create(userData) {
    try {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const { rows } = await query(
        `INSERT INTO users (userid, password, name, age, gender, phone, email)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING userindex, userid, name, email`,
        [userData.userid, hashedPassword, userData.name, userData.age, userData.gender, userData.phone, userData.email || null]
      );
      return rows[0];
    } catch (error) {
      throw error;
    }
  }

  // 아이디(userid)로 사용자 조회
  static async findByUserid(userid) {
    try {
      const { rows } = await query('SELECT * FROM users WHERE userid = $1', [userid]);
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // PK(userindex)로 사용자 조회
  static async findById(id) {
    try {
      const { rows } = await query('SELECT * FROM users WHERE userindex = $1', [id]);
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // 아이디·비밀번호 대조 인증 후 사용자 반환
  static async authenticate(userid, password) {
    try {
      const user = await this.findByUserid(userid);
      if (!user) return null;
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) return null;
      return {
        userindex: user.userindex,
        userid:    user.userid,
        name:      user.name,
        email:     user.email,
        age:       user.age,
        gender:    user.gender,
        phone:     user.phone,
      };
    } catch (error) {
      console.error('사용자 인증 오류:', error);
      throw error;
    }
  }
}

export default User;