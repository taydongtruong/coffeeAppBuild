import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

// --- CẤU HÌNH URL API ---
const BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';
const API_BASE_URL = `${BASE_URL}/api`;

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const token = localStorage.getItem('access_token');

    useEffect(() => {
        // Nếu không có token, quay lại trang login ngay lập tức
        if (!token) {
            navigate('/');
            return;
        }

        const fetchStats = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/dashboard/stats`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                } else {
                    // Nếu lỗi 401 hoặc 403 (không phải manager), quay về login
                    navigate('/'); 
                }
            } catch (err) {
                console.error("Lỗi tải báo cáo:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [token, navigate]);

    if (loading) return <div className="dashboard-wrapper">🚀 Đang phân tích dữ liệu kinh doanh...</div>;
    
    // Nếu không có dữ liệu (có thể do lỗi kết nối)
    if (!stats) return (
        <div className="dashboard-wrapper">
            <p>Không thể tải dữ liệu báo cáo. Vui lòng thử lại sau.</p>
            <button className="btn-back" onClick={() => navigate('/menu')}>Quay lại</button>
        </div>
    );

    // Tính toán tỷ lệ phần trăm an toàn (tránh chia cho 0)
    const completedOrders = stats.status_counts?.completed || 0;
    const totalOrders = stats.total_orders || 0;
    const completionRate = totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(1) : 0;

    return (
        <div className="dashboard-wrapper">
            <header className="dashboard-header">
                <div>
                    <h1>📊 Tổng Quan Kinh Doanh</h1>
                    <p>Dữ liệu doanh thu và hiệu suất đơn hàng</p>
                </div>
                <button className="btn-back" onClick={() => navigate('/menu')}>← Quay lại</button>
            </header>

            <div className="stats-grid">
                <div className="stat-card revenue">
                    <h3>Tổng Doanh Thu</h3>
                    <div className="value">{(stats.total_revenue || 0).toLocaleString()}đ</div>
                    <span className="trend">Đơn hàng đã hoàn thành</span>
                </div>
                <div className="stat-card orders">
                    <h3>Tổng Đơn Hàng</h3>
                    <div className="value">{totalOrders}</div>
                    <span className="trend">Tất cả trạng thái</span>
                </div>
                <div className="stat-card completed">
                    <h3>Thành Công</h3>
                    <div className="value">{completedOrders}</div>
                    <span className="trend-up">↑ {completionRate}%</span>
                </div>
            </div>

            <div className="chart-section">
                <h3>Doanh thu 7 ngày gần nhất</h3>
                <div className="bar-chart">
                    {stats.daily_stats && stats.daily_stats.map((day, idx) => {
                        // Tính toán chiều cao cột biểu đồ
                        const maxDailyRev = Math.max(...stats.daily_stats.map(d => d.revenue)) || 1;
                        const barHeight = (day.revenue / maxDailyRev) * 150;
                        
                        return (
                            <div key={idx} className="bar-container">
                                <div 
                                    className="bar" 
                                    style={{ height: `${barHeight}px` }}
                                >
                                    <span className="tooltip">{day.revenue.toLocaleString()}đ</span>
                                </div>
                                <span className="bar-label">{day.date}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;