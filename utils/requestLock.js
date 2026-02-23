class RequestLock {
  constructor() {
    this.locks = new Map();
    this.timeout = 5000;
  }

  // 키에 대한 락 획득 (이미 잊힌 경우 false 반환)
  acquire(key) {
    if (this.locks.has(key)) return false;
    const lockInfo = {
      timestamp: Date.now(),
      timer: setTimeout(() => this.release(key), this.timeout),
    };
    this.locks.set(key, lockInfo);
    return true;
  }

  // 락 해제 및 타이머 정리
  release(key) {
    const lockInfo = this.locks.get(key);
    if (lockInfo) {
      clearTimeout(lockInfo.timer);
      this.locks.delete(key);
    }
  }

  // 타임아웃 초과 락 강제 정리
  cleanup() {
    const now = Date.now();
    for (const [key, lockInfo] of this.locks.entries()) {
      if (now - lockInfo.timestamp > this.timeout) this.release(key);
    }
  }
}

const registrationLock = new RequestLock();
setInterval(() => registrationLock.cleanup(), 30000);

export default registrationLock;
