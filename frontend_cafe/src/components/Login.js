// src/components/Login.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_LOGIN_URL = 'http://127.0.0.1:5000/api/auth/login';

const Login = () => {
  // useState Hooks để quản lý trạng thái form
  const [username, setUsername] = useState('admin_cafe');
  const [password, setPassword] = useState('secure_admin_pass');
  const [message, setMessage] = useState('');
  
  const navigate = useNavigate(); // Hook để chuyển hướng trang

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const response = await fetch(API_LOGIN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Thành công: Lưu token và vai trò vào Local Storage
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('user_role', data.user.role);
        
        setMessage(`Đăng nhập thành công! Vai trò: ${data.user.role}`);
        
        // Chuyển hướng đến trang Menu
        setTimeout(() => navigate('/menu'), 1000);
      } else {
        // Thất bại
        setMessage(data.message || 'Lỗi đăng nhập. Vui lòng thử lại.');
      }
    } catch (error) {
      // Lỗi kết nối
      setMessage('Lỗi kết nối Server Flask (cổng 5000).');
      console.error('Lỗi kết nối:', error);
    }
  };

  return (
    <div className="container login-form">
      <h2>🔑 Đăng Nhập Quản Lý Cafe</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Tên đăng nhập:</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Mật khẩu:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Đăng Nhập</button>
      </form>
      {message && <p style={{ color: message.includes('thành công') ? 'green' : 'red' }}>{message}</p>}
      <p style={{ marginTop: '20px', fontSize: '0.9em' }}>*Sử dụng: admin_cafe / secure_admin_pass</p>
    </div>
  );
};

export default Login;