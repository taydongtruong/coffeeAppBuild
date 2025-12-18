import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Menu from './components/Menu';  
import OrderCreation from './components/OrderCreation'; 
import OrderList from './components/OrderList';
import MenuManagement from './components/MenuManagement'; 
import UserManagement from './components/UserManagement'; 
import Dashboard from './components/Dashboard'; 
import GuestOrderKiosk from './components/GuestOrderKiosk';
import './index.css'; 

// --- HELPER FUNCTIONS ---

// Kiểm tra xem đã đăng nhập chưa
const isAuthenticated = () => {
  return !!localStorage.getItem('access_token');
};

// Kiểm tra xem có phải quản lý không
const isManager = () => {
  const token = localStorage.getItem('access_token');
  const role = localStorage.getItem('user_role');
  return token && role === 'manager';
};

// --- PROTECTED ROUTE COMPONENTS ---
// Bảo vệ các trang chỉ dành cho nhân viên/quản lý đã đăng nhập
const ProtectedRoute = ({ children }) => {
  return isAuthenticated() ? children : <Navigate to="/" />;
};

// Bảo vệ các trang CHỈ dành cho quản lý
const ManagerRoute = ({ children }) => {
  return isManager() ? children : <Navigate to="/menu" />;
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
          element={<ProtectedRoute><Menu /></ProtectedRoute>} 
        />
        <Route 
          path="/order" 
          element={<ProtectedRoute><OrderCreation /></ProtectedRoute>} 
        /> 
        <Route 
          path="/orders" 
          element={<ProtectedRoute><OrderList /></ProtectedRoute>} 
        />

        {/* ================= CHỈ DÀNH CHO QUẢN LÝ (MANAGER ONLY) ================= */}
        <Route 
          path="/manage" 
          element={<ManagerRoute><MenuManagement /></ManagerRoute>} 
        /> 
        <Route 
          path="/users" 
          element={<ManagerRoute><UserManagement /></ManagerRoute>} 
        /> 
        <Route 
          path="/dashboard" 
          element={<ManagerRoute><Dashboard /></ManagerRoute>} 
        />

        {/* ================= XỬ LÝ ĐƯỜNG DẪN SAI ================= */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);