import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './UserManagement.css'; 

// --- CẤU HÌNH URL API ---
const BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';
const API_BASE_URL = `${BASE_URL}/api`;

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const navigate = useNavigate();
    
    const token = localStorage.getItem('access_token');
    const userRole = localStorage.getItem('user_role');

    const [newUser, setNewUser] = useState({
        username: '', password: '', full_name: '', role: 'staff'
    });

    useEffect(() => {
        // Bảo vệ route: Chỉ Manager có Token mới được vào
        if (!token || userRole !== 'manager') {
            navigate('/');
            return;
        }
        fetchUsers();
    }, [token, navigate, userRole]);

    const fetchUsers = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            } else if (response.status === 401) {
                localStorage.clear();
                navigate('/');
            }
        } catch (err) {
            console.error("Lỗi kết nối Server:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setMessage('Đang xử lý...');
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
                setMessage(`Thành công: Đã tạo tài khoản ${data.user.username}`);
                setNewUser({ username: '', password: '', full_name: '', role: 'staff' });
                fetchUsers();
            } else {
                setMessage(`Lỗi: ${data.message || 'Không thể tạo tài khoản'}`);
                setIsError(true);
            }
        } catch (err) {
            setMessage('Lỗi kết nối Server.');
            setIsError(true);
        }
    };

    const handleDelete = async (id, name, username) => {
        if (username === 'admin_cafe') {
            alert("Đây là tài khoản hệ thống, không thể xóa!");
            return;
        }

        if (!window.confirm(`Xác nhận xóa nhân viên: ${name}?`)) return;
        
        try {
            const res = await fetch(`${API_BASE_URL}/users/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) {
                setMessage("Xóa nhân viên thành công.");
                setIsError(false);
                fetchUsers();
            } else {
                alert("Không thể xóa tài khoản này.");
            }
        } catch (err) { 
            alert("Lỗi kết nối server"); 
        }
    };

    if (loading) return <div className="user-container">🚀 Đang tải dữ liệu nhân sự...</div>;

    return (
        <div className="user-container">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h1 style={{ margin: 0 }}>👥 Quản Lý Nhân Sự</h1>
                    <p style={{ color: '#718096', margin: 0 }}>Quản lý quyền truy cập hệ thống</p>
                </div>
                <button className="btn-delete-user" style={{ color: '#4a5568', cursor: 'pointer' }} onClick={() => navigate('/menu')}>
                    ← Quay lại
                </button>
            </header>

            <div className="user-mgmt-grid">
                {/* FORM TẠO MỚI */}
                <aside className="user-form-card">
                    <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Tạo tài khoản</h3>
                    
                    {message && (
                        <div style={{ 
                            padding: '12px', marginBottom: '20px', borderRadius: '8px',
                            backgroundColor: isError ? '#fff5f5' : '#f0fff4',
                            color: isError ? '#c53030' : '#2f855a',
                            border: `1px solid ${isError ? '#feb2b2' : '#9ae6b4'}`,
                            fontSize: '0.9rem'
                        }}>
                            {message}
                        </div>
                    )}

                    <form onSubmit={handleCreateUser}>
                        <div className="form-group">
                            <label>Tên đăng nhập</label>
                            <input className="user-input" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} required />
                        </div>
                        <div className="form-group">
                            <label>Mật khẩu</label>
                            <input className="user-input" type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required />
                        </div>
                        <div className="form-group">
                            <label>Họ và tên</label>
                            <input className="user-input" value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})} required />
                        </div>
                        <div className="form-group">
                            <label>Chức vụ</label>
                            <select className="user-input" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                                <option value="staff">Nhân viên (Staff)</option>
                                <option value="manager">Quản lý (Manager)</option>
                            </select>
                        </div>
                        <button type="submit" style={{ width: '100%', padding: '12px', background: '#3182ce', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                            TẠO TÀI KHOẢN
                        </button>
                    </form>
                </aside>

                {/* DANH SÁCH NHÂN VIÊN */}
                <main className="user-card-list">
                    {users.map(u => (
                        <div key={u.id} className="user-item-card">
                            <div>
                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{u.full_name}</div>
                                <div style={{ color: '#718096', fontSize: '0.9rem' }}>@{u.username}</div>
                                <span className={`role-badge role-${u.role}`}>
                                    {u.role === 'manager' ? 'Quản lý' : 'Nhân viên'}
                                </span>
                            </div>
                            <div className="actions">
                                {u.username !== 'admin_cafe' ? (
                                    <button className="btn-delete-user" onClick={() => handleDelete(u.id, u.full_name, u.username)}>
                                        Xóa
                                    </button>
                                ) : (
                                    <small style={{ color: '#a0aec0' }}>Hệ thống</small>
                                )}
                            </div>
                        </div>
                    ))}
                </main>
            </div>
        </div>
    );
};

export default UserManagement;