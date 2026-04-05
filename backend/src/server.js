const http = require("http");
const express = require("express");
const cors = require("cors");
const { Server } = require("socket.io");
const { SensorService } = require("./sensorService");

const PORT = Number(process.env.PORT) || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST"],
  },
});

const sensorService = new SensorService();

app.use(
  cors({
    origin: CLIENT_ORIGIN,
  })
);
app.use(express.json());

app.get("/api/data", (_request, response) => {
  response.json(sensorService.getSnapshot());
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

sensorService.start(io);

server.listen(PORT, () => {
  console.log(`CO2 backend listening on http://localhost:${PORT}`);
});

process.on("SIGINT", () => {
  sensorService.stop();
  server.close(() => process.exit(0));
});

process.on("SIGTERM", () => {
  sensorService.stop();
  server.close(() => process.exit(0));
});
