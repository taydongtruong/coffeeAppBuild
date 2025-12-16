// src/components/MenuManagement.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://127.0.0.1:5000/api';

// Hàm hiển thị thông báo lỗi/thành công
const StatusMessage = ({ message, isError }) => (
    message ? <p style={{ color: isError ? 'red' : 'green', fontWeight: 'bold' }}>{message}</p> : null
);

const MenuManagement = () => {
    const [menuData, setMenuData] = useState([]); // Chứa Categories và Products
    const [categories, setCategories] = useState([]); // Chỉ chứa danh sách Categories
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const navigate = useNavigate();
    const token = localStorage.getItem('access_token');
    const userRole = localStorage.getItem('user_role');

    // State cho Form thêm Category
    const [newCategoryName, setNewCategoryName] = useState('');
    
    // State cho Form thêm Product
    const [newProduct, setNewProduct] = useState({
        name: '',
        price: '',
        category_id: ''
    });

    useEffect(() => {
        if (!token || userRole !== 'manager') {
            navigate('/');
            return;
        }
        fetchMenuData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, navigate, userRole]);
    
    // --- 1. Fetch Dữ liệu (GET) ---

    const fetchMenuData = async () => {
        setLoading(true);
        try {
            const headers = { 'Authorization': `Bearer ${token}` };

            const [categoriesResponse, productsResponse] = await Promise.all([
                fetch(`${API_BASE_URL}/categories`, { headers }),
                fetch(`${API_BASE_URL}/products`, { headers })
            ]);

            if (!categoriesResponse.ok || !productsResponse.ok) {
                if (categoriesResponse.status === 403 || productsResponse.status === 403) {
                    throw new Error("403: Bạn không có quyền Quản lý.");
                }
                throw new Error('Lỗi tải dữ liệu Menu.');
            }

            const categoriesData = await categoriesResponse.json();
            const productsData = await productsResponse.json();
            
            setCategories(categoriesData); // Lưu danh sách Category riêng
            
            const categorizedMenu = categoriesData.map(cat => ({
                ...cat,
                products: productsData.filter(p => p.category_id === cat.id)
            }));

            setMenuData(categorizedMenu);

        } catch (err) {
            setMessage(`Lỗi: ${err.message}`);
            setIsError(true);
            console.error('Lỗi tải menu:', err);
        } finally {
            setLoading(false);
        }
    };
    
    // --- 2. Xử lý Category (POST, DELETE) ---

    const handleCreateCategory = async (e) => {
        e.preventDefault();
        setMessage('');
        setIsError(false);

        if (!newCategoryName) {
            setMessage('Tên danh mục không được trống.');
            setIsError(true);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/categories`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: newCategoryName }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(`Tạo danh mục '${data.category.name}' thành công.`);
                setNewCategoryName('');
                fetchMenuData(); // Tải lại dữ liệu
            } else {
                setMessage(`Lỗi: ${data.message || 'Lỗi server.'}`);
                setIsError(true);
            }
        } catch (error) {
            setMessage('Lỗi kết nối Server Flask.');
            setIsError(true);
        }
    };

    const handleDeleteCategory = async (categoryId) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa danh mục này? Tất cả sản phẩm thuộc danh mục này phải được xóa trước.")) return;
        
        setMessage('');
        setIsError(false);

        try {
            const response = await fetch(`${API_BASE_URL}/categories/${categoryId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(`Xóa danh mục thành công.`);
                fetchMenuData();
            } else {
                setMessage(`Lỗi: ${data.message || 'Lỗi server.'}`);
                setIsError(true);
            }
        } catch (error) {
            setMessage('Lỗi kết nối Server Flask.');
            setIsError(true);
        }
    };

    // --- 3. Xử lý Product (POST, PUT, DELETE) ---
    
    const handleNewProductChange = (e) => {
        const { name, value } = e.target;
        setNewProduct(prev => ({ ...prev, [name]: value }));
    };

    const handleCreateProduct = async (e) => {
        e.preventDefault();
        setMessage('');
        setIsError(false);

        const payload = {
            ...newProduct,
            price: parseFloat(newProduct.price),
            category_id: parseInt(newProduct.category_id)
        };

        if (!payload.name || isNaN(payload.price) || payload.price <= 0 || !payload.category_id) {
            setMessage('Vui lòng nhập đầy đủ Tên, Giá hợp lệ và chọn Danh mục.');
            setIsError(true);
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}/products`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(`Tạo sản phẩm '${data.product.name}' thành công.`);
                setNewProduct({ name: '', price: '', category_id: '' });
                fetchMenuData(); 
            } else {
                setMessage(`Lỗi: ${data.message || 'Lỗi server.'}`);
                setIsError(true);
            }
        } catch (error) {
            setMessage('Lỗi kết nối Server Flask.');
            setIsError(true);
        }
    };

    const handleDeleteProduct = async (productId) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa sản phẩm này không?")) return;

        setMessage('');
        setIsError(false);

        try {
            const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(`Xóa sản phẩm thành công.`);
                fetchMenuData();
            } else {
                setMessage(`Lỗi: ${data.message || 'Lỗi server.'}`);
                setIsError(true);
            }
        } catch (error) {
            setMessage('Lỗi kết nối Server Flask.');
            setIsError(true);
        }
    };

    // Hàm cho phép sửa tên/giá/tình trạng (Tạm thời dùng Prompt)
    const handleEditProduct = async (product) => {
        const newName = prompt(`Nhập tên mới cho '${product.name}':`, product.name);
        if (newName === null) return;
        
        const newPrice = prompt(`Nhập giá mới cho '${newName}':`, product.price);
        if (newPrice === null || isNaN(parseFloat(newPrice)) || parseFloat(newPrice) <= 0) {
            alert("Giá không hợp lệ.");
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/products/${product.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: newName, price: parseFloat(newPrice) }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(`Cập nhật sản phẩm '${data.product.name}' thành công.`);
                fetchMenuData(); 
            } else {
                setMessage(`Lỗi cập nhật: ${data.message || 'Lỗi server.'}`);
                setIsError(true);
            }
        } catch (error) {
            setMessage('Lỗi kết nối Server Flask.');
            setIsError(true);
        }
    };


    if (loading) return <div className="container">Đang tải Menu Quản lý...</div>;
    if (userRole !== 'manager') return <div className="container" style={{ color: 'red' }}>Truy cập bị từ chối.</div>;

    return (
        <div className="container menu-page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #ccc', paddingBottom: '10px' }}>
                <h1>⚙️ Bảng Điều Khiển Quản Lý Menu</h1>
                <button onClick={() => navigate('/menu')}>← Quay lại Menu</button>
            </div>
            
            <StatusMessage message={message} isError={isError} />
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px', marginTop: '20px' }}>
                
                {/* Cột 1: Quản lý Category và Thêm Product */}
                <div>
                    {/* Thêm Category */}
                    <div style={{ border: '1px solid #007bff', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
                        <h3>+ Thêm Danh Mục Mới</h3>
                        <form onSubmit={handleCreateCategory}>
                            <input 
                                type="text" 
                                value={newCategoryName} 
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                placeholder="Tên danh mục (vd: Cafe Đá, Trà Trái Cây)"
                                required
                                style={{ width: '100%', marginBottom: '10px' }}
                            />
                            <button type="submit" style={{ width: '100%', backgroundColor: '#007bff' }}>Tạo Danh Mục</button>
                        </form>
                    </div>

                    {/* Thêm Product */}
                    <div style={{ border: '1px solid #28a745', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
                        <h3>+ Thêm Sản Phẩm Mới</h3>
                        <form onSubmit={handleCreateProduct}>
                            <input 
                                type="text" 
                                name="name"
                                value={newProduct.name} 
                                onChange={handleNewProductChange}
                                placeholder="Tên sản phẩm (vd: Latte, Trà Đào)"
                                required
                                style={{ width: '100%', marginBottom: '10px' }}
                            />
                            <input 
                                type="number" 
                                name="price"
                                value={newProduct.price} 
                                onChange={handleNewProductChange}
                                placeholder="Giá (VND)"
                                required
                                min="1000"
                                style={{ width: '100%', marginBottom: '10px' }}
                            />
                            <select 
                                name="category_id"
                                value={newProduct.category_id}
                                onChange={handleNewProductChange}
                                required
                                style={{ width: '100%', marginBottom: '10px', padding: '8px' }}
                            >
                                <option value="">-- Chọn Danh mục --</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                            <button type="submit" style={{ width: '100%', backgroundColor: '#28a745' }}>Tạo Sản Phẩm</button>
                        </form>
                    </div>
                </div>

                {/* Cột 2: Danh sách và CRUD Product */}
                <div>
                    <h2>Danh Sách & Quản lý Sản Phẩm</h2>
                    {menuData.length === 0 ? (
                        <p style={{ fontStyle: 'italic', color: '#888' }}>Chưa có danh mục nào.</p>
                    ) : (
                        menuData.map(category => (
                            <div key={category.id} style={{ marginBottom: '20px', border: '1px solid #ddd', padding: '15px', borderRadius: '5px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>
                                    <h3 style={{ color: '#007bff' }}>{category.name}</h3>
                                    <button 
                                        onClick={() => handleDeleteCategory(category.id)} 
                                        style={{ backgroundColor: '#dc3545', padding: '5px 10px' }}
                                        disabled={category.products.length > 0}
                                        title={category.products.length > 0 ? "Phải xóa hết sản phẩm trước khi xóa danh mục" : "Xóa Danh mục"}
                                    >
                                        Xóa
                                    </button>
                                </div>
                                
                                {category.products.length > 0 ? (
                                    <ul style={{ listStyleType: 'none', padding: 0 }}>
                                        {category.products.map(product => (
                                            <li key={product.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dotted #ccc', padding: '10px 0', alignItems: 'center' }}>
                                                <span>
                                                    <strong>{product.name}</strong> - 
                                                    {product.price.toLocaleString('vi-VN')} VND (ID: {product.id})
                                                </span>
                                                <div>
                                                    <button 
                                                        onClick={() => handleEditProduct(product)} 
                                                        style={{ backgroundColor: '#ffc107', marginRight: '5px', padding: '5px 10px' }}
                                                    >
                                                        Sửa
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteProduct(product.id)} 
                                                        style={{ backgroundColor: '#dc3545', padding: '5px 10px' }}
                                                    >
                                                        Xóa
                                                    </button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p style={{ fontStyle: 'italic', color: '#888' }}>Chưa có sản phẩm nào trong danh mục này.</p>
                                )}
                            </div>
                        ))
                    )}
                </div>

            </div>
        </div>
    );
};

export default MenuManagement;