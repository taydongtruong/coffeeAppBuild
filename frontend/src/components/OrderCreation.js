import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './OrderCreation.css'; 

// --- CẤU HÌNH URL API ---
const BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';
const API_BASE_URL = `${BASE_URL}/api`;

const OrderCreation = () => {
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const token = localStorage.getItem('access_token');

    useEffect(() => {
        if (!token) { 
            navigate('/'); 
            return; 
        }
        fetchProducts();
    }, [token, navigate]);

    const fetchProducts = async () => {
        try {
            // CẦN THÊM AUTHORIZATION ĐỂ LẤY PRODUCTS
            const res = await fetch(`${API_BASE_URL}/products`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (res.status === 401) {
                localStorage.clear();
                navigate('/');
                return;
            }

            const data = await res.json();
            setProducts(data);
        } catch (err) { 
            console.error("Lỗi tải sản phẩm:", err); 
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

    if (loading) return <div className="order-creation-wrapper">☕ Đang tải menu...</div>;

    return (
        <div className="order-creation-wrapper">
            <header className="menu-header">
                <div className="header-title">
                    <h1>☕ Tạo Đơn Hàng Mới</h1>
                    <p className="welcome-text">Giao diện POS dành riêng cho nhân viên.</p>
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
                                <div className="product-thumb-pos">
                                    <img 
                                        src={p.image_url || 'https://via.placeholder.com/100?text=Cafe'} 
                                        alt={p.name}
                                        onError={(e) => { e.target.src = 'https://via.placeholder.com/100?text=No+Img'; }}
                                    />
                                </div>
                                <div className="product-info-pos">
                                    <div className="product-name-pos">{p.name}</div>
                                    <div className="product-price-pos">{p.price.toLocaleString()}đ</div>
                                </div>
                                <button className="btn-add-quick">+</button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* BÊN PHẢI: GIỎ HÀNG */}
                <aside className="cart-sidebar">
                    <h3 className="category-title">🛒 Chi tiết đơn hàng</h3>
                    {cart.length === 0 ? (
                        <div className="cart-empty">
                            <p className="cart-icon-large">🛒</p>
                            <p>Chưa có món nào được chọn</p>
                        </div>
                    ) : (
                        <>
                            <div className="cart-items">
                                {cart.map(item => (
                                    <div key={item.product_id} className="cart-line-item">
                                        <div className="cart-item-details">
                                            <div className="cart-item-name">{item.name}</div>
                                            <div className="cart-item-sub">
                                                {item.quantity} x {item.unit_price.toLocaleString()}đ
                                            </div>
                                        </div>
                                        <button 
                                            className="btn-remove-item"
                                            onClick={(e) => { e.stopPropagation(); removeFromCart(item.product_id); }} 
                                        >
                                            Xóa
                                        </button>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="cart-footer">
                                <div className="cart-total-display">
                                    <span>Tổng cộng:</span>
                                    <span>{totalBill.toLocaleString()}đ</span>
                                </div>
                                <button className="btn-confirm-pos" onClick={handleSubmitOrder}>
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