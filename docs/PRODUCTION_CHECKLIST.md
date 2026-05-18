# Production Checklist

Before deploying to Hostinger at admin.fs-communication.com, ensure all items are completed.

## Pre-Deployment (Local)

### Code & Security
- [ ] All TypeScript compiles: `npm run lint`
- [ ] No console errors or warnings: `npm run dev`
- [ ] `.env.local` exists and is NOT committed
- [ ] Secrets are rotated (not defaults)
- [ ] No hardcoded API keys or secrets in code
- [ ] .gitignore includes: `node_modules/`, `.next/`, `.env.local`, `*.log`

### Documentation
- [ ] README.md is up to date
- [ ] CONTRIBUTING.md exists with git workflow
- [ ] ARCHITECTURE.md documents key patterns
- [ ] AUTH.md explains authentication
- [ ] HOSTINGER_DEPLOYMENT.md is current

### Testing
- [ ] Local dev server works: `npm run dev`
- [ ] Build succeeds: `npm run build`
- [ ] No build output warnings or errors
- [ ] Database queries work
- [ ] Admin login flow works
- [ ] Staff login flow works

## Pre-Deployment (Hostinger Setup)

### Hosting Configuration
- [ ] Hostinger domain: admin.fs-communication.com (confirmed)
- [ ] Hosting plan confirmed (Shared/VPS/Cloud)
- [ ] Node.js version identified (18+)
- [ ] SSH access enabled and credentials saved
- [ ] MySQL or PostgreSQL database created
- [ ] Database credentials noted (hostname, user, password, dbname)

### Environment Preparation
- [ ] `.env.production` file created locally
- [ ] `NEXTAUTH_SECRET` rotated (new random value)
- [ ] `NEXTAUTH_URL=https://admin.fs-communication.com`
- [ ] `DATABASE_URL` set to production database
- [ ] `NODE_ENV=production` set
- [ ] All required environment variables documented

### Deployment Files Ready
- [ ] `deploy.sh` is executable
- [ ] `ecosystem.config.js` is configured
- [ ] `.env.production` is ready (not committed)
- [ ] `.env.example` has all required keys

## Deployment

### Initial Deployment
- [ ] SSH into Hostinger server
- [ ] Clone repository: `git clone https://github.com/abhakeemshah/FS.git`
- [ ] Enter directory: `cd FS-Communication`
- [ ] Copy env template: `cp .env.example .env.local`
- [ ] Edit with production values: `nano .env.local`
- [ ] Install dependencies: `npm ci`
- [ ] Build application: `npm run build`
- [ ] Migrate database: `npx prisma migrate deploy`
- [ ] Seed database: `npm run seed`
- [ ] Install PM2: `npm install -g pm2`
- [ ] Start with PM2: `pm2 start ecosystem.config.js`
- [ ] Enable auto-start: `pm2 startup` + `pm2 save`

### Reverse Proxy Configuration
- [ ] Apache `.htaccess` OR Nginx config is in place
- [ ] Requests forward to `http://localhost:3000`
- [ ] SSL certificate is valid (Let's Encrypt)
- [ ] HTTPS redirects work

### Domain & SSL
- [ ] Domain DNS points to correct server IP
- [ ] SSL certificate valid for admin.fs-communication.com
- [ ] HTTPS works: `https://admin.fs-communication.com`
- [ ] HTTP redirects to HTTPS

## Post-Deployment Verification

### Functionality
- [ ] App loads at https://admin.fs-communication.com
- [ ] Admin login page works
- [ ] Staff login page works
- [ ] Dashboard loads after login
- [ ] Create/read/update/delete operations work
- [ ] Database queries succeed
- [ ] File uploads work (if applicable)

### Performance & Stability
- [ ] Page load time < 3 seconds
- [ ] No 500 errors in logs
- [ ] No database connection errors
- [ ] App stays running after page refresh
- [ ] Multiple concurrent users don't crash app

### Monitoring
- [ ] PM2 logs clean: `pm2 logs fs-communication`
- [ ] No JavaScript errors in browser console
- [ ] Server memory usage < 500MB
- [ ] CPU usage normal
- [ ] Disk space available

### Backups & Recovery
- [ ] Backup script scheduled (daily/weekly)
- [ ] Database backups configured
- [ ] Backup files stored securely
- [ ] Tested recovery procedure

## Ongoing Maintenance

### Weekly
- [ ] Check PM2 logs: `pm2 logs`
- [ ] Monitor disk space
- [ ] Review error logs

### Monthly
- [ ] Create database backup
- [ ] Review security vulnerabilities
- [ ] Update dependencies: `npm update`
- [ ] Test backup recovery

### Quarterly
- [ ] Rotate NEXTAUTH_SECRET
- [ ] Review access logs
- [ ] Performance optimization review
- [ ] Security audit

### When Issues Occur

#### App Won't Start
```bash
pm2 stop fs-communication
pm2 logs fs-communication
pm2 restart fs-communication
```

#### Database Connection Error
- Verify DATABASE_URL in `.env.local`
- Check database credentials in Hostinger panel
- Test connection: `mysql -h hostname -u user -p`

#### High Memory Usage
```bash
pm2 monit
pm2 restart fs-communication
```

#### SSL Certificate Issue
- Check expiration: Hostinger panel → SSL
- Let's Encrypt auto-renewal should handle this
- Restart web server if needed

#### Logs Location
```bash
pm2 logs fs-communication
tail -f ~/FS-Communication/logs/pm2-error.log
tail -f ~/FS-Communication/logs/pm2-out.log
```

## Emergency Procedures

### Rollback to Previous Version
```bash
cd ~/FS-Communication
git log --oneline | head -5  # See recent commits
git reset --hard <commit-hash>
npm ci
npm run build
pm2 restart fs-communication
```

### Clear Cache & Rebuild
```bash
rm -rf .next
npm run build
pm2 restart fs-communication
```

### Database Restore
```bash
# From backup
mysql -u user -p database < backup.sql
npx prisma migrate deploy
pm2 restart fs-communication
```

## Success Criteria

✅ **Deployment Complete When:**
- [ ] App responds at https://admin.fs-communication.com
- [ ] Login flows work for admin and staff
- [ ] All core features functional
- [ ] No errors in PM2 logs
- [ ] Performance acceptable (< 3s load time)
- [ ] SSL certificate valid
- [ ] Database connected and working
- [ ] Backups scheduled
- [ ] Team can access and use app

## Support Resources

- **Hostinger Support:** https://support.hostinger.com
- **Deployment Guide:** [HOSTINGER_DEPLOYMENT.md](HOSTINGER_DEPLOYMENT.md)
- **Architecture:** [ARCHITECTURE.md](../ARCHITECTURE.md)
- **Authentication:** [AUTH.md](AUTH.md)
- **Security:** [SECURITY.md](../SECURITY.md)
