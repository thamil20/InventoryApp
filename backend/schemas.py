"""
Input validation schemas using Marshmallow
"""
from marshmallow import Schema, fields, validate, ValidationError

class UserRegistrationSchema(Schema):
    """Schema for user registration"""
    username = fields.Str(
        required=True,
        validate=[
            validate.Length(min=3, max=50),
            validate.Regexp(r'^[a-zA-Z0-9_-]+$')
        ],
        error_messages={
            'required': 'Username is required',
            'invalid': 'Username can only contain letters, numbers, underscores, and hyphens'
        }
    )
    password = fields.Str(
        required=True,
        validate=validate.Length(min=8, max=128),
        error_messages={
            'required': 'Password is required',
            'invalid': 'Password must be at least 8 characters long'
        }
    )
    email = fields.Email(
        required=True,
        error_messages={
            'required': 'Email is required',
            'invalid': 'Invalid email address'
        }
    )
    phone = fields.Str(
        allow_none=True,
        load_default=None,
        validate=validate.And(
            validate.Length(min=0),
            validate.Regexp(r'^$|^\+?[0-9\s\-()]+$')  # Allow empty string or valid phone
        ),
        error_messages={'invalid': 'Invalid phone number format'}
    )

class UserLoginSchema(Schema):
    """Schema for user login"""
    username = fields.Str(
        required=True,
        validate=validate.Length(min=1),
        error_messages={'required': 'Username is required'}
    )
    password = fields.Str(
        required=True,
        validate=validate.Length(min=1),
        error_messages={'required': 'Password is required'}
    )

class ForgotPasswordSchema(Schema):
    """Schema for forgot password request"""
    email = fields.Email(
        required=True,
        error_messages={
            'required': 'Email is required',
            'invalid': 'Invalid email format'
        }
    )

class InventoryItemSchema(Schema):
    """Schema for creating/updating inventory items"""
    name = fields.Str(
        required=True,
        validate=validate.Length(min=1, max=200),
        error_messages={
            'required': 'Item name is required',
            'invalid': 'Name must be between 1 and 200 characters'
        }
    )
    quantity = fields.Integer(
        required=True,
        validate=validate.Range(min=0),
        error_messages={
            'required': 'Quantity is required',
            'invalid': 'Quantity must be a non-negative integer'
        }
    )
    price = fields.Float(
        required=True,
        validate=validate.Range(min=0),
        error_messages={
            'required': 'Price is required',
            'invalid': 'Price must be non-negative'
        }
    )
    description = fields.Str(
        allow_none=True,
        validate=validate.Length(max=1000),
        error_messages={'invalid': 'Description cannot exceed 1000 characters'}
    )
    category = fields.Str(
        allow_none=True,
        validate=validate.Length(max=100),
        error_messages={'invalid': 'Category cannot exceed 100 characters'}
    )

class ItemUpdateSchema(Schema):
    """Schema for updating inventory items"""
    name = fields.Str(validate=validate.Length(min=1, max=200))
    quantity = fields.Integer(validate=validate.Range(min=0))
    price = fields.Float(validate=validate.Range(min=0))
    description = fields.Str(allow_none=True, validate=validate.Length(max=1000))
    category = fields.Str(allow_none=True, validate=validate.Length(max=100))

class SoldItemSchema(Schema):
    """Schema for selling items"""
    quantity = fields.Integer(
        required=True,
        validate=validate.Range(min=1),
        error_messages={
            'required': 'Quantity is required',
            'invalid': 'Quantity must be at least 1'
        }
    )
    soldPrice = fields.Float(
        required=True,
        validate=validate.Range(min=0),
        error_messages={
            'required': 'Sold price is required',
            'invalid': 'Sold price must be non-negative'
        }
    )

class ExpensesUpdateSchema(Schema):
    """Schema for updating user expenses"""
    expenses = fields.Float(
        required=True,
        validate=validate.Range(min=0),
        error_messages={
            'required': 'Expenses value is required',
            'invalid': 'Expenses must be non-negative'
        }
    )

class RenumberSchema(Schema):
    """Schema for renumbering items"""
    items = fields.List(
        fields.Dict(keys=fields.Str(), values=fields.Integer()),
        required=True,
        validate=validate.Length(min=1),
        error_messages={
            'required': 'Items list is required',
            'invalid': 'Items list cannot be empty'
        }
    )

def validate_request(schema_class):
    """
    Decorator to validate request data against a Marshmallow schema
    Usage:
        @app.route('/endpoint', methods=['POST'])
        @validate_request(SomeSchema)
        def endpoint():
            data = request.validated_data
    """
    def decorator(f):
        def wrapper(*args, **kwargs):
            from flask import request, jsonify, current_app
            schema = schema_class()
            try:
                request_data = request.get_json() or {}
                current_app.logger.debug(f"Validating request data: {request_data}")
                # Validate and deserialize
                validated_data = schema.load(request_data)
                # Attach validated data to request object
                request.validated_data = validated_data
                return f(*args, **kwargs)
            except ValidationError as err:
                current_app.logger.warning(f"Validation error: {err.messages}")
                return jsonify({"error": "Validation failed", "details": err.messages}), 400
        wrapper.__name__ = f.__name__
        return wrapper
    return decorator
