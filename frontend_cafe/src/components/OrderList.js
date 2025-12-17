import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Menu.css'; // Đảm bảo bạn đã có file CSS này để giao diện đẹp mắt

const API_BASE_URL = 'http://127.0.0.1:5000/api';
const VALID_STATUSES = ['pending', 'completed', 'cancelled'];

const OrderList = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    
    const token = localStorage.getItem('access_token');
    const userRole = localStorage.getItem('user_role');

    // Hàm lấy danh sách đơn hàng
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Hàm cập nhật trạng thái đơn hàng (Khớp với Route PUT trong app.py)
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
                // Tải lại danh sách để cập nhật giao diện ngay lập tức
                fetchOrders(); 
            } else {
                const errorData = await response.json();
                alert(`Lỗi: ${errorData.message}`);
            }
        } catch (err) {
            alert('Không thể kết nối đến máy chủ.');
        }
    };

    // Hàm chuyển đổi nhãn trạng thái sang tiếng Việt và Icon
    const getStatusInfo = (status) => {
        switch (status) {
            case 'completed': return { label: '✅ HOÀN THÀNH', color: '#28a745' };
            case 'cancelled': return { label: '❌ ĐÃ HỦY', color: '#dc3545' };
            default: return { label: '⏳ ĐANG CHỜ', color: '#ffc107' };
        }
    };

    if (loading) return <div className="menu-container"><div className="empty-state">Đang tải đơn hàng...</div></div>;
    if (error) return <div className="menu-container" style={{ color: 'red', textAlign: 'center' }}>{error}</div>;

    return (
        <div className="menu-container">
            <header className="menu-header">
                <div className="header-title">
                    <h1>📄 Quản Lý Đơn Hàng</h1>
                    <p className="welcome-text">Tổng cộng <strong>{orders.length}</strong> đơn hàng đã được ghi nhận.</p>
                </div>
                <button className="btn btn-menu" onClick={() => navigate('/menu')}>← Quay lại Menu</button>
            </header>

            {orders.length === 0 ? (
                <div className="empty-state">Hệ thống chưa ghi nhận đơn hàng nào.</div>
            ) : (
                <div className="product-grid" style={{ gridTemplateColumns: '1fr' }}>
                    {orders.map(order => {
                        const statusInfo = getStatusInfo(order.order_status);
                        return (
                            <div key={order.id} className="category-section" style={{ borderLeft: `8px solid ${statusInfo.color}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h3 style={{ margin: 0 }}>Đơn hàng #{order.id}</h3>
                                        <p style={{ margin: '5px 0', fontSize: '0.9rem', color: '#666' }}>
                                            Ngày: {new Date(order.created_at).toLocaleString('vi-VN')}
                                        </p>
                                        <p style={{ margin: '5px 0' }}>Bán bởi: <strong>{order.created_by}</strong></p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div className="product-price" style={{ fontSize: '1.4rem', marginBottom: '5px' }}>
                                            {order.total_amount.toLocaleString('vi-VN')} đ
                                        </div>
                                        <span style={{ fontWeight: 'bold', color: statusInfo.color }}>{statusInfo.label}</span>
                                    </div>
                                </div>

                                <div style={{ margin: '15px 0', padding: '10px', background: '#f8f9fa', borderRadius: '8px' }}>
                                    <h4 style={{ marginTop: 0, fontSize: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '5px' }}>Chi tiết món:</h4>
                                    {order.items.map((item, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
                                            <span>{item.quantity} x <strong>{item.product_name}</strong></span>
                                            <span>{(item.quantity * item.unit_price).toLocaleString('vi-VN')} đ</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="button-group" style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                    <label style={{ fontSize: '0.9rem', alignSelf: 'center' }}>Cập nhật trạng thái:</label>
                                    {VALID_STATUSES.map(status => (
                                        <button 
                                            key={status}
                                            className="btn"
                                            style={{ 
                                                fontSize: '0.75rem', 
                                                padding: '5px 10px',
                                                backgroundColor: order.order_status === status ? '#adb5bd' : 
                                                               (status === 'completed' ? '#28a745' : status === 'cancelled' ? '#dc3545' : '#ffc107')
                                            }}
                                            onClick={() => handleUpdateStatus(order.id, status)}
                                            disabled={order.order_status === status}
                                        >
                                            {status === 'pending' ? 'CHỜ' : status === 'completed' ? 'HOÀN THÀNH' : 'HỦY'}
                                        </button>
                                    ))}
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