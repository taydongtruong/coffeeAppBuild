import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Menu from './components/Menu';  
import OrderCreation from './components/OrderCreation'; 
import OrderList from './components/OrderList';
import MenuManagement from './components/MenuManagement'; 
import UserManagement from './components/UserManagement'; 
import Dashboard from './components/Dashboard'; // Trang báo cáo doanh thu mới
import GuestOrderKiosk from './components/GuestOrderKiosk';
import './index.css'; 

// 1. Kiểm tra đăng nhập cơ bản (dành cho Staff)
const isAuthenticated = () => !!localStorage.getItem('access_token');

// 2. Kiểm tra quyền Quản lý (dành cho Manager)
const isManager = () => {
  const token = localStorage.getItem('access_token');
  const role = localStorage.getItem('user_role');
  return token && role === 'manager';
};

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* ================= CÔNG KHAI ================= */}
        <Route path="/" element={<Login />} />
        <Route path="/kiosk" element={<GuestOrderKiosk />} />

        {/* ================= DÀNH CHO NHÂN VIÊN (STAFF & MANAGER) ================= */}
        <Route 
          path="/menu" 
          element={isAuthenticated() ? <Menu /> : <Navigate to="/" />} 
        />
        <Route 
          path="/order" 
          element={isAuthenticated() ? <OrderCreation /> : <Navigate to="/" />} 
        /> 
        <Route 
          path="/orders" 
          element={isAuthenticated() ? <OrderList /> : <Navigate to="/" />} 
        />

        {/* ================= CHỈ DÀNH CHO QUẢN LÝ (MANAGER ONLY) ================= */}
        <Route 
          path="/manage" 
          element={isManager() ? <MenuManagement /> : <Navigate to="/menu" />} 
        /> 
        <Route 
          path="/users" 
          element={isManager() ? <UserManagement /> : <Navigate to="/menu" />} 
        /> 
        <Route 
          path="/dashboard" 
          element={isManager() ? <Dashboard /> : <Navigate to="/menu" />} 
        />

        {/* ================= XỬ LÝ ĐƯỜNG DẪN SAI ================= */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);