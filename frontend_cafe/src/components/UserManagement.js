import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Menu.css';

const API_BASE_URL = 'http://127.0.0.1:5000/api';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const navigate = useNavigate();
    
    const token = localStorage.getItem('access_token');
    const userRole = localStorage.getItem('user_role');

    const [newUser, setNewUser] = useState({
        username: '',
        password: '',
        full_name: '',
        role: 'staff'
    });

    useEffect(() => {
        // Bảo mật lớp Frontend
        if (!token || userRole !== 'manager') {
            navigate('/');
            return;
        }
        fetchUsers();
    }, [token, navigate, userRole]);

    // 1. Lấy danh sách (GET /api/users)
    const fetchUsers = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            } else if (response.status === 401) {
                navigate('/');
            }
        } catch (err) {
            console.error("Lỗi kết nối:", err);
        } finally {
            setLoading(false);
        }
    };

    // 2. Tạo tài khoản (POST /api/users)
    const handleCreateUser = async (e) => {
        e.preventDefault();
        setMessage('');
        setIsError(false);

        try {
            const response = await fetch(`${API_BASE_URL}/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newUser),
            });

            const data = await response.json();

            if (response.ok) {
                // Khớp với app.py trả về { "user": {...} }
                setMessage(`Thành công: Đã tạo tài khoản ${data.user.username}`);
                setNewUser({ username: '', password: '', full_name: '', role: 'staff' });
                fetchUsers();
            } else {
                setMessage(`Lỗi: ${data.message || 'Không thể tạo tài khoản'}`);
                setIsError(true);
            }
        } catch (err) {
            setMessage('Lỗi kết nối Server Flask.');
            setIsError(true);
        }
    };

    // 3. Xóa tài khoản (DELETE /api/users/<id>)
    const handleDelete = async (id, name, username) => {
        // Không cho phép tự xóa chính mình hoặc xóa admin gốc
        if (username === 'admin_cafe') {
            alert("Không thể xóa tài khoản hệ thống!");
            return;
        }

        if (!window.confirm(`Bạn có chắc chắn muốn xóa nhân viên "${name}"?`)) return;
        
        try {
            const res = await fetch(`${API_BASE_URL}/users/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) {
                setMessage("Đã xóa nhân viên thành công.");
                setIsError(false);
                fetchUsers();
            } else {
                const data = await res.json();
                alert(data.message || "Lỗi khi xóa");
            }
        } catch (err) { 
            alert("Lỗi kết nối server"); 
        }
    };

    if (loading) return <div className="menu-container"><div className="empty-state">Đang tải dữ liệu nhân sự...</div></div>;

    return (
        <div className="menu-container">
            <header className="menu-header">
                <div className="header-title">
                    <h1>👥 Quản Lý Nhân Sự</h1>
                    <p className="welcome-text">Cấp quyền và quản lý tài khoản nhân viên.</p>
                </div>
                <button className="btn btn-menu" onClick={() => navigate('/menu')}>← Quay lại Menu</button>
            </header>

            <div className="user-mgmt-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '30px' }}>
                
                {/* CỘT TRÁI: FORM TẠO MỚI */}
                <div className="category-section">
                    <h3 className="category-title">Tạo Tài Khoản Mới</h3>
                    
                    {message && (
                        <div style={{ 
                            padding: '12px', 
                            marginBottom: '15px', 
                            borderRadius: '6px',
                            backgroundColor: isError ? '#fff5f5' : '#f0fff4',
                            color: isError ? '#c53030' : '#2f855a',
                            border: `1px solid ${isError ? '#feb2b2' : '#9ae6b4'}`,
                            fontSize: '0.9rem'
                        }}>
                            {message}
                        </div>
                    )}

                    <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div>
                            <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Tên đăng nhập</label>
                            <input 
                                className="search-input" 
                                placeholder="Ví dụ: hoa_nguyen" 
                                value={newUser.username} 
                                onChange={e => setNewUser({...newUser, username: e.target.value})} 
                                required 
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Mật khẩu</label>
                            <input 
                                className="search-input" 
                                type="password" 
                                placeholder="Tối thiểu 6 ký tự" 
                                value={newUser.password} 
                                onChange={e => setNewUser({...newUser, password: e.target.value})} 
                                required 
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Họ và tên</label>
                            <input 
                                className="search-input" 
                                placeholder="Nhập tên đầy đủ" 
                                value={newUser.full_name} 
                                onChange={e => setNewUser({...newUser, full_name: e.target.value})} 
                                required 
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Chức vụ</label>
                            <select 
                                className="search-input" 
                                value={newUser.role} 
                                onChange={e => setNewUser({...newUser, role: e.target.value})}
                                style={{ width: '100%' }}
                            >
                                <option value="staff">Nhân viên (Staff)</option>
                                <option value="manager">Quản lý (Manager)</option>
                            </select>
                        </div>
                        <button type="submit" className="btn btn-create-order" style={{ width: '100%', marginTop: '10px' }}>
                            ➕ TẠO TÀI KHOẢN
                        </button>
                    </form>
                </div>

                {/* CỘT PHẢI: DANH SÁCH NHÂN VIÊN */}
                <div className="category-section">
                    <h3 className="category-title">Danh Sách Nhân Viên ({users.length})</h3>
                    <div className="user-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {users.map(u => (
                            <div key={u.id} className="product-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px' }}>
                                <div className="product-info">
                                    <span className="product-name" style={{ fontSize: '1.1rem' }}>{u.full_name}</span>
                                    <div style={{ fontSize: '0.85rem', color: '#666' }}>
                                        <span style={{ 
                                            padding: '2px 8px', 
                                            borderRadius: '10px', 
                                            backgroundColor: u.role === 'manager' ? '#ebf8ff' : '#f7fafc',
                                            color: u.role === 'manager' ? '#2b6cb0' : '#4a5568',
                                            marginRight: '8px',
                                            fontWeight: 'bold'
                                        }}>
                                            {u.role.toUpperCase()}
                                        </span>
                                        @{u.username}
                                    </div>
                                </div>
                                <div className="actions">
                                    {u.username !== 'admin_cafe' ? (
                                        <button 
                                            onClick={() => handleDelete(u.id, u.full_name, u.username)} 
                                            style={{ 
                                                color: '#e53e3e', 
                                                border: '1px solid #fed7d7', 
                                                backgroundColor: '#fff5f5', 
                                                padding: '5px 12px',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '0.85rem'
                                            }}
                                        >
                                            Xóa
                                        </button>
                                    ) : (
                                        <span style={{ color: '#a0aec0', fontSize: '0.8rem', fontStyle: 'italic' }}>Tài khoản gốc</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserManagement;