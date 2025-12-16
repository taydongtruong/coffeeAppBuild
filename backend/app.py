# app.py

import os
from datetime import datetime, timedelta, timezone
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt, unset_jwt_cookies
from functools import wraps

app = Flask(__name__)

# --- Cấu hình Ứng dụng ---
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///cafe_manager.db' 
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'a_very_long_and_secure_key_for_flask' 
app.config['JWT_SECRET_KEY'] = 'another_long_secret_key_for_jwt' 
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=12)

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)
CORS(app, resources={r"/api/*": {"origins": "*"}}) 

# --- 1. Định nghĩa Models Database ---

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    full_name = db.Column(db.String(100))
    role = db.Column(db.String(20), default='staff') 
    is_active = db.Column(db.Boolean, default=True)

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)
    def to_dict(self):
        return {'id': self.id, 'username': self.username, 'full_name': self.full_name, 'role': self.role}


class Category(db.Model):
    __tablename__ = 'categories'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    products = db.relationship('Product', backref='category', lazy=True, cascade="all, delete-orphan") 
    def to_dict(self):
        return {'id': self.id, 'name': self.name}


class Product(db.Model):
    __tablename__ = 'products'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    price = db.Column(db.Float, nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=False)
    stock_status = db.Column(db.String(50), default='in_stock')
    is_available = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))
    def to_dict(self):
        return {'id': self.id, 'name': self.name, 'price': self.price, 'category_id': self.category_id, 
                'stock_status': self.stock_status, 'is_available': self.is_available}


class Order(db.Model):
    __tablename__ = 'orders'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    total_amount = db.Column(db.Float, nullable=False)
    order_status = db.Column(db.String(50), default='pending') 
    payment_method = db.Column(db.String(50), default='cash')
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))
    items = db.relationship('OrderItem', backref='order', lazy=True, cascade="all, delete-orphan")
    user = db.relationship('User', backref='orders', lazy=True)


class OrderItem(db.Model):
    __tablename__ = 'order_items'
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Float, nullable=False)
    notes = db.Column(db.String(255))
    product = db.relationship('Product', backref='order_items', lazy=True)


# --- 2. Hàm Tiện ích (Manager Required) ---

def manager_required():
    def wrapper(fn):
        @jwt_required()
        @wraps(fn) # Quan trọng để giữ tên hàm gốc
        def decorator(*args, **kwargs):
            claims = get_jwt()
            if claims.get("role") != "manager":
                return jsonify(message="Truy cập bị từ chối: Chỉ Quản lý mới có quyền"), 403
            return fn(*args, **kwargs)
        return decorator
    return wrapper

def get_order_dict(order):
    items_data = []
    for item in order.items:
        items_data.append({
            'product_id': item.product_id, 
            'product_name': item.product.name if item.product else 'Unknown Product',
            'quantity': item.quantity, 
            'unit_price': item.unit_price, 
            'notes': item.notes
        })
        
    return {
        'id': order.id,
        'user_id': order.user_id,
        'created_by': order.user.username if order.user else 'Unknown User',
        'total_amount': order.total_amount,
        'order_status': order.order_status,
        'payment_method': order.payment_method,
        'created_at': order.created_at.isoformat(),
        'items': items_data
    }


# --- 3. Tạo Database và Bảng ---

@app.before_request
def create_tables():
    if not os.path.exists('cafe_manager.db'):
        with app.app_context():
            print("Creating database tables...")
            db.create_all()
            # Thêm User mặc định, ID=1 sẽ là admin/guest
            if not User.query.filter_by(username='admin_cafe').first():
                 admin = User(username='admin_cafe', full_name='Quản lý Admin', role='manager')
                 admin.set_password('123456')
                 db.session.add(admin)
                 db.session.commit()
                 print("Default Manager user 'admin_cafe' (pass: 123456) created.")
            # Đảm bảo admin_cafe có ID=1
            global GUEST_USER_ID
            GUEST_USER_ID = User.query.filter_by(username='admin_cafe').first().id
            print(f"GUEST/ADMIN USER ID: {GUEST_USER_ID}")
            print("Database tables created.")
            
# Định nghĩa GUEST_USER_ID sau khi app context đã chạy
GUEST_USER_ID = 1 # Giả định ID 1 là Admin, dùng để gán đơn hàng Guest


# --- 4. API Xác thực (Authentication) ---

# API Đăng ký Nhân viên
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    full_name = data.get('full_name')
    role = data.get('role', 'staff') 

    if not username or not password:
        return jsonify({"message": "Tên đăng nhập và mật khẩu là bắt buộc"}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({"message": "Tên đăng nhập đã tồn tại"}), 409

    new_user = User(username=username, full_name=full_name, role=role)
    new_user.set_password(password)

    try:
        db.session.add(new_user)
        db.session.commit()
        return jsonify({"message": "Đăng ký người dùng thành công", "user": new_user.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": "Đã xảy ra lỗi trong quá trình đăng ký"}), 500

# API Đăng nhập
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = User.query.filter_by(username=username).first()

    if user and user.check_password(password):
        access_token = create_access_token(identity=str(user.id), additional_claims={"role": user.role})
        return jsonify(
            message="Đăng nhập thành công",
            user=user.to_dict(),
            access_token=access_token
        ), 200
    else:
        return jsonify({"message": "Tên đăng nhập hoặc mật khẩu không đúng"}), 401


# --- 5. API Quản lý Menu: Categories (GET, POST, DELETE) ---

# Tạo Phân loại mới (POST) và Lấy danh sách tất cả Phân loại (GET)
@app.route('/api/categories', methods=['POST', 'GET'])
def manage_categories():
    if request.method == 'POST':
        # Yêu cầu JWT cho POST (Chỉ Manager)
        try:
            get_jwt_identity() # Kiểm tra token
            if get_jwt().get("role") != "manager":
                 return jsonify(message="Truy cập bị từ chối: Chỉ Quản lý mới có quyền tạo danh mục"), 403
        except Exception:
             return jsonify(message="Truy cập bị từ chối: Vui lòng đăng nhập bằng tài khoản Quản lý"), 401
            
        data = request.get_json()
        name = data.get('name')

        if not name:
            return jsonify({"message": "Tên phân loại là bắt buộc"}), 400

        if Category.query.filter_by(name=name).first():
            return jsonify({"message": "Tên phân loại đã tồn tại"}), 409

        new_category = Category(name=name)

        try:
            db.session.add(new_category)
            db.session.commit()
            return jsonify({"message": "Tạo phân loại thành công", "category": new_category.to_dict()}), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({"message": "Lỗi server khi tạo phân loại"}), 500

    if request.method == 'GET':
        # GET: Không cần token (Khách, Staff, Manager đều xem được)
        categories = Category.query.all()
        return jsonify([c.to_dict() for c in categories]), 200


# Xóa Phân loại theo ID (DELETE)
@app.route('/api/categories/<int:category_id>', methods=['DELETE'])
@manager_required()
def delete_category(category_id):
    category = Category.query.get(category_id)

    if not category:
        return jsonify({"message": "Không tìm thấy phân loại"}), 404

    if Product.query.filter_by(category_id=category_id).first():
        return jsonify({"message": "Không thể xóa: Vẫn còn sản phẩm thuộc phân loại này"}), 400

    try:
        db.session.delete(category)
        db.session.commit()
        return jsonify({"message": "Xóa phân loại thành công"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": "Lỗi server khi xóa phân loại"}), 500


# --- 6. API Quản lý Menu: Products (GET, POST, PUT, DELETE) ---

# Tạo Sản phẩm mới (POST) và Lấy danh sách tất cả Sản phẩm (GET)
@app.route('/api/products', methods=['POST', 'GET'])
def manage_products():
    if request.method == 'POST':
        # Yêu cầu JWT cho POST (Chỉ Manager)
        try:
            get_jwt_identity() # Kiểm tra token
            if get_jwt().get("role") != "manager":
                 return jsonify(message="Truy cập bị từ chối: Chỉ Quản lý mới có quyền tạo sản phẩm"), 403
        except Exception:
             return jsonify(message="Truy cập bị từ chối: Vui lòng đăng nhập bằng tài khoản Quản lý"), 401
            
        data = request.get_json()
        name = data.get('name')
        price = data.get('price')
        category_id = data.get('category_id')

        if not name or price is None or category_id is None:
            return jsonify({"message": "Tên, giá và ID phân loại là bắt buộc"}), 400
        
        if not Category.query.get(category_id):
            return jsonify({"message": f"Category ID {category_id} không tồn tại"}), 404

        if Product.query.filter_by(name=name).first():
            return jsonify({"message": "Tên sản phẩm đã tồn tại"}), 409

        try:
            new_product = Product(name=name, price=price, category_id=category_id)
            db.session.add(new_product)
            db.session.commit()
            return jsonify({"message": "Tạo sản phẩm thành công", "product": new_product.to_dict()}), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({"message": "Lỗi server khi tạo sản phẩm"}), 500

    if request.method == 'GET':
        # GET: Không cần token (Khách, Staff, Manager đều xem được)
        products = Product.query.all()
        return jsonify([p.to_dict() for p in products]), 200

# Cập nhật (PUT) và Xóa (DELETE) Sản phẩm theo ID
@app.route('/api/products/<int:product_id>', methods=['PUT', 'DELETE'])
@manager_required()
def update_delete_product(product_id):
    product = Product.query.get(product_id)

    if not product:
        return jsonify({"message": "Không tìm thấy sản phẩm"}), 404

    if request.method == 'PUT':
        data = request.get_json()
        
        if 'name' in data:
            product.name = data['name']
        if 'price' in data:
            product.price = data['price']
        if 'category_id' in data:
            if not Category.query.get(data['category_id']):
                return jsonify({"message": "Category ID không hợp lệ"}), 404
            product.category_id = data['category_id']
        if 'is_available' in data:
            product.is_available = data['is_available']
        
        try:
            db.session.commit()
            return jsonify({"message": "Cập nhật sản phẩm thành công", "product": product.to_dict()}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({"message": "Lỗi server khi cập nhật sản phẩm"}), 500

    if request.method == 'DELETE':
        try:
            db.session.delete(product)
            db.session.commit()
            return jsonify({"message": "Xóa sản phẩm thành công"}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({"message": "Lỗi server khi xóa sản phẩm"}), 500


# --- 7. API Quản lý Đơn hàng (Orders) ---

# Tạo Đơn hàng mới (POST) và Lấy danh sách Đơn hàng (GET)
# **ĐÃ SỬA ĐỔI PHÂN QUYỀN**
@app.route('/api/orders', methods=['POST', 'GET'])
def manage_orders():
    # 1. Xử lý phân quyền cho cả GET và POST
    auth_header = request.headers.get('Authorization')
    current_user_id = None
    user_role = None

    if auth_header and auth_header.startswith('Bearer '):
        # Nếu có token (Staff/Manager)
        try:
            from flask_jwt_extended import decode_token
            token = auth_header.split()[1]
            decoded_token = decode_token(token)
            current_user_id = decoded_token['sub']
            user_role = decoded_token['role']
            current_user_id = int(current_user_id)
        except Exception:
            # Token không hợp lệ
            if request.method == 'GET':
                 return jsonify(message="Token không hợp lệ."), 401
    
    # Nếu không có token (Guest)
    if current_user_id is None:
        # Nếu là GET, phải đăng nhập
        if request.method == 'GET':
            return jsonify(message="Truy cập bị từ chối: Vui lòng đăng nhập"), 401
        
        # Nếu là POST, cho phép Guest tạo đơn hàng, gán cho GUEST_USER_ID (ID=1)
        current_user_id = GUEST_USER_ID 
        user_role = 'guest'
        
    # Xử lý GET (Chỉ Manager mới được GET)
    if request.method == 'GET':
        if user_role != "manager":
            return jsonify(message="Truy cập bị từ chối: Chỉ Quản lý mới có quyền xem đơn hàng"), 403

        orders = Order.query.all()
        return jsonify([get_order_dict(order) for order in orders]), 200
    
    # Xử lý POST (Staff, Manager & Guest đều có thể POST)
    if request.method == 'POST':
        data = request.get_json()
        items_data = data.get('items')
        
        # Nếu là đơn hàng Guest, mặc định là thanh toán tiền mặt và trạng thái pending
        payment_method = data.get('payment_method', 'cash') 

        if not items_data or not isinstance(items_data, list):
            return jsonify({"message": "Danh sách sản phẩm (items) là bắt buộc"}), 400

        total_amount = 0
        order_items = []
        
        try:
            # 1. Tính toán tổng tiền và kiểm tra tính hợp lệ của sản phẩm
            for item in items_data:
                product_id = item.get('product_id')
                quantity = item.get('quantity')
                notes = item.get('notes', '')

                if not product_id or not quantity or quantity <= 0:
                    return jsonify({"message": "ID sản phẩm và số lượng hợp lệ là bắt buộc cho mỗi mục"}), 400

                product = Product.query.get(product_id)
                if not product or not product.is_available:
                    return jsonify({"message": f"Sản phẩm ID {product_id} không tồn tại hoặc không có sẵn"}), 404

                unit_price = product.price
                subtotal = unit_price * quantity
                total_amount += subtotal

                order_items.append(OrderItem(
                    product_id=product_id,
                    quantity=quantity,
                    unit_price=unit_price,
                    notes=notes
                ))

            # 2. Tạo Đơn hàng Chính (Order)
            new_order = Order(
                user_id=current_user_id, # ID của người tạo (Staff/Manager) hoặc GUEST_USER_ID
                total_amount=total_amount,
                order_status='pending',
                payment_method=payment_method
            )
            db.session.add(new_order)
            db.session.flush()

            # 3. Liên kết Chi tiết Đơn hàng (OrderItem) với Order
            for item in order_items:
                item.order_id = new_order.id
                db.session.add(item)
                
            db.session.commit()

            return jsonify({
                "message": "Tạo đơn hàng thành công",
                "order": get_order_dict(new_order)
            }), 201

        except Exception as e:
            db.session.rollback()
            print(f"Lỗi khi tạo đơn hàng: {e}")
            return jsonify({"message": "Lỗi server khi tạo đơn hàng"}), 500


# Cập nhật trạng thái Đơn hàng theo ID (PUT)
@app.route('/api/orders/<int:order_id>', methods=['PUT'])
@manager_required()
def update_order_status(order_id):
    order = Order.query.get(order_id)
    
    if not order:
        return jsonify({"message": "Không tìm thấy đơn hàng"}), 404

    data = request.get_json()
    new_status = data.get('order_status')
    
    VALID_STATUSES = ['pending', 'completed', 'cancelled']
    
    if not new_status or new_status not in VALID_STATUSES:
        return jsonify({"message": f"Trạng thái không hợp lệ. Phải là một trong: {', '.join(VALID_STATUSES)}"}), 400

    try:
        order.order_status = new_status
        db.session.commit()
        return jsonify({"message": f"Cập nhật trạng thái đơn hàng #{order_id} thành công", "order": get_order_dict(order)}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": "Lỗi server khi cập nhật trạng thái đơn hàng"}), 500


# --- 8. Chạy Ứng dụng ---
if __name__ == '__main__':
    app.run(debug=True)