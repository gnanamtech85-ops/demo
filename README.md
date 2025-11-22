# Live Streaming Platform

## Prerequisites
- Node.js (v16+)
- Docker (for Media Server)
- MongoDB

## Setup

### 1. Backend
```bash
cd backend
npm install
# Create .env file with:
# MONGO_URI=mongodb://localhost:27017/livestream
# JWT_SECRET=your_secret
npm run dev
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```

### 3. Media Server
```bash
cd media-server
docker build -t nginx-rtmp .
docker run -d -p 1935:1935 -p 8080:8080 nginx-rtmp
```

## Architecture
- **Backend**: Node.js + Express + Socket.io
- **Frontend**: Next.js + Tailwind CSS
- **Media Server**: Nginx-RTMP + FFmpeg
