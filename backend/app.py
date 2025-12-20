import os
from datetime import datetime, timedelta, timezone
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt, verify_jwt_in_request
from functools import wraps
from sqlalchemy import func

app = Flask(__name__)

# --- 1. CẤU HÌNH HỆ THỐNG (Cloud-Ready) ---
# Tự động nhận diện Database: SQLite (Local) hoặc PostgreSQL (Cloud/Render)
db_url = os.environ.get('DATABASE_URL', 'sqlite:///cafe_manager.db')
if db_url and db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

app.config['SQLALCHEMY_DATABASE_URI'] = db_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'default_secure_key_123')
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'default_jwt_secret_456')
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=12)

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)

# CORS: Cho phép mọi nguồn (phù hợp giai đoạn dev/triển khai nhanh)
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

# --- 2. MODELS (Cấu trúc dữ liệu) ---
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    full_name = db.Column(db.String(100))
    role = db.Column(db.String(20), default='staff') 

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

    def to_dict(self, include_products=False):
        data = {'id': self.id, 'name': self.name}
        if include_products:
            data['products'] = [p.to_dict() for p in self.products if p.is_available]
        return data

class Product(db.Model):
    __tablename__ = 'products'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    price = db.Column(db.Float, nullable=False)
    image_url = db.Column(db.String(500), nullable=True)
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=False)
    is_available = db.Column(db.Boolean, default=True)

    def to_dict(self):
        return {
            'id': self.id, 'name': self.name, 'price': self.price, 
            'image_url': self.image_url, 'category_id': self.category_id, 
            'is_available': self.is_available
        }

class Order(db.Model):
    __tablename__ = 'orders'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    total_amount = db.Column(db.Float, nullable=False)
    # Trạng thái: pending (chờ), completed (hoàn thành), cancelled (hủy)
    order_status = db.Column(db.String(50), default='pending')
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    items = db.relationship('OrderItem', backref='order', lazy=True, cascade="all, delete-orphan")
    creator = db.relationship('User', backref='created_orders', lazy=True)

class OrderItem(db.Model):
    __tablename__ = 'order_items'
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Float, nullable=False)
    notes = db.Column(db.String(255), nullable=True)
    product = db.relationship('Product', backref='order_items_ref', lazy=True)

# --- 3. MIDDLEWARE (Phân quyền) ---
def manager_required():
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            if claims.get("role") != "manager":
                return jsonify(message="Yêu cầu quyền Quản lý (Manager)"), 403
            return fn(*args, **kwargs)
        return decorator
    return wrapper

# --- 4. KHỞI TẠO DB (An toàn) ---
with app.app_context():
    # QUAN TRỌNG: Đã xóa db.drop_all() để bảo vệ dữ liệu
    db.create_all() # Chỉ tạo bảng nếu chưa có
    
    # Tạo tài khoản Admin mặc định nếu chưa có
    if not User.query.filter_by(username='admin_cafe').first():
        admin = User(username='admin_cafe', full_name='Quản trị viên', role='manager')
        admin.set_password('123456')
        db.session.add(admin)
        db.session.commit()
        print(">> Đã khởi tạo tài khoản admin_cafe / 123456")

# --- 5. API ROUTES ---

@app.route('/')
def index():
    return jsonify(message="Cafe API is Online & Ready", version="2.0"), 200

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    # Kiểm tra dữ liệu đầu vào
    if not data or not data.get('username') or not data.get('password'):
        return jsonify(message="Thiếu thông tin đăng nhập"), 400
        
    user = User.query.filter_by(username=data.get('username')).first()
    if user and user.check_password(data.get('password')):
        access_token = create_access_token(identity=str(user.id), additional_claims={"role": user.role})
        return jsonify(user=user.to_dict(), access_token=access_token), 200
    return jsonify({"message": "Tài khoản hoặc mật khẩu không chính xác"}), 401

@app.route('/api/categories', methods=['GET', 'POST'])
def manage_categories():
    if request.method == 'POST':
        verify_jwt_in_request()
        data = request.get_json()
        if not data or 'name' not in data:
            return jsonify(message="Tên danh mục là bắt buộc"), 400
        
        # Kiểm tra trùng tên
        if Category.query.filter_by(name=data['name']).first():
            return jsonify(message="Danh mục này đã tồn tại"), 400

        new_cat = Category(name=data['name'])
        db.session.add(new_cat)
        db.session.commit()
        return jsonify(category=new_cat.to_dict()), 201
    
    include_products = request.args.get('include_products') == 'true'
    return jsonify([c.to_dict(include_products=include_products) for c in Category.query.all()]), 200

@app.route('/api/products', methods=['GET', 'POST'])
def manage_products():
    if request.method == 'POST':
        verify_jwt_in_request()
        data = request.get_json()
        try:
            new_prod = Product(
                name=data['name'], price=float(data['price']), 
                image_url=data.get('image_url'), category_id=int(data['category_id'])
            )
            db.session.add(new_prod)
            db.session.commit()
            return jsonify(product=new_prod.to_dict()), 201
        except Exception as e:
            return jsonify(message="Lỗi dữ liệu: " + str(e)), 400
            
    return jsonify([p.to_dict() for p in Product.query.all()]), 200

@app.route('/api/orders', methods=['GET', 'POST'])
def manage_orders():
    # TẠO ĐƠN HÀNG (POST)
    if request.method == 'POST':
        verify_jwt_in_request(optional=True) # Cho phép khách vãng lai hoặc user
        u_id = get_jwt_identity()
        data = request.get_json()
        items_data = data.get('items', [])
        
        if not items_data:
            return jsonify(message="Giỏ hàng trống"), 400
        
        try:
            total = sum(item.get('unit_price', 0) * item.get('quantity', 0) for item in items_data)
            new_order = Order(user_id=u_id, total_amount=total)
            db.session.add(new_order)
            db.session.flush() # Lấy ID của order mới tạo
            
            for i in items_data:
                db.session.add(OrderItem(
                    order_id=new_order.id, product_id=i['product_id'],
                    quantity=i['quantity'], unit_price=i['unit_price'],
                    notes=i.get('notes', '')
                ))
            db.session.commit()
            return jsonify(order={'id': new_order.id}), 201
        except Exception as e:
            db.session.rollback() # Hoàn tác nếu lỗi
            return jsonify(message="Lỗi tạo đơn hàng: " + str(e)), 400
    
    # LẤY DANH SÁCH ĐƠN HÀNG (GET)
    # Lấy 100 đơn mới nhất để tránh lag app
    orders = Order.query.order_by(Order.created_at.desc()).limit(100).all()
    result = []
    for o in orders:
        result.append({
            'id': o.id, 'total_amount': o.total_amount, 'order_status': o.order_status,
            'created_at': o.created_at.isoformat(),
            'created_by': o.creator.full_name if o.creator else "Khách vãng lai",
            'items': [{'product_name': i.product.name, 'quantity': i.quantity, 'unit_price': i.unit_price, 'notes': i.notes} for i in o.items]
        })
    return jsonify(result), 200

# [MỚI] API CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG
@app.route('/api/orders/<int:order_id>/status', methods=['PATCH'])
@jwt_required()
def update_order_status(order_id):
    data = request.get_json()
    new_status = data.get('status')
    valid_statuses = ['pending', 'completed', 'cancelled']
    
    if new_status not in valid_statuses:
        return jsonify(message="Trạng thái không hợp lệ"), 400
        
    order = Order.query.get(order_id)
    if not order:
        return jsonify(message="Không tìm thấy đơn hàng"), 404
        
    order.order_status = new_status
    db.session.commit()
    return jsonify(message=f"Đã cập nhật đơn hàng sang trạng thái {new_status}", order_id=order.id), 200

@app.route('/api/dashboard/stats', methods=['GET'])
@manager_required()
def get_dashboard_stats():
    try:
        # Doanh thu tổng (chỉ tính đơn Completed)
        total_revenue = db.session.query(func.sum(Order.total_amount)).filter(Order.order_status == 'completed').scalar() or 0
        
        # Đếm số lượng theo trạng thái
        status_stats = db.session.query(Order.order_status, func.count(Order.id)).group_by(Order.order_status).all()
        status_counts = {status: count for status, count in status_stats}
        
        # Thống kê 7 ngày gần nhất
        daily_stats = []
        now = datetime.now(timezone.utc)
        for i in range(6, -1, -1):
            target_date = (now - timedelta(days=i)).date()
            start_of_day = datetime.combine(target_date, datetime.min.time()).replace(tzinfo=timezone.utc)
            end_of_day = datetime.combine(target_date, datetime.max.time()).replace(tzinfo=timezone.utc)
            
            daily_rev = db.session.query(func.sum(Order.total_amount))\
                .filter(Order.created_at >= start_of_day)\
                .filter(Order.created_at <= end_of_day)\
                .filter(Order.order_status == 'completed').scalar() or 0
            daily_stats.append({"date": target_date.strftime("%d/%m"), "revenue": daily_rev})
            
        return jsonify({"total_revenue": total_revenue, "status_counts": status_counts, "daily_stats": daily_stats}), 200
    except Exception as e:
        return jsonify(message=f"Lỗi thống kê: {str(e)}"), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
