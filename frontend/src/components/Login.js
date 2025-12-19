import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

// --- CẤU HÌNH URL API ---
// Nếu có biến môi trường REACT_APP_API_URL thì dùng, không thì mặc định localhost để test máy nhà
const BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';
const API_LOGIN_URL = `${BASE_URL}/api/auth/login`;

const Login = () => {
  // Để trống mặc định để người dùng tự nhập, hoặc giữ admin_cafe để test nhanh
  const [username, setUsername] = useState('admin_cafe');
  const [password, setPassword] = useState('123456'); // Cập nhật mật khẩu mặc định admin của bạn là 123456
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('Đang kết nối...');
    
    try {
      const response = await fetch(API_LOGIN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Lưu thông tin vào localStorage để các trang sau sử dụng
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('user_role', data.user.role);
        localStorage.setItem('full_name', data.user.full_name);
        
        setMessage('Bẻ khoá nhà Thành công');
        // Chuyển hướng sau 1 giây
        setTimeout(() => navigate('/menu'), 1000);
      } else {
        setMessage(data.message || 'Sai mật khẩu và tài khoản rồi bạn ơi!');
      }
    } catch (error) {
      console.error("Login Error:", error);
      setMessage('Lỗi kết nối Server. Vui lòng kiểm tra lại Backend.');
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <h2>🔑 Chào mừng bạn đến với cà phê Reak Smaay </h2>
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
        
        <p className="hint">*Tài khoản mặc định: admin_cafe / 123456</p>
      </div>
    </div>
  );
};

export default Login;