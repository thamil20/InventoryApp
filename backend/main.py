from flask import request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from config import app, db
from models import Current_Inventory, Sold_Items, User
from datetime import datetime
from sqlalchemy import func

# JWT error handlers
@app.errorhandler(422)
def handle_unprocessable_entity(e):
    print(f"422 Error: {str(e)}")
    return jsonify({"error": "Unprocessable Entity", "details": str(e)}), 422

@app.errorhandler(401)
def handle_unauthorized(e):
    print(f"401 Error: {str(e)}")
    return jsonify({"error": "Unauthorized", "details": str(e)}), 401

@app.route('/')
def home():
    return (
            jsonify({"message":"Inventory Management System API is running."}), 
            200,
        )

# Authentication routes
@app.route('/auth/register', methods=['POST'])
def register():
    username = request.json.get('username')
    password = request.json.get('password')
    email = request.json.get('email')
    phone = request.json.get('phone')

    if not username or not password or not email:
        return (
            jsonify({"error": "Missing required fields (username, password, email)"}), 
            400,
        )
    
    # Check if user already exists
    if User.query.filter_by(username=username).first():
        return (
            jsonify({"error": "Username already exists"}), 
            400,
        )
    
    if User.query.filter_by(email=email).first():
        return (
            jsonify({"error": "Email already exists"}), 
            400,
        )
    
    new_user = User(
        username=username,
        email=email,
        phone=phone,
    )
    new_user.set_password(password)

    try:
        db.session.add(new_user)
        db.session.commit()
    except Exception as e:
        return (
            jsonify({"error": "Failed to create user", "details": str(e)}), 
            500,
        )
    
    # Create access token for the new user
    access_token = create_access_token(identity=str(new_user.id))
    
    return (
        jsonify({
            "message": "User registered successfully", 
            "user": new_user.to_json(),
            "access_token": access_token
        }), 
        201,
    )

@app.route('/auth/login', methods=['POST'])
def login():
    username = request.json.get('username')
    password = request.json.get('password')

    if not username or not password:
        return (
            jsonify({"error": "Missing username or password"}), 
            400,
        )
    
    user = User.query.filter_by(username=username).first()
    
    if not user or not user.check_password(password):
        return (
            jsonify({"error": "Invalid username or password"}), 
            401,
        )
    
    # Create access token
    access_token = create_access_token(identity=str(user.id))
    
    return (
        jsonify({
            "message": "Login successful",
            "user": user.to_json(),
            "access_token": access_token
        }),
        200,
    )

@app.route('/auth/logout', methods=['POST'])
@jwt_required()
def logout():
    # With JWT, logout is handled on the client side by removing the token
    # This endpoint is optional but can be used for logging or token blacklisting in the future
    return (
        jsonify({"message": "Logout successful"}),
        200,
    )

@app.route('/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if not user:
        return (
            jsonify({"error": "User not found"}),
            404,
        )
    
    return (
        jsonify({"user": user.to_json()}),
        200,
    )


@app.route('/inventory/current', methods=['GET'])
@jwt_required()
def get_current_inventory():
    try:
        user_id = int(get_jwt_identity())
        print(f"Get inventory - User ID from JWT: {user_id}")  # Debug log
        current_inventory = Current_Inventory.query.filter_by(user_id=user_id).all()
        print(f"Found {len(current_inventory)} items for user {user_id}")  # Debug log
        json_inventory = list(map(lambda item: item.to_json(), current_inventory))
        return (
                jsonify({"current_inventory":json_inventory}), 
                200,
            )
    except Exception as e:
        print(f"Error getting inventory: {str(e)}")  # Debug log
        return (
            jsonify({"error": "Failed to get inventory", "details": str(e)}), 
            500,
        )

@app.route('/inventory/sold', methods=['GET'])
@jwt_required()
def get_sold_items():
    user_id = int(get_jwt_identity())
    sold_items = Sold_Items.query.filter_by(user_id=user_id).all()
    json_sold_items = list(map(lambda item: item.to_json(), sold_items))
    return (
            jsonify({"sold_items":json_sold_items}), 
            200,
        )

@app.route('/inventory/create_item', methods=['POST'])
@jwt_required()
def create_item():
    user_id = int(get_jwt_identity())
    print(f"User ID from JWT: {user_id}")  # Debug log
    print(f"Request data: {request.json}")  # Debug log
    
    name = request.json.get('name')
    quantity = request.json.get('quantity')
    price = request.json.get('price')
    description = request.json.get('description')
    category = request.json.get('category')

    if not name or quantity is None or price is None:
        return (
            jsonify({"error": "Missing required fields"}), 
            400,
        )
    
    # Verify user exists
    user = User.query.get(user_id)
    if not user:
        print(f"User with ID {user_id} not found in database")
        return (
            jsonify({"error": "User not found"}), 
            404,
        )
    next_item_id = (
        db.session.query(func.max(Current_Inventory.item_id))
        .filter(Current_Inventory.user_id == user_id)
        .scalar()
    )
    next_item_id = (next_item_id or 0) + 1
    
    new_item = Current_Inventory(
        user_id=user_id,
        item_id=next_item_id,
        name=name,
        quantity=quantity,
        price=price,
        description=description,
        category=category,
        added_date=datetime.now(),
    )

    try:
        db.session.add(new_item)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Error creating item: {str(e)}")  # Log to console
        return (
            jsonify({"error": "Failed to create item", "details": str(e)}), 
            422,
        )
    
    return (
            jsonify({"message": "Item created successfully", "item": new_item.to_json()}), 
            201,
        )

@app.route('/inventory/sell_item/<int:item_id>', methods=['POST'])
@jwt_required()
def sell_item(item_id):
    user_id = int(get_jwt_identity())
    item = Current_Inventory.query.filter_by(item_id=item_id, user_id=user_id).first()
    if not item:
        return (
            jsonify({"error": "Item not found"}), 
            404,
        )
    
    quantity_sold = request.json.get('quantity_sold')
    sale_price = request.json.get('sale_price')
    sale_date = request.json.get('sale_date')

    if not quantity_sold or not sale_price or not sale_date:
        return (
            jsonify({"error": "Missing required fields"}), 
            400,
        )
    
    if quantity_sold > item.quantity:
        return (
            jsonify({"error": "Insufficient quantity in inventory"}), 
            400,
        )
    
    sold_item = Sold_Items(
        user_id=user_id,
        original_item_id=item.item_id,
        name=item.name,
        quantity=item.quantity,
        price=item.price,
        description=item.description,
        category=item.category,
        added_date=item.added_date,
        quantity_sold=quantity_sold,
        sale_price=sale_price,
        sale_date=datetime.fromisoformat(sale_date),
    )

    try:
        item.quantity -= quantity_sold
        db.session.add(sold_item)
        db.session.commit()
    except Exception as e:
        return (
            jsonify({"error": "Failed to sell item", "details": str(e)}), 
            500,
        )
    
    return (
            jsonify({"message": "Item sold successfully", "sold_item": sold_item.to_json()}), 
            201,
        )

@app.route("/inventory/update_item/<int:item_id>", methods=["PATCH"])
@jwt_required()
def update_item(item_id):
    user_id = int(get_jwt_identity())
    item = Current_Inventory.query.filter_by(item_id=item_id, user_id=user_id).first()
    if not item:
        return (
            jsonify({"error": "Item not found"}), 
            404,
        )
    
    data = request.json
    item.name = data.get("name", item.name)
    item.quantity = data.get("quantity", item.quantity)
    item.price = data.get("price", item.price)
    item.description = data.get("description", item.description)
    item.category = data.get("category", item.category)

    try:
        db.session.commit()
    except Exception as e:
        return (
            jsonify({"error": "Failed to update item", "details": str(e)}), 
            500,
        )
    
    return (
            jsonify({"message": "Item updated successfully", "item": item.to_json()}), 
            200,
        )

@app.route("/inventory/delete_item/<int:item_id>", methods=["DELETE"])
@jwt_required()
def delete_item(item_id):
    user_id = int(get_jwt_identity())
    item = Current_Inventory.query.filter_by(item_id=item_id, user_id=user_id).first()
    if not item:
        return (
            jsonify({"error": "Item not found"}), 
            404,
        )
    
    try:
        db.session.delete(item)
        db.session.commit()
    except Exception as e:
        return (
            jsonify({"error": "Failed to delete item", "details": str(e)}), 
            500,
        )
    
    return (
            jsonify({"message": "Item deleted successfully"}), 
            200,
        )

@app.route("/inventory/renumber", methods=["POST"])
@jwt_required()
def renumber_items():
    user_id = int(get_jwt_identity())
    try:
        items = Current_Inventory.query.filter_by(user_id=user_id).order_by(Current_Inventory.item_id).all()
        for index, item in enumerate(items, 1):
            item.item_id = index
        db.session.commit()
        return jsonify({"message": "Items renumbered successfully"}), 200
    except Exception as e:
        return jsonify({"error": "Failed to renumber items", "details": str(e)}), 500

if __name__ == "__main__":
    with app.app_context():
        db.create_all()

    app.run(debug=True, port=5000)
