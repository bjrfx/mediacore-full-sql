📋 PRODUCTION DEPLOYMENT GUIDE
MediaCore API - MySQL Edition
Date: December 8, 2025

═══════════════════════════════════════════════════════════════════

## 🚀 DEPLOYMENT STEPS

### Step 1: Backend Deployment

#### 1.1 Update Backend Environment Variables
SSH into your cPanel server and edit `/backend/.env`:

```bash
ssh user@yourdomain.com
cd ~/public_html/mediacore-api/backend
nano .env
```

Update the following:
```properties
# Database Configuration
DB_HOST=sv63.ifastnet12.org
DB_USER=masakali_kiran
DB_PASSWORD=K143iran
DB_NAME=masakali_mediacore

# JWT Configuration - CHANGE THESE IN PRODUCTION!
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# API Configuration
API_URL=https://mediacoreapi-sql.masakalirestrobar.ca
NODE_ENV=production

# Admin Configuration
ADMIN_EMAIL=admin@mediacore.com
```

⚠️ **IMPORTANT:** Generate strong random values for JWT_SECRET and JWT_REFRESH_SECRET

#### 1.2 Restart Node.js Application
In cPanel:
1. Go to "Node.js Domains"
2. Find your application domain
3. Click "Restart"
4. Verify it shows as "Running"

#### 1.3 Test Backend API
```bash
curl https://mediacoreapi-sql.masakalirestrobar.ca/health
```

Should return:
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2025-12-08T..."
}
```

### Step 2: Frontend Deployment

#### 2.1 Ensure Frontend Build is Ready
```bash
cd frontend
npm run build
```

The `/build` folder should contain:
- index.html
- static/ folder with CSS and JS
- manifest.json
- service-worker.js

#### 2.2 Deploy Frontend Build
In cPanel File Manager:
1. Navigate to `/public_html`
2. Upload the contents of `frontend/build/` to your web root
3. Ensure index.html is in the root

OR via SSH:
```bash
cd ~/public_html
rm -rf * .htaccess
cp -r ~/mediacore-full-sql/frontend/build/* .
```

#### 2.3 Configure SPA Routing
Create `.htaccess` in `/public_html` if not exists:
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # Don't rewrite files or directories
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  
  # Rewrite everything else to index.html
  RewriteRule ^ index.html [QSA,L]
</IfModule>
```

#### 2.4 Test Frontend
Visit: https://yourdomain.com
Should load the MediaCore application

### Step 3: Verify Connectivity

#### 3.1 Test Login
```bash
curl -X POST https://mediacoreapi-sql.masakalirestrobar.ca/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mediacore.com","password":"Admin@MediaCore123!"}'
```

Should return access and refresh tokens.

#### 3.2 Test Admin Panel
1. Open: https://yourdomain.com/admin/users
2. Login with: admin@mediacore.com / Admin@MediaCore123!
3. Should see the Users panel load
4. Should see 1 admin user listed

### Step 4: Security Updates

#### 4.1 Change Admin Password
1. Login to the application
2. Go to Settings
3. Change password from "Admin@MediaCore123!" to a strong password
4. Store the new password securely

#### 4.2 Update JWT Secrets
Generate new JWT secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Update both JWT_SECRET and JWT_REFRESH_SECRET in .env and restart.

#### 4.3 Enable CORS for Production
If frontend and backend are on different domains (they are):
✅ Already enabled in `/backend/server.js` with `cors({ origin: '*' })`

For production security, you may want to restrict to your domain:
```javascript
cors({ 
  origin: 'https://yourdomain.com',
  credentials: true 
})
```

═══════════════════════════════════════════════════════════════════

## 🔍 VERIFICATION CHECKLIST

### Backend Checks
- [ ] Node.js application running in cPanel
- [ ] .env file has correct database credentials
- [ ] API URL is accessible via HTTPS
- [ ] Health endpoint returns healthy status
- [ ] Login endpoint returns valid JWT tokens
- [ ] Admin endpoints require authentication

### Frontend Checks
- [ ] Build folder deployed to web root
- [ ] Application loads without errors
- [ ] Login page appears
- [ ] Can login with admin credentials
- [ ] Admin panel loads users correctly
- [ ] No console errors related to API calls

### Database Checks
- [ ] MySQL database is accessible
- [ ] All 38 tables are present
- [ ] Admin user exists with correct role
- [ ] No Firebase tables/data remain

═══════════════════════════════════════════════════════════════════

## 🐛 TROUBLESHOOTING

### Issue: "Cannot GET /"
**Solution:** Frontend build not properly deployed
- Check .htaccess file exists
- Verify build/ contents copied to web root
- Check Apache mod_rewrite is enabled

### Issue: "API Error: Cannot connect to server"
**Solution:** Backend not running or CORS issue
- Verify Node.js app is "Running" in cPanel
- Check backend .env file
- Verify firewall allows 5001 port
- Check browser console for exact error

### Issue: "Invalid JWT Token"
**Solution:** JWT secrets changed or token expired
- Verify JWT_SECRET in backend .env
- Clear browser localStorage
- Re-login to get new tokens
- Check token expiry time

### Issue: "Failed to fetch users" (500 error)
**Solution:** Database column name mismatch
- Verify all .env database credentials
- Check database is MySQL (not Firebase)
- Review backend error logs in cPanel

### Issue: "Email already exists" on signup
**Solution:** User exists but password wrong
- Verify email is correct
- Use password reset if password forgotten
- Check database for existing users

═══════════════════════════════════════════════════════════════════

## 📊 MONITORING & MAINTENANCE

### Check Error Logs
SSH into server:
```bash
cd /backend
tail -f error.log  # if exists
# Or check cPanel error logs
```

### Monitor Database
```bash
mysql -h sv63.ifastnet12.org -u masakali_kiran -p -D masakali_mediacore
# Then check table sizes, row counts, etc.
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM media;
```

### Update Admin Password Regularly
In app settings, change admin password every 90 days.

### Backup Database
cPanel → MySQL Databases → Backup

### Monitor Disk Space
Check `/public_html/uploads` folder size:
```bash
du -sh ~/public_html/uploads/
```

═══════════════════════════════════════════════════════════════════

## 🎉 YOU'RE LIVE!

Your MediaCore application is now running on:
- Frontend: https://yourdomain.com
- Backend API: https://mediacoreapi-sql.masakalirestrobar.ca

Admin Credentials:
- Email: admin@mediacore.com
- Password: [Your updated password]

Start uploading media and managing content!
