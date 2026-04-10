import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import AlertBanner from "./components/AlertBanner";
import Co2Chart from "./components/Co2Chart";
import FanControl from "./components/FanControl";
import MetricCard from "./components/MetricCard";
import StatusBadge from "./components/StatusBadge";

const DEFAULT_API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:4000`;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;

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

function App() {
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);
  const [fanEnabled, setFanEnabled] = useState(false);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fanPending, setFanPending] = useState(false);

  useEffect(() => {
    let active = true;

    const applySnapshot = (snapshot) => {
      if (!snapshot || !active) {
        return;
      }

      setCurrent(snapshot.current);
      setHistory(snapshot.history ?? []);
      setFanEnabled(Boolean(snapshot.fanEnabled));
      setError("");
    };

    const loadSnapshot = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/data`);

        if (!response.ok) {
          throw new Error("Failed to load sensor snapshot.");
        }

        const snapshot = await response.json();
        applySnapshot(snapshot);
      } catch (loadError) {
        if (active) {
          setError(loadError.message || "Unable to reach backend.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadSnapshot();

    const socket = io(API_BASE_URL, {
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      setConnected(true);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("sensor:init", (snapshot) => {
      applySnapshot(snapshot);
      setLoading(false);
    });

    socket.on("sensor:update", (payload) => {
      if (!active || !payload?.current) {
        return;
      }

      setCurrent(payload.current);
      setHistory((previousHistory) => [...previousHistory, payload.current].slice(-600));

      if (typeof payload.fanEnabled === "boolean") {
        setFanEnabled(payload.fanEnabled);
      }
    });

    socket.on("fan:update", (payload) => {
      if (!active) {
        return;
      }

      setFanEnabled(Boolean(payload?.fanEnabled));
    });

    return () => {
      active = false;
      socket.disconnect();
    };
  }, []);

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

  const status = getStatus(current?.co2 ?? 0);
  const alertActive = isSustainedAlert(history);
  const updatedAt = current?.timestamp ? formatUpdatedAt(current.timestamp) : "--";
  const statusMessage = getStatusMessage(status);
  const co2Fill = Math.min(((current?.co2 ?? 0) / 1500) * 100, 100);

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
              Live classroom air metrics with ventilation status, alerting, and a rolling CO2 trend.
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
                  <p className="mt-2 text-lg font-semibold text-white">1 sample / second</p>
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
