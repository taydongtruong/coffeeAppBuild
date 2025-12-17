// src/components/OrderList.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './OrderList.css'; 

const API_BASE_URL = 'http://127.0.0.1:5000/api';

const OrderList = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    
    const token = localStorage.getItem('access_token');

    const fetchOrders = async () => {
        if (!token) { navigate('/'); return; }
        try {
            const response = await fetch(`${API_BASE_URL}/orders`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.status === 403) {
                setError('Bạn không có quyền xem danh sách này.');
                return;
            }
            if (!response.ok) throw new Error('Lỗi tải danh sách đơn hàng.');
            const data = await response.json();
            setOrders(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleUpdateStatus = async (orderId, newStatus) => {
        try {
            const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ order_status: newStatus })
            });
            if (response.ok) fetchOrders();
        } catch (err) {
            alert('Lỗi kết nối.');
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'completed': return { label: 'Hoàn thành', color: '#28a745', bg: '#d4edda' };
            case 'cancelled': return { label: 'Đã hủy', color: '#dc3545', bg: '#f8d7da' };
            default: return { label: 'Đang chờ', color: '#f39c12', bg: '#fef5e7' };
        }
    };

    if (loading) return <div className="order-list-wrapper">Đang tải dữ liệu...</div>;

    return (
        <div className="order-list-wrapper">
            {/* Header đã bỏ Inline Style để dùng CSS file */}
            <header className="order-list-header">
                <div className="header-title">
                    <h1>📋 Quản Lý Đơn Hàng</h1>
                    <p>Theo dõi và cập nhật tiến độ pha chế</p>
                </div>
                <button className="btn-menu" onClick={() => navigate('/menu')}>
                    ← Menu chính
                </button>
            </header>

            {orders.length === 0 ? (
                <div className="no-orders">Hệ thống hiện chưa có đơn hàng nào.</div>
            ) : (
                <div className="orders-container">
                    {orders.map(order => {
                        const style = getStatusStyle(order.order_status);
                        return (
                            <div key={order.id} className="order-card" style={{ borderLeft: `8px solid ${style.color}` }}>
                                <div className="order-header">
                                    <div className="order-info">
                                        <span className="order-id">Đơn hàng #{order.id}</span>
                                        <div className="order-meta">
                                            <span>⏰ {new Date(order.created_at).toLocaleString('vi-VN')}</span>
                                            <span className="order-creator">👤 {order.created_by}</span>
                                        </div>
                                    </div>
                                    <div className="order-status-right">
                                        <div className="price-tag">{order.total_amount.toLocaleString()}đ</div>
                                        <span className="status-badge" style={{color: style.color, backgroundColor: style.bg}}>
                                            {style.label}
                                        </span>
                                    </div>
                                </div>

                                <div className="items-box">
                                    {order.items.map((item, idx) => (
                                        <div key={idx} className="item-row-with-img">
                                            <div className="item-main">
                                                <img 
                                                    src={item.image_url || 'https://via.placeholder.com/50?text=No+Img'} 
                                                    className="order-item-img"
                                                    alt={item.product_name}
                                                    onError={(e) => { e.target.src = 'https://via.placeholder.com/50?text=Error'; }}
                                                />
                                                <span className="item-details">
                                                    <strong>{item.quantity}</strong> x {item.product_name}
                                                </span>
                                            </div>
                                            <span className="item-price">{(item.quantity * item.unit_price).toLocaleString()}đ</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="status-actions">
                                    <button className="btn-status btn-pending" onClick={() => handleUpdateStatus(order.id, 'pending')} disabled={order.order_status === 'pending'}>CHỜ</button>
                                    <button className="btn-status btn-complete" onClick={() => handleUpdateStatus(order.id, 'completed')} disabled={order.order_status === 'completed'}>XONG</button>
                                    <button className="btn-status btn-cancel" onClick={() => handleUpdateStatus(order.id, 'cancelled')} disabled={order.order_status === 'cancelled'}>HỦY</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default OrderList;