from config import db
from datetime import datetime
from pytz import timezone

# Define the Item model for the inventory management system
class Current_Inventory(db.Model):
    __tablename__ = "current_inventory"
    item_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=False, nullable=False)
    quantity = db.Column(db.Integer, unique=False, nullable=False)
    price = db.Column(db.Float, unique=False, nullable=False)
    description = db.Column(db.String(255), unique=False, nullable=True)
    category = db.Column(db.String(50), unique=False, nullable=True)
    added_date = db.Column(db.DateTime, unique=False, nullable=False)

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
    # keep reference to the original inventory item (optional)
    original_item_id = db.Column(db.Integer, db.ForeignKey('current_inventory.item_id'), nullable=True)

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