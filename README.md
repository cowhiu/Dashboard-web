# 🌡️ Classroom CO2 Dashboard

A professional real-time air quality monitoring system for classroom environments. Built with modern web technologies for clean UI, real-time updates, intelligent alerts, and ventilation control.

## 📋 Overview

This is a complete full-stack web application that monitors CO2 levels, temperature, and humidity in real-time. Perfect for classroom air quality management, it provides visual alerts and manual ventilation control.

## 🏗️ Project Structure

```
web_vxl/
├── backend/                    # Node.js Express + Socket.IO server
│   ├── src/
│   │   ├── server.js          # Main server with REST API & WebSocket
│   │   └── sensorService.js   # Mock sensor data generator with realistic patterns
│   └── package.json
├── frontend/                   # React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/
│   │   │   ├── AlertBanner.jsx     # Warning banner for sustained high CO2
│   │   │   ├── Co2Chart.jsx        # Real-time line chart (Chart.js)
│   │   │   ├── FanControl.jsx      # Ventilation fan toggle control
│   │   │   ├── MetricCard.jsx      # Reusable metric display card
│   │   │   └── StatusBadge.jsx     # Color-coded status indicator
│   │   ├── App.jsx                 # Main dashboard component
│   │   ├── main.jsx                # React entry point
│   │   └── index.css               # Global styles & Tailwind
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
├── package.json                # Workspace root with concurrent dev scripts
└── README.md                   # This file
```

## ✨ Features

### 1. **Dashboard UI**
- **Large CO2 Display**: Current CO2 value in prominent typography (ppm)
- **Color-Coded Status Indicator**:
  - 🟢 **Green** (Fresh Air): < 800 ppm
  - 🟡 **Yellow** (Needs Attention): 800–1200 ppm
  - 🔴 **Red** (Poor Air Quality): > 1200 ppm
- **Temperature & Humidity Cards**: Real-time ambient conditions
- **Connection Status**: Live indicator showing WebSocket connection state
- **Air Quality Load Bar**: Visual progress indicator

### 2. **Real-time Chart**
- Line chart showing CO2 levels over the last **10 minutes**
- Auto-updates every **1 second**
- Smooth animations with gradient fill
- Responsive and interactive tooltips
- Built with **Chart.js**

### 3. **Intelligent Alerts**
- Warning banner appears when CO2 > 1200 ppm **continuously for 10 seconds**
- Animated pulse effect to draw attention
- Displays current CO2 value in the alert
- Auto-dismisses when conditions improve

### 4. **Ventilation Control**
- **Manual fan toggle**: Turn ventilation ON/OFF
- **Live status indicator**: Visual feedback with glow effect
- **Real-time sync**: Changes broadcast to all connected clients via WebSocket
- **Simulated effect**: Fan state affects mock sensor readings

### 5. **Backend API**

**REST Endpoints:**
- `GET /api/data` → Returns latest sensor snapshot with history
- `POST /api/fan` → Toggle fan state (accepts `{ enabled: boolean }`)
- `GET /api/health` → Health check endpoint

**WebSocket Events:**
- `sensor:init` → Initial data snapshot on connection
- `sensor:update` → Real-time sensor data (every 1 second)
- `fan:update` → Fan state changes
- `fan:set` → Client requests fan toggle

### 6. **Mock Sensor Data**
Realistic simulation when real hardware is not connected:
- **CO2**: 400–1500 ppm (fluctuates realistically)
- **Temperature**: 25–35°C
- **Humidity**: 40–80%
- **Intelligent behavior**: Fan state influences sensor readings
- **Smooth transitions**: Values change gradually, not abruptly

### 7. **Professional UI Design**
- **Minimal & Modern**: Clean IoT dashboard aesthetic
- **Glassmorphism**: Backdrop blur effects with soft shadows
- **Dark Theme**: Rich gradient background (teal/blue accents)
- **Rounded Cards**: Soft corners and elegant spacing
- **Responsive Layout**: Works on desktop, tablet, and mobile
- **Custom Fonts**: IBM Plex Sans + Sora (Google Fonts)
- **Smooth Animations**: Transitions and state changes

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** installed on your system
- npm (comes with Node.js)

### Installation & Running

```bash
# Navigate to the project directory
cd web_vxl

# Install all dependencies (frontend + backend)
npm install

# Run both servers concurrently in development mode
npm run dev
```

### Access the Application

- **Frontend Dashboard**: http://localhost:5173
- **Backend API**: http://localhost:4000/api/data
- **Health Check**: http://localhost:4000/api/health

The frontend and backend will hot-reload when you make changes during development.

## 📦 Tech Stack

### Frontend
- **React 18** - UI library
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **Chart.js** - Chart rendering
- **react-chartjs-2** - React wrapper for Chart.js
- **Socket.IO Client** - Real-time WebSocket connection

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Socket.IO** - WebSocket server for real-time communication
- **CORS** - Cross-origin resource sharing
- **Nodemon** - Auto-restart on file changes (dev)

## 🛠️ Available Scripts

Run these commands from the `web_vxl/` directory:

```bash
# Development mode (runs both frontend + backend)
npm run dev

# Build frontend for production
npm run build

# Start backend in production mode
npm run start

# Install dependencies for both workspaces
npm install
```

### Individual Workspace Scripts

```bash
# Frontend only
npm run dev --workspace frontend
npm run build --workspace frontend

# Backend only
npm run dev --workspace backend
npm run start --workspace backend
```

## 🎨 Design System

### Color Palette
- **Background**: Dark gradient (#08111f → #0b1726 → #050b14)
- **Accent Colors**:
  - Teal (#2dd4bf) - Primary accent
  - Emerald (#4ade80) - Good status
  - Amber (#fbbf24) - Warning status
  - Rose (#fb7185) - Critical status
- **Text**: Slate shades for hierarchy
- **Panels**: Glass effect with white/10 borders

### Typography
- **Display Font**: Sora (headings, large numbers)
- **Body Font**: IBM Plex Sans (content, labels)

### Components
- **Cards**: Rounded 2rem-3rem, backdrop blur, soft shadows
- **Status Badges**: Pill-shaped with colored borders
- **Buttons**: Rounded 2xl with smooth transitions
- **Chart**: Dark theme with teal accent line

## 📡 WebSocket Communication Flow

```
Client Connect
    ↓
Server sends: sensor:init (full snapshot)
    ↓
Every 1s: Server sends sensor:update
    ↓
User toggles fan
    ↓
Client sends: fan:set
    ↓
Server broadcasts: fan:update + sensor:update
    ↓
All clients receive updated state
```

## 🔧 Configuration

### Environment Variables

**Backend** (`backend/.env` - optional):
```env
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
```

**Frontend** (`frontend/.env` - optional):
```env
VITE_API_BASE_URL=http://localhost:4000
```

Both services work with defaults if no environment files are present.

## 📊 Data Structure

### Sensor Reading
```json
{
  "co2": 850,
  "temperature": 28.5,
  "humidity": 62.3,
  "fanEnabled": false,
  "status": "warning",
  "timestamp": "2026-04-03T15:30:00.000Z"
}
```

### API Snapshot Response
```json
{
  "current": { /* sensor reading */ },
  "history": [ /* array of 600 readings */ ],
  "fanEnabled": false,
  "updatedAt": "2026-04-03T15:30:00.000Z",
  "intervalMs": 1000,
  "historyWindowSeconds": 600,
  "thresholds": {
    "goodMax": 799,
    "warningMax": 1200,
    "criticalMin": 1201
  }
}
```

## 🧪 Testing

The application includes:
- **Mock sensor service** with realistic data patterns
- **Real-time updates** via WebSocket
- **Error handling** for disconnections and API failures
- **Loading states** during initial data fetch

To test fan control:
1. Open the dashboard
2. Click "Turn Fan On"
3. Observe CO2 levels gradually decrease
4. Temperature and humidity also adjust

## 🌐 Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Android)

## 📝 Code Quality

- **Clean folder structure** - Separation of concerns
- **Component modularity** - Reusable React components
- **ES6+ syntax** - Modern JavaScript features
- **Consistent formatting** - Readable and maintainable
- **No external dependencies** for core logic

## 🚀 Production Deployment

### Build Frontend
```bash
npm run build
```
Output will be in `frontend/dist/`

### Run Backend
```bash
npm run start
```
Backend runs on port 4000 by default.

### Serve Static Files
Configure your backend to serve the built frontend, or use a separate static hosting service (Vercel, Netlify, etc.) with the backend API URL configured.

## 🔮 Future Enhancements

Possible additions:
- Real sensor integration (Arduino, Raspberry Pi)
- Historical data persistence (database)
- User authentication
- Multi-room monitoring
- Email/SMS alerts
- Data export (CSV, PDF reports)
- Configurable thresholds
- Sound alerts
- PWA support for mobile app

## 📄 License

Private project - All rights reserved.

## 👨‍💻 Developer Notes

### Mock Sensor Algorithm
The `sensorService.js` uses a weighted random walk algorithm that:
- Gradually trends toward target ranges based on fan state
- Adds realistic noise/fluctuations
- Clamps values to realistic bounds
- Maintains smooth transitions

### Alert Logic
Alerts trigger only when CO2 exceeds threshold **continuously** for 10 seconds to avoid false positives from temporary spikes.

### Performance
- Chart re-renders are optimized with React memo
- WebSocket updates are throttled to 1 Hz
- History is capped at 600 readings (10 minutes)

---

**Built with ❤️ for better classroom air quality**
