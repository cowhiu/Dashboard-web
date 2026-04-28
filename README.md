# Classroom CO2 Monitoring Dashboard

A real-time web dashboard for monitoring indoor air quality using ESP32 sensors.
The system provides live visualization of CO₂ concentration, temperature, and humidity, along with alerting and remote fan control.

---

## Live Demo

https://dashboard-web-frontend.vercel.app

---

## Overview

This project is designed to monitor classroom air quality in real time. Sensor data is collected from an ESP32 device and streamed to a web dashboard where it is processed and visualized.

The application focuses on reliability, realtime updates, and clean data handling.

---

## Features

* Real-time CO₂ monitoring
* Temperature and humidity tracking
* Live updating dashboard via WebSocket
* CO₂ trend visualization (rolling history)
* Automated alert system for high CO₂ levels
* Remote fan control
* Auto reconnect and data resynchronization
* Data validation and normalization pipeline

---

## Architecture

ESP32 Sensor → Backend (Node.js + Express + Socket.IO) → Frontend (React)

---

## Tech Stack

Frontend:

* React (Vite)
* TailwindCSS
* Socket.IO Client
* Recharts

Backend:

* Node.js
* Express
* Socket.IO

Hardware:

* ESP32
* CO₂ Sensor (SCD40 / SCD41 or similar)

---

## Running Locally

Clone the repository:

```bash
git clone https://github.com/cowhiu/Dashboard-web.git
cd Dashboard-web
```

Install dependencies:

Frontend:

```bash
cd frontend
npm install
```

Backend:

```bash
cd backend
npm install
```

Start the services:

Backend:

```bash
npm start
```

Frontend:

```bash
npm run dev
```

---

## Realtime Behavior

* The frontend connects to the backend using WebSocket.
* Sensor data is streamed continuously and updates the UI automatically.
* The system handles reconnection and resynchronizes state after network interruptions.

---

## Alert Logic

The system monitors sustained high CO₂ levels:

* Below 800 ppm: normal conditions
* 800–1200 ppm: ventilation recommended
* Above 1200 ppm: critical level

An alert is triggered when CO₂ remains above the critical threshold for a sustained period.

---

## Data Handling

Incoming sensor data is:

* validated
* normalized
* timestamped
* streamed to the client

The frontend maintains a rolling history for visualization and analysis.

---

## Future Improvements

* Persistent database storage
* MQTT-based communication
* Multi-device support
* Mobile optimization
* Advanced analytics and prediction

---

## License

MIT License

---

## Author

Hiếu Cao
