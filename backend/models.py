
from config import db, bcrypt
from datetime import datetime
from pytz import timezone

class User(db.Model):
    __tablename__ = "user"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(200), unique=False, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    phone = db.Column(db.String(15), unique=False, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now(timezone('UTC')))
    expenses = db.Column(db.Float, default=0.0, nullable=False)
    role = db.Column(db.String(20), default='default', nullable=False)  # default, employee, manager, admin
    
    def set_password(self, password):
        """Hash and set the user's password"""
        self.password = bcrypt.generate_password_hash(password).decode('utf-8')
    
    def check_password(self, password):
        """Check if the provided password matches the hashed password"""
        return bcrypt.check_password_hash(self.password, password)
    
    def to_json(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "phone": self.phone,
            "role": self.role,
            "createdAt": self.created_at.isoformat(),
            "expenses": self.expenses
        }


# Permissions table: which employees can access which inventories and what actions
class EmployeePermission(db.Model):
    __tablename__ = "employee_permission"
    id = db.Column(db.Integer, primary_key=True)
    manager_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    employee_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    can_view_inventory = db.Column(db.Boolean, default=True, nullable=False)
    can_edit_inventory = db.Column(db.Boolean, default=False, nullable=False)
    can_see_finances = db.Column(db.Boolean, default=False, nullable=False)
    can_add_items = db.Column(db.Boolean, default=False, nullable=False)
    can_remove_items = db.Column(db.Boolean, default=False, nullable=False)
    # Add more permissions as needed

    def to_json(self):
        return {
            "id": self.id,
            "manager_id": self.manager_id,
            "employee_id": self.employee_id,
            "can_view_inventory": self.can_view_inventory,
            "can_edit_inventory": self.can_edit_inventory,
            "can_see_finances": self.can_see_finances,
            "can_add_items": self.can_add_items,
            "can_remove_items": self.can_remove_items,
        }

# Model for manager invitations
class ManagerInvitation(db.Model):
    __tablename__ = 'manager_invitations'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), nullable=False)
    manager_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    token = db.Column(db.String(64), unique=True, nullable=False)
    accepted = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

# Define the Item model for the inventory management system
class Current_Inventory(db.Model):
    __tablename__ = "current_inventory"
    id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(db.Integer, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String(100), unique=False, nullable=False)
    quantity = db.Column(db.Integer, unique=False, nullable=False)
    price = db.Column(db.Float, unique=False, nullable=False)
    description = db.Column(db.String(255), unique=False, nullable=True)
    category = db.Column(db.String(50), unique=False, nullable=True)
    added_date = db.Column(db.DateTime, unique=False, nullable=False)
    __table_args__ = (
        db.UniqueConstraint('user_id', 'item_id', name='uq_current_inventory_user_item'),
    )

    # Return model data in JSON format for API responses
    def to_json(self):
        return {
            "itemId": self.item_id,
            "name": self.name,
            "quantity": self.quantity,
            "price": self.price,
            "description": self.description,
            "category": self.category,
            "addedDate": self.added_date.isoformat(),
        }
    
class Sold_Items(db.Model):
    __tablename__ = "sold_items"
    sold_item_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    # keep reference to the original inventory item (optional)
    original_item_id = db.Column(db.Integer, nullable=True)

    # snapshot of the item at time of sale (duplicate on sale)
    name = db.Column(db.String(100), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    price = db.Column(db.Float, nullable=False)         # original price or cost if needed
    description = db.Column(db.String(255), nullable=True)
    category = db.Column(db.String(50), nullable=True)
    added_date = db.Column(db.DateTime, nullable=True)  # preserved from Current_Inventory if desired

    # sale-specific fields
    quantity_sold = db.Column(db.Integer, nullable=False)
    sale_price = db.Column(db.Float, nullable=False)
    sale_date = db.Column(db.DateTime, nullable=False)

    def to_json(self):
        return {
            "soldItemId": self.sold_item_id,
            "originalItemId": self.original_item_id,
            "name": self.name,
            "quantity": self.quantity,
            "price": self.price,
            "description": self.description,
            "category": self.category,
            "addedDate": self.added_date.isoformat() if self.added_date else None,
            "quantitySold": self.quantity_sold,
            "salePrice": self.sale_price,
            "saleDate": self.sale_date.isoformat() if self.sale_date else None,
        }