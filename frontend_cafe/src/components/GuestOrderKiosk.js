// src/components/GuestOrderKiosk.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://127.0.0.1:5000/api';

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
        setError('');
        try {
            // Lấy Menu không cần token
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
            setError('Lỗi kết nối Server hoặc dữ liệu Menu không hợp lệ.');
            console.error('Lỗi tải menu:', err);
        } finally {
            setLoading(false);
        }
    };
    
    // --- Xử lý Giỏ hàng ---

    const handleAddToCart = (product) => {
        setMessage('');
        setIsError(false);
        
        const existingItemIndex = cart.findIndex(item => item.product_id === product.id);

        if (existingItemIndex > -1) {
            // Tăng số lượng nếu sản phẩm đã có
            const updatedCart = cart.map((item, index) => 
                index === existingItemIndex 
                ? { ...item, quantity: item.quantity + 1 } 
                : item
            );
            setCart(updatedCart);
        } else {
            // Thêm mới
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
        const updatedCart = cart.map(item => 
            item.product_id === product_id 
            ? { ...item, quantity: Math.max(1, item.quantity + delta) } // Đảm bảo số lượng >= 1
            : item
        ).filter(item => item.quantity > 0); // Loại bỏ nếu số lượng về 0 (để xóa)
        
        setCart(updatedCart);
    };

    const updateNotes = (product_id, notes) => {
        const updatedCart = cart.map(item => 
            item.product_id === product_id 
            ? { ...item, notes: notes }
            : item
        );
        setCart(updatedCart);
    };

    const removeFromCart = (product_id) => {
        setCart(cart.filter(item => item.product_id !== product_id));
    };

    const calculateTotal = () => {
        return cart.reduce((total, item) => total + (item.unit_price * item.quantity), 0);
    };

    // --- Xử lý Đặt hàng ---

    const handlePlaceOrder = async () => {
        if (cart.length === 0) {
            setMessage('Giỏ hàng trống! Vui lòng chọn món.');
            setIsError(true);
            return;
        }

        setMessage('');
        setIsError(false);

        // Chuẩn bị payload cho API POST /api/orders
        const itemsPayload = cart.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
            notes: item.notes
        }));
        
        try {
            const response = await fetch(`${API_BASE_URL}/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // KHÔNG gửi token
                },
                body: JSON.stringify({ items: itemsPayload, payment_method: 'kiosk_cash' }), // Loại thanh toán có thể tùy chỉnh
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(`Đặt hàng thành công! Tổng tiền: ${calculateTotal().toLocaleString('vi-VN')} VND. Mã đơn: ${data.order.id}. Vui lòng chờ nhân viên gọi tên!`);
                setCart([]); // Xóa giỏ hàng sau khi đặt
                setIsError(false);
            } else {
                setMessage(`Lỗi đặt hàng: ${data.message || 'Lỗi server.'}`);
                setIsError(true);
            }
        } catch (err) {
            setMessage('Lỗi kết nối Server Flask.');
            setIsError(true);
        }
    };

    if (loading) return <div className="container">Đang tải Menu Quán Cafe...</div>;
    if (error) return <div className="container" style={{ color: 'red' }}>{error}</div>;

    const totalAmount = calculateTotal();

    return (
        <div className="container" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px', padding: '20px' }}>
            
            {/* Cột 1: Menu và Danh sách Sản phẩm */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #ccc', paddingBottom: '10px' }}>
                    <h1 style={{ color: '#8d6e63' }}>☕ Menu Đặt Món Tự Động</h1>
                    <button onClick={() => navigate('/')} style={{ backgroundColor: '#ccc', color: '#333' }}>← Quay lại Trang Đăng nhập (Nội bộ)</button>
                </div>
                
                {menuData.length === 0 ? (
                    <p style={{ fontStyle: 'italic', color: '#888', marginTop: '20px' }}>Menu trống. Vui lòng tạo danh mục và sản phẩm từ Bảng Quản Lý.</p>
                ) : (
                    menuData.map(category => (
                        <div key={category.id} style={{ marginBottom: '30px' }}>
                            <h2 style={{ borderBottom: '1px solid #d7ccc8', paddingBottom: '5px', color: '#4e342e' }}>{category.name}</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                                {category.products.map(product => (
                                    <div key={product.id} style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '15px', boxShadow: '2px 2px 5px rgba(0,0,0,0.1)', backgroundColor: '#fff' }}>
                                        <h3 style={{ color: '#a1887f' }}>{product.name}</h3>
                                        <p style={{ fontWeight: 'bold', color: '#5cb85c', fontSize: '1.1em' }}>
                                            {product.price.toLocaleString('vi-VN')} VND
                                        </p>
                                        <button 
                                            onClick={() => handleAddToCart(product)} 
                                            style={{ width: '100%', backgroundColor: '#28a745', padding: '10px', marginTop: '10px' }}
                                        >
                                            + Thêm vào Giỏ hàng
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Cột 2: Giỏ hàng và Thanh toán */}
            <div style={{ position: 'sticky', top: '20px', padding: '20px', border: '2px solid #a1887f', borderRadius: '10px', backgroundColor: '#f9f9f9', height: 'fit-content' }}>
                <h2 style={{ color: '#4e342e', borderBottom: '1px solid #d7ccc8', paddingBottom: '10px' }}>🛒 Giỏ Hàng ({cart.length} món)</h2>
                
                {message && (
                    <p style={{ color: isError ? 'red' : 'green', fontWeight: 'bold', border: `1px solid ${isError ? 'red' : 'green'}`, padding: '10px', borderRadius: '5px', marginBottom: '15px' }}>
                        {message}
                    </p>
                )}

                {cart.length === 0 ? (
                    <p style={{ fontStyle: 'italic', color: '#888' }}>Giỏ hàng trống.</p>
                ) : (
                    <ul style={{ listStyleType: 'none', padding: 0 }}>
                        {cart.map(item => (
                            <li key={item.product_id} style={{ borderBottom: '1px dotted #ccc', padding: '10px 0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <strong>{item.product_name}</strong>
                                    <span style={{ fontWeight: 'bold' }}>{(item.unit_price * item.quantity).toLocaleString('vi-VN')} VND</span>
                                </div>
                                <p style={{ fontSize: '0.9em', color: '#666', margin: '5px 0' }}>Giá: {item.unit_price.toLocaleString('vi-VN')} VND</p>
                                
                                <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
                                    <span style={{ marginRight: '10px' }}>SL:</span>
                                    <button onClick={() => updateQuantity(item.product_id, -1)} style={{ padding: '3px 8px', backgroundColor: '#dc3545', marginRight: '5px' }}>-</button>
                                    <span style={{ fontWeight: 'bold', minWidth: '20px', textAlign: 'center' }}>{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item.product_id, 1)} style={{ padding: '3px 8px', backgroundColor: '#28a745', marginLeft: '5px' }}>+</button>
                                    <button onClick={() => removeFromCart(item.product_id)} style={{ padding: '3px 8px', backgroundColor: '#6c757d', marginLeft: 'auto' }}>Xóa</button>
                                </div>

                                <textarea 
                                    placeholder="Ghi chú (ít đường, nhiều đá...)"
                                    value={item.notes}
                                    onChange={(e) => updateNotes(item.product_id, e.target.value)}
                                    style={{ width: '100%', marginTop: '10px', padding: '5px', borderRadius: '3px', border: '1px solid #ccc' }}
                                />
                            </li>
                        ))}
                    </ul>
                )}
                
                <h3 style={{ marginTop: '20px', borderTop: '2px solid #a1887f', paddingTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>TỔNG CỘNG:</span>
                    <span style={{ color: '#dc3545', fontSize: '1.5em' }}>{totalAmount.toLocaleString('vi-VN')} VND</span>
                </h3>

                <button 
                    onClick={handlePlaceOrder} 
                    disabled={cart.length === 0}
                    style={{ width: '100%', backgroundColor: '#dc3545', padding: '15px', fontSize: '1.2em', marginTop: '15px' }}
                >
                    ✅ Đặt Hàng & Thanh Toán (Tiền Mặt)
                </button>
            </div>
        </div>
    );
};

export default GuestOrderKiosk;