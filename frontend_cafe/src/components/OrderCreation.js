import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Menu.css';

const API_BASE_URL = 'http://127.0.0.1:5000/api';

const OrderCreation = () => {
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const token = localStorage.getItem('access_token');

    useEffect(() => {
        if (!token) { navigate('/'); return; }
        fetchProducts();
    }, [token]);

    const fetchProducts = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/products`);
            const data = await res.json();
            setProducts(data);
        } catch (err) { 
            console.error("Lỗi tải sản phẩm"); 
        } finally { 
            setLoading(false); 
        }
    };

    // Thêm món vào giỏ (Đảm bảo lưu product_id và unit_price để khớp app.py)
    const addToCart = (product) => {
        setCart(prevCart => {
            const existingItem = prevCart.find(item => item.product_id === product.id);
            if (existingItem) {
                return prevCart.map(item =>
                    item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prevCart, { 
                product_id: product.id, 
                name: product.name, 
                unit_price: product.price, 
                quantity: 1 
            }];
        });
    };

    const removeFromCart = (productId) => {
        setCart(prevCart => prevCart.filter(item => item.product_id !== productId));
    };

    // Tính tổng bill dựa trên unit_price
    const totalBill = cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);

    const handleSubmitOrder = async () => {
        if (cart.length === 0) return alert("Giỏ hàng trống!");

        try {
            const response = await fetch(`${API_BASE_URL}/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                // Gửi toàn bộ cart (đã có product_id, quantity, unit_price)
                body: JSON.stringify({ items: cart })
            });

            const data = await response.json();

            if (response.ok) {
                // app.py trả về { order: { id: ... } }
                alert(`🎉 Tạo đơn hàng thành công! ID: #${data.order.id}`);
                setCart([]); 
            } else {
                alert(`Lỗi: ${data.message || "Không thể lưu đơn hàng"}`);
            }
        } catch (err) { 
            alert("Lỗi kết nối server."); 
        }
    };

    if (loading) return <div className="menu-container">Đang tải menu...</div>;

    return (
        <div className="menu-container">
            <header className="menu-header">
                <div className="header-title">
                    <h1>☕ Tạo Đơn Hàng Mới</h1>
                    <p className="welcome-text">Dành cho nhân viên phục vụ.</p>
                </div>
                <button className="btn btn-menu" onClick={() => navigate('/menu')}>← Menu chính</button>
            </header>

            <div className="order-content-layout" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px' }}>
                
                {/* BÊN TRÁI: DANH SÁCH MÓN */}
                <div className="category-section">
                    <h3 className="category-title">Menu Món Ăn</h3>
                    <div className="product-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '15px' }}>
                        {products.map(p => (
                            <div key={p.id} className="product-item" style={{ cursor: 'pointer', padding: '15px', border: '1px solid #ddd', borderRadius: '8px', textAlign: 'center' }} onClick={() => addToCart(p)}>
                                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{p.name}</div>
                                <div style={{ color: '#d35400' }}>{p.price.toLocaleString()}đ</div>
                                <button className="btn-add-quick" style={{ marginTop: '10px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer' }}>+</button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* BÊN PHẢI: GIỎ HÀNG */}
                <div className="cart-sidebar" style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #ddd', position: 'sticky', top: '20px', height: 'fit-content' }}>
                    <h3 className="category-title">🛒 Đơn hàng hiện tại</h3>
                    {cart.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#888', marginTop: '20px' }}>Chưa chọn món nào.</p>
                    ) : (
                        <>
                            <div className="cart-items" style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '20px' }}>
                                {cart.map(item => (
                                    <div key={item.product_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid #f0f0f0' }}>
                                        <div>
                                            <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                                            <div style={{ fontSize: '0.9rem', color: '#666' }}>
                                                {item.quantity} x {item.unit_price.toLocaleString()}đ
                                            </div>
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); removeFromCart(item.product_id); }} 
                                            style={{ background: '#ff4d4d', color: 'white', border: 'none', borderRadius: '4px', padding: '5px 8px', cursor: 'pointer' }}
                                        >
                                            Xóa
                                        </button>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="cart-footer" style={{ borderTop: '2px solid #eee', paddingTop: '15px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.3rem', fontWeight: 'bold', marginBottom: '20px' }}>
                                    <span>Tổng:</span>
                                    <span style={{ color: '#d35400' }}>{totalBill.toLocaleString()}đ</span>
                                </div>
                                <button 
                                    className="btn-confirm" 
                                    style={{ width: '100%', padding: '15px', background: '#007bff', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer' }} 
                                    onClick={handleSubmitOrder}
                                >
                                    XÁC NHẬN & IN HÓA ĐƠN
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrderCreation;