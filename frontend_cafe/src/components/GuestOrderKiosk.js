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
            setError('Không thể kết nối với máy chủ. Vui lòng kiểm tra Backend Flask.');
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
        const updatedCart = cart.map(item => 
            item.product_id === product_id 
            ? { ...item, quantity: Math.max(1, item.quantity + delta) }
            : item
        );
        setCart(updatedCart);
    };

    const handlePlaceOrder = async () => {
        if (cart.length === 0) return;

        // Chuẩn bị payload khớp với app.py mới
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
                setMessage(`🎉 ĐẶT HÀNG THÀNH CÔNG! Mã đơn của bạn là #${data.order.id}. Vui lòng chuẩn bị tiền mặt và chờ gọi món.`);
                setCart([]);
                setIsError(false);
                // Tự động xóa thông báo sau 10 giây để đón khách mới
                setTimeout(() => setMessage(''), 10000);
            } else {
                setMessage(`Lỗi: ${data.message}`);
                setIsError(true);
            }
        } catch (err) {
            setMessage('Lỗi kết nối Server.');
            setIsError(true);
        }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '50px', fontSize: '24px' }}>☕ Đang tải menu...</div>;

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#4e342e', padding: '20px', borderRadius: '15px', color: 'white', marginBottom: '20px' }}>
                <div>
                    <h1 style={{ margin: 0 }}>REAK SMAAY COFFEE ☕</h1>
                    <p style={{ margin: 0, opacity: 0.8 }}>Quý khách vui lòng tự chọn món và nhận số thứ tự tại quầy</p>
                </div>
                <button onClick={() => navigate('/')} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '10px 15px', borderRadius: '5px', cursor: 'pointer' }}>
                    🔐 Nhân viên Đăng nhập
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '20px' }}>
                
                {/* Danh sách món ăn */}
                <div>
                    {menuData.map(category => (
                        <div key={category.id} style={{ marginBottom: '30px' }}>
                            <h2 style={{ color: '#4e342e', borderLeft: '5px solid #8d6e63', paddingLeft: '15px' }}>{category.name}</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
                                {category.products.map(product => (
                                    <div key={product.id} style={{ border: '1px solid #ddd', borderRadius: '12px', padding: '15px', textAlign: 'center', background: 'white', transition: '0.3s', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                                        <h3 style={{ margin: '10px 0' }}>{product.name}</h3>
                                        <p style={{ color: '#28a745', fontWeight: 'bold', fontSize: '1.2em' }}>{product.price.toLocaleString('vi-VN')}đ</p>
                                        <button 
                                            onClick={() => handleAddToCart(product)}
                                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', background: '#8d6e63', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                                        >
                                            + Chọn món
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Giỏ hàng bên phải */}
                <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '15px', border: '1px solid #dee2e6', height: 'fit-content', position: 'sticky', top: '20px' }}>
                    <h2 style={{ marginTop: 0, textAlign: 'center' }}>🛒 Đơn hàng</h2>
                    
                    {message && (
                        <div style={{ padding: '15px', borderRadius: '8px', marginBottom: '15px', background: isError ? '#f8d7da' : '#d4edda', color: isError ? '#721c24' : '#155724', fontWeight: 'bold', textAlign: 'center' }}>
                            {message}
                        </div>
                    )}

                    {cart.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#6c757d', padding: '40px 0' }}>Giỏ hàng đang trống.<br/>Mời quý khách chọn món!</p>
                    ) : (
                        <>
                            {cart.map(item => (
                                <div key={item.product_id} style={{ borderBottom: '1px solid #ddd', padding: '10px 0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                                        <span>{item.product_name}</span>
                                        <span>{(item.unit_price * item.quantity).toLocaleString('vi-VN')}đ</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}>
                                        <button onClick={() => updateQuantity(item.product_id, -1)} style={{ width: '25px', height: '25px', borderRadius: '50%', border: '1px solid #ddd' }}>-</button>
                                        <span style={{ margin: '0 15px', fontWeight: 'bold' }}>{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.product_id, 1)} style={{ width: '25px', height: '25px', borderRadius: '50%', border: '1px solid #ddd' }}>+</button>
                                        <button onClick={() => setCart(cart.filter(i => i.product_id !== item.product_id))} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer' }}>Xóa</button>
                                    </div>
                                    <input 
                                        type="text" 
                                        placeholder="Ghi chú (đá, đường...)" 
                                        style={{ width: '100%', marginTop: '8px', padding: '5px', borderRadius: '4px', border: '1px solid #eee', fontSize: '0.85em' }}
                                        value={item.notes}
                                        onChange={(e) => {
                                            const newCart = [...cart];
                                            newCart.find(i => i.product_id === item.product_id).notes = e.target.value;
                                            setCart(newCart);
                                        }}
                                    />
                                </div>
                            ))}
                            <div style={{ marginTop: '20px', borderTop: '2px solid #4e342e', paddingTop: '15px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.4em', fontWeight: 'bold', color: '#4e342e' }}>
                                    <span>TỔNG CỘNG:</span>
                                    <span>{cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0).toLocaleString('vi-VN')}đ</span>
                                </div>
                                <button 
                                    onClick={handlePlaceOrder}
                                    style={{ width: '100%', marginTop: '15px', padding: '15px', borderRadius: '10px', border: 'none', background: '#28a745', color: 'white', fontSize: '1.2em', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 10px rgba(40, 167, 69, 0.3)' }}
                                >
                                    ĐẶT MÓN NGAY ✅
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GuestOrderKiosk;