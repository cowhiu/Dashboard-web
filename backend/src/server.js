require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const { Resend } = require("resend");
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
let manualMode = false;
let alertHighSince = null;
let alertEmailSent = false;
let alertEmailInFlight = false;

const HISTORY_LIMIT = 1000;
const CO2_ALERT_THRESHOLD = 1200;
// const CO2_ALERT_DURATION_MS = 15 * 60 * 1000;
const CO2_ALERT_DURATION_MS = 0;
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

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

function emitFanUpdate() {
  io.emit("fan:update", {
    fanEnabled,
    manualMode,
  });
}

function emitSensorUpdate() {
  io.emit("sensor:update", {
    current: latestReading,
    fanEnabled,
    manualMode,
  });
}

function resetCo2AlertState() {
  alertHighSince = null;
  alertEmailSent = false;
  alertEmailInFlight = false;
}

function formatHumidity(value) {
  return value === null || value === undefined ? "N/A" : `${value}`;
}

async function sendCo2AlertEmail(reading) {
  if (!resend || !process.env.ALERT_EMAIL) {
    return;
  }

  const from = process.env.ALERT_FROM_EMAIL || "Classroom CO2 Alert <onboarding@resend.dev>";
  const subject = "⚠️ Classroom CO₂ Alert";
  const text = [
    "The classroom CO₂ concentration has exceeded 1200 ppm continuously for more than 15 minutes.",
    "",
    "Current CO₂:",
    `${reading.co2} ppm`,
    "",
    "Temperature:",
    `${reading.temperature} °C`,
    "",
    "Humidity:",
    `${formatHumidity(reading.humidity)} %`,
    "",
    "Time:",
    reading.timestamp,
    "",
    "Please improve classroom ventilation immediately.",
  ].join("\n");

  await resend.emails.send({
    from,
    to: [process.env.ALERT_EMAIL],
    subject,
    text,
  });
}

function evaluateCo2Alert(reading) {
  const readingTime = Date.parse(reading.timestamp);
  if (!Number.isFinite(readingTime)) {
    return;
  }

  if (reading.co2 <= CO2_ALERT_THRESHOLD) {
    resetCo2AlertState();
    return;
  }

  if (alertHighSince === null) {
    alertHighSince = readingTime;
  }

  if (alertEmailSent || alertEmailInFlight) {
    return;
  }

  if (readingTime - alertHighSince < CO2_ALERT_DURATION_MS) {
    return;
  }

  alertEmailInFlight = true;

  void sendCo2AlertEmail(reading)
    .then(() => {
      alertEmailSent = true;
    })
    .catch((error) => {
      console.error("Failed to send CO2 alert email:", error);
    })
    .finally(() => {
      alertEmailInFlight = false;
    });
}

function applyFanState(nextState) {
  if (typeof nextState?.fanEnabled === "boolean") {
    fanEnabled = nextState.fanEnabled;
  }

  if (typeof nextState?.manualMode === "boolean") {
    manualMode = nextState.manualMode;
  }
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
  evaluateCo2Alert(reading);

  return res.status(200).json({
    current: latestReading,
    fanEnabled,
    manualMode,
  });
});

// GET /api/data
app.get("/api/data", (_req, res) => {
  res.json({
    current: latestReading,
    history,
    fanEnabled,
    manualMode,
  });
});

app.post("/api/fan", (req, res) => {
  applyFanState({
    fanEnabled: typeof req.body.fanEnabled === "boolean" ? req.body.fanEnabled : undefined,
    manualMode: typeof req.body.manualMode === "boolean" ? req.body.manualMode : undefined,
  });

  emitFanUpdate();
  emitSensorUpdate();

  res.json({ fanEnabled, manualMode });
});

// GET /api/fan
app.get("/api/fan", (req, res) => {
  res.json({
    fanEnabled,
    manualMode,
  });
});

// Socket.IO
io.on("connection", (socket) => {
  socket.emit("sensor:init", {
    current: latestReading,
    history,
    fanEnabled,
    manualMode,
  });

  socket.on("fan:set", (payload) => {
    if (typeof payload === "boolean") {
      fanEnabled = payload;
    } else if (typeof payload?.enabled === "boolean") {
      fanEnabled = payload.enabled;
    }

    if (typeof payload?.manualMode === "boolean") {
      manualMode = payload.manualMode;
    }

    if (typeof payload !== "boolean" && typeof payload?.enabled !== "boolean" && typeof payload?.manualMode !== "boolean") {
      return;
    }

    emitFanUpdate();
    emitSensorUpdate();
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

