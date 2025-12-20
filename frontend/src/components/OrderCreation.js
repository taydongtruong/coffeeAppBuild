import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './OrderCreation.css';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';
const API_BASE_URL = `${BASE_URL}/api`;

const OrderCreation = () => {
    // --- KHAI BÁO STATE ---
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState(''); 
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCartOpen, setIsCartOpen] = useState(false); 
    
    const navigate = useNavigate();
    const token = localStorage.getItem('access_token');

    // --- LẤY DỮ LIỆU SẢN PHẨM ---
    const fetchProducts = useCallback(async () => {
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE_URL}/products`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.status === 401) {
                localStorage.clear();
                navigate('/');
                return;
            }

            const data = await res.json();
            // Đảm bảo data là mảng
            if (Array.isArray(data)) {
                setProducts(data);
            } else {
                setProducts([]);
            }
        } catch (err) { 
            console.error("Lỗi tải sản phẩm:", err); 
        } finally { 
            setLoading(false); 
        }
    }, [token, navigate]);

    useEffect(() => {
        if (!token) { navigate('/'); return; }
        fetchProducts();
    }, [token, navigate, fetchProducts]);

    // --- LOGIC HIỆU ỨNG BAY (ANIMATION) ---
    const runFlyingAnimation = (e) => {
        const imgElement = e.currentTarget.querySelector('img');
        const mobileBtn = document.querySelector('.mobile-cart-btn');
        const cartSidebar = document.querySelector('.cart-sidebar');
        const targetElement = (mobileBtn && mobileBtn.offsetParent !== null) ? mobileBtn : cartSidebar;

        if (!imgElement || !targetElement) return;

        const imgClone = imgElement.cloneNode();
        const startRect = imgElement.getBoundingClientRect();
        const endRect = targetElement.getBoundingClientRect();

        Object.assign(imgClone.style, {
            position: 'fixed',
            zIndex: '9999',
            top: `${startRect.top}px`,
            left: `${startRect.left}px`,
            width: `${startRect.width}px`,
            height: `${startRect.height}px`,
            borderRadius: '50%',
            transition: 'all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)',
            opacity: '0.8',
            pointerEvents: 'none' 
        });

        document.body.appendChild(imgClone);

        setTimeout(() => {
            Object.assign(imgClone.style, {
                top: `${endRect.top + endRect.height / 2 - 15}px`,
                left: `${endRect.left + endRect.width / 2 - 15}px`,
                width: '30px',
                height: '30px',
                opacity: '0',
                transform: 'scale(0.5)'
            });
        }, 10);

        setTimeout(() => {
            imgClone.remove();
        }, 600);
    };

    // --- THÊM VÀO GIỎ HÀNG ---
    const addToCart = (product, e) => {
        if (e) runFlyingAnimation(e);

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
                // QUAN TRỌNG: Thêm || 0 để tránh lỗi undefined nếu API thiếu giá
                unit_price: product.price || 0, 
                quantity: 1 
            }];
        });

        const mobileBtn = document.querySelector('.mobile-cart-btn');
        if (mobileBtn && mobileBtn.offsetParent !== null) {
            mobileBtn.classList.remove('bump'); 
            void mobileBtn.offsetWidth; 
            mobileBtn.classList.add('bump');
        }
    };

    // --- GIẢM SỐ LƯỢNG ---
    const decreaseQuantity = (productId) => {
        setCart(prevCart => {
            return prevCart.map(item => {
                if (item.product_id === productId) {
                    return { ...item, quantity: Math.max(1, item.quantity - 1) };
                }
                return item;
            });
        });
    };

    const removeFromCart = (productId) => {
        setCart(prevCart => prevCart.filter(item => item.product_id !== productId));
    };

    // QUAN TRỌNG: Thêm || 0 vào unit_price để tính tổng không bị NaN
    const totalBill = cart.reduce((sum, item) => sum + ((item.unit_price || 0) * item.quantity), 0);
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

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
                alert(`🎉 Tạo đơn thành công: #${data.order.id}`);
                setCart([]);
                setIsCartOpen(false); 
            } else {
                alert(`Lỗi: ${data.message}`);
            }
        } catch (err) { alert("Lỗi kết nối server."); }
    };

    const filteredProducts = products.filter(p => 
        p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="order-creation-wrapper">☕ Đang tải menu...</div>;

    return (
        <div className="order-creation-wrapper">
            <header className="menu-header">
                <button className="btn-back-mobile" onClick={() => navigate('/menu')}>←</button>
                <div className="header-title"><h1>Menu</h1></div>
                
                <div className="search-container">
                    <span className="search-icon-placeholder">🔍</span>
                    <input 
                        type="text" 
                        className="search-input" 
                        placeholder="Tìm món (vd: Latte...)"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <button className="mobile-cart-btn" onClick={() => setIsCartOpen(true)}>
                    🛒 {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
                </button>
                <button className="btn-menu desktop-only" onClick={() => navigate('/menu')}>Thoát về trang chủ</button>
            </header>

            <div className="order-content-layout">
                <div className="category-section">
                    <div className="product-grid">
                        {filteredProducts.length > 0 ? (
                            filteredProducts.map(p => (
                                <div key={p.id} className="product-item" onClick={(e) => addToCart(p, e)}>
                                    <div className="product-thumb-pos">
                                        <img 
                                            src={p.image_url || 'https://via.placeholder.com/150'} 
                                            alt={p.name}
                                            onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=No+Img'; }}
                                        />
                                    </div>
                                    <div className="product-info-pos">
                                        <div className="product-name-pos">{p.name}</div>
                                        {/* FIX LỖI Ở ĐÂY: Thêm check tồn tại giá */}
                                        <div className="product-price-pos">
                                            {(p.price || 0).toLocaleString()}đ
                                        </div>
                                    </div>
                                    <button className="btn-add-quick">+</button>
                                </div>
                            ))
                        ) : (
                            <p style={{textAlign: 'center', color: '#888', gridColumn: '1/-1', padding: '20px'}}>
                                Không tìm thấy món nào khớp với "{searchTerm}"
                            </p>
                        )}
                    </div>
                </div>

                <aside className={`cart-sidebar ${isCartOpen ? 'mobile-open' : ''}`}>
                    <div className="mobile-cart-header">
                        <h3>Giỏ hàng ({totalItems})</h3>
                        <button className="btn-close-cart" onClick={() => setIsCartOpen(false)}>✕</button>
                    </div>

                    <h3 className="category-title desktop-only">Đơn hàng hiện tại</h3>
                    
                    {cart.length === 0 ? (
                        <div className="cart-empty">
                            <p className="cart-icon-large">🛒</p>
                            <p>Chưa có món nào</p>
                        </div>
                    ) : (
                        <>
                            <div className="cart-items">
                                {cart.map(item => (
                                    <div key={item.product_id} className="cart-line-item">
                                        <div className="cart-item-info">
                                            <div className="cart-item-name">{item.name}</div>
                                            {/* FIX LỖI Ở ĐÂY: Thêm check tồn tại giá */}
                                            <div className="cart-item-price-unit">
                                                {(item.unit_price || 0).toLocaleString()}đ
                                            </div>
                                        </div>

                                        <div className="cart-item-actions">
                                            <div className="quantity-control">
                                                <button className="btn-qty" onClick={() => decreaseQuantity(item.product_id)}>-</button>
                                                <span className="qty-display">{item.quantity}</span>
                                                <button className="btn-qty" onClick={() => addToCart(item, null)}>+</button>
                                            </div>
                                            <button className="btn-remove-item" onClick={(e) => { e.stopPropagation(); removeFromCart(item.product_id); }}>🗑</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="cart-footer">
                                <div className="cart-total-display">
                                    <span>Tổng cộng:</span>
                                    {/* FIX LỖI Ở ĐÂY: Tính tổng an toàn */}
                                    <span style={{color: '#e74c3c'}}>{(totalBill || 0).toLocaleString()}đ</span>
                                </div>
                                <button className="btn-confirm-pos" onClick={handleSubmitOrder}>TẠO ĐƠN MỚI</button>
                            </div>
                        </>
                    )}
                </aside>
                {isCartOpen && <div className="cart-overlay" onClick={() => setIsCartOpen(false)}></div>}
            </div>
        </div>
    );
};

export default OrderCreation;