const express = require('express');
const router = express.Router();
const { formatUtil } = require('../utils');

// 기본 API 경로
router.get('/', (req, res) => {
    res.json({ message: 'API is working' });
});

// 여기에 추가 라우트 정의
// 예: router.use('/users', require('./users'));

module.exports = router;
