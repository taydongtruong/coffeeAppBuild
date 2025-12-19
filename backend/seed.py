import random
from datetime import datetime, timedelta, timezone
from app import app, db, User, Category, Product, Order, OrderItem

def seed_data():
    with app.app_context():
        print("--- Đang làm mới dữ liệu mẫu ---")

        # Link ảnh mẫu cho từng loại
        IMG_URLS = {
            "Cà Phê": "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=500&auto=format&fit=crop&q=60",
            "Trà Trái Cây": "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500&auto=format&fit=crop&q=60",
            "Bánh Ngọt": "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&auto=format&fit=crop&q=60",
            "Đồ Ăn Vặt": "https://images.unsplash.com/photo-1599490659223-930b447870ed?w=500&auto=format&fit=crop&q=60"
        }

        # 1. Tạo danh mục món
        categories = ["Cà Phê", "Trà Trái Cây", "Bánh Ngọt", "Đồ Ăn Vặt"]
        cat_objs = {}
        for cat_name in categories:
            cat = Category.query.filter_by(name=cat_name).first()
            if not cat:
                cat = Category(name=cat_name)
                db.session.add(cat)
                db.session.flush()
            cat_objs[cat_name] = cat

        # 2. Tạo/Cập nhật sản phẩm mẫu
        products = [
            ("Espresso", 35000, "Cà Phê"),
            ("Bạc Xỉu", 45000, "Cà Phê"),
            ("Cà Phê Muối", 49000, "Cà Phê"),
            ("Trà Đào Cam Sả", 55000, "Trà Trái Cây"),
            ("Trà Dâu Đông Du", 50000, "Trà Trái Cây"),
            ("Trà Vải Khiếm Khuyết", 55000, "Trà Trái Cây"),
            ("Tiramisu", 65000, "Bánh Ngọt"),
            ("Bánh Sừng Bò", 40000, "Bánh Ngọt"),
            ("Hướng Dương", 20000, "Đồ Ăn Vặt"),
            ("Khô Gà Lá Chanh", 35000, "Đồ Ăn Vặt")
        ]

        for p_name, p_price, c_name in products:
            prod = Product.query.filter_by(name=p_name).first()
            if not prod:
                # Nếu chưa có thì tạo mới
                prod = Product(
                    name=p_name, 
                    price=p_price, 
                    category_id=cat_objs[c_name].id,
                    image_url=IMG_URLS[c_name]
                )
                db.session.add(prod)
            else:
                # Nếu ĐÃ CÓ thì cập nhật lại ảnh và giá cho chuẩn
                prod.image_url = IMG_URLS[c_name]
                prod.price = p_price
        
        db.session.commit()
        print("✅ Đã cập nhật ảnh và sản phẩm thành công!")

if __name__ == "__main__":
    seed_data()