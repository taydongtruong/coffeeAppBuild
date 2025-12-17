import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css'; // <--- Import CSS riêng tại đây

const API_LOGIN_URL = 'http://127.0.0.1:5000/api/auth/login';

const Login = () => {
  const [username, setUsername] = useState('admin_cafe');
  const [password, setPassword] = useState('secure_admin_pass');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const response = await fetch(API_LOGIN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('user_role', data.user.role);
        setMessage('Đăng nhập thành công!');
        setTimeout(() => navigate('/menu'), 1000);
      } else {
        setMessage(data.message || 'Lỗi đăng nhập.');
      }
    } catch (error) {
      setMessage('Lỗi kết nối Server.');
    }
  };

  return (
    <div className="login-wrapper"> {/* Class bao bọc toàn trang */}
      <div className="login-card"> {/* Thẻ card trắng */}
        <h2>🔑 Quản Lý Cafe</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Tên đăng nhập</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Nhập tài khoản..."
            />
          </div>
          <div className="form-group">
            <label>Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Nhập mật khẩu..."
            />
          </div>
          <button type="submit" className="login-btn">Đăng Nhập</button>
        </form>
        
        {message && (
          <p className="message" style={{ color: message.includes('thành công') ? '#2ecc71' : '#e74c3c' }}>
            {message}
          </p>
        )}
        
        <p className="hint">*Gợi ý: admin_cafe / secure_admin_pass</p>
      </div>
    </div>
  );
};

export default Login;