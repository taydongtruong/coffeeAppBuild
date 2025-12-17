import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './OrderCreation.css'; // Đảm bảo import đúng tên file css

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
                body: JSON.stringify({ items: cart })
            });

            const data = await response.json();

            if (response.ok) {
                alert(`🎉 Tạo đơn hàng thành công! ID: #${data.order.id}`);
                setCart([]); 
            } else {
                alert(`Lỗi: ${data.message || "Không thể lưu đơn hàng"}`);
            }
        } catch (err) { 
            alert("Lỗi kết nối server."); 
        }
    };

    if (loading) return <div className="order-creation-wrapper">Đang tải menu...</div>;

    return (
        <div className="order-creation-wrapper">
            <header className="menu-header">
                <div className="header-title">
                    <h1>☕ Tạo Đơn Hàng Mới</h1>
                    <p className="welcome-text">Giao diện dành riêng cho nhân viên.</p>
                </div>
                <button className="btn-menu" onClick={() => navigate('/menu')}>← Menu chính</button>
            </header>

            <div className="order-content-layout">
                {/* BÊN TRÁI: DANH SÁCH MÓN */}
                <div className="category-section">
                    <h3 className="category-title">Thực đơn tại quầy</h3>
                    <div className="product-grid">
                        {products.map(p => (
                            <div key={p.id} className="product-item" onClick={() => addToCart(p)}>
                                <div style={{ fontWeight: 'bold', marginBottom: '5px', textAlign: 'center' }}>{p.name}</div>
                                <div style={{ color: '#e67e22', fontWeight: 'bold' }}>{p.price.toLocaleString()}đ</div>
                                <button className="btn-add-quick">+</button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* BÊN PHẢI: GIỎ HÀNG */}
                <aside className="cart-sidebar">
                    <h3 className="category-title">🛒 Chi tiết đơn hàng</h3>
                    {cart.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 0' }}>
                            <p style={{ color: '#bdc3c7', fontSize: '3rem', margin: 0 }}>🛒</p>
                            <p style={{ color: '#888' }}>Chưa có món nào được chọn</p>
                        </div>
                    ) : (
                        <>
                            <div className="cart-items">
                                {cart.map(item => (
                                    <div key={item.product_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid #f8f9fa' }}>
                                        <div>
                                            <div style={{ fontWeight: '600' }}>{item.name}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#7f8c8d' }}>
                                                {item.quantity} x {item.unit_price.toLocaleString()}đ
                                            </div>
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); removeFromCart(item.product_id); }} 
                                            style={{ background: '#fff', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.8rem' }}
                                        >
                                            Xóa
                                        </button>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="cart-footer">
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.4rem', fontWeight: '800', marginBottom: '20px', color: '#2c3e50' }}>
                                    <span>Tổng:</span>
                                    <span>{totalBill.toLocaleString()}đ</span>
                                </div>
                                <button className="btn-confirm" onClick={handleSubmitOrder}>
                                    XÁC NHẬN ĐƠN ✅
                                </button>
                            </div>
                        </>
                    )}
                </aside>
            </div>
        </div>
    );
};

export default OrderCreation;