# Quick Start: Deploy to VPS

**Time Required**: 2-3 hours  
**Prerequisites**: VPS with Ubuntu/Debian, domain name, SSH access

---

## Step 1: Generate Secrets (2 minutes)

```bash
# Run locally on your computer
python -c "import secrets; print('SECRET_KEY=' + secrets.token_hex(32))"
python -c "import secrets; print('JWT_SECRET_KEY=' + secrets.token_hex(32))"
```

**Save these values!** You'll need them in Step 4.

---

## Step 2: VPS Initial Setup (15 minutes)

```bash
# SSH into your VPS
ssh root@YOUR_VPS_IP

# Update system
sudo apt update && sudo apt upgrade -y

# Install everything
sudo apt install python3-pip python3-venv python3-dev nginx postgresql postgresql-contrib build-essential certbot python3-certbot-nginx -y

# Start services
sudo systemctl start postgresql nginx
sudo systemctl enable postgresql nginx
```

---

## Step 3: Database Setup (5 minutes)

```bash
# Create database
sudo -u postgres psql

# In PostgreSQL prompt, run:
CREATE DATABASE inventoryapp;
CREATE USER inventoryuser WITH PASSWORD 'YOUR_STRONG_PASSWORD_HERE';
ALTER ROLE inventoryuser SET client_encoding TO 'utf8';
ALTER ROLE inventoryuser SET default_transaction_isolation TO 'read committed';
ALTER ROLE inventoryuser SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE inventoryapp TO inventoryuser;
\q
```

---

## Step 4: Deploy Code (10 minutes)

```bash
# Create directory
sudo mkdir -p /var/www/inventoryapp
sudo chown $USER:$USER /var/www/inventoryapp

# Upload/clone code
cd /var/www/inventoryapp
git clone https://github.com/YOUR_USERNAME/InventoryApp.git .
# OR use scp to upload

# Set up Python
python3 -m venv venv
source venv/bin/activate
cd backend
pip install -r requirements.txt
pip install psycopg2-binary

# Create .env file
nano .env
```

**Paste this into .env** (replace YOUR_* values):

```env
FLASK_ENV=production
FLASK_DEBUG=0
SECRET_KEY=YOUR_SECRET_KEY_FROM_STEP_1
JWT_SECRET_KEY=YOUR_JWT_SECRET_FROM_STEP_1
DATABASE_URL=postgresql://inventoryuser:YOUR_DB_PASSWORD@localhost:5432/inventoryapp
ALLOWED_ORIGINS=https://YOUR_DOMAIN.com
PORT=8000
LOG_LEVEL=INFO
```

Save with `Ctrl+X`, then `Y`, then `Enter`.

```bash
# Fix permissions
chmod 600 .env

# Create logs directory
mkdir -p logs

# Initialize database
python -c "from config import app, db; app.app_context().push(); db.create_all()"

# Test backend
gunicorn -c gunicorn_config.py main:app --bind 0.0.0.0:8000
# Open new terminal, test: curl http://YOUR_VPS_IP:8000/
# Should return: {"message":"Inventory Management System API is running."}
# Ctrl+C to stop
```

---

## Step 5: Build & Upload Frontend (10 minutes)

```bash
# On your LOCAL computer
cd frontend
npm install

# Edit .env.production
nano .env.production
# Change to: VITE_API_URL=https://YOUR_DOMAIN.com/api

# Build
npm run build

# Upload to VPS (replace YOUR_VPS_IP)
scp -r dist/* root@YOUR_VPS_IP:/var/www/inventoryapp/frontend/dist/
```

---

## Step 6: Configure Nginx (10 minutes)

```bash
# Back on VPS
sudo cp /var/www/inventoryapp/deployment/nginx.conf /etc/nginx/sites-available/inventoryapp

# Edit to add your domain
sudo nano /etc/nginx/sites-available/inventoryapp
# Replace all instances of "your-domain.com" with YOUR actual domain

# Enable site
sudo ln -s /etc/nginx/sites-available/inventoryapp /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test and restart
sudo nginx -t
sudo systemctl restart nginx
```

---

## Step 7: Set Up Systemd Service (5 minutes)

```bash
# Copy service file
sudo cp /var/www/inventoryapp/deployment/inventoryapp.service /etc/systemd/system/

# Start service
sudo systemctl daemon-reload
sudo systemctl start inventoryapp
sudo systemctl enable inventoryapp

# Verify it's running
sudo systemctl status inventoryapp
```

---

## Step 8: Install SSL Certificate (5 minutes)

```bash
# Get certificate (replace YOUR_DOMAIN.com)
sudo certbot --nginx -d YOUR_DOMAIN.com -d www.YOUR_DOMAIN.com

# Follow prompts:
# - Enter your email
# - Agree to terms
# - Choose to redirect HTTP to HTTPS (option 2)

# Test auto-renewal
sudo certbot renew --dry-run
```

---

## Step 9: Configure Firewall (2 minutes)

```bash
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
sudo ufw status
```

---

## Step 10: Test Everything (10 minutes)

```bash
# Test API
curl https://YOUR_DOMAIN.com/api/
# Should return: {"message":"Inventory Management System API is running."}

# Check logs
tail -f /var/www/inventoryapp/backend/logs/inventoryapp.log

# Check all services
sudo systemctl status inventoryapp
sudo systemctl status nginx
sudo systemctl status postgresql
```

**In browser:**
1. Visit `https://YOUR_DOMAIN.com`
2. Register new account
3. Login
4. Add inventory item
5. Test all features

---

## Step 11: Set Up Backups (10 minutes)

```bash
# Create backup script
mkdir -p /var/www/inventoryapp/scripts
nano /var/www/inventoryapp/scripts/backup_db.sh
```

**Paste this:**

```bash
#!/bin/bash
BACKUP_DIR="/var/www/inventoryapp/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
export PGPASSWORD='YOUR_DB_PASSWORD'
pg_dump -U inventoryuser inventoryapp > $BACKUP_DIR/inventoryapp_$DATE.sql
unset PGPASSWORD
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
```

```bash
# Make executable
chmod +x /var/www/inventoryapp/scripts/backup_db.sh

# Test it
/var/www/inventoryapp/scripts/backup_db.sh
ls -la /var/www/inventoryapp/backups/

# Schedule daily at 2 AM
crontab -e
# Add this line:
0 2 * * * /var/www/inventoryapp/scripts/backup_db.sh
```

---

## ✅ You're Live!

Your InventoryApp is now running at `https://YOUR_DOMAIN.com`

### Daily Monitoring Commands

```bash
# Check services
sudo systemctl status inventoryapp

# View logs
tail -f /var/www/inventoryapp/backend/logs/inventoryapp.log

# Check disk space
df -h

# Check resource usage
htop
```

### If Something Goes Wrong

```bash
# Restart backend
sudo systemctl restart inventoryapp

# Restart Nginx
sudo systemctl restart nginx

# Check logs for errors
sudo journalctl -u inventoryapp --since "1 hour ago"
tail -100 /var/www/inventoryapp/backend/logs/inventoryapp.log
```

---

## Important Security Notes

✅ **Done**: All code security fixes implemented  
⚠️ **Required**: You MUST use strong, unique secrets (Step 1)  
⚠️ **Required**: Change PostgreSQL password to something strong (Step 3)  
⚠️ **Required**: Keep server updated: `sudo apt update && sudo apt upgrade`  
⚠️ **Recommended**: Set up fail2ban for SSH protection  
⚠️ **Recommended**: Use SSH keys instead of passwords  

---

## Need Help?

- **Detailed Guide**: See `DEPLOYMENT.md`
- **Security Info**: See `SECURITY.md`
- **Full Checklist**: See `PRODUCTION_CHECKLIST.md`
- **Changes Made**: See `IMPLEMENTATION_SUMMARY.md`

---

## Common Issues

**502 Bad Gateway**: Backend not running
```bash
sudo systemctl restart inventoryapp
sudo systemctl status inventoryapp
```

**Database connection error**: Check DATABASE_URL in `.env`
```bash
cat /var/www/inventoryapp/backend/.env | grep DATABASE_URL
```

**Frontend shows wrong URL**: Rebuild with correct .env.production
```bash
cd frontend
nano .env.production  # Fix VITE_API_URL
npm run build
scp -r dist/* root@VPS:/var/www/inventoryapp/frontend/dist/
```

---

**Total Time**: 60-90 minutes  
**Difficulty**: Intermediate  
**Result**: Fully functional, secure, production-ready app! 🚀
