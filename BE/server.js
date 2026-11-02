require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Khởi tạo WebSocket hỗ trợ kết nối từ Frontend React (Vite thường chạy port 5173)
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

// Import routes
const apiRoutes = require('./routes/apiRoutes');

// Gắn Router vào đường dẫn /api
app.use('/api', apiRoutes);

// Khởi tạo MQTT & truyền io vào để phát realtime
const mqttClient = require('./services/mqttService')(io);

// ==========================================
// API ĐIỀU KHIỂN THIẾT BỊ TỪ DASHBOARD 
// ==========================================
app.post('/api/device/control', (req, res) => {
    const { maTB, hanhDong } = req.body; 
    const command = JSON.stringify({ maTB, hanhDong });
    
    // 1. Publish lệnh xuống MQTT
    mqttClient.publish('iot/devices/control', command, (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Lỗi gửi lệnh' });
    });

    // 2. Tạo hàm lắng nghe bản tin trả về từ mạch
    let isResponded = false;
    const onMessage = (topic, message) => {
        if (topic === 'iot/devices/status') {
            try {
                const data = JSON.parse(message.toString());
                if (data.maTB === maTB) {
                    isResponded = true;
                    mqttClient.removeListener('message', onMessage); // Ngừng lắng nghe để tránh trùng lặp
                    res.json({ success: true, message: 'Lệnh đã được thực thi' });
                }
            } catch (e) { }
        }
    };

    // Bắt đầu lắng nghe sự kiện MQTT
    mqttClient.on('message', onMessage);

    // 3. Đặt thời gian chờ (Timeout) là 3.5 giây
    setTimeout(async () => {
        if (!isResponded) {
            // Dọn dẹp listener vì đã hết hạn chờ
            mqttClient.removeListener('message', onMessage);

            // GHI LỊCH SỬ "THẤT BẠI" VÀO DATABASE
            try {
                const { poolPromise } = require('./config/db'); // Gọi DB
                const pool = await poolPromise;
                await pool.request()
                    .input('matb', maTB)
                    .input('hanhdong', hanhDong === "ON" ? 'Bật' : 'Tắt')
                    .input('trangthai', 'Thất bại') // Lưu chữ Thất bại
                    .query(`INSERT INTO history (MaTB, HanhDong, TrangThai, ThoiGian) VALUES (@matb, @hanhdong, @trangthai, GETDATE())`);
            } catch (dbError) {
                console.error('Lỗi lưu DB khi timeout:', dbError);
            }

            // Trả về mã lỗi 408 (Request Timeout) cho Web
            return res.status(408).json({ success: false, message: 'Thiết bị không phản hồi' });
        }
    }, 3500); 
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`=> Server Backend đang chạy tại http://localhost:${PORT}`);
});