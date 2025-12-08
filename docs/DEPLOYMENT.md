# Deployment Guide

## Production Checklist

Before deploying to production, ensure:

- [ ] All environment variables configured
- [ ] Database migrations completed
- [ ] SSL certificates configured
- [ ] Rate limiting enabled
- [ ] Monitoring configured
- [ ] Backup strategy implemented
- [ ] Performance benchmarks met

## Environment Configuration

### Required Environment Variables

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Authentication
NEXTAUTH_SECRET=your-secure-secret
NEXTAUTH_URL=https://yourdomain.com

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Security
CSRF_SECRET=your-csrf-secret
RATE_LIMIT_SECRET=your-rate-limit-secret

# Performance
ENABLE_ANALYTICS=true
LOG_LEVEL=info
```

### Optional Environment Variables

```bash
# Performance Monitoring
SENTRY_DSN=your-sentry-dsn
PERFORMANCE_BUDGET_WARNING=300
PERFORMANCE_BUDGET_ERROR=500

# Database Optimization
DB_POOL_MAX_CONNECTIONS=20
DB_QUERY_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=10000

# Caching
REDIS_URL=redis://host:6379
CACHE_TTL=3600

# External Services
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-pass
```

## Platform-Specific Deployment

### Vercel

1. **Setup**
   ```bash
   npm install -g vercel
   vercel login
   ```

2. **Configure**
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add SUPABASE_SERVICE_ROLE_KEY
   vercel env add NEXTAUTH_SECRET
   # Add all required environment variables
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

4. **Domain Configuration**
   ```bash
   vercel domains add yourdomain.com
   ```

### Netlify

1. **Build Configuration** (netlify.toml)
   ```toml
   [build]
     command = "npm run build"
     publish = ".next"
   
   [build.environment]
     NODE_VERSION = "18"
   
   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

2. **Environment Variables**
   Configure in Netlify dashboard under Site Settings > Environment Variables

### Docker Deployment

1. **Dockerfile**
   ```dockerfile
   FROM node:18-alpine AS deps
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   
   FROM node:18-alpine AS builder
   WORKDIR /app
   COPY . .
   COPY --from=deps /app/node_modules ./node_modules
   RUN npm run build
   
   FROM node:18-alpine AS runner
   WORKDIR /app
   ENV NODE_ENV production
   
   RUN addgroup -g 1001 -S nodejs
   RUN adduser -S nextjs -u 1001
   
   COPY --from=builder /app/public ./public
   COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
   COPY --from=builder /app/node_modules ./node_modules
   COPY --from=builder /app/package.json ./package.json
   
   USER nextjs
   EXPOSE 3000
   ENV PORT 3000
   
   CMD ["npm", "start"]
   ```

2. **Docker Compose**
   ```yaml
   version: '3.8'
   services:
     app:
       build: .
       ports:
         - "3000:3000"
       environment:
         - NODE_ENV=production
       env_file:
         - .env.production
   ```

### AWS (EC2 + RDS)

1. **Setup EC2 Instance**
   - Choose Ubuntu 20.04 LTS
   - Configure security groups (port 80, 443, 22)
   - Install Node.js and PM2

2. **Application Setup**
   ```bash
   # On EC2 instance
   sudo apt update
   sudo apt install nodejs npm nginx
   sudo npm install -g pm2
   
   # Deploy application
   git clone your-repo
   cd dealvize
   npm install
   npm run build
   
   # Start with PM2
   pm2 start npm --name "dealvize" -- start
   pm2 startup
   pm2 save
   ```

3. **Nginx Configuration**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

## Database Setup

### Supabase Production

1. **Create Production Project**
   - Go to Supabase dashboard
   - Create new project
   - Note connection details

2. **Run Migrations**
   ```bash
   npx supabase db push
   ```

3. **Configure RLS Policies**
   ```sql
   -- Enable RLS on all tables
   ALTER TABLE users ENABLE ROW LEVEL SECURITY;
   ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
   ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
   ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
   
   -- Add policies for each table
   ```

### Self-Hosted PostgreSQL

1. **Install PostgreSQL**
   ```bash
   sudo apt install postgresql postgresql-contrib
   ```

2. **Configure Database**
   ```sql
   CREATE DATABASE dealvize;
   CREATE USER dealvize_user WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE dealvize TO dealvize_user;
   ```

3. **Run Migrations**
   ```bash
   npm run db:migrate
   ```

## SSL Configuration

### Let's Encrypt (Certbot)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### Cloudflare

1. Add domain to Cloudflare
2. Update DNS records
3. Enable SSL/TLS (Full Strict)
4. Configure additional security rules

## Monitoring Setup

### Application Monitoring

1. **Sentry Integration**
   ```bash
   npm install @sentry/nextjs
   ```

2. **Configure Sentry**
   ```javascript
   // sentry.client.config.ts
   import { init } from "@sentry/nextjs";
   
   init({
     dsn: process.env.SENTRY_DSN,
     environment: process.env.NODE_ENV,
   });
   ```

### Performance Monitoring

1. **Enable Performance Tracking**
   ```javascript
   // lib/monitoring.ts
   export const performanceConfig = {
     enableTracking: process.env.NODE_ENV === 'production',
     sampleRate: 0.1,
     trackWebVitals: true
   };
   ```

2. **Dashboard Setup**
   - Configure New Relic or similar
   - Set up alerts for key metrics
   - Monitor database performance

## Backup Strategy

### Database Backups

1. **Automated Supabase Backups**
   - Enabled by default in Supabase Pro
   - Configure backup retention

2. **Manual Backup Script**
   ```bash
   #!/bin/bash
   pg_dump $DATABASE_URL | gzip > backup-$(date +%Y%m%d).sql.gz
   aws s3 cp backup-$(date +%Y%m%d).sql.gz s3://your-backups/
   ```

### File Backups

```bash
# Backup uploaded files
rsync -av uploads/ user@backup-server:/backups/uploads/
```

## Post-Deployment Verification

1. **Health Checks**
   ```bash
   curl https://yourdomain.com/api/health
   ```

2. **Performance Tests**
   ```bash
   npm run benchmark
   ```

3. **Security Scan**
   ```bash
   npm audit
   ```

4. **Load Testing**
   ```bash
   npx autocannon https://yourdomain.com
   ```

## Troubleshooting

### Common Issues

1. **Environment Variables Not Loading**
   - Check .env.production file
   - Verify platform-specific configuration
   - Restart application after changes

2. **Database Connection Issues**
   - Verify connection string
   - Check firewall rules
   - Confirm SSL requirements

3. **Build Failures**
   - Check Node.js version compatibility
   - Clear cache: `npm run clean`
   - Review build logs

### Logs and Debugging

1. **Application Logs**
   ```bash
   # PM2
   pm2 logs dealvize
   
   # Docker
   docker logs container-name
   ```

2. **Database Logs**
   ```bash
   # PostgreSQL
   sudo tail -f /var/log/postgresql/postgresql-13-main.log
   ```

## Rollback Procedure

1. **Application Rollback**
   ```bash
   # PM2
   pm2 stop dealvize
   git checkout previous-commit
   npm install
   npm run build
   pm2 restart dealvize
   ```

2. **Database Rollback**
   ```bash
   # Restore from backup
   gunzip -c backup-YYYYMMDD.sql.gz | psql $DATABASE_URL
   ```