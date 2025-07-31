const express = require('express');
const router = express.Router();
const problemSummaryMetaController = require('../controllers/problemSummaryMetaController');

// 모든 문제 메타데이터 조회
router.get('/', problemSummaryMetaController.getAllProblemSummaryMeta);

// 특정 ID의 문제 메타데이터 조회
router.get('/:id', problemSummaryMetaController.getProblemSummaryMetaById);

module.exports = router;
