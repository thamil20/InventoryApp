# InventoryApp VPS Deployment Guide

This guide covers deploying InventoryApp to a Linux VPS server (Ubuntu/Debian) with PostgreSQL, Nginx, and SSL.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Security Setup](#security-setup)
- [Database Migration](#database-migration)
- [Backend Deployment](#backend-deployment)
- [Frontend Deployment](#frontend-deployment)
- [SSL Certificate](#ssl-certificate)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### VPS Requirements
- Ubuntu 20.04+ or Debian 11+
- Minimum 1GB RAM (2GB recommended)
- 20GB disk space
- Root or sudo access
- Domain name pointed to VPS IP

### Local Requirements
- Git installed
- Node.js 18+ and npm
- Python 3.9+
- SSH access to VPS

---

## Security Setup

### 1. Generate Secure Secret Keys

**CRITICAL: Do this BEFORE deployment**

```bash
# Generate SECRET_KEY
python -c "import secrets; print('SECRET_KEY=' + secrets.token_hex(32))"

# Generate JWT_SECRET_KEY
python -c "import secrets; print('JWT_SECRET_KEY=' + secrets.token_hex(32))"
```

Save these keys securely - you'll need them in step 5.

### 2. Update Environment Files

**Backend (.env):**
```bash
cd backend
cp .env.example .env
nano .env
```

Update:
```env
FLASK_ENV=production
FLASK_DEBUG=0
SECRET_KEY=<your-generated-secret-key>
JWT_SECRET_KEY=<your-generated-jwt-secret>
DATABASE_URL=postgresql://inventoryuser:YOUR_DB_PASSWORD@localhost:5432/inventoryapp
ALLOWED_ORIGINS=https://yourdomain.com
PORT=8000
LOG_LEVEL=INFO
```

**Frontend (.env.production):**
```bash
cd frontend
nano .env.production
```

Update:
```env
VITE_API_URL=https://yourdomain.com/api
```

---

## Database Migration

### 3. Install PostgreSQL on VPS

```bash
# SSH into your VPS
ssh root@your-vps-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 4. Create Database and User

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL prompt:
CREATE DATABASE inventoryapp;
CREATE USER inventoryuser WITH PASSWORD 'YOUR_SECURE_PASSWORD';
ALTER ROLE inventoryuser SET client_encoding TO 'utf8';
ALTER ROLE inventoryuser SET default_transaction_isolation TO 'read committed';
ALTER ROLE inventoryuser SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE inventoryapp TO inventoryuser;
\q
```

### 5. Backup SQLite Data (if migrating from development)

**On local machine:**
```bash
# Export data from SQLite (create a migration script if needed)
# Or start fresh with PostgreSQL in production
```

---

## Backend Deployment

### 6. Install System Dependencies

```bash
# Install Python and build tools
sudo apt install python3-pip python3-venv python3-dev build-essential -y

# Install Nginx
sudo apt install nginx -y
```

### 7. Create Application Directory

```bash
# Create directory structure
sudo mkdir -p /var/www/inventoryapp
sudo chown -R $USER:$USER /var/www/inventoryapp

# Clone or upload your code
cd /var/www/inventoryapp
git clone https://github.com/YOUR_USERNAME/InventoryApp.git .
# OR use scp/rsync to upload files
```

### 8. Set Up Python Virtual Environment

```bash
cd /var/www/inventoryapp/backend

# Create virtual environment
python3 -m venv ../venv
source ../venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Install psycopg2 for PostgreSQL
pip install psycopg2-binary
```

### 9. Configure Environment

```bash
# Copy your prepared .env file to the VPS
# or create it directly on the server
nano .env

# Paste your production environment variables
# Press Ctrl+X, then Y, then Enter to save
```

### 10. Initialize Database

```bash
# Still in backend directory with venv activated
python -c "from config import app, db; app.app_context().push(); db.create_all()"

# Verify tables were created
python -c "from config import app, db; from models import User; app.app_context().push(); print('Tables:', db.metadata.tables.keys())"
```

### 11. Test Backend

```bash
# Test with Gunicorn
gunicorn -c gunicorn_config.py main:app --bind 0.0.0.0:8000

# In another terminal, test endpoint
curl http://localhost:8000/
# Should return: {"message":"Inventory Management System API is running."}

# Ctrl+C to stop
```

### 12. Set Up Systemd Service

```bash
# Copy service file
sudo cp /var/www/inventoryapp/deployment/inventoryapp.service /etc/systemd/system/

# Edit if needed (adjust paths/user)
sudo nano /etc/systemd/system/inventoryapp.service

# Reload systemd
sudo systemctl daemon-reload

# Start service
sudo systemctl start inventoryapp

# Enable on boot
sudo systemctl enable inventoryapp

# Check status
sudo systemctl status inventoryapp
```

---

## Frontend Deployment

### 13. Build React Application

**On local machine:**
```bash
cd frontend

# Install dependencies
npm install

# Build for production (uses .env.production)
npm run build

# dist/ folder is created with optimized static files
```

### 14. Upload Frontend Build

```bash
# Upload dist folder to VPS
scp -r dist root@your-vps-ip:/var/www/inventoryapp/frontend/

# OR if using git, build on VPS:
# cd /var/www/inventoryapp/frontend
# npm install
# npm run build
```

### 15. Configure Nginx

```bash
# Copy Nginx configuration
sudo cp /var/www/inventoryapp/deployment/nginx.conf /etc/nginx/sites-available/inventoryapp

# Edit configuration - update domain names
sudo nano /etc/nginx/sites-available/inventoryapp
# Replace "your-domain.com" with your actual domain

# Create symbolic link
sudo ln -s /etc/nginx/sites-available/inventoryapp /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx
```

---

## SSL Certificate

### 16. Install Certbot (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow prompts:
# - Enter email
# - Agree to terms
# - Choose redirect (option 2)

# Test auto-renewal
sudo certbot renew --dry-run
```

Certificate auto-renewal is configured automatically via cron/systemd timer.

---

## Monitoring & Maintenance

### 17. Set Up Logging

```bash
# Create logs directory
mkdir -p /var/www/inventoryapp/backend/logs

# View application logs
tail -f /var/www/inventoryapp/backend/logs/inventoryapp.log

# View Gunicorn logs
tail -f /var/www/inventoryapp/backend/logs/gunicorn_error.log

# View Nginx logs
sudo tail -f /var/log/nginx/inventoryapp_access.log
sudo tail -f /var/log/nginx/inventoryapp_error.log

# View systemd service logs
sudo journalctl -u inventoryapp -f
```

### 18. Configure Log Rotation

```bash
# Create logrotate config
sudo nano /etc/logrotate.d/inventoryapp

# Add:
/var/www/inventoryapp/backend/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        systemctl reload inventoryapp > /dev/null 2>&1 || true
    endscript
}
```

### 19. Database Backups

```bash
# Create backup script
nano /var/www/inventoryapp/scripts/backup_db.sh

# Add:
#!/bin/bash
BACKUP_DIR="/var/www/inventoryapp/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
pg_dump -U inventoryuser inventoryapp > $BACKUP_DIR/inventoryapp_$DATE.sql
# Keep only last 7 days
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete

# Make executable
chmod +x /var/www/inventoryapp/scripts/backup_db.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add line:
0 2 * * * /var/www/inventoryapp/scripts/backup_db.sh
```

### 20. Monitoring Commands

```bash
# Check service status
sudo systemctl status inventoryapp
sudo systemctl status nginx
sudo systemctl status postgresql

# Restart services
sudo systemctl restart inventoryapp
sudo systemctl restart nginx

# Check resource usage
htop

# Check disk space
df -h

# Check database size
sudo -u postgres psql -c "SELECT pg_size_pretty(pg_database_size('inventoryapp'));"

# Active connections
sudo -u postgres psql inventoryapp -c "SELECT count(*) FROM pg_stat_activity;"
```

---

## Troubleshooting

### Common Issues

#### 1. 502 Bad Gateway
```bash
# Check if backend is running
sudo systemctl status inventoryapp

# Check backend logs
tail -f /var/www/inventoryapp/backend/logs/gunicorn_error.log

# Check if Gunicorn is listening
sudo netstat -tlnp | grep 8000

# Restart backend
sudo systemctl restart inventoryapp
```

#### 2. Database Connection Errors
```bash
# Verify PostgreSQL is running
sudo systemctl status postgresql

# Test connection
sudo -u postgres psql inventoryapp

# Check DATABASE_URL in .env
cat /var/www/inventoryapp/backend/.env | grep DATABASE_URL

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*-main.log
```

#### 3. Frontend Shows Wrong API URL
```bash
# Rebuild frontend with correct .env.production
cd /var/www/inventoryapp/frontend
nano .env.production  # Verify VITE_API_URL
npm run build

# Copy new build
sudo cp -r dist/* /var/www/inventoryapp/frontend/dist/

# Clear browser cache
```

#### 4. CORS Errors
```bash
# Check ALLOWED_ORIGINS in backend .env
cat /var/www/inventoryapp/backend/.env | grep ALLOWED_ORIGINS

# Should match your frontend domain exactly
# Update and restart:
nano /var/www/inventoryapp/backend/.env
sudo systemctl restart inventoryapp
```

#### 5. Permission Errors
```bash
# Fix ownership
sudo chown -R www-data:www-data /var/www/inventoryapp

# Fix permissions
sudo chmod -R 755 /var/www/inventoryapp
sudo chmod 600 /var/www/inventoryapp/backend/.env
```

#### 6. Rate Limiting Issues
```bash
# Check logs for "rate limit exceeded"
tail -f /var/www/inventoryapp/backend/logs/inventoryapp.log

# Adjust limits in .env if needed
nano /var/www/inventoryapp/backend/.env
# Update RATE_LIMIT_* variables
sudo systemctl restart inventoryapp
```

---

## Security Checklist

Before going live, verify:

- [ ] SECRET_KEY is strong random string (not default)
- [ ] JWT_SECRET_KEY is strong random string (not default)
- [ ] FLASK_DEBUG=0 in production .env
- [ ] FLASK_ENV=production in .env
- [ ] ALLOWED_ORIGINS set to your domain only (no *)
- [ ] PostgreSQL using strong password
- [ ] .env file has 600 permissions (not world-readable)
- [ ] Firewall configured (UFW or iptables)
- [ ] SSH key authentication enabled (password disabled)
- [ ] SSL certificate installed and working
- [ ] Database backups automated
- [ ] Log rotation configured
- [ ] No sensitive data in git repository
- [ ] .env added to .gitignore

---

## Updating Application

### Deploy Updates

```bash
# SSH to VPS
ssh root@your-vps-ip

cd /var/www/inventoryapp

# Pull latest code
git pull

# Update backend dependencies if changed
source venv/bin/activate
cd backend
pip install -r requirements.txt

# Restart backend
sudo systemctl restart inventoryapp

# Update frontend if changed
cd ../frontend
npm install
npm run build
# Files automatically served from dist/

# Check everything is working
sudo systemctl status inventoryapp
curl https://yourdomain.com/api/
```

---

## Performance Optimization

### Gunicorn Workers

```python
# In gunicorn_config.py, adjust workers based on server resources
# Current: workers = CPU_COUNT * 2 + 1
# For 1 CPU: 3 workers
# For 2 CPU: 5 workers
# Monitor memory usage and adjust
```

### PostgreSQL Tuning

```bash
sudo nano /etc/postgresql/*/main/postgresql.conf

# Adjust based on available RAM:
shared_buffers = 256MB          # 25% of RAM
effective_cache_size = 1GB      # 50-75% of RAM
max_connections = 100

sudo systemctl restart postgresql
```

### Nginx Caching

```nginx
# Add to nginx.conf location / block:
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

---

## Support

For issues or questions:
1. Check logs first (see Monitoring section)
2. Review common issues in Troubleshooting
3. Check application status: `sudo systemctl status inventoryapp`
4. Verify database connectivity
5. Test API endpoints with curl

**Useful Resources:**
- [Flask Documentation](https://flask.palletsprojects.com/)
- [Gunicorn Documentation](https://docs.gunicorn.org/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Let's Encrypt](https://letsencrypt.org/docs/)
