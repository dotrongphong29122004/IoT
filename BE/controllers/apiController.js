const { poolPromise } = require('../config/db');

// [GET] /api/dashboard/chart-history
// Mục đích: Lấy dữ liệu khởi tạo biểu đồ
exports.getChartHistory = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 30;
        const pool = await poolPromise;
        
        const query = `
            SELECT TOP (${limit * 3}) 
                d.GiaTri, d.ThoiGian, s.LoaiCB 
            FROM data_sensor d
            JOIN sensor s ON d.MaCB = s.MaCB
            ORDER BY d.ThoiGian DESC
        `;
        
        const result = await pool.request().query(query);
        res.status(200).json(result.recordset);
    } catch (error) {
        console.error("Lỗi lấy dữ liệu biểu đồ:", error);
        res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
    }
};

// [GET] /api/data-sensor
// Mục đích: Lấy dữ liệu bảng cảm biến (Có Search, Lọc, Sắp xếp, Phân trang)
exports.getDataSensor = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // Lấy các tham số lọc/tìm kiếm từ URL
        const search = req.query.search || '';
        const searchField = req.query.searchField || 'all';
        
        // Cấu hình cột sắp xếp (chống SQL Injection bằng cách giới hạn chuỗi cho phép)
        const sortBy = req.query.sortBy === 'value' ? 'd.GiaTri' : 'd.ThoiGian';
        const sortDir = req.query.order === 'asc' ? 'ASC' : 'DESC';

        const pool = await poolPromise;
        const request = pool.request(); // Tạo một request chung để map input

        let whereConditions = [];

        // 1. Xử lý Lọc theo Loại cảm biến (Dropdown)
        if (searchField === 'temp') whereConditions.push("d.MaCB = 1");
        else if (searchField === 'humidity') whereConditions.push("d.MaCB = 2");
        else if (searchField === 'light') whereConditions.push("d.MaCB = 3");

        // 2. Xử lý Tìm kiếm chuỗi (Text Search)
        if (search) {
            request.input('searchTerm', `%${search}%`);
            
            if (searchField === 'time') {
                // Chuyển ngày giờ thành chuỗi YYYY-MM-DD HH:mm:ss để dễ tìm kiếm
                whereConditions.push("CONVERT(VARCHAR, d.ThoiGian, 120) LIKE @searchTerm");
            } else if (['temp', 'humidity', 'light'].includes(searchField)) {
                whereConditions.push("CAST(d.GiaTri AS VARCHAR) LIKE @searchTerm");
            } else {
                // Nếu là 'all' thì tìm bao quát trên mọi cột
                whereConditions.push(`(
                    CAST(d.MaData AS VARCHAR) LIKE @searchTerm OR 
                    s.TenCB LIKE @searchTerm OR 
                    CAST(d.GiaTri AS VARCHAR) LIKE @searchTerm OR 
                    CONVERT(VARCHAR, d.ThoiGian, 120) LIKE @searchTerm
                )`);
            }
        }

        // 3. Ghép nối chuỗi WHERE
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Truy vấn lấy dữ liệu
        const dataQuery = `
            SELECT 
                d.MaData AS id, 
                s.TenCB AS device, 
                s.LoaiCB AS type,
                d.GiaTri AS value, 
                s.DonViDo AS unit,
                d.ThoiGian AS datetime
            FROM data_sensor d
            JOIN sensor s ON d.MaCB = s.MaCB
            ${whereClause}
            ORDER BY ${sortBy} ${sortDir}
            OFFSET @offset ROWS 
            FETCH NEXT @limit ROWS ONLY
        `;

        // Truy vấn đếm tổng số dòng (áp dụng cùng bộ lọc để tính chính xác số trang)
        const countQuery = `
            SELECT COUNT(*) as total 
            FROM data_sensor d
            JOIN sensor s ON d.MaCB = s.MaCB
            ${whereClause}
        `;

        // Truyền tham số phân trang
        request.input('offset', offset);
        request.input('limit', limit);

        // Chạy song song 2 truy vấn Data và Count cho tối ưu
        const dataResult = await request.query(dataQuery);
        const countResult = await request.query(countQuery);
        
        const total = countResult.recordset[0].total;

        res.status(200).json({
            data: dataResult.recordset,
            pagination: {
                page: page,
                limit: limit,
                total: total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("Lỗi lấy dữ liệu Data Sensor:", error);
        res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
    }
};

// [GET] /api/history
// Mục đích: Lấy lịch sử điều khiển (Có Search, Lọc nhiều dropdown, Sắp xếp, Phân trang)
exports.getHistory = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const search = req.query.search || '';
        const deviceFilter = req.query.device;
        const actionFilter = req.query.action;
        const statusFilter = req.query.status;
        const sortDir = req.query.order === 'asc' ? 'ASC' : 'DESC';

        const pool = await poolPromise;
        const request = pool.request();

        let whereConditions = [];

        // 1. Xử lý các Dropdown Bộ lọc
        if (deviceFilter) {
            whereConditions.push("t.TenTB = @device");
            request.input('device', deviceFilter);
        }
        if (actionFilter) {
            whereConditions.push("h.HanhDong = @action");
            request.input('action', actionFilter);
        }
        if (statusFilter) {
            whereConditions.push("h.TrangThai = @status");
            request.input('status', statusFilter);
        }

        // 2. Xử lý Tìm kiếm tổng hợp
        if (search) {
            request.input('searchTerm', `%${search}%`);
            whereConditions.push(`(
                CAST(h.MaLichSu AS VARCHAR) LIKE @searchTerm OR 
                t.TenTB LIKE @searchTerm OR 
                h.HanhDong LIKE @searchTerm OR 
                h.TrangThai LIKE @searchTerm OR 
                CONVERT(VARCHAR, h.ThoiGian, 120) LIKE @searchTerm
            )`);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Truy vấn dữ liệu Data
        const dataQuery = `
            SELECT 
                h.MaLichSu AS id, 
                t.TenTB AS device, 
                h.HanhDong AS action, 
                h.TrangThai AS status, 
                h.ThoiGian AS datetime
            FROM history h
            JOIN device t ON h.MaTB = t.MaTB
            ${whereClause}
            ORDER BY h.ThoiGian ${sortDir}
            OFFSET @offset ROWS 
            FETCH NEXT @limit ROWS ONLY
        `;

        // Truy vấn Count tổng dòng thoả mãn điều kiện tìm kiếm
        const countQuery = `
            SELECT COUNT(*) as total 
            FROM history h
            JOIN device t ON h.MaTB = t.MaTB
            ${whereClause}
        `;

        // 3. Truy vấn bổ sung: Đếm trạng thái (Quick Stats) dùng cho Header Frontend
        // Nhóm GROUP BY trên TOÀN BỘ database để cho cái nhìn tổng quan.
        const statsQuery = `
            SELECT TrangThai, COUNT(*) as count 
            FROM history 
            GROUP BY TrangThai
        `;

        request.input('offset', offset);
        request.input('limit', limit);

        const dataResult = await request.query(dataQuery);
        const countResult = await request.query(countQuery);
        const statsResult = await pool.request().query(statsQuery); // Chạy query stats độc lập (không cần where param)

        const total = countResult.recordset[0].total;

        // Map kết quả đếm trạng thái về dạng object { success, processing, error }
        let counts = { success: 0, processing: 0, error: 0 };
        statsResult.recordset.forEach(row => {
            if (row.TrangThai === 'Thành công') counts.success = row.count;
            if (row.TrangThai === 'Đang xử lý') counts.processing = row.count;
            if (row.TrangThai === 'Thất bại') counts.error = row.count;
        });

        res.status(200).json({
            data: dataResult.recordset,
            counts: counts, // Đẩy obj counts này lên cho UI gán trực tiếp vào Thẻ Quick Stats
            pagination: {
                page: page,
                limit: limit,
                total: total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error("Lỗi lấy dữ liệu History:", error);
        res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
    }
};

// [GET] /api/devices
// Mục đích: Lấy trạng thái hiện tại của thiết bị (LED) lúc vừa mở Dashboard
exports.getDevices = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT MaTB, TenTB, TrangThaiHienTai FROM device');
        res.status(200).json({ status: 'success', data: result.recordset });
    } catch (error) {
        console.error("Lỗi lấy trạng thái thiết bị:", error);
        res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
    }
};

// [GET] /api/profile
// Mục đích: Lấy thông tin cá nhân (Tạm fix cứng MaUser = 1 do chưa làm tính năng Login)
exports.getProfile = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT HoTen, Avatar, MaSinhVien, LinkFigma, LinkGithub, LinkPostman, LinkDoc FROM [user] WHERE MaUser = 1');
        res.status(200).json({ status: 'success', data: result.recordset[0] });
    } catch (error) {
        console.error("Lỗi lấy profile:", error);
        res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
    }
};

// [PUT] /api/profile
// Mục đích: Lưu cập nhật thông tin cá nhân vào Database
exports.updateProfile = async (req, res) => {
    try {
        const { name, msv, figma, github, postman, docLink, avatar } = req.body;
        const pool = await poolPromise;
        
        await pool.request()
            .input('hoten', name)
            .input('msv', msv)
            .input('figma', figma)
            .input('github', github)
            .input('postman', postman)
            .input('docLink', docLink)
            .input('avatar', avatar)
            .query(`
                UPDATE [user] SET 
                    HoTen = @hoten, MaSinhVien = @msv, 
                    LinkFigma = @figma, LinkGithub = @github, 
                    LinkPostman = @postman, LinkDoc = @docLink, 
                    Avatar = @avatar
                WHERE MaUser = 1
            `);
            
        res.status(200).json({ status: 'success', message: 'Cập nhật thành công' });
    } catch (error) {
        console.error("Lỗi cập nhật profile:", error);
        res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
    }
};