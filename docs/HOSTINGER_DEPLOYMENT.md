# Hostinger Deployment Guide

## Prerequisites

Before deploying to Hostinger, ensure you have:

- [ ] Hostinger account with hosting plan and domain `admin.fs-communication.com`
- [ ] SSH access enabled (or FTP access)
- [ ] Node.js 18+ installed on server (check in Hostinger control panel)
- [ ] GitHub account with access to [https://github.com/abhakeemshah/FS](https://github.com/abhakeemshah/FS)
- [ ] Database credentials (MySQL or PostgreSQL on Hostinger)

## Step-by-Step Deployment

### 1. Identify Your Hostinger Setup

**In Hostinger Dashboard:**
- Go to **My Hosting** → Your domain
- Check **Control Panel** for:
  - SSH access credentials
  - Node.js version (via Terminal or Application managers)
  - Database credentials (MySQL/PostgreSQL)
  - Document root path (usually `public_html/`)

### 2. Connect via SSH

```bash
# On your local machine
ssh username@your-server-ip

# Or use your domain
ssh username@admin.fs-communication.com
```

### 3. Clone & Deploy

#### Option A: Automated (Git Integration)
```bash
# Go to home directory
cd ~

# Clone project
git clone https://github.com/abhakeemshah/FS.git FS-Communication
cd FS-Communication

# Run deployment script
chmod +x deploy.sh
./deploy.sh
```

#### Option B: Manual Steps
```bash
cd ~
git clone https://github.com/abhakeemshah/FS.git FS-Communication
cd FS-Communication

# Install dependencies
npm ci

# Create production environment
cp .env.example .env.local

# Edit with production values
nano .env.local
# Set NEXTAUTH_SECRET, DATABASE_URL, NEXTAUTH_URL=https://admin.fs-communication.com

# Build
npm run build

# Seed database (if needed)
npm run seed

# Start with PM2
npm install -g pm2
pm2 start ecosystem.config.js --name "fs-communication"
pm2 startup
pm2 save
```

### 4. Configure Reverse Proxy (Important for Hostinger)

Hostinger typically requires a reverse proxy to route requests to your Node.js app.

#### Using Apache (.htaccess)
Create `.htaccess` in your `public_html/` or document root:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # Skip rewrite for existing files/directories
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  
  # Forward all requests to Node.js app on port 3000
  RewriteRule ^(.*)$ http://localhost:3000/$1 [P,L]
</IfModule>
```

#### Using Nginx Configuration
If your Hostinger uses Nginx, add this to your server block:

```nginx
location / {
  proxy_pass http://localhost:3000;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection 'upgrade';
  proxy_set_header Host $host;
  proxy_cache_bypass $http_upgrade;
}
```

### 5. Enable SSL (Free with Hostinger)

```bash
# Hostinger usually provides free SSL via Let's Encrypt
# This may be automatic, but you can renew:
certbot renew --dry-run
```

### 6. Set Up Environment Variables on Server

Edit `.env.local` on the server with production values:

```bash
ssh username@admin.fs-communication.com
cd FS-Communication
nano .env.local

# Add production settings:
# NEXTAUTH_SECRET=your-rotated-secret
# DATABASE_URL=mysql://user:password@host:3306/db_name
# NEXTAUTH_URL=https://admin.fs-communication.com
# NODE_ENV=production
```

### 7. Monitor & Maintain

#### Check App Status
```bash
pm2 status
pm2 logs fs-communication
```

#### Restart App
```bash
pm2 restart fs-communication
```

#### View Error Logs
```bash
tail -f logs/pm2-error.log
```

#### Update Code
```bash
cd ~/FS-Communication
git pull origin main
npm ci
npm run build
pm2 restart fs-communication
```

## Database Setup on Hostinger

### For MySQL (Recommended)

1. **Create Database in Hostinger Panel:**
   - Go to Databases section
   - Create new MySQL database
   - Note: hostname, username, password, database name

2. **Update `.env.local`:**
   ```
   DATABASE_URL="mysql://username:password@hostname:3306/database_name"
   ```

3. **Run Migrations:**
   ```bash
   npx prisma migrate deploy
   npm run seed
   ```

### For SQLite (Not Recommended for Production)
Only use for testing:
```
DATABASE_URL="file:./prisma/prod.db"
```

## Troubleshooting

### "Connection refused" on port 3000
- Verify Node.js is running: `pm2 status`
- Check reverse proxy is configured correctly
- Restart app: `pm2 restart fs-communication`

### "Cannot connect to database"
- Verify DATABASE_URL in `.env.local`
- Check database credentials in Hostinger panel
- Test connection: `mysql -h hostname -u username -p`

### "NEXTAUTH_SECRET not set"
- Verify `.env.local` has `NEXTAUTH_SECRET=your-secret`
- Restart app: `pm2 restart fs-communication`

### "Static files 404"
- Check Next.js build succeeded: `npm run build`
- Verify `.next/` folder exists
- Restart: `pm2 restart fs-communication`

### Domain not routing to app
- Check DNS points to correct IP
- Verify SSL certificate is valid
- Test reverse proxy: `curl http://localhost:3000`

## Performance Tips

1. **Enable Compression:**
   ```bash
   npm install compression
   ```

2. **Monitor Memory:**
   ```bash
   pm2 monit
   ```

3. **Set Up Auto-Restart on Crash:**
   - Already configured in `ecosystem.config.js`

4. **Enable Caching:**
   - Next.js caches in `.next/` folder
   - Browser cache via HTTP headers

## Security Checklist

- [ ] `NEXTAUTH_SECRET` is strong (32+ characters)
- [ ] `.env.local` is not committed to git
- [ ] SSL certificate is valid (HTTPS enabled)
- [ ] Database credentials are strong
- [ ] SSH key-based auth (not password) if possible
- [ ] Firewall only allows needed ports (80, 443, 22)
- [ ] Regular backups scheduled
- [ ] NEXTAUTH_URL matches your domain

## Backup & Recovery

```bash
# Create backup
tar -czf fs-communication-backup.tar.gz ~/FS-Communication/

# Download backup
scp username@server:~/fs-communication-backup.tar.gz ./

# Restore backup
tar -xzf fs-communication-backup.tar.gz
cd FS-Communication
npm ci
pm2 restart fs-communication
```

## Next Steps

Once deployed:
1. Visit https://admin.fs-communication.com
2. Test admin and staff login flows
3. Verify database connectivity
4. Monitor logs: `pm2 logs`
5. Set up automated backups on Hostinger

## Support

For Hostinger-specific issues:
- Check [Hostinger Documentation](https://support.hostinger.com)
- Verify Node.js is enabled in control panel
- Contact Hostinger support if reverse proxy isn't working

For app issues:
- Check [CONTRIBUTING.md](../CONTRIBUTING.md) for development setup
- Check [ARCHITECTURE.md](../ARCHITECTURE.md) for code structure
- Review [AUTH.md](../docs/AUTH.md) for authentication configuration
