# Password Leak Checker v2.0

A modern, privacy-first password breach checking web application similar to Have I Been Pwned (HIBP), built with React, Node.js, and modern web technologies.

## 🔐 Features

- **Privacy-First Design**: Uses k-anonymity to protect your passwords
- **Modern Web UI**: Built with React and Vite for fast, responsive experience
- **Multiple Deployment Options**: Static hosting, Node.js server, or Docker
- **Offline Support**: Service Worker for offline functionality
- **Real-time Statistics**: Live database statistics and breach counts
- **Secure API**: Rate limiting, CORS protection, and security headers
- **Progressive Web App**: Installable on mobile and desktop
- **Client-side Hashing**: SHA-1 hashing happens in your browser

## 🚀 Quick Start

### Option 1: Development Mode (Recommended)

```bash
# Install dependencies
npm install

# Start development servers (client + API)
npm run dev

# Or start individually:
npm run dev:client  # React dev server on :3000
npm run dev:server  # API server on :5000
```

Visit http://localhost:3000 for the client interface and http://localhost:5000/api/health for API status.

### Option 2: Production Build

```bash
# Build the application
npm run build

# Start production server
npm start

# Or serve static files
npm run serve:static
```

### Option 3: Docker (Coming Soon)

```bash
docker build -t password-checker .
docker run -p 5000:5000 password-checker
```

## 🏗️ Architecture

### Frontend
- **React 18** with functional components and hooks
- **Vite** for fast development and optimized builds
- **Service Worker** for offline support
- **Responsive Design** with CSS Grid and Flexbox
- **Modern JavaScript** (ES2020+, modules)

### Backend
- **Node.js + Express** for RESTful API
- **SQLite** with better-sqlite3 for fast queries
- **K-anonymity** implementation for privacy
- **Security Middleware** (Helmet, CORS, Rate Limiting)

### Security Features
- K-anonymity password checking
- Client-side SHA-1 hashing
- Rate limiting and input validation
- Security headers and CSP
- No password storage or logging

## 📊 Database Schema

The application uses SQLite with two main tables:

```sql
-- Password hash storage
CREATE TABLE leaked_passwords (
    hash_prefix TEXT NOT NULL,           -- First 5 chars of SHA-1
    hash_suffix TEXT NOT NULL,           -- Remaining 35 chars
    count INTEGER DEFAULT 1,             -- Breach occurrence count
    PRIMARY KEY (hash_prefix, hash_suffix)
);

-- Database statistics
CREATE TABLE breach_stats (
    id INTEGER PRIMARY KEY DEFAULT 1,
    total_passwords INTEGER DEFAULT 0,
    total_breaches INTEGER DEFAULT 0,
    last_updated TEXT DEFAULT CURRENT_TIMESTAMP
);
```

## 🛠️ API Endpoints

### Core Endpoints

#### `GET /api/health`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z",
  "version": "2.0.0"
}
```

#### `GET /api/range/:hashPrefix`
Check passwords using k-anonymity.

**Parameters:**
- `hashPrefix`: 5-character SHA-1 hash prefix (hex)

**Response:**
```json
{
  "matches": [
    {
      "suffix": "ABCDEF123456789...",
      "count": 12345
    }
  ]
}
```

#### `GET /api/stats`
Get database statistics.

**Response:**
```json
{
  "total_passwords": 613584246,
  "total_breaches": 684,
  "last_updated": "2024-01-01T12:00:00Z"
}
```

### Admin Endpoints

#### `POST /api/add-passwords`
Add passwords to database (admin only).

**Body:**
```json
{
  "passwords": [
    "password123",
    {
      "password": "anotherpassword",
      "count": 100
    }
  ]
}
```

## 🔒 Security & Privacy

### K-Anonymity Implementation

1. **Client-side Hashing**: Password is hashed with SHA-1 in the browser
2. **Partial Hash Transfer**: Only first 5 characters (hash prefix) sent to server
3. **Server Response**: Server returns all hashes starting with the prefix
4. **Local Comparison**: Browser compares suffixes locally
5. **No Password Storage**: Neither full hash nor password is stored

### Security Headers

The application implements several security headers:

- **Content Security Policy (CSP)**: Prevents XSS attacks
- **X-Frame-Options**: Prevents clickjacking
- **X-XSS-Protection**: Enables browser XSS filtering
- **X-Content-Type-Options**: Prevents MIME sniffing

### Privacy Guarantees

- ✅ Password never leaves device in plain text
- ✅ Only hash prefixes transmitted to server
- ✅ No server-side password storage
- ✅ No analytics or tracking
- ✅ Open source for transparency

## 📦 Project Structure

```
├── public/                 # Static assets
│   ├── index.html         # HTML template
│   └── sw.js             # Service worker
├── src/                   # Source code
│   ├── components/       # React components
│   ├── services/         # API services
│   ├── utils/            # Utilities (crypto, formatters)
│   ├── styles/           # CSS styles
│   └── App.js           # Main app component
├── server.js            # Express server
├── dist/                # Built application
├── data/                # SQLite database
├── docs/                # Documentation
├── scripts/             # Build scripts
├── package.json         # Dependencies
└── vite.config.js      # Vite configuration
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run linting
npm run lint

# Format code
npm run format
```

## 🚀 Deployment

### Static Hosting (Netlify, Vercel, GitHub Pages)

1. Build the project: `npm run build`
2. Deploy the `dist/` folder to your hosting service
3. Configure API endpoints or use serverless functions

### Node.js Server

1. Build: `npm run build`
2. Start: `npm start`
3. Configure reverse proxy (nginx) for production

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- Inspired by [Have I Been Pwned](https://haveibeenpwned.com/) by Troy Hunt
- Built with modern web technologies for privacy and performance
- K-anonymity implementation based on HIBP's research

## ⚠️ Disclaimer

This tool is for educational and informational purposes. While we implement industry-standard security practices, we cannot guarantee the completeness or accuracy of breach data. Always verify information through multiple sources and use strong, unique passwords for each account.
