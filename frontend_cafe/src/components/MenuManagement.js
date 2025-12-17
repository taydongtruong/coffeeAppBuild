import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://127.0.0.1:5000/api';

const StatusMessage = ({ message, isError }) => (
    message ? (
        <div style={{ 
            padding: '10px', 
            marginBottom: '15px', 
            borderRadius: '5px', 
            backgroundColor: isError ? '#f8d7da' : '#d4edda',
            color: isError ? '#721c24' : '#155724',
            border: `1px solid ${isError ? '#f5c6cb' : '#c3e6cb'}`
        }}>
            {message}
        </div>
    ) : null
);

const MenuManagement = () => {
    const [menuData, setMenuData] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    
    const navigate = useNavigate();
    const token = localStorage.getItem('access_token');
    const userRole = localStorage.getItem('user_role');

    const [newCategoryName, setNewCategoryName] = useState('');
    const [newProduct, setNewProduct] = useState({ name: '', price: '', category_id: '' });

    useEffect(() => {
        if (!token || userRole !== 'manager') {
            navigate('/');
            return;
        }
        fetchMenuData();
    }, [token, navigate, userRole]);

    // --- 1. Lấy dữ liệu ---
    const fetchMenuData = async () => {
        setLoading(true);
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            const [catRes, prodRes] = await Promise.all([
                fetch(`${API_BASE_URL}/categories`, { headers }),
                fetch(`${API_BASE_URL}/products`, { headers })
            ]);

            if (catRes.status === 401 || prodRes.status === 401) {
                navigate('/'); return;
            }

            const categoriesData = await catRes.json();
            const productsData = await prodRes.json();

            setCategories(categoriesData);
            const combined = categoriesData.map(cat => ({
                ...cat,
                products: productsData.filter(p => p.category_id === cat.id)
            }));
            setMenuData(combined);
        } catch (err) {
            setMessage("Không thể kết nối đến máy chủ.");
            setIsError(true);
        } finally {
            setLoading(false);
        }
    };

    // --- 2. Quản lý Danh mục (Category) ---
    const handleCreateCategory = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_BASE_URL}/categories`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: newCategoryName }),
            });
            const data = await res.json();
            if (res.ok) {
                setMessage(`Đã thêm danh mục: ${data.category.name}`);
                setIsError(false);
                setNewCategoryName('');
                fetchMenuData();
            } else {
                throw new Error(data.message);
            }
        } catch (err) {
            setMessage(err.message);
            setIsError(true);
        }
    };

    const handleDeleteCategory = async (id) => {
        if (!window.confirm("Xóa danh mục này?")) return;
        try {
            const res = await fetch(`${API_BASE_URL}/categories/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setMessage("Đã xóa danh mục.");
                setIsError(false);
                fetchMenuData();
            } else {
                const data = await res.json();
                setMessage(data.message);
                setIsError(true);
            }
        } catch (err) {
            setMessage("Lỗi khi xóa.");
            setIsError(true);
        }
    };

    // --- 3. Quản lý Sản phẩm (Product) ---
    const handleCreateProduct = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_BASE_URL}/products`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: newProduct.name,
                    price: parseFloat(newProduct.price),
                    category_id: parseInt(newProduct.category_id)
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setMessage(`Đã thêm: ${data.product.name}`);
                setIsError(false);
                setNewProduct({ name: '', price: '', category_id: '' });
                fetchMenuData();
            } else {
                setMessage(data.message);
                setIsError(true);
            }
        } catch (err) {
            setMessage("Lỗi kết nối.");
            setIsError(true);
        }
    };

    const handleEditProduct = async (product) => {
        const newName = prompt("Tên sản phẩm mới:", product.name);
        if (!newName) return;
        const newPrice = prompt("Giá mới:", product.price);
        if (!newPrice) return;

        try {
            const res = await fetch(`${API_BASE_URL}/products/${product.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: newName, price: parseFloat(newPrice) }),
            });
            if (res.ok) {
                setMessage("Cập nhật thành công!");
                setIsError(false);
                fetchMenuData();
            }
        } catch (err) {
            alert("Lỗi cập nhật.");
        }
    };

    const handleDeleteProduct = async (id) => {
        if (!window.confirm("Xóa sản phẩm này?")) return;
        try {
            const res = await fetch(`${API_BASE_URL}/products/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setMessage("Đã xóa sản phẩm.");
                setIsError(false);
                fetchMenuData();
            }
        } catch (err) {
            setMessage("Lỗi khi xóa.");
            setIsError(true);
        }
    };

    if (loading) return <div className="container">Đang tải dữ liệu...</div>;

    return (
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h2>⚙️ Quản Lý Menu (Admin)</h2>
                <button onClick={() => navigate('/menu')} style={{ backgroundColor: '#6c757d' }}>Trở về Menu</button>
            </div>

            <StatusMessage message={message} isError={isError} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
                {/* Form thêm mới */}
                <aside>
                    <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '20px' }}>
                        <h4 style={{ marginTop: 0 }}>+ Danh mục mới</h4>
                        <input 
                            type="text" 
                            placeholder="Tên danh mục..." 
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            style={{ width: '100%', marginBottom: '10px', padding: '8px' }}
                        />
                        <button onClick={handleCreateCategory} style={{ width: '100%' }}>Thêm danh mục</button>
                    </div>

                    <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
                        <h4 style={{ marginTop: 0 }}>+ Sản phẩm mới</h4>
                        <input 
                            type="text" 
                            placeholder="Tên món..." 
                            value={newProduct.name}
                            onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                            style={{ width: '100%', marginBottom: '10px', padding: '8px' }}
                        />
                        <input 
                            type="number" 
                            placeholder="Giá VND..." 
                            value={newProduct.price}
                            onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                            style={{ width: '100%', marginBottom: '10px', padding: '8px' }}
                        />
                        <select 
                            value={newProduct.category_id}
                            onChange={(e) => setNewProduct({...newProduct, category_id: e.target.value})}
                            style={{ width: '100%', marginBottom: '10px', padding: '8px' }}
                        >
                            <option value="">Chọn danh mục</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <button onClick={handleCreateProduct} style={{ width: '100%', backgroundColor: '#28a745' }}>Thêm sản phẩm</button>
                    </div>
                </aside>

                {/* Danh sách hiển thị */}
                <main>
                    {menuData.map(cat => (
                        <div key={cat.id} style={{ marginBottom: '25px', padding: '15px', border: '1px solid #eee', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #007bff', paddingBottom: '5px' }}>
                                <h3 style={{ margin: 0 }}>{cat.name}</h3>
                                <button 
                                    onClick={() => handleDeleteCategory(cat.id)}
                                    disabled={cat.products.length > 0}
                                    style={{ padding: '2px 8px', backgroundColor: cat.products.length > 0 ? '#ccc' : '#dc3545', fontSize: '12px' }}
                                >
                                    Xóa DM
                                </button>
                            </div>
                            <table style={{ width: '100%', marginTop: '10px', borderCollapse: 'collapse' }}>
                                <tbody>
                                    {cat.products.map(p => (
                                        <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                                            <td style={{ padding: '10px 0' }}><strong>{p.name}</strong></td>
                                            <td>{p.price.toLocaleString()}đ</td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button onClick={() => handleEditProduct(p)} style={{ backgroundColor: '#ffc107', color: '#000', marginRight: '5px', padding: '3px 10px' }}>Sửa</button>
                                                <button onClick={() => handleDeleteProduct(p.id)} style={{ backgroundColor: '#dc3545', padding: '3px 10px' }}>Xóa</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </main>
            </div>
        </div>
    );
};

export default MenuManagement;