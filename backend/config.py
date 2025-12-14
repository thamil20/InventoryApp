from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import os
import logging
from logging.handlers import RotatingFileHandler
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Environment configuration
ENV = os.getenv('FLASK_ENV', 'development')
DEBUG = os.getenv('FLASK_DEBUG', '0') == '1'

# Security configuration
app.config["SECRET_KEY"] = os.getenv('SECRET_KEY')
if not app.config["SECRET_KEY"]:
    raise ValueError("SECRET_KEY must be set in .env file")
# In production, reject weak/default keys
if ENV == 'production' and app.config["SECRET_KEY"] in [
    'CHANGE_THIS_TO_SECURE_RANDOM_STRING_IN_PRODUCTION',
    'dev-secret-key-local-only-not-for-production-use',
    'replace-with-secure-random-string'
]:
    raise ValueError("SECRET_KEY must be a secure random string in production (not a default/dev key)")

# CORS configuration - restrict origins in production
allowed_origins = os.getenv('ALLOWED_ORIGINS', 'http://localhost:5137')
allowed_origins_list = [origin.strip() for origin in allowed_origins.split(',')]
CORS(app, resources={r"/*": {
    "origins": allowed_origins_list,
    "allow_headers": ["Content-Type", "Authorization"],
    "supports_credentials": True
}})

# Database configuration
database_url = os.getenv('DATABASE_URL')

app.config["SQLALCHEMY_DATABASE_URI"] = database_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SQLALCHEMY_ECHO"] = False
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_pre_ping": True,  # Verify connections before using
    "pool_recycle": 300,    # Recycle connections after 5 minutes
}

# JWT configuration
app.config["JWT_SECRET_KEY"] = os.getenv('JWT_SECRET_KEY')
if not app.config["JWT_SECRET_KEY"]:
    raise ValueError("JWT_SECRET_KEY must be set in .env file")
# In production, reject weak/default keys
if ENV == 'production' and app.config["JWT_SECRET_KEY"] in [
    'CHANGE_THIS_TO_SECURE_RANDOM_STRING_IN_PRODUCTION',
    'dev-jwt-secret-key-local-only-not-for-production',
    'your-jwt-secret-key-change-in-production'
]:
    raise ValueError("JWT_SECRET_KEY must be a secure random string in production (not a default/dev key)")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = 3600  # 1 hour in seconds

# Rate limiting configuration
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=[os.getenv('RATE_LIMIT_DEFAULT', '100 per minute')],
    storage_uri="memory://"
)

db = SQLAlchemy(app)
jwt = JWTManager(app)
bcrypt = Bcrypt(app)

# Logging configuration
def setup_logging():
    """Configure production-grade logging"""
    log_level = os.getenv('LOG_LEVEL', 'INFO')
    
    # Create logs directory if it doesn't exist
    if not os.path.exists('logs'):
        os.makedirs('logs')
    
    # File handler with rotation
    file_handler = RotatingFileHandler(
        'logs/inventoryapp.log',
        maxBytes=10485760,  # 10MB
        backupCount=10
    )
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    ))
    file_handler.setLevel(getattr(logging, log_level))
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(getattr(logging, log_level))
    console_handler.setFormatter(logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    ))
    
    # Configure app logger
    app.logger.addHandler(file_handler)
    app.logger.addHandler(console_handler)
    app.logger.setLevel(getattr(logging, log_level))
    
    # Suppress werkzeug logs in production
    if ENV == 'production':
        logging.getLogger('werkzeug').setLevel(logging.WARNING)

setup_logging()
app.logger.info(f'InventoryApp starting in {ENV} mode')

# JWT error handlers
@jwt.invalid_token_loader
def invalid_token_callback(error):
    app.logger.warning(f"Invalid token error: {error}")
    return jsonify({"error": "Invalid token", "details": str(error)}), 422

@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    app.logger.info("Expired token attempt")
    return jsonify({"error": "Token has expired"}), 401

@jwt.unauthorized_loader
def missing_token_callback(error):
    app.logger.warning(f"Missing token: {error}")
    return jsonify({"error": "Authorization token is missing"}), 401

