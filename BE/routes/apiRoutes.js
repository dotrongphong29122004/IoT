const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');

// 1. API cho Dashboard: Lấy dữ liệu lịch sử để vẽ biểu đồ ban đầu
router.get('/dashboard/chart-history', apiController.getChartHistory);

// 2. API cho trang Data Sensor: Lấy danh sách đo đạc (có phân trang)
router.get('/data-sensor', apiController.getDataSensor);

// 3. API cho trang History: Lấy danh sách lịch sử bật/tắt thiết bị (có phân trang)
router.get('/history', apiController.getHistory);

module.exports = router;