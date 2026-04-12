import { useContext, useMemo } from "react";
import Navbar from "./Navbar";
import { AppContext } from "../Context";

const formatTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const formatDateTime = (value) => {
  if (!value) return "Waiting";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Waiting";
  return date.toLocaleString([], {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const levelLabel = {
  low: "Low",
  medium: "Medium",
  high: "High",
  unknown: "Unknown",
};

const levelTone = {
  low: {
    dot: "var(--success)",
    bg: "var(--success-soft)",
    border: "color-mix(in srgb, var(--success), var(--border-subtle) 65%)",
    text: "var(--text-primary)",
  },
  medium: {
    dot: "var(--neutral)",
    bg: "var(--neutral-soft)",
    border: "var(--border-subtle)",
    text: "var(--text-primary)",
  },
  high: {
    dot: "var(--danger)",
    bg: "var(--danger-soft)",
    border: "color-mix(in srgb, var(--danger), var(--border-subtle) 65%)",
    text: "var(--text-primary)",
  },
  unknown: {
    dot: "var(--neutral)",
    bg: "var(--neutral-soft)",
    border: "var(--border-subtle)",
    text: "var(--text-primary)",
  },
};

const metrics = [
  { key: "clients", label: "Wi‑Fi clients" },
  { key: "bt_devices", label: "Bluetooth devices" },
  { key: "density", label: "Density score" },
  { key: "crowd_estimate", label: "Crowd estimate" },
];

const Card = ({ children, className = "" }) => (
  <div className={`ui-card ${className}`}>{children}</div>
);

const Home = () => {
  const { latest, past, lastSynced, isRefreshing, error, refreshAll } =
    useContext(AppContext);
  const pastSummary = Array.isArray(past) ? past : [];

  const crowdLevelKey =
    typeof latest?.crowd_level === "string"
      ? latest.crowd_level.toLowerCase()
      : "unknown";
  const level = levelLabel[crowdLevelKey] || "Unknown";
  const tone = levelTone[crowdLevelKey] || levelTone.unknown;

  const statusText = useMemo(() => {
    if (error) return error;
    if (isRefreshing) return "Refreshing data…";
    if (lastSynced) return `Last synced ${formatDateTime(lastSynced)}`;
    return "Waiting for data";
  }, [error, isRefreshing, lastSynced]);

  return (
    <div
      className="min-h-screen antialiased"
      style={{ background: "var(--app-bg)", color: "var(--text-primary)" }}
    >
      <Navbar
        onRefresh={refreshAll}
        lastSynced={lastSynced}
        isRefreshing={isRefreshing}
      />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <section id="overview">
          <Card className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-xl font-semibold">Dashboard</h1>
              <button
                type="button"
                onClick={refreshAll}
                className="ui-button rounded-lg px-3 py-2 text-sm font-medium"
                disabled={isRefreshing}
              >
                {isRefreshing ? "Refreshing" : "Refresh"}
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div
                className="ui-card-strong p-3"
                style={{ background: tone.bg, borderColor: tone.border }}
              >
                <p className="ui-label">Crowd level</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="ui-value">{level}</p>
                  <span
                    className="ui-pill"
                    style={{
                      background: tone.bg,
                      borderColor: tone.border,
                      color: tone.text,
                    }}
                  >
                    <span
                      className="ui-pill-dot"
                      aria-hidden="true"
                      style={{ background: tone.dot }}
                    />
                    {latest?.crowd_level ? "Live" : "—"}
                  </span>
                </div>
              </div>
              <div className="ui-card-strong p-3">
                <p className="ui-label">Last sync</p>
                <p className="ui-value">{formatDateTime(lastSynced)}</p>
              </div>
              <div className="ui-card-strong p-3">
                <p className="ui-label">Crowd estimate</p>
                <p className="ui-value">{latest?.crowd_estimate ?? "—"}</p>
              </div>
              <div
                className="ui-status rounded-lg px-3 py-2 text-sm"
                aria-live="polite"
              >
                {statusText}
              </div>
            </div>
          </Card>
        </section>

        <section id="live" className="space-y-3">
          <h2 className="text-lg font-semibold">Live metrics</h2>

          {latest ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric) => (
                <Card key={metric.key} className="p-4">
                  <p className="ui-label">{metric.label}</p>
                  <p className="mt-2 text-2xl font-semibold">
                    {latest?.[metric.key] ?? 0}
                  </p>
                </Card>
              ))}
            </div>
          ) : (
            <Card
              className="p-4 text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              No live reading yet. Refresh soon.
            </Card>
          )}
        </section>

        <section id="history" className="space-y-3">
          <h2 className="text-lg font-semibold">History</h2>

          {pastSummary.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {pastSummary.map((item, index) => (
                <Card key={item.chunkIndex ?? index} className="p-4">
                  <p className="ui-label">Window</p>
                  <p className="mt-1 text-lg font-semibold">
                    {formatTime(item.from)} – {formatTime(item.to)}
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="ui-card-strong p-3">
                      <p className="ui-label">Samples</p>
                      <p className="mt-1 text-xl font-semibold">
                        {item.count ?? 0}
                      </p>
                    </div>
                    <div className="ui-card-strong p-3">
                      <p className="ui-label">Avg crowd</p>
                      <p className="mt-1 text-xl font-semibold">
                        {item.avgCrowd != null
                          ? Math.round(item.avgCrowd)
                          : "—"}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card
              className="p-4 text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              No historical data yet. Refresh soon.
            </Card>
          )}
        </section>
      </main>
    </div>
  );
};

export default Home;
