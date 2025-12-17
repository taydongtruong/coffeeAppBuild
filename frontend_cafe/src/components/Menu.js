// src/components/Menu.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Menu.css'; // Import file CSS chuyên nghiệp

const API_BASE_URL = 'http://127.0.0.1:5000/api';

const Menu = () => {
    const [menuData, setMenuData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState(''); // Thêm tính năng tìm kiếm
    
    const navigate = useNavigate();
    const token = localStorage.getItem('access_token');
    const userRole = localStorage.getItem('user_role'); 

    useEffect(() => {
        // 1. Kiểm tra Token ngay lập tức
        if (!token) {
            navigate('/');
            return;
        }

        const fetchMenu = async () => {
            setLoading(true);
            try {
                const headers = { 'Authorization': `Bearer ${token}` };

                // Fetch song song để tối ưu tốc độ
                const [resCat, resProd] = await Promise.all([
                    fetch(`${API_BASE_URL}/categories`, { headers }),
                    fetch(`${API_BASE_URL}/products`, { headers })
                ]);

                // Xử lý Token hết hạn (401)
                if (resCat.status === 401 || resProd.status === 401) {
                    handleLogout();
                    alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
                    return;
                }

                // Xử lý lỗi quyền truy cập (403)
                if (resCat.status === 403 || resProd.status === 403) {
                    setError("Bạn không có quyền xem dữ liệu này.");
                    return;
                }

                if (!resCat.ok || !resProd.ok) throw new Error('Không thể tải dữ liệu từ Server.');

                const categories = await resCat.json();
                const products = await resProd.json();
                
                // 2. Cấu trúc lại dữ liệu Menu
                const categorizedMenu = categories.map(cat => ({
                    ...cat,
                    products: products.filter(p => p.category_id === cat.id)
                }));

                setMenuData(categorizedMenu);

            } catch (err) {
                setError(err.message || 'Lỗi kết nối Server.');
            } finally {
                setLoading(false);
            }
        };

        fetchMenu();
    }, [token, navigate]);

    const handleLogout = () => {
        localStorage.clear();
        navigate('/');
    };

    // Logic lọc sản phẩm theo tên khi người dùng tìm kiếm
    const filteredMenu = menuData.map(cat => ({
        ...cat,
        products: cat.products.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
    })).filter(cat => cat.products.length > 0 || searchTerm === '');

    if (loading) return (
        <div className="menu-container">
            <div className="empty-state">🚀 Đang tải thực đơn cafe...</div>
        </div>
    );

    if (error) return (
        <div className="menu-container">
            <div className="empty-state" style={{ color: '#dc3545' }}>❌ {error}</div>
            <center><button className="btn btn-menu" onClick={() => window.location.reload()}>Thử lại</button></center>
        </div>
    );

    return (
        <div className="menu-container">
            <header className="menu-header">
                <div className="header-title">
                    <h1>📋 Quản Lý Menu Cafe</h1>
                    <p className="welcome-text">Xin chào, <strong>{userRole}</strong>! Chúc bạn một ngày làm việc tốt lành.</p>
                </div>
                
                <div className="button-group">
                    {userRole === 'manager' && (
                        <>
                            <button className="btn btn-manager" onClick={() => navigate('/users')}>👥 Người Dùng</button>
                            <button className="btn btn-menu" onClick={() => navigate('/manage')}>⚙️ Cài Đặt Menu</button>
                            <button className="btn btn-order-list" onClick={() => navigate('/orders')}>📄 Quản lý Đơn Hàng</button>
                        </>
                    )}
                    <button className="btn btn-create-order" onClick={() => navigate('/order')}>🛒 Tạo Đơn Mới</button>
                    <button className="btn btn-logout" onClick={handleLogout}>Đăng Xuất</button>
                </div>
            </header>

            {/* Thanh tìm kiếm món ăn nhanh */}
            <div style={{ marginBottom: '25px' }}>
                <input 
                    type="text" 
                    placeholder="🔍 Tìm nhanh món ăn hoặc đồ uống..." 
                    className="search-input" // Bạn có thể thêm class này vào CSS
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '12px 20px',
                        borderRadius: '8px',
                        border: '1px solid #ddd',
                        fontSize: '1rem'
                    }}
                />
            </div>

            {filteredMenu.length === 0 ? (
                <div className="empty-state">
                    <p>Không tìm thấy món ăn nào phù hợp với "{searchTerm}"</p>
                </div>
            ) : (
                filteredMenu.map(category => (
                    <section key={category.id} className="category-section">
                        <h3 className="category-title">
                            {category.name} 
                            <span style={{color: '#6c757d', fontSize: '0.9rem', fontWeight: 'normal', marginLeft: '10px'}}>
                                ({category.products.length} món)
                            </span>
                        </h3>
                        
                        <div className="product-grid">
                            {category.products.length > 0 ? (
                                category.products.map(product => (
                                    <div key={product.id} className="product-item">
                                        <div className="product-info">
                                            <span className="product-name">{product.name}</span>
                                            <span className="product-id">#{product.id}</span>
                                        </div>
                                        <div className="product-price">
                                            {product.price.toLocaleString('vi-VN')} đ
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="empty-state" style={{padding: '10px', fontSize: '0.9rem'}}>Chưa có sản phẩm</p>
                            )}
                        </div>
                    </section>
                ))
            )}
        </div>
    );
};

export default Menu;