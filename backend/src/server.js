const http = require("http");
const express = require("express");
const cors = require("cors");
const { Server } = require("socket.io");
const { SensorService } = require("./sensorService");

const PORT = Number(process.env.PORT) || 4000;

// Comma-separated list of allowed origins. If empty, allow all (useful on private networks like Tailscale).
// Example: CLIENT_ORIGINS="http://100.x.y.z:5173,http://localhost:5173"
const CLIENT_ORIGINS = (process.env.CLIENT_ORIGINS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const allowAllOrigins = CLIENT_ORIGINS.length === 0;
const isOriginAllowed = (origin) => allowAllOrigins || CLIENT_ORIGINS.includes(origin);

const corsOrigin = (origin, callback) => {
  if (!origin) {
    callback(null, true);
    return;
  }

  callback(null, isOriginAllowed(origin));
};

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST"],
  },
});

const sensorService = new SensorService();

app.use(
  cors({
    origin: corsOrigin,
  })
);
app.use(express.json());
app.get("/api/data", (req, res) => {
  res.json({
    current: sensorService.latestReading,
    history: sensorService.history,
  });
});
app.post("/api/fan", (request, response) => {
  const requestedValue = request.body?.enabled;
  const nextEnabled =
    typeof requestedValue === "boolean" ? requestedValue : !sensorService.fanEnabled;
  const fanEnabled = sensorService.setFanEnabled(nextEnabled);
  const changedAt = new Date().toISOString();

  io.emit("fan:update", {
    fanEnabled,
    changedAt,
  });
  io.emit("sensor:update", {
    current: sensorService.latestReading,
    fanEnabled,
  });

  response.json({
    fanEnabled,
    changedAt,
  });
});

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
  });
});

io.on("connection", (socket) => {
  socket.emit("sensor:init", sensorService.getSnapshot());

  socket.on("fan:set", (payload) => {
    const requestedValue = payload?.enabled;
    const nextEnabled =
      typeof requestedValue === "boolean" ? requestedValue : !sensorService.fanEnabled;
    const fanEnabled = sensorService.setFanEnabled(nextEnabled);
    const changedAt = new Date().toISOString();

    io.emit("fan:update", {
      fanEnabled,
      changedAt,
    });
    io.emit("sensor:update", {
      current: sensorService.latestReading,
      fanEnabled,
    });
  });
});

//sensorService.start(io);
app.post("/api/data", (req, res) => {
  const value = req.body.value;

  const reading = {
    co2: value,
    temperature: 30,
    humidity: 60,
    fanEnabled: sensorService.fanEnabled,
    status: value < 800 ? "good" : value <= 1200 ? "warning" : "critical",
    timestamp: new Date().toISOString(),
  };

  sensorService.latestReading = reading;
  sensorService.pushReading(reading);

  // 🔥 gửi realtime lên web
  io.emit("sensor:update", {
    current: reading,
    fanEnabled: sensorService.fanEnabled,
  });

  res.send("OK");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`CO2 backend listening on http://0.0.0.0:${PORT}`);
  if (!allowAllOrigins) {
    console.log(`Allowed origins: ${CLIENT_ORIGINS.join(", ")}`);
  }
});

process.on("SIGINT", () => {
  sensorService.stop();
  server.close(() => process.exit(0));
});

process.on("SIGTERM", () => { 
  sensorService.stop();
  server.close(() => process.exit(0));
});

