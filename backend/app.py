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
        return jsonify(message="Đăng nhập thành công",user=user.to_dict(), access_token=access_token), 200
    return jsonify({"message": "Tài khoản hoặc mật khẩu không chính xác"}), 401

# === USER MANAGEMENT (Đã bổ sung cho UserManagement.js) ===
@app.route('/api/users', methods=['GET', 'POST'])
@manager_required()
def manage_users():
    if request.method == 'GET':
        users = User.query.all()
        return jsonify([u.to_dict() for u in users]), 200
    
    if request.method == 'POST':
        data = request.get_json()
        if User.query.filter_by(username=data['username']).first():
            return jsonify(message="Tên đăng nhập đã tồn tại"), 400
        
        new_user = User(
            username=data['username'],
            full_name=data['full_name'],
            role=data.get('role', 'staff')
        )
        new_user.set_password(data['password'])
        db.session.add(new_user)
        db.session.commit()
        return jsonify(message="Tạo nhân viên thành công", user=new_user.to_dict()), 201

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
@manager_required()
def delete_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify(message="Không tìm thấy nhân viên"), 404
    if user.username == 'admin_cafe':
        return jsonify(message="Không thể xóa Admin hệ thống"), 400
    
    db.session.delete(user)
    db.session.commit()
    return jsonify(message="Đã xóa nhân viên"), 200


# === MENU & PRODUCTS ===
@app.route('/api/categories', methods=['GET', 'POST'])
def manage_categories():
    # GET: Ai cũng xem được (kể cả khách vãng lai Kiosk)
    if request.method == 'GET':
        include_products = request.args.get('include_products') == 'true'
        cats = Category.query.all()
        return jsonify([c.to_dict(include_products) for c in cats]), 200

    # POST: Chỉ Manager
    verify_jwt_in_request()
    claims = get_jwt()
    if claims.get("role") != "manager":
        return jsonify(message="Cần quyền quản lý"), 403

    data = request.get_json()
    if Category.query.filter_by(name=data['name']).first():
        return jsonify(message="Danh mục đã tồn tại"), 400
    new_cat = Category(name=data['name'])
    db.session.add(new_cat)
    db.session.commit()
    return jsonify(category=new_cat.to_dict()), 201

@app.route('/api/categories/<int:id>', methods=['DELETE'])
@manager_required()
def delete_category(id):
    cat = Category.query.get(id)
    if cat:
        db.session.delete(cat)
        db.session.commit()
        return jsonify(message="Đã xóa danh mục"), 200
    return jsonify(message="Không tìm thấy"), 404

@app.route('/api/products', methods=['GET', 'POST'])
def manage_products():
    if request.method == 'GET':
        return jsonify([p.to_dict() for p in Product.query.all()]), 200

    # POST (Thêm món): Chỉ Manager
    verify_jwt_in_request()
    claims = get_jwt()
    if claims.get("role") != "manager":
        return jsonify(message="Cần quyền quản lý"), 403

    data = request.get_json()
    try:
        new_prod = Product(
            name=data['name'], 
            price=float(data['price']), 
            image_url=data.get('image_url'), 
            category_id=int(data['category_id'])
        )
        db.session.add(new_prod)
        db.session.commit()
        return jsonify(product=new_prod.to_dict()), 201
    except Exception as e:
        return jsonify(message=str(e)), 400

@app.route('/api/products/<int:id>', methods=['PUT', 'DELETE'])
@manager_required()
def update_product(id):
    product = Product.query.get(id)
    if not product:
        return jsonify(message="Không tìm thấy món"), 404

    if request.method == 'DELETE':
        db.session.delete(product)
        db.session.commit()
        return jsonify(message="Đã xóa món"), 200

    # PUT: Cập nhật món
    data = request.get_json()
    if 'name' in data: product.name = data['name']
    if 'price' in data: product.price = float(data['price'])
    if 'image_url' in data: product.image_url = data['image_url']
    
    db.session.commit()
    return jsonify(message="Cập nhật thành công", product=product.to_dict()), 200

# === ORDERS ===
@app.route('/api/orders', methods=['GET', 'POST'])
def handle_orders():
    # POST: Tạo đơn (Khách hoặc Nhân viên)
    if request.method == 'POST':
        # Check token nếu có, nhưng không bắt buộc (cho chế độ Kiosk khách vãng lai)
        try:
            verify_jwt_in_request(optional=True)
            user_id = get_jwt_identity()
        except:
            user_id = None

        data = request.get_json()
        items = data.get('items', [])
        if not items:
            return jsonify(message="Giỏ hàng trống"), 400

        total = sum(i.get('unit_price', 0) * i.get('quantity', 0) for i in items)
        new_order = Order(user_id=user_id, total_amount=total)
        db.session.add(new_order)
        db.session.flush()

        for i in items:
            db.session.add(OrderItem(
                order_id=new_order.id,
                product_id=i['product_id'],
                quantity=i['quantity'],
                unit_price=i['unit_price'],
                notes=i.get('notes', '')
            ))
        
        db.session.commit()
        return jsonify(message="Tạo đơn thành công", order={'id': new_order.id}), 201

    # GET: Lấy danh sách đơn (Chỉ nhân viên/quản lý)
    verify_jwt_in_request()
    orders = Order.query.order_by(Order.created_at.desc()).limit(50).all()
    result = []
    for o in orders:
        result.append({
            'id': o.id,
            'total_amount': o.total_amount,
            'order_status': o.order_status,
            'created_at': o.created_at.isoformat(),
            'created_by': o.creator.full_name if o.creator else "Khách vãng lai",
            'items': [{
                'product_name': i.product.name,
                'quantity': i.quantity,
                'unit_price': i.unit_price,
                'image_url': i.product.image_url # Thêm cái này để OrderList hiện ảnh
            } for i in o.items]
        })
    return jsonify(result), 200

@app.route('/api/orders/<int:order_id>', methods=['PUT'])
@jwt_required()
def update_order_status(order_id):
    order = Order.query.get(order_id)
    if not order:
        return jsonify(message="Không tìm thấy đơn"), 404
    
    data = request.get_json()
    new_status = data.get('order_status')
    if new_status in ['pending', 'completed', 'cancelled']:
        order.order_status = new_status
        db.session.commit()
        return jsonify(message="Đã cập nhật trạng thái"), 200
    return jsonify(message="Trạng thái không hợp lệ"), 400

# === DASHBOARD ===
@app.route('/api/dashboard/stats', methods=['GET'])
@manager_required()
def dashboard_stats():
    # 1. Tổng doanh thu (chỉ tính đơn Completed)
    total_rev = db.session.query(func.sum(Order.total_amount)).filter(Order.order_status == 'completed').scalar() or 0
    
    # 2. Tổng số đơn
    total_orders = db.session.query(func.count(Order.id)).scalar() or 0
    
    # 3. Đếm theo trạng thái
    status_stats = db.session.query(Order.order_status, func.count(Order.id)).group_by(Order.order_status).all()
    status_counts = {s: c for s, c in status_stats}

    # 4. Doanh thu 7 ngày qua
    daily_stats = []
    now = datetime.now(timezone.utc)
    for i in range(6, -1, -1):
        d = (now - timedelta(days=i)).date()
        start = datetime.combine(d, datetime.min.time())
        end = datetime.combine(d, datetime.max.time())
        
        rev = db.session.query(func.sum(Order.total_amount))\
            .filter(Order.created_at >= start, Order.created_at <= end, Order.order_status == 'completed')\
            .scalar() or 0
        daily_stats.append({"date": d.strftime("%d/%m"), "revenue": rev})

    return jsonify({
        "total_revenue": total_rev,
        "total_orders": total_orders,
        "status_counts": status_counts,
        "daily_stats": daily_stats
    }), 200

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
