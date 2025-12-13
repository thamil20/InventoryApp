from flask import request, jsonify
from config import app, db
from models import Current_Inventory, Sold_Items
from datetime import datetime

@app.route('/')
def home():
    return (
            jsonify({"message":"Inventory Management System API is running."}), 
            200,
        )

@app.route('/inventory/current', methods=['GET'])
def get_current_inventory():
    current_inventory = Current_Inventory.query.all()
    json_inventory = list(map(lambda item: item.to_json(), current_inventory))
    return (
            jsonify({"current_inventory":json_inventory}), 
            200,
        )

@app.route('/inventory/sold', methods=['GET'])
def get_sold_items():
    sold_items = Sold_Items.query.all()
    json_sold_items = list(map(lambda item: item.to_json(), sold_items))
    return (
            jsonify({"sold_items":json_sold_items}), 
            200,
        )

@app.route('/inventory/create_item', methods=['POST'])
def create_item():
    name = request.json.get('name')
    quantity = request.json.get('quantity')
    price = request.json.get('price')
    description = request.json.get('description')
    category = request.json.get('category')

    if not name or not quantity or not price or not description or not category:
        return (
            jsonify({"error": "Missing required fields"}), 
            400,
        )
    
    new_item = Current_Inventory(
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
        return (
            jsonify({"error": "Failed to create item", "details": str(e)}), 
            500,
        )
    
    return (
            jsonify({"message": "Item created successfully", "item": new_item.to_json()}), 
            201,
        )

@app.route('/inventory/sell_item/<int:item_id>', methods=['POST'])
def sell_item(item_id):
    item = Current_Inventory.query.get(item_id)
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
def update_item(item_id):
    item = Current_Inventory.query.get(item_id)
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
def delete_item(item_id):
    item = Current_Inventory.query.get(item_id)
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
def renumber_items():
    try:
        items = Current_Inventory.query.order_by(Current_Inventory.item_id).all()
        for index, item in enumerate(items, 1):
            item.item_id = index
        db.session.commit()
        return jsonify({"message": "Items renumbered successfully"}), 200
    except Exception as e:
        return jsonify({"error": "Failed to renumber items", "details": str(e)}), 500

if __name__ == "__main__":
    with app.app_context():
        db.create_all

    app.run(debug=True, port=5000)
