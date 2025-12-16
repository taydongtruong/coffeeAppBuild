// src/components/OrderList.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://127.0.0.1:5000/api';
const VALID_STATUSES = ['pending', 'completed', 'cancelled'];

const OrderList = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const token = localStorage.getItem('access_token');
    const userRole = localStorage.getItem('user_role');

    // Hàm chung để fetch và cập nhật trạng thái
    const fetchOrders = async () => {
        if (!token) {
            navigate('/');
            return;
        }

        if (userRole !== 'manager') {
            setError('Bạn không có quyền Quản lý để xem danh sách đơn hàng.');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/orders`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 403) {
                setError('Lỗi 403: Chỉ Quản lý mới có quyền xem đơn hàng.');
                return;
            }
            if (!response.ok) {
                throw new Error('Lỗi tải danh sách đơn hàng.');
            }

            const data = await response.json();
            setOrders(data);
        } catch (err) {
            setError(`Lỗi: ${err.message}`);
            console.error('Lỗi tải đơn hàng:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, navigate, userRole]);

    // Hàm cập nhật trạng thái (PUT API)
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

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Lỗi khi cập nhật trạng thái.');
            }

            // Cập nhật lại danh sách sau khi PUT thành công
            fetchOrders(); 

        } catch (err) {
            alert(`Cập nhật thất bại: ${err.message}`);
        }
    };
    
    // Hàm hiển thị màu sắc cho trạng thái
    const getStatusStyle = (status) => {
        switch (status) {
            case 'completed': return { backgroundColor: '#d4edda', color: '#155724', padding: '5px', borderRadius: '5px' };
            case 'cancelled': return { backgroundColor: '#f8d7da', color: '#721c24', padding: '5px', borderRadius: '5px' };
            case 'pending':
            default: return { backgroundColor: '#fff3cd', color: '#856404', padding: '5px', borderRadius: '5px' };
        }
    };

    if (loading) return <div className="container">Đang tải danh sách đơn hàng...</div>;
    if (error) return <div className="container" style={{ color: 'red' }}>{error}</div>;

    return (
        <div className="container menu-page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #ccc', paddingBottom: '10px' }}>
                <h1>📄 Quản Lý Đơn Hàng ({orders.length} đơn)</h1>
                <button onClick={() => navigate('/menu')}>← Quay lại Menu</button>
            </div>
            
            <p style={{ marginTop: '15px' }}>Chỉ Quản lý (Manager) mới có thể truy cập trang này.</p>

            {orders.length === 0 ? (
                <p style={{ marginTop: '20px' }}>Chưa có đơn hàng nào được tạo.</p>
            ) : (
                <div style={{ display: 'grid', gap: '20px', marginTop: '20px' }}>
                    {orders.sort((a, b) => b.id - a.id).map(order => (
                        <div key={order.id} style={{ border: '1px solid #007bff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <h3>Đơn hàng #{order.id}</h3>
                                <span style={getStatusStyle(order.order_status)}>{order.order_status.toUpperCase()}</span>
                            </div>
                            
                            <p><strong>Tổng tiền:</strong> {order.total_amount.toLocaleString('vi-VN')} VND</p>
                            <p><strong>Người tạo:</strong> {order.created_by} ({order.user_id})</p>
                            <p><strong>Thanh toán:</strong> {order.payment_method}</p>
                            <p><strong>Thời gian:</strong> {new Date(order.created_at).toLocaleString('vi-VN')}</p>

                            <h4 style={{ marginTop: '10px', borderBottom: '1px dotted #ccc', paddingBottom: '5px' }}>Chi tiết ({order.items.length} món)</h4>
                            <ul style={{ listStyleType: 'none', paddingLeft: '10px' }}>
                                {order.items.map((item, index) => (
                                    <li key={index} style={{ marginBottom: '5px' }}>
                                        {item.quantity} x {item.product_name} 
                                        ({item.unit_price.toLocaleString('vi-VN')} VND)
                                        {item.notes && <span style={{ fontStyle: 'italic', color: '#6c757d' }}> - {item.notes}</span>}
                                    </li>
                                ))}
                            </ul>

                            <div style={{ marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                                <label style={{ marginRight: '10px' }}>Cập nhật trạng thái:</label>
                                {VALID_STATUSES.map(status => (
                                    <button
                                        key={status}
                                        onClick={() => handleUpdateStatus(order.id, status)}
                                        disabled={order.order_status === status}
                                        style={{ 
                                            marginRight: '5px', 
                                            backgroundColor: order.order_status === status ? '#ccc' : (status === 'completed' ? '#28a745' : (status === 'cancelled' ? '#dc3545' : '#ffc107')),
                                            padding: '5px 10px'
                                        }}
                                    >
                                        {status.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default OrderList;