// src/components/OrderForm.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://127.0.0.1:5000/api';

const OrderForm = () => {
  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([]); // [{ product_id: 1, quantity: 1, notes: '' }]
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem('access_token');
  
  // Tổng tiền tạm tính
  const totalAmount = items.reduce((sum, item) => {
    const product = products.find(p => p.id === item.product_id);
    return sum + (product ? product.price * item.quantity : 0);
  }, 0);

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }
    
    // Tải danh sách sản phẩm (dùng quyền Manager)
    const fetchProducts = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/products`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
            if (response.status === 403) throw new Error('Không có quyền Quản lý để xem Menu.');
            throw new Error('Lỗi tải sản phẩm.');
        }

        const data = await response.json();
        setProducts(data);
        setLoading(false);
      } catch (err) {
        setMessage(`Lỗi: ${err.message}`);
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, [token, navigate]);

  // Thêm một sản phẩm vào danh sách đơn hàng
  const addItem = (product_id) => {
    if (!items.find(item => item.product_id === product_id)) {
      setItems([...items, { product_id: product_id, quantity: 1, notes: '' }]);
    }
  };

  // Cập nhật số lượng hoặc ghi chú của một sản phẩm
  const updateItem = (product_id, field, value) => {
    setItems(items.map(item => 
      item.product_id === product_id ? { ...item, [field]: value } : item
    ));
  };
  
  // Xóa một sản phẩm khỏi danh sách đơn hàng
  const removeItem = (product_id) => {
    setItems(items.filter(item => item.product_id !== product_id));
  };

  // Xử lý việc Tạo Đơn hàng
  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    setMessage('');

    if (items.length === 0) {
      setMessage('Vui lòng thêm ít nhất một sản phẩm vào đơn hàng.');
      return;
    }
    
    const orderPayload = {
      items: items.map(item => ({
        product_id: item.product_id,
        quantity: parseInt(item.quantity),
        notes: item.notes
      })),
      payment_method: paymentMethod
    };

    try {
      const response = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderPayload),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`Tạo đơn hàng #${data.order.id} thành công! Tổng tiền: ${data.order.total_amount.toLocaleString('vi-VN')} VND`);
        setItems([]); // Xóa giỏ hàng
        setPaymentMethod('cash');
        // Tự động chuyển về trang Menu sau 3 giây
        setTimeout(() => navigate('/menu'), 3000); 
      } else {
        setMessage(`Lỗi tạo đơn hàng: ${data.message || 'Lỗi server.'}`);
      }
    } catch (error) {
      setMessage('Lỗi kết nối Server Flask (cổng 5000).');
      console.error('Lỗi kết nối:', error);
    }
  };

  if (loading) return <div className="container">Đang tải danh sách sản phẩm...</div>;
  if (message && message.includes('Lỗi:')) return <div className="container" style={{ color: 'red' }}>{message}</div>;

  return (
    <div className="container menu-page">
        <h2>🧾 Tạo Đơn Hàng Mới</h2>
        <button onClick={() => navigate('/menu')}>← Quay lại Menu</button>
        <hr style={{margin: '20px 0'}} />

        {message && <p style={{ color: message.includes('thành công') ? 'green' : 'red' }}>{message}</p>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
            
            {/* Cột 1: Danh sách Sản phẩm (Menu) */}
            <div>
                <h3>Danh Sách Sản Phẩm</h3>
                <ul style={{ listStyleType: 'none', padding: 0 }}>
                    {products.map(product => (
                        <li key={product.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #eee' }}>
                            <span>{product.name} - {product.price.toLocaleString('vi-VN')} VND</span>
                            <button 
                                onClick={() => addItem(product.id)}
                                disabled={items.some(item => item.product_id === product.id)}
                                style={{ backgroundColor: items.some(item => item.product_id === product.id) ? '#ccc' : '#28a745', width: '80px', padding: '5px' }}
                            >
                                {items.some(item => item.product_id === product.id) ? 'Đã thêm' : 'Thêm'}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Cột 2: Giỏ hàng và Thanh toán */}
            <form onSubmit={handleSubmitOrder}>
                <h3>Giỏ Hàng (Tổng: {totalAmount.toLocaleString('vi-VN')} VND)</h3>
                
                {items.length === 0 ? (
                    <p style={{ fontStyle: 'italic', color: '#888' }}>Giỏ hàng trống.</p>
                ) : (
                    items.map(item => {
                        const product = products.find(p => p.id === item.product_id);
                        if (!product) return null;
                        
                        return (
                            <div key={item.product_id} style={{ border: '1px solid #ddd', padding: '10px', marginBottom: '10px', borderRadius: '5px' }}>
                                <h4>{product.name}</h4>
                                <p>Giá: {product.price.toLocaleString('vi-VN')} VND</p>
                                
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <label>Số lượng:</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={item.quantity}
                                        onChange={(e) => updateItem(product.id, 'quantity', e.target.value)}
                                        style={{ width: '60px', marginBottom: '5px' }}
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => removeItem(product.id)}
                                        style={{ backgroundColor: '#dc3545', width: '80px', padding: '5px' }}
                                    >
                                        Xóa
                                    </button>
                                </div>
                                <label>Ghi chú:</label>
                                <input
                                    type="text"
                                    value={item.notes}
                                    onChange={(e) => updateItem(product.id, 'notes', e.target.value)}
                                    placeholder="Ít đường, nhiều đá..."
                                />
                                
                                <p style={{ fontWeight: 'bold' }}>Thành tiền: {(product.price * item.quantity).toLocaleString('vi-VN')} VND</p>
                            </div>
                        );
                    })
                )}
                
                {items.length > 0 && (
                    <div style={{ marginTop: '20px' }}>
                        <label>Phương thức thanh toán:</label>
                        <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            style={{ padding: '8px', width: '100%', marginBottom: '20px' }}
                        >
                            <option value="cash">Tiền mặt</option>
                            <option value="card">Thẻ/QR Code</option>
                        </select>

                        <button type="submit" style={{ width: '100%', padding: '15px', fontSize: '1.1em', backgroundColor: '#007bff' }}>
                            Tạo Đơn Hàng ({totalAmount.toLocaleString('vi-VN')} VND)
                        </button>
                    </div>
                )}
            </form>
        </div>
    </div>
  );
};

export default OrderForm;