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

# --- CẤU HÌNH HỆ THỐNG ---
db_url = os.environ.get('DATABASE_URL', 'sqlite:///cafe_manager.db')
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

app.config['SQLALCHEMY_DATABASE_URI'] = db_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'default_secure_key_123')
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'default_jwt_secret_456')
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=12)

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)

CORS(app)

# --- MODELS ---
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
    notes = db.Column(db.String(255), nullable=True) # FIXED: Added notes column
    product = db.relationship('Product', backref='order_items_ref', lazy=True)

# --- MIDDLEWARE ---
def manager_required():
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            if claims.get("role") != "manager":
                return jsonify(message="Quyền Quản lý là bắt buộc"), 403
            return fn(*args, **kwargs)
        return decorator
    return wrapper

# --- KHỞI TẠO DB ---
with app.app_context():
    db.create_all()
    if not User.query.filter_by(username='admin_cafe').first():
        admin = User(username='admin_cafe', full_name='Quản trị viên', role='manager')
        admin.set_password('123456')
        db.session.add(admin)
        db.session.commit()

# --- API ROUTES ---

@app.route('/')
def index():
    return jsonify(message="Cafe API is Online", version="1.1"), 200

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
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
        new_cat = Category(name=data['name'])
        db.session.add(new_cat)
        db.session.commit()
        return jsonify(category=new_cat.to_dict()), 201
    
    include_products = request.args.get('include_products') == 'true'
    return jsonify([c.to_dict(include_products=include_products) for c in Category.query.all()]), 200

@app.route('/api/categories/<int:id>', methods=['DELETE'])
@manager_required()
def delete_category(id):
    category = Category.query.get_or_404(id)
    db.session.delete(category)
    db.session.commit()
    return jsonify(message="Xóa danh mục thành công"), 200

@app.route('/api/products', methods=['GET', 'POST'])
def manage_products():
    if request.method == 'POST':
        verify_jwt_in_request()
        data = request.get_json()
        new_prod = Product(
            name=data['name'], price=data['price'], 
            image_url=data.get('image_url'), category_id=data['category_id']
        )
        db.session.add(new_prod)
        db.session.commit()
        return jsonify(product=new_prod.to_dict()), 201
    return jsonify([p.to_dict() for p in Product.query.all()]), 200

@app.route('/api/products/<int:id>', methods=['PUT', 'DELETE'])
@manager_required()
def update_delete_product(id):
    product = Product.query.get_or_404(id)
    if request.method == 'DELETE':
        db.session.delete(product)
        db.session.commit()
        return jsonify(message="Xóa sản phẩm thành công"), 200
    data = request.get_json()
    product.name = data.get('name', product.name)
    product.price = data.get('price', product.price)
    product.is_available = data.get('is_available', product.is_available)
    product.category_id = data.get('category_id', product.category_id)
    product.image_url = data.get('image_url', product.image_url)
    db.session.commit()
    return jsonify(product=product.to_dict()), 200

@app.route('/api/orders', methods=['GET', 'POST'])
def manage_orders():
    if request.method == 'POST':
        verify_jwt_in_request(optional=True)
        u_id = get_jwt_identity()
        data = request.get_json()
        items_data = data.get('items', [])
        if not items_data:
            return jsonify(message="Giỏ hàng trống"), 400
        total = sum(item.get('unit_price', 0) * item.get('quantity', 0) for item in items_data)
        new_order = Order(user_id=u_id, total_amount=total)
        db.session.add(new_order)
        db.session.flush()
        for i in items_data:
            db.session.add(OrderItem(
                order_id=new_order.id, product_id=i['product_id'],
                quantity=i['quantity'], unit_price=i['unit_price'],
                notes=i.get('notes') # FIXED: Save notes from Kiosk
            ))
        db.session.commit()
        return jsonify(order={'id': new_order.id}), 201
    
    orders = Order.query.order_by(Order.created_at.desc()).all()
    result = []
    for o in orders:
        result.append({
            'id': o.id, 'total_amount': o.total_amount, 'order_status': o.order_status,
            'created_at': o.created_at.isoformat(),
            'created_by': o.creator.full_name if o.creator else "Khách vãng lai",
            'items': [{'product_name': i.product.name, 'quantity': i.quantity, 'unit_price': i.unit_price, 'notes': i.notes} for i in o.items]
        })
    return jsonify(result), 200

@app.route('/api/orders/<int:id>', methods=['PUT'])
@manager_required()
def update_order_status(id):
    order = Order.query.get_or_404(id)
    data = request.get_json()
    order.order_status = data.get('order_status', order.order_status)
    db.session.commit()
    return jsonify(message="Cập nhật trạng thái đơn hàng thành công"), 200

@app.route('/api/users', methods=['GET', 'POST'])
@manager_required()
def manage_users():
    if request.method == 'POST':
        data = request.get_json()
        if User.query.filter_by(username=data.get('username')).first():
            return jsonify(message="Tên đăng nhập đã tồn tại"), 400
        new_user = User(username=data.get('username'), full_name=data.get('full_name'), role=data.get('role', 'staff'))
        new_user.set_password(data.get('password'))
        db.session.add(new_user)
        db.session.commit()
        return jsonify(user=new_user.to_dict()), 201
    users = User.query.all()
    return jsonify([u.to_dict() for u in users]), 200

@app.route('/api/users/<int:id>', methods=['DELETE'])
@manager_required()
def delete_user(id):
    user = User.query.get_or_404(id)
    if user.username == 'admin_cafe':
        return jsonify(message="Không thể xóa tài khoản quản trị hệ thống"), 403
    db.session.delete(user)
    db.session.commit()
    return jsonify(message="Xóa người dùng thành công"), 200

@app.route('/api/dashboard/stats', methods=['GET'])
@manager_required()
def get_dashboard_stats():
    try:
        total_revenue = db.session.query(func.sum(Order.total_amount)).filter(Order.order_status == 'completed').scalar() or 0
        status_stats = db.session.query(Order.order_status, func.count(Order.id)).group_by(Order.order_status).all()
        status_counts = {status: count for status, count in status_stats}
        total_orders = db.session.query(func.count(Order.id)).scalar() or 0
        daily_stats = []
        now = datetime.now(timezone.utc)
        for i in range(6, -1, -1):
            target_date = (now - timedelta(days=i)).date()
            daily_rev = db.session.query(func.sum(Order.total_amount)).filter(func.date(Order.created_at) == target_date).filter(Order.order_status == 'completed').scalar() or 0
            daily_stats.append({"date": target_date.strftime("%d/%m"), "revenue": daily_rev})
        return jsonify({"total_revenue": total_revenue, "total_orders": total_orders, "status_counts": status_counts, "daily_stats": daily_stats}), 200
    except Exception as e:
        return jsonify(message=str(e)), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)