# InventoryApp - Production-Ready Inventory Management System

A full-stack web application for managing inventory, tracking sales, and monitoring finances. Built with Flask (Python) and React, now **production-ready** for VPS deployment.

[![Production Ready](https://img.shields.io/badge/production-ready-brightgreen)]()
[![Security](https://img.shields.io/badge/security-hardened-blue)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()

---

## 🚀 Features

### Inventory Management
- ✅ Add, edit, and delete inventory items
- ✅ Track quantity, price, description, and category
- ✅ Automatic item ID numbering
- ✅ View current inventory in real-time

### Sales Tracking
- ✅ Mark items as sold
- ✅ Record sale price and date
- ✅ Track historical sales data
- ✅ Calculate total revenue

### Financial Overview
- ✅ Track expenses
- ✅ Calculate profit (revenue - expenses)
- ✅ Daily sales charts
- ✅ Financial dashboard

### User Management
- ✅ Secure user registration and login
- ✅ JWT token authentication
- ✅ Password hashing with bcrypt
- ✅ User-scoped data (each user sees only their data)

### Security Features (NEW!)
- ✅ Rate limiting (brute force protection)
- ✅ Input validation (Marshmallow schemas)
- ✅ CORS configuration (whitelist only)
- ✅ Production logging with rotation
- ✅ Environment-based configuration
- ✅ SQL injection protection (ORM)

---

## 🛠️ Tech Stack

### Backend
- **Framework**: Flask 3.1.2
- **Database**: PostgreSQL (production) / SQLite (development)
- **ORM**: SQLAlchemy 2.0.45
- **Authentication**: Flask-JWT-Extended 4.7.1
- **Password Hashing**: Flask-Bcrypt 1.0.1
- **Rate Limiting**: Flask-Limiter 3.8.0
- **Validation**: Marshmallow 3.23.2
- **WSGI Server**: Gunicorn 23.0.0

### Frontend
- **Framework**: React 19.2.0
- **Build Tool**: Vite 7.2.4
- **Routing**: React Router DOM 7.10.1
- **Styling**: CSS3

### Infrastructure
- **Web Server**: Nginx
- **Process Manager**: Systemd
- **SSL**: Let's Encrypt (Certbot)
- **OS**: Ubuntu 20.04+ / Debian 11+

---

## 📋 Prerequisites

### Development
- Python 3.9+
- Node.js 18+
- npm or yarn

### Production
- VPS with Ubuntu/Debian
- 1GB+ RAM
- Domain name
- SSH access

---

## 🏃 Quick Start

### Development Setup (Local)

**📘 Detailed local setup guide**: [`LOCAL_DEVELOPMENT.md`](LOCAL_DEVELOPMENT.md)

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/InventoryApp.git
cd InventoryApp

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with development settings

# Initialize database
python -c "from config import app, db; app.app_context().push(); db.create_all()"

# Run backend
python main.py
# Backend runs at http://localhost:5000

# Frontend setup (new terminal)
cd frontend
npm install

# Create .env file
echo "VITE_API_URL=http://localhost:5000" > .env

# Run frontend
npm run dev
# Frontend runs at http://localhost:5173
```

### Production Deployment (VPS)

**⚡ Fast Track**: Follow [`QUICKSTART.md`](QUICKSTART.md) (60-90 minutes)

**📖 Detailed Guide**: Follow [`DEPLOYMENT.md`](DEPLOYMENT.md) (complete walkthrough)

---

## 📚 Documentation

| Document | Description | Use When |
|----------|-------------|----------|
| [`QUICKSTART.md`](QUICKSTART.md) | Fast deployment guide (60-90 min) | Ready to deploy now |
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | Complete deployment walkthrough | Need detailed instructions |
| [`SECURITY.md`](SECURITY.md) | Security features & best practices | Understanding security |
| [`PRODUCTION_CHECKLIST.md`](PRODUCTION_CHECKLIST.md) | Pre-deployment verification | Before going live |
| [`IMPLEMENTATION_SUMMARY.md`](IMPLEMENTATION_SUMMARY.md) | What changed & why | Understanding updates |

---

## 🔒 Security Features

### Implemented Security Measures

✅ **Authentication**
- Bcrypt password hashing (10 rounds)
- JWT token authentication
- 1-hour token expiration
- User-scoped data access

✅ **Rate Limiting**
- Login: 5 attempts/minute
- Register: 3 attempts/hour
- Default: 100 requests/minute

✅ **Input Validation**
- Marshmallow schema validation
- Type checking
- Length limits
- Format validation

✅ **Configuration Security**
- Environment-based secrets
- CORS whitelist
- Debug mode disabled in production
- Secure session management

✅ **Infrastructure**
- HTTPS/SSL (Let's Encrypt)
- Nginx reverse proxy
- Security headers
- Firewall configuration

See [`SECURITY.md`](SECURITY.md) for complete details.

---

## 🎯 Production Readiness

### What's Been Fixed

This application was thoroughly reviewed and hardened for production:

1. ❌ **BEFORE**: Hardcoded localhost URLs → ✅ **NOW**: Environment variables
2. ❌ **BEFORE**: Weak default secrets → ✅ **NOW**: Required secure secrets
3. ❌ **BEFORE**: CORS allows all origins (`*`) → ✅ **NOW**: Whitelist only
4. ❌ **BEFORE**: Debug mode always on → ✅ **NOW**: Environment-controlled
5. ❌ **BEFORE**: Console logging (`print`) → ✅ **NOW**: Production logging
6. ❌ **BEFORE**: No rate limiting → ✅ **NOW**: Comprehensive rate limits
7. ❌ **BEFORE**: No input validation → ✅ **NOW**: Marshmallow schemas
8. ❌ **BEFORE**: Flask dev server → ✅ **NOW**: Gunicorn WSGI

**Risk Level**: 🔴 HIGH → 🟢 LOW

---

## 📁 Project Structure

```
InventoryApp/
├── backend/
│   ├── config.py              # Flask configuration
│   ├── main.py                # API endpoints
│   ├── models.py              # Database models
│   ├── schemas.py             # Validation schemas
│   ├── gunicorn_config.py     # WSGI configuration
│   ├── requirements.txt       # Python dependencies
│   ├── .env.example           # Environment template
│   └── logs/                  # Application logs
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Main component
│   │   ├── AuthContext.jsx   # Authentication state
│   │   ├── Dashboard.jsx     # Dashboard view
│   │   ├── Finances.jsx      # Financial tracking
│   │   ├── CurrentInventoryList.jsx
│   │   ├── SoldItemsList.jsx
│   │   ├── AddItemForm.jsx
│   │   ├── Login.jsx
│   │   └── Register.jsx
│   ├── package.json           # Node dependencies
│   ├── vite.config.js         # Build configuration
│   └── .env.production        # Production API URL
├── deployment/
│   ├── nginx.conf             # Nginx configuration
│   └── inventoryapp.service   # Systemd service
├── QUICKSTART.md              # Fast deployment guide
├── DEPLOYMENT.md              # Detailed deployment guide
├── SECURITY.md                # Security documentation
├── PRODUCTION_CHECKLIST.md    # Pre-deployment checklist
└── README.md                  # This file
```

---

## 🧪 Testing

### Manual Testing

```bash
# Test backend health
curl http://localhost:5000/

# Test registration
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test1234","email":"test@example.com"}'

# Test login
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test1234"}'

# Test rate limiting
for i in {1..10}; do
  curl -X POST http://localhost:5000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"wrong","password":"wrong"}'
done
```

### Production Testing

Follow the testing section in [`PRODUCTION_CHECKLIST.md`](PRODUCTION_CHECKLIST.md)

---

## 🔧 Configuration

### Environment Variables

#### Backend (`.env`)

```env
# Application Environment
FLASK_ENV=production
FLASK_DEBUG=0

# Security Keys (MUST BE UNIQUE!)
SECRET_KEY=your-secure-random-string
JWT_SECRET_KEY=your-jwt-secret-key

# Database
DATABASE_URL=postgresql://user:pass@localhost/inventoryapp

# CORS (comma-separated)
ALLOWED_ORIGINS=https://yourdomain.com

# Server
PORT=8000

# Logging
LOG_LEVEL=INFO

# Rate Limiting
RATE_LIMIT_LOGIN=5 per minute
RATE_LIMIT_REGISTER=3 per hour
RATE_LIMIT_DEFAULT=100 per minute
```

#### Frontend (`.env.production`)

```env
VITE_API_URL=https://yourdomain.com/api
```

---

## 🐛 Troubleshooting

### Backend Won't Start

```bash
# Check logs
tail -f backend/logs/inventoryapp.log

# Check if port is in use
sudo lsof -i :8000

# Verify environment variables
cat backend/.env
```

### Frontend Can't Connect to Backend

```bash
# Check API URL
cat frontend/.env.production

# Rebuild frontend
cd frontend
npm run build
```

### Database Connection Error

```bash
# Test PostgreSQL
sudo systemctl status postgresql
psql -U inventoryuser -d inventoryapp -h localhost

# Check DATABASE_URL
grep DATABASE_URL backend/.env
```

### 502 Bad Gateway (Production)

```bash
# Check backend service
sudo systemctl status inventoryapp
sudo systemctl restart inventoryapp

# Check logs
sudo journalctl -u inventoryapp -n 50
```

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for more troubleshooting.

---

## 📊 Performance

### Benchmarks (Expected)

- **API Response Time**: < 500ms
- **Page Load Time**: < 2s
- **Database Queries**: < 100ms
- **Concurrent Users**: 100+

### Optimization Tips

1. Adjust Gunicorn workers based on CPU cores
2. Enable PostgreSQL query optimization
3. Configure Nginx caching for static assets
4. Use CDN for frontend assets (optional)

---

## 🗺️ Roadmap

### Implemented ✅
- User authentication & authorization
- Inventory CRUD operations
- Sales tracking
- Financial calculations
- Rate limiting
- Input validation
- Production deployment configs

### Planned 🔮
- [ ] Unit & integration tests
- [ ] API versioning (/api/v1/)
- [ ] Pagination for large datasets
- [ ] Email verification
- [ ] Password reset functionality
- [ ] Two-factor authentication (2FA)
- [ ] Audit logging
- [ ] Export data (CSV/PDF)
- [ ] Mobile responsive improvements
- [ ] Dark mode

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👤 Author

Tyler Hamilton
- GitHub: [@thamil20](https://github.com/thamil20)

---

## 🙏 Acknowledgments

- Flask documentation
- React documentation
- PostgreSQL community
- Let's Encrypt for free SSL

---

## 📞 Support

If you encounter any issues:

1. Check the documentation in this repository
2. Review the troubleshooting section above
3. Open an issue on GitHub
4. Check logs for error messages

---
