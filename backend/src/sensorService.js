const HISTORY_WINDOW_SECONDS = 600;
const UPDATE_INTERVAL_MS = 1000;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const randomBetween = (min, max) => Math.random() * (max - min) + min;

const getStatus = (co2) => {
  if (co2 < 800) {
    return "good";
  }

  if (co2 <= 1200) {
    return "warning";
  }

  return "critical";
};

const createReading = ({ co2, temperature, humidity, fanEnabled, timestamp }) => ({
  co2: Math.round(co2),
  temperature: Number(temperature.toFixed(1)),
  humidity: Number(humidity.toFixed(1)),
  fanEnabled,
  status: getStatus(co2),
  timestamp: new Date(timestamp).toISOString(),
});

class SensorService {
  constructor() {
    this.fanEnabled = false;
    this.history = [];
    this.latestReading = createReading({
      co2: 720,
      temperature: 29.4,
      humidity: 58.2,
      fanEnabled: this.fanEnabled,
      timestamp: new Date(),
    });
    this.intervalHandle = null;
    this.seedHistory();
  }

  seedHistory() {
    const now = Date.now();
    let previous = this.latestReading;

    this.history = [];

    for (let index = HISTORY_WINDOW_SECONDS - 1; index >= 0; index -= 1) {
      previous = this.buildNextReading(previous, {
        fanEnabled: this.fanEnabled,
        timestamp: new Date(now - index * UPDATE_INTERVAL_MS),
      });
      this.history.push(previous);
    }

    this.latestReading = this.history[this.history.length - 1];
  }

  buildNextReading(previous, overrides = {}) {
    const fanEnabled =
      typeof overrides.fanEnabled === "boolean" ? overrides.fanEnabled : this.fanEnabled;
    const timestamp = overrides.timestamp ?? new Date();
    const co2Target = fanEnabled ? randomBetween(520, 900) : randomBetween(760, 1450);
    const temperatureTarget = fanEnabled ? randomBetween(25.0, 29.0) : randomBetween(27.0, 35.0);
    const humidityTarget = fanEnabled ? randomBetween(42.0, 58.0) : randomBetween(48.0, 80.0);

    const co2 = clamp(
      previous.co2 + randomBetween(-55, 55) + (co2Target - previous.co2) * 0.2,
      400,
      1500
    );
    const temperature = clamp(
      previous.temperature + randomBetween(-0.35, 0.35) + (temperatureTarget - previous.temperature) * 0.15,
      25,
      35
    );
    const humidity = clamp(
      previous.humidity + randomBetween(-1.6, 1.6) + (humidityTarget - previous.humidity) * 0.12,
      40,
      80
    );

    return createReading({
      co2,
      temperature,
      humidity,
      fanEnabled,
      timestamp,
    });
  }

  pushReading(reading) {
    this.history.push(reading);

    if (this.history.length > HISTORY_WINDOW_SECONDS) {
      this.history.shift();
    }
  }

  start(io) {
    if (this.intervalHandle) {
      return;
    }

    this.intervalHandle = setInterval(() => {
      this.latestReading = this.buildNextReading(this.latestReading);
      this.pushReading(this.latestReading);

      io.emit("sensor:update", {
        current: this.latestReading,
        fanEnabled: this.fanEnabled,
      });
    }, UPDATE_INTERVAL_MS);
  }

  stop() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  getSnapshot() {
    return {
      current: this.latestReading,
      history: this.history,
      fanEnabled: this.fanEnabled,
      updatedAt: this.latestReading.timestamp,
      intervalMs: UPDATE_INTERVAL_MS,
      historyWindowSeconds: HISTORY_WINDOW_SECONDS,
      thresholds: {
        goodMax: 799,
        warningMax: 1200,
        criticalMin: 1201,
      },
    };
  }

  setFanEnabled(enabled) {
    this.fanEnabled = Boolean(enabled);
    this.latestReading = {
      ...this.latestReading,
      fanEnabled: this.fanEnabled,
    };

    return this.fanEnabled;
  }
}

module.exports = {
  SensorService,
  HISTORY_WINDOW_SECONDS,
  UPDATE_INTERVAL_MS,
};
