import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './GuestOrderKiosk.css'; 

const BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';
const API_BASE_URL = `${BASE_URL}/api`;

const GuestOrderKiosk = () => {
    const [menuData, setMenuData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [cart, setCart] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchMenuData();
    }, []);

    const fetchMenuData = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/categories?include_products=true`);
            if (!response.ok) throw new Error('Không thể tải menu');
            const data = await response.json();
            setMenuData(data);
        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    const addToCart = (product) => {
        const exist = cart.find(x => x.product_id === product.id);
        if (exist) {
            setCart(cart.map(x => x.product_id === product.id 
                ? { ...exist, quantity: exist.quantity + 1 } : x
            ));
        } else {
            setCart([...cart, { 
                product_id: product.id, 
                product_name: product.name, 
                unit_price: product.price, 
                quantity: 1, 
                notes: '' 
            }]);
        }
        // Tự động mở drawer trên mobile khi thêm món lần đầu (tùy chọn)
        // if (!isCartOpen) setIsCartOpen(true);
    };

    const updateQuantity = (id, delta) => {
        const newCart = cart.map(item => {
            if (item.product_id === id) {
                const newQty = item.quantity + delta;
                return newQty > 0 ? { ...item, quantity: newQty } : null;
            }
            return item;
        }).filter(Boolean);
        setCart(newCart);
    };

    const updateNote = (id, text) => {
        setCart(cart.map(item => 
            item.product_id === id ? { ...item, notes: text } : item
        ));
    };

    const handlePlaceOrder = async () => {
        if (cart.length === 0) return;
        try {
            const response = await fetch(`${API_BASE_URL}/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: cart }),
            });
            if (response.ok) {
                const data = await response.json();
                alert(`🎉 ĐẶT MÓN THÀNH CÔNG!\nMã đơn của bạn là: #${data.order.id}`);
                setCart([]);
                setIsCartOpen(false);
            }
        } catch (err) {
            alert("Lỗi kết nối máy chủ!");
        }
    };

    const totalAmount = cart.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
    const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0);

    if (loading) return <div className="kiosk-loader">☕ Đang chuẩn bị menu...</div>;

    return (
        <div className="kiosk-viewport">
            {/* Header / Thanh công cụ */}
            <header className="kiosk-navbar">
                <div className="nav-left">
                    <h1 onClick={() => window.location.reload()}>REAK SMAAY</h1>
                </div>
                <div className="nav-right">
                    {/* Nút giỏ hàng có badge số lượng */}
                    <button className="cart-trigger" onClick={() => setIsCartOpen(!isCartOpen)}>
                        <span className="cart-icon">🛒</span>
                        {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
                    </button>
                    <button className="admin-btn" onClick={() => navigate('/')}>🔐</button>
                </div>
            </header>

            <div className="kiosk-body">
                {/* Khu vực hiển thị sản phẩm */}
                <main className="menu-content">
                    {menuData.map(cat => (
                        <section key={cat.id} className="menu-section">
                            <h2 className="section-title">{cat.name}</h2>
                            <div className="responsive-grid">
                                {cat.products && cat.products.map(p => (
                                    <div key={p.id} className="product-item" onClick={() => addToCart(p)}>
                                        <div className="image-wrapper">
                                            <img 
                                                src={p.image_url || 'https://via.placeholder.com/200?text=Coffee'} 
                                                alt={p.name} 
                                            />
                                            <div className="quick-add">+</div>
                                        </div>
                                        <div className="product-details">
                                            <h3>{p.name}</h3>
                                            <span className="price">{p.price.toLocaleString()}đ</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    ))}
                </main>

                {/* Giỏ hàng (Sidebar trên PC, Drawer trên Mobile) */}
                <aside className={`cart-drawer ${isCartOpen ? 'open' : ''}`}>
                    <div className="drawer-header">
                        <h3>Đơn hàng của bạn</h3>
                        <button className="close-drawer" onClick={() => setIsCartOpen(false)}>×</button>
                    </div>

                    <div className="drawer-content">
                        {cart.length === 0 ? (
                            <div style={{textAlign: 'center', marginTop: '50px', color: '#999'}}>
                                Giỏ hàng của bạn đang trống
                            </div>
                        ) : (
                            cart.map(item => (
                                <div key={item.product_id} className="cart-card">
                                    <div className="cart-card-top">
                                        <span>{item.product_name}</span>
                                        <span>{(item.unit_price * item.quantity).toLocaleString()}đ</span>
                                    </div>
                                    <div className="qty-controls">
                                        <button onClick={(e) => { e.stopPropagation(); updateQuantity(item.product_id, -1); }}>-</button>
                                        <span>{item.quantity}</span>
                                        <button onClick={(e) => { e.stopPropagation(); updateQuantity(item.product_id, 1); }}>+</button>
                                    </div>
                                    <input 
                                        type="text"
                                        className="note-input"
                                        placeholder="Ghi chú (đá, đường...)"
                                        value={item.notes}
                                        onChange={(e) => updateNote(item.product_id, e.target.value)}
                                    />
                                </div>
                            ))
                        )}
                    </div>

                    {cart.length > 0 && (
                        <div className="drawer-footer">
                            <div className="total-row">
                                <span>Tổng cộng</span>
                                <strong>{totalAmount.toLocaleString()}đ</strong>
                            </div>
                            <button className="order-now-btn" onClick={handlePlaceOrder}>
                                XÁC NHẬN ĐẶT MÓN ✅
                            </button>
                        </div>
                    )}
                </aside>
            </div>

            {/* Lớp nền mờ khi mở Drawer trên Mobile */}
            {isCartOpen && <div className="backdrop" onClick={() => setIsCartOpen(false)}></div>}
        </div>
    );
};

export default GuestOrderKiosk;