// src/components/Menu.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://127.0.0.1:5000/api';

const Menu = () => {
    const [menuData, setMenuData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const token = localStorage.getItem('access_token');
    // Lấy userRole để quyết định hiển thị nút Quản lý
    const userRole = localStorage.getItem('user_role'); 

    useEffect(() => {
        // 1. Kiểm tra Token
        if (!token) {
            alert('Vui lòng đăng nhập để truy cập.');
            navigate('/');
            return;
        }

        const fetchMenu = async () => {
            try {
                const headers = {
                    'Authorization': `Bearer ${token}`
                };

                // Gửi cả 2 yêu cầu cùng lúc để tăng tốc độ
                const [categoriesResponse, productsResponse] = await Promise.all([
                    fetch(`${API_BASE_URL}/categories`, { headers }),
                    fetch(`${API_BASE_URL}/products`, { headers })
                ]);

                // Xử lý lỗi bảo mật (403)
                if (categoriesResponse.status === 403 || productsResponse.status === 403) {
                    setError("Lỗi 403: Tài khoản hiện tại không có quyền Quản lý để xem Menu.");
                    return;
                }

                const categories = await categoriesResponse.json();
                const products = await productsResponse.json();
                
                // 2. Ghép Category và Product
                const categorizedMenu = categories.map(cat => ({
                    ...cat,
                    products: products.filter(p => p.category_id === cat.id)
                }));

                setMenuData(categorizedMenu);

            } catch (err) {
                setError('Lỗi kết nối Server Flask hoặc dữ liệu không hợp lệ.');
                console.error('Lỗi tải menu:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchMenu();
    }, [token, navigate]);

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_role');
        navigate('/');
    };

    if (loading) return <div className="container">Đang tải Menu...</div>;
    if (error) return <div className="container" style={{ color: 'red' }}>{error}</div>;

    return (
        <div className="container menu-page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #ccc', paddingBottom: '10px' }}>
                <h1>📋 Quản Lý Menu Cafe</h1>
                <div>
                    {/* KHU VỰC CẬP NHẬT: Thêm nút Quản lý Người dùng và sắp xếp các nút quản lý */}
                    {userRole === 'manager' && (
                        <>
                            <button 
                                onClick={() => navigate('/users')} 
                                style={{ backgroundColor: '#343a40', marginRight: '10px' }} // Màu đen/xám đậm cho User Management
                            >
                                👥 Quản Lý Người Dùng
                            </button>
                            <button 
                                onClick={() => navigate('/manage')} 
                                style={{ backgroundColor: '#6c757d', marginRight: '10px' }} 
                            >
                                ⚙️ Quản Lý Menu
                            </button>
                            <button 
                                onClick={() => navigate('/orders')} 
                                style={{ backgroundColor: '#007bff', marginRight: '10px' }}
                            >
                                📄 Quản lý Đơn Hàng
                            </button>
                        </>
                    )}

                    {/* Nút Tạo Đơn Hàng Mới (Staff & Manager) */}
                    <button 
                        onClick={() => navigate('/order')} 
                        style={{ backgroundColor: '#28a745', marginRight: '10px' }}
                    >
                        🛒 Tạo Đơn Hàng Mới
                    </button>
                    
                    <button onClick={handleLogout}>Đăng Xuất</button>
                </div>
            </div>
            
            <p style={{ marginTop: '15px' }}>Chào mừng, **{userRole}**! Đây là danh sách sản phẩm đã được tải từ Server Flask.</p>
            
            {menuData.length === 0 ? (
                <p style={{ marginTop: '20px' }}>Chưa có danh mục hoặc sản phẩm nào. Vui lòng tạo thêm bằng API POST.</p>
            ) : (
                menuData.map(category => (
                    <div key={category.id} style={{ marginBottom: '25px', border: '1px solid #eee', padding: '15px', borderRadius: '5px' }}>
                        <h3 style={{ color: '#007bff' }}>{category.name} ({category.products.length} sản phẩm)</h3>
                        
                        {category.products.length > 0 ? (
                            <ul style={{ listStyleType: 'none', padding: 0 }}>
                                {category.products.map(product => (
                                <li key={product.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dotted #ccc', padding: '8px 0' }}>
                                    <span>{product.name} (ID: {product.id})</span>
                                    <span style={{ fontWeight: 'bold', color: '#5cb85c' }}>
                                        {product.price.toLocaleString('vi-VN')} VND
                                    </span>
                                </li>
                                ))}
                            </ul>
                        ) : (
                            <p style={{ fontStyle: 'italic', color: '#888' }}>Danh mục này chưa có sản phẩm nào.</p>
                        )}
                    </div>
                ))
            )}
        </div>
    );
};

export default Menu;