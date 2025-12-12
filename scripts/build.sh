#!/bin/bash
# Build script for Password Leak Checker v2.0

set -e

echo "🔐 Password Leak Checker v2.0 - Build Script"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="16.0.0"

if ! node -e "process.exit(process.version.slice(1).split('.').map(Number).some((v, i, arr) => v < ['$REQUIRED_VERSION'.split('.').map(Number)][i]))" 2>/dev/null; then
    print_error "Node.js version $NODE_VERSION is not supported. Please upgrade to Node.js 16+."
    exit 1
fi

print_success "Node.js version $NODE_VERSION detected"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

print_success "npm version $(npm -v) detected"

# Create necessary directories
print_status "Creating directories..."
mkdir -p dist
mkdir -p data
mkdir -p backups

# Install dependencies
print_status "Installing dependencies..."
if npm install; then
    print_success "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Run linting if available
if npm run lint --silent 2>/dev/null; then
    print_success "Linting passed"
else
    print_warning "Linting not available or failed (continuing...)"
fi

# Build the application
print_status "Building application..."
if npm run build; then
    print_success "Application built successfully"
else
    print_error "Build failed"
    exit 1
fi

# Copy standalone version
print_status "Copying standalone version..."
cp standalone/index.html dist/index.html

# Create service worker for static version
print_status "Creating service worker..."
cat > dist/sw.js << 'EOF'
// Service Worker for Password Leak Checker
const CACHE_NAME = 'password-checker-v2.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      }
    )
  );
});
EOF

# Create a simple start script
print_status "Creating startup scripts..."
cat > start.sh << 'EOF'
#!/bin/bash
# Start script for Password Leak Checker

case "$1" in
  "dev")
    echo "🚀 Starting development mode..."
    npm run dev
    ;;
  "prod")
    echo "🚀 Starting production mode..."
    npm start
    ;;
  "static")
    echo "🚀 Starting static server..."
    npm run serve:static
    ;;
  "standalone")
    echo "🚀 Opening standalone version..."
    if command -v python3 &> /dev/null; then
      python3 -m http.server 8080 -d standalone
    elif command -v python &> /dev/null; then
      python -m SimpleHTTPServer 8080
    else
      echo "Python not found. Please open standalone/index.html in your browser."
    fi
    ;;
  *)
    echo "Usage: $0 {dev|prod|static|standalone}"
    echo ""
    echo "  dev       - Start development servers (React + API)"
    echo "  prod      - Start production server"
    echo "  static    - Serve static build files"
    echo "  standalone- Open standalone HTML version"
    exit 1
    ;;
esac
EOF

chmod +x start.sh

# Create installation verification
print_status "Creating installation verification..."
cat > verify_installation.js << 'EOF'
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔐 Password Leak Checker v2.0 - Installation Verification');
console.log('==========================================================');

const checks = [
  {
    name: 'Node.js Version',
    check: () => {
      const version = process.version;
      const major = parseInt(version.slice(1).split('.')[0]);
      return major >= 16;
    },
    required: 'Node.js 16+'
  },
  {
    name: 'Package.json',
    check: () => fs.existsSync('./package.json'),
    required: true
  },
  {
    name: 'Main Server File',
    check: () => fs.existsSync('./server.js'),
    required: true
  },
  {
    name: 'React Components',
    check: () => fs.existsSync('./src/App.js'),
    required: true
  },
  {
    name: 'Build Directory',
    check: () => fs.existsSync('./dist'),
    required: true
  },
  {
    name: 'Standalone Version',
    check: () => fs.existsSync('./standalone/index.html'),
    required: true
  }
];

let passed = 0;
let total = checks.length;

checks.forEach((check, index) => {
  const result = check.check();
  const status = result ? '✅ PASS' : '❌ FAIL';
  console.log(`${index + 1}. ${check.name}: ${status}`);
  if (!result) {
    console.log(`   Required: ${check.required}`);
  }
  if (result) passed++;
});

console.log(`\nResults: ${passed}/${total} checks passed`);

if (passed === total) {
  console.log('\n🎉 Installation successful! You can now:');
  console.log('   npm run dev     - Start development mode');
  console.log('   npm run build   - Build for production');
  console.log('   ./start.sh dev  - Quick development start');
  console.log('   ./start.sh standalone - Try standalone version');
} else {
  console.log('\n⚠️  Some checks failed. Please review the errors above.');
  process.exit(1);
}
EOF

chmod +x verify_installation.js

# Final summary
print_success "Build completed successfully!"
echo ""
echo "📦 Available versions:"
echo "  1. Full React App: npm run dev (development)"
echo "  2. Production Build: npm run build && npm start"
echo "  3. Static Server: npm run serve:static"
echo "  4. Standalone: ./start.sh standalone"
echo ""
echo "🔧 Quick start:"
echo "  ./start.sh dev    # Development mode"
echo "  ./start.sh standalone  # Try standalone version"
echo ""
echo "📚 Documentation:"
echo "  README.md         # Full documentation"
echo "  docs/             # Additional docs"
echo ""

# Run verification
if node verify_installation.js; then
    print_success "All systems ready!"
else
    print_warning "Installation verification failed, but build completed"
fi

echo "🎯 Happy coding!"