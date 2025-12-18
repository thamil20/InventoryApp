# Endpoint for manager to list their invitations
@app.route('/api/manager/invitations', methods=['GET'])
@jwt_required()
def list_invitations():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or user.role != 'manager':
        return jsonify({'error': 'Unauthorized'}), 403
    invitations = ManagerInvitation.query.filter_by(manager_id=user.id).all()
    return jsonify({'invitations': [
        {
            'id': inv.id,
            'email': inv.email,
            'accepted': inv.accepted
        } for inv in invitations
    ]})
# ...existing imports...
from flask import url_for
import uuid
from flask import request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from config import app, db, limiter
from models import Current_Inventory, Sold_Items, User, EmployeePermission
from models import db
from flask_migrate import Migrate

migrate = Migrate(app, db)


from schemas import (
    validate_request, UserRegistrationSchema, UserLoginSchema,
    InventoryItemSchema, ItemUpdateSchema, SoldItemSchema,
    ExpensesUpdateSchema, ForgotPasswordSchema
)
from datetime import datetime
from sqlalchemy import func
import os

# JWT error handlers
@app.errorhandler(422)
def handle_unprocessable_entity(e):
    app.logger.error(f"422 Error: {str(e)}")
    return jsonify({"error": "Unprocessable Entity", "details": str(e)}), 422

@app.errorhandler(401)
def handle_unauthorized(e):
    app.logger.warning(f"401 Error: {str(e)}")
    return jsonify({"error": "Unauthorized", "details": str(e)}), 401

@app.route('/')
def home():
    return (
            jsonify({"message":"Inventory Management System API is running."}), 
            200,
        )

# Authentication routes
@app.route('/auth/register', methods=['POST'])
@limiter.limit("3 per hour")
@validate_request(UserRegistrationSchema)
def register():
    data = request.validated_data
    app.logger.debug(f"Registration data validated: {data}")
    username = data['username']
    password = data['password']
    email = data['email']
    phone = data.get('phone')
    
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
@limiter.limit("5 per minute")
@validate_request(UserLoginSchema)
def login():
    data = request.validated_data
    username = data['username']
    password = data['password']
    
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


# --- Password reset with email support ---
import secrets
import smtplib
from email.mime.text import MIMEText
from datetime import timedelta

from sqlalchemy import and_

class PasswordResetToken(db.Model):
    __tablename__ = "password_reset_token"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    token = db.Column(db.String(128), unique=True, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False, nullable=False)

def send_email(to_email, subject, body):
    # Use environment variables for config
    import os
    SMTP_HOST = os.environ.get('SMTP_HOST')
    SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
    SMTP_USER = os.environ.get('SMTP_USER')
    SMTP_PASS = os.environ.get('SMTP_PASS')
    FROM_EMAIL = os.environ.get('FROM_EMAIL', SMTP_USER)
    if not (SMTP_HOST and SMTP_USER and SMTP_PASS):
        app.logger.error('SMTP config missing')
        return False
    msg = MIMEText(body)
    msg['Subject'] = subject
    msg['From'] = FROM_EMAIL
    msg['To'] = to_email
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(FROM_EMAIL, [to_email], msg.as_string())
        return True
    except Exception as e:
        app.logger.error(f"Failed to send email: {e}")
        return False

@app.route('/auth/forgot-password', methods=['POST'])
@limiter.limit("3 per hour")
@validate_request(ForgotPasswordSchema)
def forgot_password():
    data = request.validated_data
    email = data['email']
    user = User.query.filter_by(email=email).first()
    # Always return success to prevent email enumeration
    if user:
        # Generate token
        token = secrets.token_urlsafe(48)
        expires = datetime.utcnow() + timedelta(hours=1)
        prt = PasswordResetToken(user_id=user.id, token=token, expires_at=expires)
        db.session.add(prt)
        db.session.commit()
        # Send email
        reset_url = f"{os.environ.get('FRONTEND_URL', 'http://localhost:5173')}/reset-password?token={token}"

            # Endpoint for employee to accept invitation
        body = f"Hello {user.username},\n\nTo reset your password, click the link below:\n{reset_url}\n\nIf you did not request this, ignore this email.\n\nThis link expires in 1 hour."
        send_email(user.email, "Password Reset Request", body)
    return (
        jsonify({
            "message": "If an account exists with this email, a password reset link has been sent."
        }),
        200,
    )

@app.route('/auth/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json() or {}
    token = data.get('token')
    new_password = data.get('password')
    if not (token and new_password):

            # Endpoint for default user to request manager role
        return jsonify({"error": "Token and password required"}), 400
    prt = PasswordResetToken.query.filter(and_(PasswordResetToken.token == token, PasswordResetToken.used == False)).first()
    if not prt or prt.expires_at < datetime.utcnow():
        return jsonify({"error": "Invalid or expired token"}), 400
    user = User.query.get(prt.user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    user.set_password(new_password)
    prt.used = True
    db.session.add(user)

    db.session.add(prt)
    db.session.commit()
    return jsonify({"message": "Password reset successful"})

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



def _get_user_role(user_id: int) -> str:
    user = User.query.get(user_id)
    return user.role if user else None

def _require_role(user_id: int, allowed_roles):
    role = _get_user_role(user_id)
    return role in allowed_roles


@app.route('/admin/users', methods=['GET'])
@jwt_required()
def admin_list_users():
    try:
        requester_id = int(get_jwt_identity())
        if not _require_role(requester_id, ["admin"]):
            return (jsonify({"error": "Admin access required"}), 403)

        q = request.args.get('q', '').strip()
        query = User.query
        if q:
            like = f"%{q}%"
            query = query.filter((User.username.ilike(like)) | (User.email.ilike(like)))

        users = query.all()
        return (jsonify({"users": [u.to_json() for u in users]}), 200)
    except Exception as e:
        app.logger.error(f"Error listing users: {str(e)}")
        return (jsonify({"error": "Failed to list users", "details": str(e)}), 500)


@app.route('/admin/users/<int:target_id>', methods=['GET', 'PATCH', 'DELETE'])
@jwt_required()
def admin_user_detail(target_id):
    try:
        requester_id = int(get_jwt_identity())
        if not _require_role(requester_id, ["admin"]):
            return (jsonify({"error": "Admin access required"}), 403)

        user = User.query.get(target_id)
        if not user:
            return (jsonify({"error": "User not found"}), 404)

        if request.method == 'GET':
            return (jsonify({"user": user.to_json()}), 200)

        if request.method == 'PATCH':
            data = request.get_json() or {}
            # Allow updating username, email, phone, is_admin, password
            if 'username' in data:
                user.username = data['username']
            if 'email' in data:
                user.email = data['email']
            if 'phone' in data:
                user.phone = data['phone']
            if 'role' in data:
                user.role = data['role']
            if 'password' in data and data['password']:
                user.set_password(data['password'])

            db.session.add(user)
            db.session.commit()
            return (jsonify({"message": "User updated", "user": user.to_json()}), 200)

        if request.method == 'DELETE':
            db.session.delete(user)
            db.session.commit()
            return (jsonify({"message": "User deleted"}), 200)

    except Exception as e:
        app.logger.error(f"Error in admin user detail: {str(e)}")
        return (jsonify({"error": "Admin operation failed", "details": str(e)}), 500)


# MANAGER: Manage employees and permissions
@app.route('/manager/employees', methods=['GET', 'POST'])
@jwt_required()
def manager_employees():
    requester_id = int(get_jwt_identity())
    if not _require_role(requester_id, ["manager", "admin"]):
        return (jsonify({"error": "Manager or admin access required"}), 403)

    if request.method == 'GET':
        # List employees managed by this manager
        perms = EmployeePermission.query.filter_by(manager_id=requester_id).all()
        employees = [User.query.get(p.employee_id).to_json() for p in perms]
        return jsonify({"employees": employees, "permissions": [p.to_json() for p in perms]})

    if request.method == 'POST':
        data = request.get_json() or {}
        email = data.get('email')
        employee = User.query.filter_by(email=email).first()
        if not employee:
            return jsonify({"error": "No user with that email"}), 404
        if employee.role not in ["employee", "default"]:
            return jsonify({"error": "User is not an employee or default"}), 400
        # Promote to employee if needed
        if employee.role == "default":
            employee.role = "employee"
            db.session.add(employee)
        # Add permission row
        perm = EmployeePermission(manager_id=requester_id, employee_id=employee.id)
        db.session.add(perm)
        db.session.commit()
        return jsonify({"message": "Employee added", "employee": employee.to_json(), "permission": perm.to_json()}), 201

# Update or remove employee permissions
@app.route('/manager/employees/<int:employee_id>', methods=['PATCH', 'DELETE'])
@jwt_required()
def manager_employee_detail(employee_id):
    requester_id = int(get_jwt_identity())
    if not _require_role(requester_id, ["manager", "admin"]):
        return (jsonify({"error": "Manager or admin access required"}), 403)
    perm = EmployeePermission.query.filter_by(manager_id=requester_id, employee_id=employee_id).first()
    if not perm:
        return jsonify({"error": "No such employee for this manager"}), 404
    if request.method == 'PATCH':
        data = request.get_json() or {}
        for field in ["can_view_inventory", "can_edit_inventory", "can_see_finances", "can_add_items", "can_remove_items"]:
            if field in data:
                setattr(perm, field, bool(data[field]))
        db.session.add(perm)
        db.session.commit()
        return jsonify({"message": "Permissions updated", "permission": perm.to_json()})
    if request.method == 'DELETE':
        db.session.delete(perm)
        db.session.commit()
        return jsonify({"message": "Employee removed"})


@app.route('/inventory/current', methods=['GET'])
@jwt_required()
def get_current_inventory():
    try:
        user_id = int(get_jwt_identity())
        app.logger.debug(f"Get inventory - User ID from JWT: {user_id}")
        current_inventory = Current_Inventory.query.filter_by(user_id=user_id).all()
        app.logger.debug(f"Found {len(current_inventory)} items for user {user_id}")
        json_inventory = list(map(lambda item: item.to_json(), current_inventory))
        return (
                jsonify({"current_inventory":json_inventory}), 
                200,
            )
    except Exception as e:
        app.logger.error(f"Error getting inventory: {str(e)}")
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
@validate_request(InventoryItemSchema)
def create_item():
    user_id = int(get_jwt_identity())
    data = request.validated_data
    app.logger.debug(f"User ID from JWT: {user_id}")
    app.logger.debug(f"Request data: {data}")
    
    # Verify user exists
    user = User.query.get(user_id)
    if not user:
        app.logger.warning(f"User with ID {user_id} not found in database")
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
        name=data['name'],
        quantity=data['quantity'],
        price=data['price'],
        description=data.get('description'),
        category=data.get('category'),
        added_date=datetime.now(),
    )

    try:
        db.session.add(new_item)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error creating item: {str(e)}")
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
        
        # If all items are sold, delete the item from inventory
        if item.quantity == 0:
            db.session.delete(item)
        
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
        # If quantity is 0, delete the item
        if item.quantity == 0:
            db.session.delete(item)
        
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

@app.route('/finances', methods=['GET'])
@jwt_required()
def get_finances():
    try:
        user_id = int(get_jwt_identity())
        
        # Get days parameter from query string (default to 7)
        days_param = request.args.get('days', '7')
        
        # Get user to retrieve expenses
        user = User.query.get(user_id)
        if not user:
            return (
                jsonify({"error": "User not found"}),
                404,
            )
        
        # Get all sold items for the user
        sold_items = Sold_Items.query.filter_by(user_id=user_id).all()
        
        # Calculate total revenue from sold items
        total_revenue = sum(item.sale_price * item.quantity_sold for item in sold_items)
        
        # Get current inventory
        current_inventory = Current_Inventory.query.filter_by(user_id=user_id).all()
        
        # Calculate potential revenue from current inventory
        potential_revenue = sum(item.price * item.quantity for item in current_inventory)
        
        # Calculate daily sales based on requested period
        from datetime import timedelta
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        daily_sales = []
        
        # Determine the number of days to fetch
        if days_param == 'year':
            # Get all sales data grouped by day
            num_days = 365
        else:
            num_days = int(days_param)
        
        for i in range(num_days - 1, -1, -1):  # Count backwards from num_days-1 to 0
            day = today - timedelta(days=i)
            next_day = day + timedelta(days=1)
            
            # Get sales for this specific day
            day_result = db.session.query(
                func.sum(Sold_Items.sale_price * Sold_Items.quantity_sold),
                func.sum(Sold_Items.quantity_sold)
            ).filter(
                Sold_Items.user_id == user_id,
                Sold_Items.sale_date >= day,
                Sold_Items.sale_date < next_day
            ).first()
            
            day_revenue = float(day_result[0]) if day_result[0] else 0
            items_sold = int(day_result[1]) if day_result[1] else 0
            
            daily_sales.append({
                "date": day.strftime('%Y-%m-%d'),
                "revenue": day_revenue,
                "items_sold": items_sold
            })
        
        return (
            jsonify({
                "totalRevenue": float(total_revenue),
                "potentialRevenue": float(potential_revenue),
                "expenses": float(user.expenses),
                "dailySales": daily_sales
            }),
            200,
        )
    except Exception as e:
        app.logger.error(f"Error getting finances: {str(e)}")
        return (
            jsonify({"error": "Failed to get finances", "details": str(e)}),
            500,
        )

@app.route('/finances/expenses', methods=['PATCH'])
@jwt_required()
def update_expenses():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user:
            return (
                jsonify({"error": "User not found"}),
                404,
            )
        
        expenses = request.json.get('expenses')
        
        if expenses is None:
            return (
                jsonify({"error": "Expenses value is required"}),
                400,
            )
        
        user.expenses = float(expenses)
        db.session.commit()
        
        return (
            jsonify({
                "message": "Expenses updated successfully",
                "expenses": user.expenses
            }),
            200,
        )
    except Exception as e:
        app.logger.error(f"Error updating expenses: {str(e)}")
        return (
            jsonify({"error": "Failed to update expenses", "details": str(e)}),
            500,
        )

@app.route('/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard():
    try:
        user_id = int(get_jwt_identity())
        
        # Get user for expenses
        user = User.query.get(user_id)
        if not user:
            return (
                jsonify({"error": "User not found"}),
                404,
            )
        
        # Get 5 most recently added inventory items
        recent_inventory = Current_Inventory.query.filter_by(user_id=user_id)\
            .order_by(Current_Inventory.added_date.desc())\
            .limit(5)\
            .all()
        
        # Get 5 most recently sold items
        recent_sold = Sold_Items.query.filter_by(user_id=user_id)\
            .order_by(Sold_Items.sale_date.desc())\
            .limit(5)\
            .all()
        
        # Calculate total revenue
        all_sold_items = Sold_Items.query.filter_by(user_id=user_id).all()
        total_revenue = sum(item.sale_price * item.quantity_sold for item in all_sold_items)
        
        # Calculate profit
        profit = total_revenue - user.expenses
        
        return (
            jsonify({
                "recentInventory": [item.to_json() for item in recent_inventory],
                "recentSold": [item.to_json() for item in recent_sold],
                "profit": float(profit),
                "totalRevenue": float(total_revenue),
                "expenses": float(user.expenses)
            }),
            200,
        )
    except Exception as e:
        app.logger.error(f"Error getting dashboard data: {str(e)}")
        return (
            jsonify({"error": "Failed to get dashboard data", "details": str(e)}),
            500,
        )

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        app.logger.info("Database tables created successfully")
    
    # Only use development server for local development
    # For production, use Gunicorn: gunicorn -c gunicorn_config.py main:app
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', '0') == '1'
    
    if debug:
        app.logger.warning("Running in DEBUG mode - DO NOT use in production!")
    
    app.run(debug=debug, port=port, host='127.0.0.1')
