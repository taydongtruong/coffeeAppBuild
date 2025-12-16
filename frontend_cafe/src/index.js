// src/index.js (CẬP NHẬT)
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Menu from './components/Menu';  
import OrderForm from './components/OrderForm';
import OrderList from './components/OrderList';
import MenuManagement from './components/MenuManagement'; 
import UserManagement from './components/UserManagement'; 
import GuestOrderKiosk from './components/GuestOrderKiosk'; // IMPORT MỚI
import './index.css'; 

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/order" element={<OrderForm />} /> 
        <Route path="/orders" element={<OrderList />} />
        <Route path="/manage" element={<MenuManagement />} /> 
        <Route path="/users" element={<UserManagement />} /> 
        <Route path="/kiosk" element={<GuestOrderKiosk />} /> {/* ROUTE MỚI */}
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);