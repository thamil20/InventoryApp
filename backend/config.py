from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# CORS configuration - allow credentials and Authorization header
CORS(app, resources={r"/*": {"origins": "*", "allow_headers": ["Content-Type", "Authorization"]}})

# Database configuration
database_url = os.getenv('DATABASE_URL')
app.config["SQLALCHEMY_DATABASE_URI"] = database_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# JWT configuration
app.config["JWT_SECRET_KEY"] = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = 3600  # 1 hour in seconds

db = SQLAlchemy(app)
jwt = JWTManager(app)
bcrypt = Bcrypt(app)

# JWT error handlers
@jwt.invalid_token_loader
def invalid_token_callback(error):
    print(f"Invalid token error: {error}")
    return jsonify({"error": "Invalid token", "details": str(error)}), 422

@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    print(f"Expired token")
    return jsonify({"error": "Token has expired"}), 401

@jwt.unauthorized_loader
def missing_token_callback(error):
    print(f"Missing token: {error}")
    return jsonify({"error": "Authorization token is missing"}), 401

