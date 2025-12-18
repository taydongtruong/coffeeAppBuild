import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './GuestOrderKiosk.css'; 

// --- CẤU HÌNH URL API ---
const BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';
const API_BASE_URL = `${BASE_URL}/api`;

const GuestOrderKiosk = () => {
    const [menuData, setMenuData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [cart, setCart] = useState([]);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchMenuData();
    }, []);

    const fetchMenuData = async () => {
        setLoading(true);
        try {
            // Khách vãng lai gọi API không cần Token
            const [categoriesResponse, productsResponse] = await Promise.all([
                fetch(`${API_BASE_URL}/categories`),
                fetch(`${API_BASE_URL}/products`)
            ]);
            
            const categoriesData = await categoriesResponse.json();
            const productsData = await productsResponse.json();
            
            const categorizedMenu = categoriesData.map(cat => ({
                ...cat,
                products: productsData.filter(p => p.category_id === cat.id && p.is_available)
            }));
            setMenuData(categorizedMenu);
        } catch (err) {
            console.error("Kiosk Fetch Error:", err);
            setError('Không thể kết nối máy chủ. Vui lòng báo nhân viên.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddToCart = (product) => {
        setMessage('');
        const existingItemIndex = cart.findIndex(item => item.product_id === product.id);
        if (existingItemIndex > -1) {
            const updatedCart = [...cart];
            updatedCart[existingItemIndex].quantity += 1;
            setCart(updatedCart);
        } else {
            setCart([...cart, { 
                product_id: product.id, 
                product_name: product.name,
                unit_price: product.price, 
                quantity: 1, 
                notes: '' 
            }]);
        }
    };

    const updateQuantity = (product_id, delta) => {
        setCart(cart.map(item => 
            item.product_id === product_id 
            ? { ...item, quantity: Math.max(1, item.quantity + delta) }
            : item
        ));
    };

    const handlePlaceOrder = async () => {
        if (cart.length === 0) return;
        
        const itemsPayload = cart.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            notes: item.notes
        }));
        
        try {
            const response = await fetch(`${API_BASE_URL}/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: itemsPayload }),
            });
            const data = await response.json();

            if (response.ok) {
                setMessage(`🎉 THÀNH CÔNG! Mã đơn: #${data.order.id}. Vui lòng chờ gọi món.`);
                setCart([]);
                setIsError(false);
                // Tự động ẩn thông báo sau 10 giây
                setTimeout(() => setMessage(''), 10000);
            } else {
                setMessage(`Lỗi: ${data.message || 'Không thể tạo đơn hàng'}`);
                setIsError(true);
            }
        } catch (err) {
            setMessage('Lỗi kết nối Server.');
            setIsError(true);
        }
    };

    if (loading) return <div className="kiosk-page-wrapper">☕ Đang tải menu...</div>;
    if (error) return <div className="kiosk-page-wrapper">❌ {error}</div>;

    return (
        <div className="kiosk-page-wrapper">
            <div className="kiosk-container">
                <header className="kiosk-header">
                    <div>
                        <h1>REAK SMAAY COFFEE ☕</h1>
                        <p>Tự chọn món ngon - Nhận số tại quầy</p>
                    </div>
                    <button className="staff-login-btn" onClick={() => navigate('/')}>
                        🔐 Nhân viên
                    </button>
                </header>

                <div className="kiosk-content">
                    <main className="menu-list">
                        {menuData.map(category => (
                            <div key={category.id} className="category-block">
                                <h2 className="category-name">{category.name}</h2>
                                <div className="product-grid">
                                    {category.products.map(product => (
                                        <div key={product.id} className="product-card">
                                            <div className="product-image-box">
                                                <img 
                                                    src={product.image_url || 'https://via.placeholder.com/200x150?text=No+Image'} 
                                                    alt={product.name} 
                                                    className="product-img"
                                                    onError={(e) => { e.target.src = 'https://via.placeholder.com/200x150?text=Image+Error'; }}
                                                />
                                            </div>
                                            
                                            <div className="product-info">
                                                <h3>{product.name}</h3>
                                                <p className="product-price">{product.price.toLocaleString('vi-VN')}đ</p>
                                                <button className="select-btn" onClick={() => handleAddToCart(product)}>
                                                    + Thêm món
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </main>

                    <aside className="cart-panel">
                        <h2 style={{textAlign: 'center', margin: '0 0 20px 0'}}>🛒 Đơn hàng</h2>
                        
                        {message && (
                            <div style={{ 
                                padding: '15px', borderRadius: '8px', marginBottom: '15px', 
                                background: isError ? '#f8d7da' : '#d4edda', 
                                color: isError ? '#721c24' : '#155724', fontWeight: 'bold' 
                            }}>
                                {message}
                            </div>
                        )}

                        {cart.length === 0 ? (
                            <p style={{textAlign: 'center', color: '#888', padding: '40px 0'}}>Giỏ hàng đang trống...</p>
                        ) : (
                            <>
                                {cart.map(item => (
                                    <div key={item.product_id} className="cart-item">
                                        <div className="cart-item-info">
                                            <span>{item.product_name}</span>
                                            <span>{(item.unit_price * item.quantity).toLocaleString('vi-VN')}đ</span>
                                        </div>
                                        <div className="cart-item-actions">
                                            <button className="qty-circle" onClick={() => updateQuantity(item.product_id, -1)}>-</button>
                                            <span style={{margin: '0 15px', fontWeight: 'bold'}}>{item.quantity}</span>
                                            <button className="qty-circle" onClick={() => updateQuantity(item.product_id, 1)}>+</button>
                                            <button onClick={() => setCart(cart.filter(i => i.product_id !== item.product_id))} 
                                                    style={{marginLeft: 'auto', background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer'}}>Xóa</button>
                                        </div>
                                        <input 
                                            className="item-note"
                                            type="text" 
                                            placeholder="Ghi chú: ít đường, nhiều đá..." 
                                            value={item.notes}
                                            onChange={(e) => {
                                                const newCart = [...cart];
                                                newCart.find(i => i.product_id === item.product_id).notes = e.target.value;
                                                setCart(newCart);
                                            }}
                                        />
                                    </div>
                                ))}
                                
                                <div className="cart-total">
                                    <div className="total-price">
                                        <span>TỔNG:</span>
                                        <span>{cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0).toLocaleString('vi-VN')}đ</span>
                                    </div>
                                    <button className="checkout-btn" onClick={handlePlaceOrder}>
                                        ĐẶT MÓN NGAY ✅
                                    </button>
                                </div>
                            </>
                        )}
                    </aside>
                </div>
            </div>
        </div>
    );
};

export default GuestOrderKiosk;