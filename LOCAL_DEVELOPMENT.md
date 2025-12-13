# Local Development Setup

Quick guide to run InventoryApp on your local machine.

---

## Prerequisites

- Python 3.9+
- Node.js 18+
- npm or yarn

---

## Backend Setup (First Time)

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# The .env file is already configured for development
# It uses SQLite and localhost settings

# Initialize database
python -c "from config import app, db; app.app_context().push(); db.create_all()"

# Run backend
python main.py
```

Backend will run at: **http://localhost:5000**

---

## Frontend Setup (First Time)

```bash
# Open NEW terminal
cd frontend

# Install dependencies
npm install

# The .env file is already configured for development
# It points to http://localhost:5000

# Run frontend
npm run dev
```

Frontend will run at: **http://localhost:5173** (or 5137)

---

## Daily Development

### Start Backend
```bash
cd backend
venv\Scripts\activate  # Windows
python main.py
```

### Start Frontend
```bash
cd frontend
npm run dev
```

### Access Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

---

## Troubleshooting

### "Failed to fetch" errors

**Check if backend is running:**
```bash
curl http://localhost:5000/
# Should return: {"message":"Inventory Management System API is running."}
```

**Check if frontend is using correct URL:**
- File: `frontend/.env`
- Should contain: `VITE_API_URL=http://localhost:5000`

**Check CORS settings:**
- File: `backend/.env`
- Should include: `ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5137`

### "Secret key validation error"

Your `backend/.env` should have:
```env
SECRET_KEY=dev-secret-key-local-only-not-for-production-use
JWT_SECRET_KEY=dev-jwt-secret-key-local-only-not-for-production
```

These are development-only keys and are safe for local use.

### Port already in use

**Backend (port 5000):**
```bash
# Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# macOS/Linux:
lsof -ti:5000 | xargs kill -9
```

**Frontend (port 5173):**
```bash
# Windows:
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# macOS/Linux:
lsof -ti:5173 | xargs kill -9
```

### Database issues

```bash
# Delete and recreate database
cd backend
rm -rf instance/InventoryDatabase.db  # macOS/Linux
del instance\InventoryDatabase.db     # Windows

# Recreate
python -c "from config import app, db; app.app_context().push(); db.create_all()"
```

---

## Environment Files

### Backend (.env) - Already configured ✅
```env
FLASK_ENV=development
FLASK_DEBUG=1
SECRET_KEY=dev-secret-key-local-only-not-for-production-use
JWT_SECRET_KEY=dev-jwt-secret-key-local-only-not-for-production
DATABASE_URL=sqlite:///instance/InventoryDatabase.db
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5137
PORT=5000
LOG_LEVEL=DEBUG
```

### Frontend (.env) - Already configured ✅
```env
VITE_API_URL=http://localhost:5000
```

---

## Testing the Application

1. Start both backend and frontend
2. Visit http://localhost:5173
3. Register a new user
4. Login
5. Add some inventory items
6. Test all features

---

## Development vs Production

| Feature | Development | Production |
|---------|-------------|------------|
| Database | SQLite (file-based) | PostgreSQL |
| Debug Mode | ON | OFF |
| Secret Keys | Development keys | Secure random keys |
| CORS | localhost only | Your domain |
| WSGI Server | Flask dev server | Gunicorn |
| Logs | Console + DEBUG level | File + INFO level |
| Rate Limits | Permissive | Strict |

---

## Common Development Tasks

### View Backend Logs
```bash
# Logs are printed to console in development
# Also saved to: backend/logs/inventoryapp.log
tail -f backend/logs/inventoryapp.log  # macOS/Linux
type backend\logs\inventoryapp.log     # Windows
```

### Test API Endpoints
```bash
# Health check
curl http://localhost:5000/

# Register
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"test\",\"password\":\"test1234\",\"email\":\"test@test.com\"}"

# Login
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"test\",\"password\":\"test1234\"}"
```

### Reset Database
```bash
cd backend
# Delete database
rm instance/InventoryDatabase.db

# Recreate
python -c "from config import app, db; app.app_context().push(); db.create_all()"
```

---

## Code Organization

```
InventoryApp/
├── backend/
│   ├── main.py              # API routes
│   ├── config.py            # Flask config
│   ├── models.py            # Database models
│   ├── schemas.py           # Validation
│   ├── .env                 # Development config
│   └── instance/            # SQLite database
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main app
│   │   ├── Dashboard.jsx    # Dashboard
│   │   ├── Login.jsx        # Login page
│   │   └── ...
│   ├── .env                 # Development config
│   └── package.json
```

---

## Next Steps

- **Ready to deploy?** See [QUICKSTART.md](QUICKSTART.md)
- **Need security info?** See [SECURITY.md](SECURITY.md)
- **Full deployment guide?** See [DEPLOYMENT.md](DEPLOYMENT.md)

---

## Quick Commands Cheat Sheet

```bash
# Backend
cd backend
venv\Scripts\activate
python main.py

# Frontend
cd frontend
npm run dev

# Test backend
curl http://localhost:5000/

# Install new backend package
pip install <package>
pip freeze > requirements.txt

# Install new frontend package
npm install <package>
```

---

**Need help?** Check the troubleshooting section above or open an issue on GitHub.

Happy coding! 🚀
