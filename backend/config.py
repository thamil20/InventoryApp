from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# CORS configuration
allowed_origins = os.getenv('ALLOWED_ORIGINS').split(',')
CORS(app, resources={r"/inventory/*": {"origins": allowed_origins}})

# Database configuration
database_url = os.getenv('DATABASE_URL')
app.config["SQLALCHEMY_DATABASE_URI"] = database_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db = SQLAlchemy(app)
