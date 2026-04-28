const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// In-memory state
let latestReading = null;
let history = [];
let fanEnabled = false;

const HISTORY_LIMIT = 1000;

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function co2Status(co2) {
  if (co2 <= 800) return "good";
  if (co2 <= 1200) return "warning";
  return "critical";
}

function emitSensorUpdate() {
  io.emit("sensor:update", {
    current: latestReading,
    fanEnabled,
  });
}

// POST /api/data
app.post("/api/data", (req, res) => {
  // Accept typical ESP32 field variants, then normalize
  const rawCo2 = req.body.CO2 ?? req.body.co2 ?? null;
  const rawTemperature = req.body.Temperature ?? req.body.temperature ?? null;
  const rawHumidity = req.body.Humidity ?? req.body.humidity ?? null;

  const co2Num = toNumberOrNull(rawCo2);
  const tempNum = toNumberOrNull(rawTemperature);
  const humidityNum = toNumberOrNull(rawHumidity);

  // Validate CO2: integer, 300-10000
  if (co2Num === null || !Number.isInteger(co2Num)) {
    return res.status(400).json({ error: "CO2 must be an integer." });
  }
  if (co2Num < 300 || co2Num > 10000) {
    return res.status(400).json({ error: "CO2 must be between 300 and 10000." });
  }

  // Validate temperature: float, -40 to 85
  if (tempNum === null) {
    return res.status(400).json({ error: "Temperature must be a number." });
  }
  if (tempNum < -40 || tempNum > 85) {
    return res.status(400).json({ error: "Temperature must be between -40 and 85." });
  }

  // Humidity is nullable float
  if (rawHumidity !== null && rawHumidity !== undefined && rawHumidity !== "" && humidityNum === null) {
    return res.status(400).json({ error: "Humidity must be a number or null." });
  }

  const reading = {
    co2: co2Num,
    temperature: tempNum,
    humidity: humidityNum === null ? null : humidityNum,
    status: co2Status(co2Num),
    timestamp: new Date().toISOString(),
  };

  latestReading = reading;
  history.push(reading);
  if (history.length > HISTORY_LIMIT) {
    history.shift();
  }

  emitSensorUpdate();

  return res.status(200).json({
    current: latestReading,
    fanEnabled,
  });
});

// GET /api/data
app.get("/api/data", (_req, res) => {
  res.json({
    current: latestReading,
    history,
  });
});

// POST /api/fan
// body.enabled boolean => set explicitly, otherwise toggle
app.post("/api/fan", (req, res) => {
  if (typeof req.body?.enabled === "boolean") {
    fanEnabled = req.body.enabled;
  } else {
    fanEnabled = !fanEnabled;
  }

  io.emit("fan:update", { fanEnabled });
  emitSensorUpdate();

  res.json({ fanEnabled });
});

// Socket.IO
io.on("connection", (socket) => {
  socket.emit("sensor:init", {
    current: latestReading,
    history,
    fanEnabled,
  });

  socket.on("fan:set", (payload) => {
    if (typeof payload === "boolean") {
      fanEnabled = payload;
    } else if (typeof payload?.enabled === "boolean") {
      fanEnabled = payload.enabled;
    } else {
      return;
    }

    io.emit("fan:update", { fanEnabled });
    emitSensorUpdate();
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

