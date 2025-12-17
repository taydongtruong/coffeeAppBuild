// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Menu from './components/Menu';  
import OrderCreation from './components/OrderCreation'; // Đổi từ OrderForm cho đồng bộ
import OrderList from './components/OrderList';
import MenuManagement from './components/MenuManagement'; 
import UserManagement from './components/UserManagement'; 
import GuestOrderKiosk from './components/GuestOrderKiosk';
import './index.css'; 

// Hàm kiểm tra đăng nhập nhanh
const isAuthenticated = () => !!localStorage.getItem('access_token');

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Công khai */}
        <Route path="/" element={<Login />} />
        <Route path="/kiosk" element={<GuestOrderKiosk />} />

        {/* Cần đăng nhập mới vào được (Protected Routes) */}
        <Route path="/menu" element={isAuthenticated() ? <Menu /> : <Navigate to="/" />} />
        <Route path="/order" element={isAuthenticated() ? <OrderCreation /> : <Navigate to="/" />} /> 
        <Route path="/orders" element={isAuthenticated() ? <OrderList /> : <Navigate to="/" />} />
        <Route path="/manage" element={isAuthenticated() ? <MenuManagement /> : <Navigate to="/" />} /> 
        <Route path="/users" element={isAuthenticated() ? <UserManagement /> : <Navigate to="/" />} /> 

        {/* Nếu gõ sai đường dẫn, quay về Login */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);