// src/components/Dashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const API_BASE_URL = 'http://127.0.0.1:5000/api';

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const token = localStorage.getItem('access_token');

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/dashboard/stats`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                } else {
                    navigate('/'); // Không phải manager hoặc hết hạn thì đá ra ngoài
                }
            } catch (err) {
                console.error("Lỗi:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [token, navigate]);

    if (loading) return <div className="dashboard-wrapper">Đang phân tích dữ liệu...</div>;
    if (!stats) return null;

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
                    <div className="value">{stats.total_revenue.toLocaleString()}đ</div>
                    <span className="trend">Đơn hàng đã hoàn thành</span>
                </div>
                <div className="stat-card orders">
                    <h3>Tổng Đơn Hàng</h3>
                    <div className="value">{stats.total_orders}</div>
                    <span className="trend">Tất cả trạng thái</span>
                </div>
                <div className="stat-card completed">
                    <h3>Thành Công</h3>
                    <div className="value">{stats.status_counts.completed}</div>
                    <span className="trend-up">↑ {((stats.status_counts.completed / stats.total_orders) * 100).toFixed(1)}%</span>
                </div>
            </div>

            <div className="chart-section">
                <h3>Doanh thu 7 ngày gần nhất</h3>
                <div className="bar-chart">
                    {stats.daily_stats.map((day, idx) => (
                        <div key={idx} className="bar-container">
                            <div 
                                className="bar" 
                                style={{ height: `${(day.revenue / (Math.max(...stats.daily_stats.map(d => d.revenue)) || 1)) * 150}px` }}
                            >
                                <span className="tooltip">{day.revenue.toLocaleString()}đ</span>
                            </div>
                            <span className="bar-label">{day.date}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;