from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

CORS(app)

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

