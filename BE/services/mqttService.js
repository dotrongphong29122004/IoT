const mqtt = require('mqtt');
const { poolPromise } = require('../config/db');

function setupMqtt(io) {
    const client = mqtt.connect(process.env.MQTT_HOST, {
        username: process.env.MQTT_USER,
        password: process.env.MQTT_PASS
    });

    client.on('connect', () => {
        console.log('=> Đã kết nối tới MQTT Broker');
        // Subscribe các topic từ ESP32
        client.subscribe('iot/sensors/data');
        client.subscribe('iot/devices/status');
    });

    client.on('message', async (topic, message) => {
        const payload = message.toString();
        console.log(`Nhận bản tin từ [${topic}]: ${payload}`);

        try {
            const pool = await poolPromise;
            const data = JSON.parse(payload);

            // 1. Luồng dữ liệu cảm biến
            if (topic === 'iot/sensors/data') {
                // Đẩy dữ liệu realtime lên Frontend qua WebSocket
                io.emit('sensor-data', data);

                // Lưu vào SQL Server bảng data_sensor
                // Giả sử MaCB: 1=Nhiệt độ, 2=Độ ẩm, 3=Ánh sáng
                const query = `
                    INSERT INTO data_sensor (MaCB, GiaTri, ThoiGian) VALUES 
                    (1, @temp, GETDATE()), 
                    (2, @hum, GETDATE()), 
                    (3, @lux, GETDATE())
                `;
                await pool.request()
                    .input('temp', data.temp)
                    .input('hum', data.hum)
                    .input('lux', data.lux)
                    .query(query);
            }

            // 2. Luồng trạng thái thiết bị (Phản hồi từ ESP32)
            if (topic === 'iot/devices/status') {
                // data ví dụ: {"maTB": 1, "trangThai": "ON"}
                const actionText = data.trangThai === "ON" ? "Bật" : "Tắt";
                
                await pool.request()
                    .input('matb', data.maTB)
                    .input('hanhdong', actionText)
                    .input('trangthai', "Thành công")
                    .query(`INSERT INTO history (MaTB, HanhDong, TrangThai, ThoiGian) 
                            VALUES (@matb, @hanhdong, @trangthai, GETDATE())`);
                
                // Báo cho Frontend biết thiết bị đã đổi trạng thái thành công
                io.emit('device-status', data);
            }
        } catch (error) {
            console.error('Lỗi xử lý message MQTT:', error);
        }
    });

    return client;
}

module.exports = setupMqtt;