// src/components/UserManagement.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://127.0.0.1:5000/api';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const navigate = useNavigate();
    const token = localStorage.getItem('access_token');
    const userRole = localStorage.getItem('user_role');

    // State cho Form tạo người dùng mới
    const [newUser, setNewUser] = useState({
        username: '',
        password: '',
        full_name: '',
        role: 'staff' // Mặc định là staff
    });

    useEffect(() => {
        if (!token || userRole !== 'manager') {
            navigate('/');
            return;
        }
        // Vì chúng ta chưa có API GET /api/users, nên chúng ta sẽ không fetch ban đầu
        // Tạm thời chỉ hiển thị form tạo user.
        // Tuy nhiên, nếu có API, bạn sẽ gọi fetchUsers ở đây.
        // Giả sử chỉ có admin_cafe là user ban đầu.
        setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, navigate, userRole]);

    // Hàm gọi API Register để tạo người dùng mới
    const handleCreateUser = async (e) => {
        e.preventDefault();
        setMessage('');
        setIsError(false);

        if (!newUser.username || !newUser.password || !newUser.full_name) {
            setMessage('Vui lòng nhập đầy đủ Tên đăng nhập, Mật khẩu và Tên đầy đủ.');
            setIsError(true);
            return;
        }
        
        try {
            // Sử dụng API /api/auth/register đã có
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // API Register không cần token, nhưng chúng ta chỉ gọi nó từ giao diện Manager
                },
                body: JSON.stringify(newUser),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(`Tạo tài khoản '${data.user.username}' thành công! (Role: ${data.user.role})`);
                setIsError(false);
                setNewUser({ username: '', password: '', full_name: '', role: 'staff' }); // Reset form
                // Nếu có API GET /users, ta sẽ gọi fetchUsers() ở đây
            } else {
                setMessage(`Lỗi: ${data.message || 'Lỗi server khi tạo người dùng.'}`);
                setIsError(true);
            }
        } catch (err) {
            setMessage('Lỗi kết nối Server Flask.');
            setIsError(true);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewUser(prev => ({ ...prev, [name]: value }));
    };

    if (loading) return <div className="container">Đang tải trang Quản lý Người dùng...</div>;
    if (userRole !== 'manager') return <div className="container" style={{ color: 'red' }}>Truy cập bị từ chối.</div>;

    return (
        <div className="container menu-page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #ccc', paddingBottom: '10px' }}>
                <h1>👥 Quản Lý Tài Khoản Người Dùng</h1>
                <button onClick={() => navigate('/menu')}>← Quay lại Menu</button>
            </div>
            
            <p style={{ marginTop: '15px' }}>Sử dụng trang này để tạo tài khoản mới cho Staff hoặc Manager.</p>

            <div style={{ margin: '20px 0', padding: '20px', border: '1px solid #007bff', borderRadius: '8px' }}>
                <h2>+ Tạo Tài Khoản Mới</h2>
                
                {message && (
                    <p style={{ color: isError ? 'red' : 'green', fontWeight: 'bold', border: `1px solid ${isError ? 'red' : 'green'}`, padding: '10px', borderRadius: '5px' }}>
                        {message}
                    </p>
                )}

                <form onSubmit={handleCreateUser} style={{ display: 'grid', gap: '10px' }}>
                    <input 
                        type="text" 
                        name="username"
                        value={newUser.username} 
                        onChange={handleInputChange}
                        placeholder="Tên đăng nhập (Username)"
                        required
                        style={{ padding: '10px' }}
                    />
                    <input 
                        type="password" 
                        name="password"
                        value={newUser.password} 
                        onChange={handleInputChange}
                        placeholder="Mật khẩu"
                        required
                        style={{ padding: '10px' }}
                    />
                    <input 
                        type="text" 
                        name="full_name"
                        value={newUser.full_name} 
                        onChange={handleInputChange}
                        placeholder="Tên đầy đủ"
                        required
                        style={{ padding: '10px' }}
                    />
                    <select 
                        name="role"
                        value={newUser.role}
                        onChange={handleInputChange}
                        required
                        style={{ padding: '10px' }}
                    >
                        <option value="staff">Staff (Nhân viên)</option>
                        <option value="manager">Manager (Quản lý)</option>
                    </select>
                    
                    <button type="submit" style={{ backgroundColor: '#007bff', padding: '10px', marginTop: '10px' }}>Tạo Tài Khoản</button>
                </form>
            </div>
            
            {/* Nếu có API GET /api/users, bạn sẽ hiển thị danh sách ở đây */}
            {/* <div>
                <h2>Danh sách Người dùng</h2>
                ... (Hiển thị users.map) ...
            </div> */}
        </div>
    );
};

export default UserManagement;