/**
 * 동시 요청 방지를 위한 간단한 in-memory 잠금 시스템
 */
class RequestLock {
  constructor() {
    this.locks = new Map();
    this.timeout = 5000; // 5초 후 자동 해제
  }

  /**
   * 잠금 획득 시도
   * @param {string} key - 잠금 키 (예: userid)
   * @returns {boolean} 잠금 획득 성공 여부
   */
  acquire(key) {
    if (this.locks.has(key)) {
      return false; // 이미 잠금이 있음
    }

    // 잠금 설정
    const lockInfo = {
      timestamp: Date.now(),
      timer: setTimeout(() => {
        this.release(key);
      }, this.timeout)
    };
    
    this.locks.set(key, lockInfo);
    return true;
  }

  /**
   * 잠금 해제
   * @param {string} key - 잠금 키
   */
  release(key) {
    const lockInfo = this.locks.get(key);
    if (lockInfo) {
      clearTimeout(lockInfo.timer);
      this.locks.delete(key);
    }
  }

  /**
   * 만료된 잠금 정리 (선택사항)
   */
  cleanup() {
    const now = Date.now();
    for (const [key, lockInfo] of this.locks.entries()) {
      if (now - lockInfo.timestamp > this.timeout) {
        this.release(key);
      }
    }
  }
}

// 싱글톤 인스턴스
const registrationLock = new RequestLock();

// 30초마다 만료된 잠금 정리
setInterval(() => {
  registrationLock.cleanup();
}, 30000);

module.exports = registrationLock;
