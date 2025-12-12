#!/bin/bash
# Deployment script for Password Leak Checker

set -e

echo "🚀 Password Leak Checker v2.0 - Deployment Script"
echo "==================================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if build exists
if [ ! -d "dist" ]; then
    print_error "Build directory not found. Please run 'npm run build' first."
    exit 1
fi

# Parse command line arguments
DEPLOYMENT_TYPE=${1:-"local"}
ENVIRONMENT=${2:-"production"}

print_status "Deployment type: $DEPLOYMENT_TYPE"
print_status "Environment: $ENVIRONMENT"

case $DEPLOYMENT_TYPE in
    "local")
        print_status "Setting up local deployment..."
        # Create startup script
        cat > start-production.sh << 'EOF'
#!/bin/bash
echo "🔐 Starting Password Leak Checker Production Server..."
cd "$(dirname "$0")"
node server.js
EOF
        chmod +x start-production.sh
        print_success "Local deployment ready. Run: ./start-production.sh"
        ;;
        
    "docker")
        print_status "Creating Docker deployment..."
        # Create Dockerfile
        cat > Dockerfile << 'EOF'
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Build the application
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership of the app directory
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Start the application
CMD ["npm", "start"]
EOF
        
        # Create .dockerignore
        cat > .dockerignore << 'EOF'
node_modules
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.git
.gitignore
README.md
.env
.nyc_output
coverage
.vscode
.DS_Store
*.log
.git
.node_repl_history
.npm
.eslintcache
EOF
        
        # Create docker-compose.yml
        cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  password-checker:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - PORT=5000
    volumes:
      - ./data:/app/data
      - ./backups:/app/backups
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
EOF
        
        print_success "Docker files created. Build with: docker build -t password-checker ."
        print_success "Or use docker-compose: docker-compose up -d"
        ;;
        
    "static")
        print_status "Preparing static deployment..."
        # Ensure standalone files are ready
        cp standalone/index.html dist/index.html
        
        # Create static deployment instructions
        cat > DEPLOYMENT.md << 'EOF'
# Static Deployment Guide

## Files Ready for Deployment

The `dist/` directory contains all files needed for static hosting.

### Deployment Options

#### Netlify
1. Drag and drop the `dist/` folder to Netlify
2. Or connect your Git repository and set build command to `npm run build`

#### Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel --prod dist/`

#### GitHub Pages
1. Create a gh-pages branch
2. Copy dist/ contents to the branch
3. Enable GitHub Pages in repository settings

#### Traditional Web Hosting
1. Upload all files from `dist/` to your web server
2. Ensure your server serves index.html for all routes
3. Configure HTTPS (required for service worker)

### Security Headers for Nginx
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
```

### Apache (.htaccess)
```apache
Header always set X-Frame-Options "SAMEORIGIN"
Header always set X-XSS-Protection "1; mode=block"
Header always set X-Content-Type-Options "nosniff"
Header always set Referrer-Policy "no-referrer-when-downgrade"
Header always set Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'"
```
EOF
        
        print_success "Static deployment ready. See DEPLOYMENT.md for instructions."
        ;;
        
    "vercel")
        print_status "Setting up Vercel deployment..."
        
        cat > vercel.json << 'EOF'
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    },
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/server.js"
    },
    {
      "src": "/(.*)",
      "dest": "/dist/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  },
  "build": {
    "env": {
      "NODE_ENV": "production"
    }
  }
}
EOF
        
        print_success "Vercel configuration created. Deploy with: vercel --prod"
        ;;
        
    "heroku")
        print_status "Setting up Heroku deployment..."
        
        cat > Procfile << 'EOF'
web: npm start
EOF
        
        cat > app.json << 'EOF'
{
  "name": "Password Leak Checker",
  "description": "Privacy-first password breach checking service",
  "repository": "https://github.com/your-username/password-leak-checker",
  "logo": "https://your-domain.com/logo.png",
  "keywords": ["password", "security", "hibp", "k-anonymity"],
  "stack": "heroku-20",
  "buildpacks": [
    {
      "url": "heroku/nodejs"
    }
  ],
  "env": {
    "NODE_ENV": {
      "description": "Environment mode",
      "value": "production"
    }
  }
}
EOF
        
        print_success "Heroku configuration created. Deploy with: git push heroku main"
        ;;
        
    *)
        print_error "Unknown deployment type: $DEPLOYMENT_TYPE"
        echo "Available types: local, docker, static, vercel, heroku"
        exit 1
        ;;
esac

# Create environment file template for production
print_status "Creating production environment template..."
cat > .env.production << 'EOF'
# Production Environment Configuration
NODE_ENV=production
PORT=5000

# Database Configuration
DB_PATH=./data/passwords.db
DB_BACKUP=./backups

# Security Configuration
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
CORS_ORIGIN=https://your-domain.com
CORS_CREDENTIALS=true

# Feature Flags
STATIC_MODE=false
DEMO_MODE=true
STATISTICS_ENABLED=true
PASSWORD_ADDITION_ENABLED=false
EXPORT_DATA_ENABLED=false
EOF

print_success "Deployment configuration completed!"
echo ""
echo "📋 Next steps:"
case $DEPLOYMENT_TYPE in
    "local")
        echo "  1. Copy .env.production to .env and update values"
        echo "  2. Run: ./start-production.sh"
        ;;
    "docker")
        echo "  1. Build image: docker build -t password-checker ."
        echo "  2. Run container: docker run -p 5000:5000 password-checker"
        echo "  3. Or use docker-compose: docker-compose up -d"
        ;;
    "static")
        echo "  1. Upload dist/ contents to your web host"
        echo "  2. Configure HTTPS and security headers"
        echo "  3. Test the deployment"
        ;;
    "vercel")
        echo "  1. Install Vercel CLI: npm i -g vercel"
        echo "  2. Deploy: vercel --prod"
        echo "  3. Configure environment variables in Vercel dashboard"
        ;;
    "heroku")
        echo "  1. Create Heroku app: heroku create your-app-name"
        echo "  2. Push code: git push heroku main"
        echo "  3. Open app: heroku open"
        ;;
esac

echo ""
echo "🔒 Don't forget to:"
echo "  • Configure HTTPS for production"
echo "  • Set up proper CORS origins"
echo "  • Configure rate limiting"
echo "  • Set up monitoring and logging"
echo ""
print_success "Deployment script completed!"