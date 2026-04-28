import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import AlertBanner from "./components/AlertBanner";
import Co2Chart from "./components/Co2Chart";
import FanControl from "./components/FanControl";
import MetricCard from "./components/MetricCard";
import StatusBadge from "./components/StatusBadge";

const DEFAULT_API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:4000`;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;
const HISTORY_LIMIT = 600;

function getStatus(co2) {
  if (co2 < 800) {
    return "good";
  }

  if (co2 <= 1200) {
    return "warning";
  }

  return "critical";
}

function formatUpdatedAt(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function isSustainedAlert(history) {
  const recentReadings = history.slice(-10);

  if (recentReadings.length < 10) {
    return false;
  }

  const first = new Date(recentReadings[0].timestamp).getTime();
  const last = new Date(recentReadings[recentReadings.length - 1].timestamp).getTime();

  return last - first >= 9000 && recentReadings.every((point) => point.co2 > 1200);
}

function getStatusMessage(status) {
  if (status === "good") {
    return "Air is well within the recommended classroom range.";
  }

  if (status === "warning") {
    return "Ventilation should be improved before comfort drops.";
  }

  return "Ventilation is urgently needed to bring CO2 back down.";
}

function toFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toTimestampMs(value) {
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function normalizeReading(raw) {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const co2 = toFiniteNumber(raw.co2);
  const temperature = toFiniteNumber(raw.temperature);
  const humidityRaw = raw.humidity;
  const humidity = humidityRaw == null ? null : toFiniteNumber(humidityRaw);
  const timestampMs = toTimestampMs(raw.timestamp);

  if (co2 === null || temperature === null || timestampMs === null) {
    return null;
  }

  if (humidityRaw != null && humidity === null) {
    return null;
  }

  return {
    co2,
    temperature,
    humidity,
    timestamp: new Date(timestampMs).toISOString(),
  };
}

function normalizeHistory(rawHistory) {
  if (!Array.isArray(rawHistory)) {
    return [];
  }

  const byTimestamp = new Map();

  for (const item of rawHistory) {
    const normalized = normalizeReading(item);
    if (!normalized) {
      continue;
    }
    byTimestamp.set(normalized.timestamp, normalized);
  }

  return [...byTimestamp.values()]
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
    .slice(-HISTORY_LIMIT);
}

function sameReading(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.co2 === b.co2 &&
    a.temperature === b.temperature &&
    a.humidity === b.humidity &&
    a.timestamp === b.timestamp
  );
}

function mergeHistory(previousHistory, reading) {
  const incomingTs = toTimestampMs(reading.timestamp);
  if (incomingTs === null) {
    return previousHistory;
  }

  if (previousHistory.length === 0) {
    return [reading];
  }

  const last = previousHistory[previousHistory.length - 1];
  const lastTs = toTimestampMs(last.timestamp);

  if (lastTs !== null && incomingTs <= lastTs) {
    return previousHistory; // duplicate timestamp or backward time jump
  }

  const next = [...previousHistory, reading];
  if (next.length > HISTORY_LIMIT) {
    next.splice(0, next.length - HISTORY_LIMIT);
  }

  return next;
}

function App() {
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);
  const [fanEnabled, setFanEnabled] = useState(false);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fanPending, setFanPending] = useState(false);

  const aliveRef = useRef(true);
  const lastAcceptedTsRef = useRef(-Infinity);

  const applySnapshot = useCallback((snapshot) => {
    if (!snapshot || !aliveRef.current) {
      return;
    }

    const normalizedHistory = normalizeHistory(snapshot.history);
    const normalizedCurrent = normalizeReading(snapshot.current);
    const fallbackCurrent =
      normalizedHistory.length > 0 ? normalizedHistory[normalizedHistory.length - 1] : null;
    const nextCurrent = normalizedCurrent ?? fallbackCurrent;

    const snapshotLatestTs =
      nextCurrent && toTimestampMs(nextCurrent.timestamp) !== null
        ? toTimestampMs(nextCurrent.timestamp)
        : -Infinity;

    // Ignore stale snapshots for sensor data but still accept fan state.
    if (snapshotLatestTs < lastAcceptedTsRef.current) {
      if (typeof snapshot.fanEnabled === "boolean") {
        setFanEnabled((prev) => (prev === snapshot.fanEnabled ? prev : snapshot.fanEnabled));
      }
      setError("");
      return;
    }

    lastAcceptedTsRef.current = snapshotLatestTs;

    setCurrent((prev) => (sameReading(prev, nextCurrent) ? prev : nextCurrent));

    setHistory((prev) => {
      if (prev.length === normalizedHistory.length) {
        let identical = true;
        for (let i = 0; i < prev.length; i += 1) {
          if (!sameReading(prev[i], normalizedHistory[i])) {
            identical = false;
            break;
          }
        }
        if (identical) {
          return prev;
        }
      }
      return normalizedHistory;
    });

    if (typeof snapshot.fanEnabled === "boolean") {
      setFanEnabled((prev) => (prev === snapshot.fanEnabled ? prev : snapshot.fanEnabled));
    }

    setError("");
  }, []);

  const fetchSnapshot = useCallback(async () => {
    const response = await fetch(`${API_BASE_URL}/api/data`);
    if (!response.ok) {
      throw new Error("Failed to load sensor snapshot.");
    }
    const snapshot = await response.json();
    applySnapshot(snapshot);
  }, [applySnapshot]);

  useEffect(() => {
    aliveRef.current = true;

    const socket = io(API_BASE_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
      timeout: 10000,
    });

    const handleConnect = () => {
      if (!aliveRef.current) return;
      setConnected(true);

      // Re-sync after every (re)connect to recover missed events.
      fetchSnapshot()
        .then(() => {
          if (aliveRef.current) setError("");
        })
        .catch((loadError) => {
          if (aliveRef.current) {
            setError(loadError.message || "Unable to reach backend.");
          }
        })
        .finally(() => {
          if (aliveRef.current) setLoading(false);
        });
    };

    const handleDisconnect = () => {
      if (!aliveRef.current) return;
      setConnected(false);
    };

    const handleConnectError = () => {
      if (!aliveRef.current) return;
      setConnected(false);
    };

    const handleSensorInit = (snapshot) => {
      if (!aliveRef.current) return;
      applySnapshot(snapshot);
      setLoading(false);
    };

    const handleSensorUpdate = (payload) => {
      if (!aliveRef.current) return;

      const reading = normalizeReading(payload?.current);
      if (!reading) {
        return; // defensive: ignore malformed payload
      }

      const incomingTs = toTimestampMs(reading.timestamp);
      if (incomingTs === null || incomingTs <= lastAcceptedTsRef.current) {
        return; // duplicate timestamp or backward time jump
      }

      lastAcceptedTsRef.current = incomingTs;

      setCurrent((prev) => (sameReading(prev, reading) ? prev : reading));
      setHistory((previousHistory) => mergeHistory(previousHistory, reading));

      if (typeof payload?.fanEnabled === "boolean") {
        setFanEnabled((prev) => (prev === payload.fanEnabled ? prev : payload.fanEnabled));
      }

      setError("");
    };

    const handleFanUpdate = (payload) => {
      if (!aliveRef.current) return;
      if (typeof payload?.fanEnabled === "boolean") {
        setFanEnabled((prev) => (prev === payload.fanEnabled ? prev : payload.fanEnabled));
      }
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("sensor:init", handleSensorInit);
    socket.on("sensor:update", handleSensorUpdate);
    socket.on("fan:update", handleFanUpdate);

    // Initial REST snapshot (works before socket init event or if init is missed).
    fetchSnapshot()
      .then(() => {
        if (aliveRef.current) setError("");
      })
      .catch((loadError) => {
        if (aliveRef.current) {
          setError(loadError.message || "Unable to reach backend.");
        }
      })
      .finally(() => {
        if (aliveRef.current) setLoading(false);
      });

    return () => {
      aliveRef.current = false;
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("sensor:init", handleSensorInit);
      socket.off("sensor:update", handleSensorUpdate);
      socket.off("fan:update", handleFanUpdate);
      socket.disconnect();
    };
  }, [applySnapshot, fetchSnapshot]);

  const handleToggleFan = async () => {
    setFanPending(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/fan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          enabled: !fanEnabled,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update fan state.");
      }

      const result = await response.json();
      setFanEnabled(Boolean(result.fanEnabled));
      setError("");
    } catch (requestError) {
      setError(requestError.message || "Unable to update fan state.");
    } finally {
      setFanPending(false);
    }
  };

  const status = useMemo(() => getStatus(current?.co2 ?? 0), [current?.co2]);
  const alertActive = useMemo(() => isSustainedAlert(history), [history]);
  const updatedAt = useMemo(
    () => (current?.timestamp ? formatUpdatedAt(current.timestamp) : "--"),
    [current?.timestamp]
  );
  const statusMessage = useMemo(() => getStatusMessage(status), [status]);
  const co2Fill = useMemo(() => Math.min(((current?.co2 ?? 0) / 1500) * 100, 100), [current?.co2]);

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-teal-300">
              Classroom CO2 Monitor
            </p>
            <h1 className="mt-3 font-display text-3xl font-semibold text-white sm:text-4xl">
              Real-time Indoor Air Dashboard
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">
              Live classroom air metrics with ventilation status, alerting, and a rolling CO2
              trend.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start rounded-full border border-white/10 bg-slate-950/40 px-4 py-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                connected ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
            <span className="text-sm font-medium text-slate-200">
              {connected ? "Realtime connected" : "Attempting reconnect"}
            </span>
          </div>
        </header>

        <AlertBanner active={alertActive} co2={current?.co2 ?? "--"} />

        {error ? (
          <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {error}
          </div>
        ) : null}

        <section className="grid gap-5 lg:grid-cols-4">
          <section
            className={`rounded-[2rem] border bg-white/5 p-6 shadow-panel backdrop-blur lg:col-span-2 ${
              alertActive ? "border-rose-400/35" : "border-white/10"
            }`}
          >
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-400">
                    Current CO2
                  </p>
                  <div className="mt-4 flex items-end gap-3">
                    <span className="font-display text-6xl font-semibold text-white sm:text-7xl">
                      {loading && !current ? "--" : current?.co2 ?? "--"}
                    </span>
                    <span className="pb-2 text-lg text-slate-400">ppm</span>
                  </div>
                </div>
                <StatusBadge status={status} />
              </div>

              <p className="max-w-xl text-sm text-slate-300 sm:text-base">{statusMessage}</p>

              <div>
                <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-slate-400">
                  <span>Air quality load</span>
                  <span>Updated {updatedAt}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full rounded-full transition-all ${
                      status === "good"
                        ? "bg-emerald-400"
                        : status === "warning"
                        ? "bg-amber-400"
                        : "bg-rose-400"
                    }`}
                    style={{ width: `${co2Fill}%` }}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Target zone</p>
                  <p className="mt-2 text-lg font-semibold text-white">&lt; 800 ppm</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Alert rule</p>
                  <p className="mt-2 text-lg font-semibold text-white">1200+ ppm for 10s</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Stream rate</p>
                  <p className="mt-2 text-lg font-semibold text-white">1 sample / 5 seconds</p>
                </div>
              </div>
            </div>
          </section>

          <MetricCard
            title="Temperature"
            value={loading && !current ? "--" : current?.temperature ?? "--"}
            unit="C"
            description="Classroom ambient temperature"
            accentClass="border-white/10"
          />

          <MetricCard
            title="Humidity"
            value={loading && !current ? "--" : current?.humidity ?? "--"}
            unit="%"
            description="Relative humidity in the room"
            accentClass="border-white/10"
          />

          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-panel backdrop-blur lg:col-span-3">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-400">
                  CO2 Trend
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold text-white">
                  Rolling 10-minute history
                </h2>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-sm text-slate-300">
                Auto-refreshing every second
              </div>
            </div>
            <Co2Chart history={history} />
          </section>

          <FanControl fanEnabled={fanEnabled} pending={fanPending} onToggle={handleToggleFan} />
        </section>
      </div>
    </main>
  );
}

export default App;
