# ...existing imports...
from flask import url_for, redirect, request, jsonify
import uuid
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from config import app, db, limiter
from models import Current_Inventory, Sold_Items, User, EmployeePermission, ManagerInvitation, DataExport
from flask_migrate import Migrate

migrate = Migrate(app, db)

from schemas import (
    validate_request, UserRegistrationSchema, UserLoginSchema,
    InventoryItemSchema, ItemUpdateSchema, SoldItemSchema,
    ExpensesUpdateSchema, ForgotPasswordSchema
)
from datetime import datetime, timedelta
from sqlalchemy import func, and_
import os
import secrets
import smtplib
from email.mime.text import MIMEText

# Endpoint for manager to list their invitations
@app.route('/manager/invitations', methods=['GET'])
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

# Endpoint for manager to delete an invitation
@app.route('/manager/invitations/<int:invitation_id>', methods=['DELETE'])
@jwt_required()
def delete_invitation(invitation_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role != 'manager':
        return jsonify({'error': 'Unauthorized'}), 403
    invitation = ManagerInvitation.query.filter_by(id=invitation_id, manager_id=user.id).first()
    if not invitation:
        return jsonify({'error': 'Invitation not found'}), 404
    db.session.delete(invitation)
    db.session.commit()
    return jsonify({'message': 'Invitation deleted'})

# Endpoint for manager to invite employee by email
@app.route('/manager/invite-employee', methods=['POST'])
@jwt_required()
def invite_employee():
    user_id = int(get_jwt_identity())
    manager = User.query.get(user_id)
    if not manager or manager.role != 'manager':
        return jsonify({'error': 'Unauthorized'}), 403
    data = request.get_json() or {}
    email = data.get('email')
    if not email:
        return jsonify({'error': 'Email required'}), 400
    # Create invitation
    token = str(uuid.uuid4())
    invitation = ManagerInvitation(email=email, manager_id=manager.id, token=token)
    db.session.add(invitation)
    db.session.commit()
    
    # Send email with accept link - use FRONTEND_URL for base, but /api/ prefix for backend routes
    base_url = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
    
    # Ensure URL has protocol
    if not base_url.startswith('http'):
        base_url = 'https://' + base_url
    
    # Use /api/ prefix so nginx routes to backend
    accept_url = f"{base_url}/api/accept-invitation/{token}"
    decline_url = f"{base_url}/api/decline-invitation/{token}"
    
    body = (
        f"Hello,\n\nYou have been invited by {manager.username} ({manager.email}) to join their team as an employee.\n"
        f"Accept: {accept_url}\n"
        f"Decline: {decline_url}\n\n"
        "If you don't have an account yet, please register first, then click the link again."
    )
    if not send_email(email, 'Invitation to join as employee', body):
        return jsonify({'error': 'Failed to send invitation email'}), 500
    return jsonify({'message': 'Invitation sent'})

# Endpoint for employee to accept invitation (no auth required)
@app.route('/accept-invitation/<token>', methods=['GET'])
def accept_invitation(token):
    frontend = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
    
    invitation = ManagerInvitation.query.filter_by(token=token, accepted=False).first()
    if not invitation:
        # Check if already accepted
        already_accepted = ManagerInvitation.query.filter_by(token=token, accepted=True).first()
        if already_accepted:
            # Already accepted, just redirect to dashboard
            return redirect(f"{frontend}/?invite=accepted")
        # Invalid or expired
        return redirect(f"{frontend}/?invite=error")
    
    # Case-insensitive email lookup
    user = User.query.filter(User.email.ilike(invitation.email)).first()
    if not user:
        return redirect(f"{frontend}/?invite=error")
    
    # Promote to employee if default
    if user.role == 'default':
        user.role = 'employee'
        db.session.add(user)
    
    # Add permission row if not exists
    existing = EmployeePermission.query.filter_by(manager_id=invitation.manager_id, employee_id=user.id).first()
    if not existing:
        perm = EmployeePermission(manager_id=invitation.manager_id, employee_id=user.id)
        db.session.add(perm)
    
    # Mark invitation accepted
    invitation.accepted = True
    db.session.add(invitation)
    db.session.commit()
    
    # Redirect to dashboard; frontend can read invite=accepted to show manager data
    return redirect(f"{frontend}/?invite=accepted")

# Endpoint for employee to decline invitation (no auth required)
@app.route('/decline-invitation/<token>', methods=['GET'])
def decline_invitation(token):
    invitation = ManagerInvitation.query.filter_by(token=token).first()
    frontend = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
    if not invitation:
        return redirect(f"{frontend}/?invite=error")
    try:
        # Invalidate invitation by deleting it so it can't be reused
        db.session.delete(invitation)
        db.session.commit()
    except Exception:
        # Fallback to mark as not accepted
        invitation.accepted = False
        db.session.add(invitation)
        db.session.commit()
    return redirect(f"{frontend}/?invite=declined")

# Endpoint for default user to request manager role
@app.route('/request-manager', methods=['POST'])
@jwt_required()
def request_manager():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    if user.role != 'default':
        return jsonify({'error': 'Only default users can become managers'}), 400
    user.role = 'manager'
    db.session.add(user)
    db.session.commit()
    return jsonify({'message': 'You are now a manager', 'user': user.to_json()})

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
    
    # Check if user already exists (single query for both username and email)
    existing_user = User.query.filter(
        (User.username == username) | (User.email == email)
    ).first()
    
    if existing_user:
        if existing_user.username == username:
            return jsonify({"error": "Username already exists"}), 400
        else:
            return jsonify({"error": "Email already exists"}), 400
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
    # Use environment variables for config (MAIL_*)
    try:
        MAIL_SERVER = os.environ.get('MAIL_SERVER')
        MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
        MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
        MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
        MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'true').lower() in ('1','true','yes')
        MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER', MAIL_USERNAME)
        
        app.logger.info(f"Email config - Server: {MAIL_SERVER}, Port: {MAIL_PORT}, Username: {MAIL_USERNAME}, TLS: {MAIL_USE_TLS}")
        
        if not (MAIL_SERVER and MAIL_USERNAME and MAIL_PASSWORD):
            app.logger.error(f'SMTP config missing - Server: {MAIL_SERVER}, Username: {MAIL_USERNAME}, Password: {"***" if MAIL_PASSWORD else "MISSING"}')
            return False
        
        msg = MIMEText(body)
        msg['Subject'] = subject
        msg['From'] = MAIL_DEFAULT_SENDER
        msg['To'] = to_email
        
        app.logger.info(f"Attempting to send email to {to_email} via {MAIL_SERVER}")
        
        # Try port 587 first, fallback to 2525 if it fails
        ports_to_try = [MAIL_PORT]
        if MAIL_PORT == 587:
            ports_to_try.append(2525)
        
        last_error = None
        for port in ports_to_try:
            try:
                app.logger.info(f"Trying SMTP port {port}...")
                # Create SMTP connection with timeout
                server = smtplib.SMTP(MAIL_SERVER, port, timeout=10)
                
                try:
                    if MAIL_USE_TLS:
                        app.logger.info("Starting TLS...")
                        server.starttls()
                    
                    app.logger.info(f"Logging in with {MAIL_USERNAME}...")
                    server.login(MAIL_USERNAME, MAIL_PASSWORD)
                    
                    app.logger.info(f"Sending email...")
                    server.sendmail(MAIL_DEFAULT_SENDER, [to_email], msg.as_string())
                    
                    app.logger.info(f"Email sent successfully to {to_email} using port {port}")
                    return True
                finally:
                    try:
                        server.quit()
                    except:
                        pass
            except Exception as e:
                last_error = e
                app.logger.warning(f"Failed on port {port}: {str(e)}")
                continue
        
        # If we get here, all ports failed
        app.logger.error(f"All SMTP ports failed. Last error: {str(last_error)}")
        return False
                
    except smtplib.SMTPAuthenticationError as e:
        app.logger.error(f"SMTP Authentication failed: {str(e)}")
        return False
    except smtplib.SMTPException as e:
        app.logger.error(f"SMTP error: {type(e).__name__}: {str(e)}")
        return False
    except ConnectionError as e:
        app.logger.error(f"Connection error: {str(e)}")
        return False
    except TimeoutError as e:
        app.logger.error(f"Connection timeout: {str(e)}")
        return False
    except Exception as e:
        app.logger.error(f"Failed to send email to {to_email}: {type(e).__name__}: {str(e)}")
        import traceback
        app.logger.error(traceback.format_exc())
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
    
    # Auto-fix: If user is 'default' but has an employee permission record, promote them to employee
    if user.role == 'default':
        perm = EmployeePermission.query.filter_by(employee_id=user.id).first()
        if perm:
            user.role = 'employee'
            db.session.add(user)
            db.session.commit()
    
    user_data = user.to_json()
    
    # If user is an employee, include their permissions and manager info
    if user.role == 'employee':
        perm = EmployeePermission.query.filter_by(employee_id=user.id).first()
        if perm:
            manager = User.query.get(perm.manager_id)
            user_data['permissions'] = perm.to_json()
            user_data['manager_id'] = perm.manager_id
            if manager:
                user_data['manager_name'] = manager.username
    
    return (
        jsonify({"user": user_data}),
        200,
    )



def _get_user_role(user_id: int) -> str:
    user = User.query.get(user_id)
    return user.role if user else None

def _require_role(user_id: int, allowed_roles):
    role = _get_user_role(user_id)
    return role in allowed_roles

def _check_employee_permission(user_id: int, permission_name: str) -> bool:
    """Check if an employee has a specific permission. Returns True for managers/admins."""
    user = User.query.get(user_id)
    if not user:
        return False
    
    # Managers and admins have all permissions
    if user.role in ['manager', 'admin']:
        return True
    
    # Employees need to check their permissions
    if user.role == 'employee':
        perm = EmployeePermission.query.filter_by(employee_id=user_id).first()
        if perm:
            return getattr(perm, permission_name, False)
        return False
    
    # Default users have no permissions
    return False

def _get_effective_user_id(user_id: int) -> int:
    """
    Get the effective user ID for data access.
    Employees see their manager's data, others see their own.
    """
    user = User.query.get(user_id)
    if not user:
        return user_id
    
    if user.role == 'employee':
        perm = EmployeePermission.query.filter_by(employee_id=user_id).first()
        if perm:
            return perm.manager_id
    
    return user_id


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
            # Prevent admin from deleting themselves
            if target_id == requester_id:
                return (jsonify({"error": "You cannot delete your own account"}), 400)
            
            try:
                # Handle orphaned employees: if user is employee but has no manager, convert to default
                if user.role == 'employee':
                    perm = EmployeePermission.query.filter_by(employee_id=target_id).first()
                    if not perm:
                        app.logger.info(f"Converting orphaned employee {user.username} to default user")
                        user.role = 'default'
                        db.session.add(user)
                
                # Handle special case for manager deletion: update employee roles
                if user.role == 'manager':
                    app.logger.info(f"Deleting manager {user.username}, updating employee roles")
                    # Find all employees of this manager and change their role to 'default'
                    employees = EmployeePermission.query.filter_by(manager_id=target_id).all()
                    for perm in employees:
                        employee = User.query.get(perm.employee_id)
                        if employee and employee.role == 'employee':
                            app.logger.info(f"Converting employee {employee.username} to default user")
                            employee.role = 'default'
                            db.session.add(employee)
                
                app.logger.info(f"Starting deletion of user {user.username} (ID: {target_id})")
                
                # Delete all related records first to avoid foreign key constraint errors
                
                # Delete employee permissions where user is manager or employee
                perm_count = EmployeePermission.query.filter(
                    (EmployeePermission.manager_id == target_id) | 
                    (EmployeePermission.employee_id == target_id)
                ).delete()
                app.logger.info(f"Deleted {perm_count} employee permission records")
                
                # Delete manager invitations sent by this user
                invite_count = ManagerInvitation.query.filter_by(manager_id=target_id).delete()
                app.logger.info(f"Deleted {invite_count} manager invitation records")
                
                # Delete all inventory items for this user
                inventory_count = Current_Inventory.query.filter_by(user_id=target_id).delete()
                app.logger.info(f"Deleted {inventory_count} inventory records")
                
                # Delete all sold items for this user
                sold_count = Sold_Items.query.filter_by(user_id=target_id).delete()
                app.logger.info(f"Deleted {sold_count} sold item records")
                
                # Delete all export records for this user
                export_count = DataExport.query.filter_by(user_id=target_id).delete()
                app.logger.info(f"Deleted {export_count} export records")
                
                # Delete all password reset tokens for this user
                token_count = PasswordResetToken.query.filter_by(user_id=target_id).delete()
                app.logger.info(f"Deleted {token_count} password reset tokens")
                
                # Finally delete the user
                app.logger.info(f"Deleting user record for {user.username}")
                db.session.delete(user)
                db.session.commit()
                app.logger.info(f"Successfully deleted user {user.username} and all associated data")
                return (jsonify({"message": "User and all associated data deleted"}), 200)
                
            except Exception as e:
                db.session.rollback()
                app.logger.error(f"Error deleting user {user.username} (ID: {target_id}): {str(e)}")
                app.logger.error(f"Exception type: {type(e).__name__}")
                import traceback
                app.logger.error(f"Traceback: {traceback.format_exc()}")
                return (jsonify({"error": "Failed to delete user", "details": str(e)}), 500)

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
        
        # Check if employee has permission to view inventory
        if not _check_employee_permission(user_id, 'can_view_inventory'):
            return jsonify({"error": "You don't have permission to view inventory"}), 403
        
        # Get effective user_id (manager's ID for employees)
        effective_user_id = _get_effective_user_id(user_id)
        
        current_inventory = Current_Inventory.query.filter_by(user_id=effective_user_id).all()
        app.logger.debug(f"Found {len(current_inventory)} items for user {effective_user_id}")
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
    
    # Check if employee has permission
    if not _check_employee_permission(user_id, 'can_see_finances'):
        return jsonify({"error": "You don't have permission to view sold items"}), 403
    
    # Get effective user_id (manager's ID for employees)
    effective_user_id = _get_effective_user_id(user_id)
    
    sold_items = Sold_Items.query.filter_by(user_id=effective_user_id).all()
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
    
    # Check if employee has permission to add items
    if not _check_employee_permission(user_id, 'can_add_items'):
        return jsonify({"error": "You don't have permission to add items"}), 403
    
    # Get effective user_id (manager's ID for employees)
    effective_user_id = _get_effective_user_id(user_id)
    
    # Verify effective user exists
    user = User.query.get(effective_user_id)
    if not user:
        app.logger.warning(f"User with ID {effective_user_id} not found in database")
        return (
            jsonify({"error": "User not found"}), 
            404,
        )
    next_item_id = (
        db.session.query(func.max(Current_Inventory.item_id))
        .filter(Current_Inventory.user_id == effective_user_id)
        .scalar()
    )
    next_item_id = (next_item_id or 0) + 1
    
    new_item = Current_Inventory(
        user_id=effective_user_id,
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
    
    # Check if employee has permission to edit inventory
    if not _check_employee_permission(user_id, 'can_edit_inventory'):
        return jsonify({"error": "You don't have permission to sell items"}), 403
    
    # Get effective user_id (manager's ID for employees)
    effective_user_id = _get_effective_user_id(user_id)
    
    item = Current_Inventory.query.filter_by(item_id=item_id, user_id=effective_user_id).first()
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
        user_id=effective_user_id,
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
    
    # Check if employee has permission to edit inventory
    if not _check_employee_permission(user_id, 'can_edit_inventory'):
        return jsonify({"error": "You don't have permission to edit items"}), 403
    
    # Get effective user_id (manager's ID for employees)
    effective_user_id = _get_effective_user_id(user_id)
    
    item = Current_Inventory.query.filter_by(item_id=item_id, user_id=effective_user_id).first()
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
    
    # Check if employee has permission to remove items
    if not _check_employee_permission(user_id, 'can_remove_items'):
        return jsonify({"error": "You don't have permission to delete items"}), 403
    
    # Get effective user_id (manager's ID for employees)
    effective_user_id = _get_effective_user_id(user_id)
    
    item = Current_Inventory.query.filter_by(item_id=item_id, user_id=effective_user_id).first()
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
        
        # Check if employee has permission to see finances
        if not _check_employee_permission(user_id, 'can_see_finances'):
            return jsonify({"error": "You don't have permission to view finances"}), 403
        
        # Get effective user_id (manager's ID for employees)
        effective_user_id = _get_effective_user_id(user_id)
        
        # Get days parameter from query string (default to 7)
        days_param = request.args.get('days', '7')
        
        # Get user to retrieve expenses
        user = User.query.get(effective_user_id)
        if not user:
            return (
                jsonify({"error": "User not found"}),
                404,
            )
        
        # Get all sold items for the user
        sold_items = Sold_Items.query.filter_by(user_id=effective_user_id).all()
        
        # Calculate total revenue from sold items
        total_revenue = sum(item.sale_price * item.quantity_sold for item in sold_items)
        
        # Get current inventory
        current_inventory = Current_Inventory.query.filter_by(user_id=effective_user_id).all()
        
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
                Sold_Items.user_id == effective_user_id,
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

@app.route('/finances/export', methods=['POST'])
@jwt_required()
def export_finances_data():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Only allow defaults, managers, and admins to export
        if user.role not in ['default', 'manager', 'admin']:
            return jsonify({"error": "You don't have permission to export data"}), 403
        
        # Get effective user_id (manager's ID for employees, but since we check role above, this will be the user's own ID)
        effective_user_id = _get_effective_user_id(user_id)
        
        data = request.get_json() or {}
        start_date_str = data.get('start_date')
        end_date_str = data.get('end_date')
        
        if not start_date_str or not end_date_str:
            return jsonify({"error": "Start date and end date are required"}), 400
        
        try:
            start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
            end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
        except ValueError:
            return jsonify({"error": "Invalid date format. Use ISO format (YYYY-MM-DDTHH:MM:SS)"}), 400
        
        if start_date >= end_date:
            return jsonify({"error": "Start date must be before end date"}), 400
        
        # Get sold items within date range
        sold_items = Sold_Items.query.filter(
            Sold_Items.user_id == effective_user_id,
            Sold_Items.sale_date >= start_date,
            Sold_Items.sale_date <= end_date
        ).order_by(Sold_Items.sale_date).all()
        
        # Get current inventory (snapshot at export time)
        current_inventory = Current_Inventory.query.filter_by(user_id=effective_user_id).all()
        
        # Create CSV content
        import csv
        import io
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write sold items section
        writer.writerow(['EXPORTED FINANCES DATA'])
        writer.writerow(['Export Date:', datetime.now().strftime('%Y-%m-%d %H:%M:%S')])
        writer.writerow(['Date Range:', f'{start_date.strftime("%Y-%m-%d")} to {end_date.strftime("%Y-%m-%d")}'])
        writer.writerow(['User:', user.username])
        writer.writerow([])
        
        writer.writerow(['SOLD ITEMS'])
        writer.writerow(['Sale Date', 'Item Name', 'Category', 'Quantity Sold', 'Sale Price', 'Total Revenue'])
        
        total_revenue = 0
        for item in sold_items:
            total_item_revenue = item.sale_price * item.quantity_sold
            total_revenue += total_item_revenue
            writer.writerow([
                item.sale_date.strftime('%Y-%m-%d %H:%M:%S'),
                item.name,
                item.category or '',
                item.quantity_sold,
                f'${item.sale_price:.2f}',
                f'${total_item_revenue:.2f}'
            ])
        
        writer.writerow([])
        writer.writerow(['Total Revenue:', f'${total_revenue:.2f}'])
        writer.writerow(['Total Expenses:', f'${user.expenses:.2f}'])
        writer.writerow(['Net Profit:', f'${total_revenue - user.expenses:.2f}'])
        writer.writerow([])
        
        # Write current inventory section
        writer.writerow(['CURRENT INVENTORY'])
        writer.writerow(['Item ID', 'Name', 'Category', 'Quantity', 'Price', 'Total Value'])
        
        total_inventory_value = 0
        for item in current_inventory:
            total_item_value = item.price * item.quantity
            total_inventory_value += total_item_value
            writer.writerow([
                item.item_id,
                item.name,
                item.category or '',
                item.quantity,
                f'${item.price:.2f}',
                f'${total_item_value:.2f}'
            ])
        
        writer.writerow([])
        writer.writerow(['Total Inventory Value:', f'${total_inventory_value:.2f}'])
        
        csv_content = output.getvalue()
        output.close()
        
        # Generate filename
        filename = f"finances_export_{user.username}_{start_date.strftime('%Y%m%d')}_to_{end_date.strftime('%Y%m%d')}.csv"
        
        # Store export record in database
        export_record = DataExport(
            user_id=user_id,
            filename=filename,
            start_date=start_date,
            end_date=end_date,
            export_type='finances',
            file_size=len(csv_content.encode('utf-8'))
        )
        db.session.add(export_record)
        db.session.commit()
        
        # Return CSV file
        response = app.response_class(
            csv_content,
            mimetype='text/csv',
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"',
                'Content-Length': len(csv_content.encode('utf-8'))
            }
        )
        return response
        
    except Exception as e:
        app.logger.error(f"Error exporting finances data: {str(e)}")
        return jsonify({"error": "Failed to export data", "details": str(e)}), 500

@app.route('/finances/exports', methods=['GET'])
@jwt_required()
def get_export_history():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Only allow defaults, managers, and admins to view exports
        if user.role not in ['default', 'manager', 'admin']:
            return jsonify({"error": "You don't have permission to view exports"}), 403
        
        exports = DataExport.query.filter_by(user_id=user_id).order_by(DataExport.created_at.desc()).all()
        
        return jsonify({
            "exports": [export.to_json() for export in exports]
        }), 200
        
    except Exception as e:
        app.logger.error(f"Error getting export history: {str(e)}")
        return jsonify({"error": "Failed to get export history", "details": str(e)}), 500

@app.route('/finances/export/<int:export_id>/download', methods=['GET'])
@jwt_required()
def download_export(export_id):
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Only allow defaults, managers, and admins to download exports
        if user.role not in ['default', 'manager', 'admin']:
            return jsonify({"error": "You don't have permission to download exports"}), 403
        
        export_record = DataExport.query.filter_by(id=export_id, user_id=user_id).first()
        
        if not export_record:
            return jsonify({"error": "Export not found"}), 404
        
        # For now, we'll regenerate the CSV since we don't store the actual file
        # In a production system, you'd store the file and serve it directly
        
        effective_user_id = _get_effective_user_id(user_id)
        
        # Get sold items within date range
        sold_items = Sold_Items.query.filter(
            Sold_Items.user_id == effective_user_id,
            Sold_Items.sale_date >= export_record.start_date,
            Sold_Items.sale_date <= export_record.end_date
        ).order_by(Sold_Items.sale_date).all()
        
        # Get current inventory
        current_inventory = Current_Inventory.query.filter_by(user_id=effective_user_id).all()
        
        # Create CSV content (same as export function)
        import csv
        import io
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        writer.writerow(['EXPORTED FINANCES DATA'])
        writer.writerow(['Export Date:', datetime.now().strftime('%Y-%m-%d %H:%M:%S')])
        writer.writerow(['Date Range:', f'{export_record.start_date.strftime("%Y-%m-%d")} to {export_record.end_date.strftime("%Y-%m-%d")}'])
        writer.writerow(['User:', user.username])
        writer.writerow([])
        
        writer.writerow(['SOLD ITEMS'])
        writer.writerow(['Sale Date', 'Item Name', 'Category', 'Quantity Sold', 'Sale Price', 'Total Revenue'])
        
        total_revenue = 0
        for item in sold_items:
            total_item_revenue = item.sale_price * item.quantity_sold
            total_revenue += total_item_revenue
            writer.writerow([
                item.sale_date.strftime('%Y-%m-%d %H:%M:%S'),
                item.name,
                item.category or '',
                item.quantity_sold,
                f'${item.sale_price:.2f}',
                f'${total_item_revenue:.2f}'
            ])
        
        writer.writerow([])
        writer.writerow(['Total Revenue:', f'${total_revenue:.2f}'])
        writer.writerow([])
        
        writer.writerow(['CURRENT INVENTORY'])
        writer.writerow(['Item ID', 'Name', 'Category', 'Quantity', 'Price', 'Total Value'])
        
        total_inventory_value = 0
        for item in current_inventory:
            total_item_value = item.price * item.quantity
            total_inventory_value += total_item_value
            writer.writerow([
                item.item_id,
                item.name,
                item.category or '',
                item.quantity,
                f'${item.price:.2f}',
                f'${total_item_value:.2f}'
            ])
        
        writer.writerow([])
        writer.writerow(['Total Inventory Value:', f'${total_inventory_value:.2f}'])
        
        csv_content = output.getvalue()
        output.close()
        
        # Return CSV file
        response = app.response_class(
            csv_content,
            mimetype='text/csv',
            headers={
                'Content-Disposition': f'attachment; filename="{export_record.filename}"',
                'Content-Length': len(csv_content.encode('utf-8'))
            }
        )
        return response
        
    except Exception as e:
        app.logger.error(f"Error downloading export: {str(e)}")
        return jsonify({"error": "Failed to download export", "details": str(e)}), 500

@app.route('/dashboard', methods=['GET'])
@jwt_required()
def get_dashboard():
    try:
        user_id = int(get_jwt_identity())
        
        # Get effective user_id (manager's ID for employees)
        effective_user_id = _get_effective_user_id(user_id)
        
        # Get user for expenses
        user = User.query.get(effective_user_id)
        if not user:
            return (
                jsonify({"error": "User not found"}),
                404,
            )
        
        # Get 5 most recently added inventory items
        recent_inventory = Current_Inventory.query.filter_by(user_id=effective_user_id)\
            .order_by(Current_Inventory.added_date.desc())\
            .limit(5)\
            .all()
        
        # Get 5 most recently sold items
        recent_sold = Sold_Items.query.filter_by(user_id=effective_user_id)\
            .order_by(Sold_Items.sale_date.desc())\
            .limit(5)\
            .all()
        
        # Calculate total revenue
        all_sold_items = Sold_Items.query.filter_by(user_id=effective_user_id).all()
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
