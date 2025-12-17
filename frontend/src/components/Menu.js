import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Menu.css'; 

const API_BASE_URL = 'http://127.0.0.1:5000/api';

const Menu = () => {
    const [menuData, setMenuData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    
    const navigate = useNavigate();
    const token = localStorage.getItem('access_token');
    const userRole = localStorage.getItem('user_role'); 

    useEffect(() => {
        // Kiểm tra quyền truy cập cơ bản
        if (!token) {
            navigate('/');
            return;
        }

        const fetchMenu = async () => {
            setLoading(true);
            try {
                const headers = { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                };

                // Lấy đồng thời Danh mục và Sản phẩm
                const [resCat, resProd] = await Promise.all([
                    fetch(`${API_BASE_URL}/categories`, { headers }),
                    fetch(`${API_BASE_URL}/products`, { headers })
                ]);

                // Kiểm tra nếu Token hết hạn (401)
                if (resCat.status === 401 || resProd.status === 401) {
                    handleLogout();
                    alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
                    return;
                }

                if (!resCat.ok || !resProd.ok) throw new Error('Không thể tải dữ liệu từ Server.');

                const categories = await resCat.json();
                const products = await resProd.json();
                
                // Gom nhóm sản phẩm vào từng danh mục tương ứng
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

    // Logic tìm kiếm món ăn
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
            <center>
                <button className="btn btn-menu" onClick={() => window.location.reload()}>Thử lại</button>
            </center>
        </div>
    );

    return (
        <div className="menu-container">
            <header className="menu-header">
                <div className="header-title">
                    <h1>📋 Quản Lý Menu Cafe</h1>
                    <p className="welcome-text">
                        Xin chào, <strong>{userRole === 'manager' ? 'Quản lý' : 'Nhân viên'}</strong>! Chúc bạn một ngày tốt lành.
                    </p>
                </div>
                
                <div className="button-group">
                    {/* Các nút chỉ dành cho Quản lý */}
                    {userRole === 'manager' && (
                        <>
                            <button className="btn btn-dashboard" onClick={() => navigate('/dashboard')}>📊 Báo Cáo</button>
                            <button className="btn btn-manager" onClick={() => navigate('/users')}>👥 Người Dùng</button>
                            <button className="btn btn-menu" onClick={() => navigate('/manage')}>⚙️ Cài Đặt Menu</button>
                        </>
                    )}
                    
                    {/* Nút dành cho cả Staff và Manager */}
                    <button className="btn btn-order-list" onClick={() => navigate('/orders')}>📄 Đơn Hàng</button>
                    <button className="btn btn-create-order" onClick={() => navigate('/order')}>🛒 Tạo Đơn Mới</button>
                    <button className="btn btn-logout" onClick={handleLogout}>Đăng Xuất</button>
                </div>
            </header>

            <div className="search-box">
                <input 
                    type="text" 
                    placeholder="🔍 Tìm nhanh món ăn hoặc đồ uống..." 
                    className="search-input"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {filteredMenu.length === 0 ? (
                <div className="empty-state">
                    <p>Không tìm thấy món nào phù hợp với "{searchTerm}"</p>
                </div>
            ) : (
                filteredMenu.map(category => (
                    <section key={category.id} className="category-section">
                        <h3 className="category-title">
                            {category.name} 
                            <span className="category-count">({category.products.length} món)</span>
                        </h3>
                        
                        <div className="product-grid">
                            {category.products.map(product => (
                                <div key={product.id} className="product-item">
                                    <div className="product-main-info">
                                        <div className="product-thumb">
                                            <img 
                                                src={product.image_url || 'https://via.placeholder.com/60?text=No+Img'} 
                                                alt={product.name} 
                                                onError={(e) => { e.target.src = 'https://via.placeholder.com/150?text=Cafe'; }}
                                            />
                                        </div>
                                        <div className="product-text">
                                            <span className="product-name">{product.name}</span>
                                            <span className="product-id">Mã: #{product.id}</span>
                                        </div>
                                    </div>
                                    <div className="product-price">
                                        {product.price.toLocaleString('vi-VN')}đ
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ))
            )}
        </div>
    );
};

export default Menu;