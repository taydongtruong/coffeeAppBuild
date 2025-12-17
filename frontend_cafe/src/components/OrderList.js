import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './OrderList.css'; 

const API_BASE_URL = 'http://127.0.0.1:5000/api';
const VALID_STATUSES = ['pending', 'completed', 'cancelled'];

const OrderList = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    
    const token = localStorage.getItem('access_token');
    const userRole = localStorage.getItem('user_role');

    const fetchOrders = async () => {
        if (!token || userRole !== 'manager') {
            navigate('/');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/orders`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 403) {
                setError('Chỉ Quản lý mới có quyền xem danh sách này.');
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

            if (response.ok) {
                fetchOrders(); 
            } else {
                const errorData = await response.json();
                alert(`Lỗi: ${errorData.message}`);
            }
        } catch (err) {
            alert('Không thể kết nối đến máy chủ.');
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
    if (error) return <div className="order-list-wrapper" style={{ color: 'red' }}>{error}</div>;

    return (
        <div className="order-list-wrapper">
            <header className="menu-header" style={{display: 'flex', justifyContent: 'space-between', marginBottom: '30px', background: 'white', padding: '20px', borderRadius: '12px'}}>
                <div>
                    <h1 style={{margin: 0}}>📋 Quản Lý Đơn Hàng</h1>
                    <p style={{color: '#666', margin: '5px 0 0 0'}}>Theo dõi và cập nhật trạng thái phục vụ</p>
                </div>
                <button className="btn-menu" onClick={() => navigate('/menu')} style={{padding: '10px 20px', cursor: 'pointer'}}>← Menu chính</button>
            </header>

            {orders.length === 0 ? (
                <div style={{textAlign: 'center', padding: '50px', background: 'white', borderRadius: '12px'}}>Hệ thống chưa có đơn hàng nào.</div>
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
                                            <span style={{marginLeft: '15px'}}>👤 Người tạo: <strong>{order.created_by}</strong></span>
                                        </div>
                                    </div>
                                    <div style={{textAlign: 'right'}}>
                                        <div className="price-tag">{order.total_amount.toLocaleString('vi-VN')}đ</div>
                                        <span className="status-badge" style={{color: style.color, backgroundColor: style.bg}}>
                                            {style.label}
                                        </span>
                                    </div>
                                </div>

                                <div className="items-box">
                                    {order.items.map((item, idx) => (
                                        <div key={idx} className="item-row">
                                            <span>{item.quantity} x <strong>{item.product_name}</strong></span>
                                            <span>{(item.quantity * item.unit_price).toLocaleString('vi-VN')}đ</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="status-actions">
                                    <span style={{fontSize: '0.85rem', color: '#95a5a6', fontWeight: 'bold'}}>CHUYỂN TRẠNG THÁI:</span>
                                    <button 
                                        className="btn-status" 
                                        style={{backgroundColor: '#f1c40f', color: 'white'}}
                                        onClick={() => handleUpdateStatus(order.id, 'pending')}
                                        disabled={order.order_status === 'pending'}
                                    >CHỜ</button>
                                    <button 
                                        className="btn-status" 
                                        style={{backgroundColor: '#2ecc71', color: 'white'}}
                                        onClick={() => handleUpdateStatus(order.id, 'completed')}
                                        disabled={order.order_status === 'completed'}
                                    >HOÀN THÀNH</button>
                                    <button 
                                        className="btn-status" 
                                        style={{backgroundColor: '#e74c3c', color: 'white'}}
                                        onClick={() => handleUpdateStatus(order.id, 'cancelled')}
                                        disabled={order.order_status === 'cancelled'}
                                    >HỦY</button>
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