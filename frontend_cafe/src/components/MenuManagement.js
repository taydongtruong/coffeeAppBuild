import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './MenuManagement.css'; 

const API_BASE_URL = 'http://127.0.0.1:5000/api';

const StatusMessage = ({ message, isError }) => (
    message ? (
        <div className={`status-msg ${isError ? 'error' : 'success'}`} style={{
            padding: '12px', marginBottom: '20px', borderRadius: '8px',
            backgroundColor: isError ? '#fee2e2' : '#dcfce7',
            color: isError ? '#991b1b' : '#166534',
            border: `1px solid ${isError ? '#fecaca' : '#bbf7d0'}`
        }}>
            {isError ? '❌ ' : '✅ '} {message}
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

    const fetchMenuData = async () => {
        setLoading(true);
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            const [catRes, prodRes] = await Promise.all([
                fetch(`${API_BASE_URL}/categories`, { headers }),
                fetch(`${API_BASE_URL}/products`, { headers })
            ]);

            if (catRes.status === 401 || prodRes.status === 401) { navigate('/'); return; }

            const categoriesData = await catRes.json();
            const productsData = await prodRes.json();

            setCategories(categoriesData);
            const combined = categoriesData.map(cat => ({
                ...cat,
                products: productsData.filter(p => p.category_id === cat.id)
            }));
            setMenuData(combined);
        } catch (err) {
            setMessage("Lỗi kết nối server.");
            setIsError(true);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCategory = async (e) => {
        e.preventDefault();
        if(!newCategoryName) return;
        try {
            const res = await fetch(`${API_BASE_URL}/categories`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ name: newCategoryName }),
            });
            const data = await res.json();
            if (res.ok) {
                setMessage(`Đã thêm: ${data.category.name}`);
                setIsError(false);
                setNewCategoryName('');
                fetchMenuData();
            } else { throw new Error(data.message); }
        } catch (err) { setMessage(err.message); setIsError(true); }
    };

    const handleDeleteCategory = async (id) => {
        if (!window.confirm("Xóa danh mục này?")) return;
        try {
            const res = await fetch(`${API_BASE_URL}/categories/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) { fetchMenuData(); setMessage("Xóa thành công"); setIsError(false); }
            else { const d = await res.json(); setMessage(d.message); setIsError(true); }
        } catch (err) { setMessage("Lỗi khi xóa."); setIsError(true); }
    };

    const handleCreateProduct = async (e) => {
        e.preventDefault();
        if(!newProduct.name || !newProduct.price || !newProduct.category_id) return alert("Vui lòng điền đủ thông tin");
        try {
            const res = await fetch(`${API_BASE_URL}/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    name: newProduct.name,
                    price: parseFloat(newProduct.price),
                    category_id: parseInt(newProduct.category_id)
                }),
            });
            if (res.ok) {
                setMessage("Thêm món thành công"); setIsError(false);
                setNewProduct({ name: '', price: '', category_id: '' });
                fetchMenuData();
            }
        } catch (err) { setMessage("Lỗi kết nối."); setIsError(true); }
    };

    const handleEditProduct = async (product) => {
        const newName = prompt("Tên sản phẩm mới:", product.name);
        const newPrice = prompt("Giá mới:", product.price);
        if (!newName || !newPrice) return;

        try {
            const res = await fetch(`${API_BASE_URL}/products/${product.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ name: newName, price: parseFloat(newPrice) }),
            });
            if (res.ok) fetchMenuData();
        } catch (err) { alert("Lỗi cập nhật."); }
    };

    const handleDeleteProduct = async (id) => {
        if (!window.confirm("Xóa món này?")) return;
        try {
            await fetch(`${API_BASE_URL}/products/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchMenuData();
        } catch (err) { setMessage("Lỗi khi xóa."); setIsError(true); }
    };

    if (loading) return <div className="admin-wrapper">Đang tải dữ liệu...</div>;

    return (
        <div className="admin-wrapper">
            <header className="admin-header">
                <div>
                    <h2 style={{margin: 0}}>⚙️ Quản Lý Thực Đơn</h2>
                    <p style={{margin: 0, color: '#7f8c8d'}}>Dành cho Quản lý hệ thống</p>
                </div>
                <button className="btn-admin" onClick={() => navigate('/menu')} style={{backgroundColor: '#95a5a6', color: 'white'}}>← Menu chính</button>
            </header>

            <StatusMessage message={message} isError={isError} />

            <div className="admin-grid">
                {/* BÊN TRÁI: BIỂU MẪU NHẬP */}
                <aside className="admin-sidebar">
                    <div className="card-form">
                        <h4>📂 Danh mục mới</h4>
                        <input type="text" placeholder="Tên danh mục..." value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
                        <button className="btn-admin btn-save" onClick={handleCreateCategory}>Tạo danh mục</button>
                    </div>

                    <div className="card-form">
                        <h4>☕ Thêm món ăn</h4>
                        <input type="text" placeholder="Tên món..." value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} />
                        <input type="number" placeholder="Giá tiền..." value={newProduct.price} onChange={(e) => setNewProduct({...newProduct, price: e.target.value})} />
                        <select value={newProduct.category_id} onChange={(e) => setNewProduct({...newProduct, category_id: e.target.value})}>
                            <option value="">Chọn danh mục</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <button className="btn-admin btn-save" onClick={handleCreateProduct}>Lưu món mới</button>
                    </div>
                </aside>

                {/* BÊN PHẢI: DANH SÁCH CHI TIẾT */}
                <main className="admin-main">
                    {menuData.map(cat => (
                        <div key={cat.id} className="category-block">
                            <div className="category-header">
                                <h3 style={{margin: 0}}>{cat.name} ({cat.products.length})</h3>
                                <button className="btn-admin btn-delete" onClick={() => handleDeleteCategory(cat.id)} disabled={cat.products.length > 0}>
                                    Xóa danh mục
                                </button>
                            </div>
                            <table className="product-table">
                                <tbody>
                                    {cat.products.map(p => (
                                        <tr key={p.id}>
                                            <td style={{width: '50%'}}><strong>{p.name}</strong></td>
                                            <td style={{color: '#e67e22', fontWeight: 'bold'}}>{p.price.toLocaleString()}đ</td>
                                            <td style={{textAlign: 'right'}}>
                                                <button className="btn-admin btn-edit" onClick={() => handleEditProduct(p)} style={{marginRight: '8px'}}>Sửa</button>
                                                <button className="btn-admin btn-delete" onClick={() => handleDeleteProduct(p.id)}>Xóa</button>
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