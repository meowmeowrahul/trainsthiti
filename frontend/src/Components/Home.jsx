import { useContext } from "react";
import Navbar from "./Navbar";
import { AppContext } from "../Context";

const formatTime = (iso) => {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
};

const StatCard = ({ label, value }) => (
  <div className="flex flex-col border border-slate-200 bg-slate-50 p-6 rounded-2xl shadow-sm">
    <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
      {label}
    </span>
    <span className="mt-3 text-4xl font-bold tracking-tight text-slate-900">
      {value}
    </span>
  </div>
);

const Home = () => {
  const { latest, past } = useContext(AppContext);
  const pastSummary = past || [];

  return (
    <div className="min-h-screen bg-gray-50/50 font-sans text-gray-900 antialiased">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-4 md:pt-12 lg:pt-20">
        <header className="mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">
            Station Overview
          </h1>
          <p className="mt-3 text-lg md:text-xl text-gray-500 font-medium">
            Real-time crowd monitoring and insights.
          </p>
        </header>

        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
              Current Status
            </h2>
            {latest?.timestamp && (
              <span className="text-sm font-medium text-gray-600 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm">
                Last updated: {formatTime(latest.timestamp)}
              </span>
            )}
          </div>

          {latest ? (
            <div className="bg-slate-300 border border-slate-400 rounded-3xl p-8 lg:p-10 shadow-md relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-slate-800"></div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    Crowd Level
                  </h3>
                  <p className="text-base text-slate-600 mt-1">
                    Estimated congestion based on sensor data
                  </p>
                </div>
                <span
                  className={`px-4 py-2 text-sm font-bold uppercase tracking-widest rounded-full shadow-sm ${
                    latest.crowd_level === "high"
                      ? "bg-red-100 text-red-800 border border-red-200"
                      : latest.crowd_level === "medium"
                        ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                        : "bg-green-100 text-green-800 border border-green-200"
                  }`}
                >
                  {latest.crowd_level || "Unknown"}
                </span>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Clients" value={latest.clients || 0} />
                <StatCard label="Bluetooth" value={latest.bt_devices || 0} />
                <StatCard label="Density" value={latest.density || 0} />
                <StatCard
                  label="Crowd Est."
                  value={latest.crowd_estimate || 0}
                />
              </div>
            </div>
          ) : (
            <div className="bg-slate-300 border-dashed border-2 border-slate-400 rounded-2xl flex items-center justify-center p-12 text-sm font-medium text-slate-600">
              No real-time data available
            </div>
          )}
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-6">
            Past Records (Current Hour)
          </h2>

          {pastSummary.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pastSummary.map((item, i) => (
                <div
                  key={item.chunkIndex ?? i}
                  className="bg-slate-300 border border-slate-400 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow cursor-default"
                >
                  <div className="flex justify-between items-start mb-6">
                    <span className="text-base font-semibold text-slate-900">
                      {item.from ? formatTime(item.from) : "—"} -{" "}
                      {item.to ? formatTime(item.to) : "—"}
                    </span>
                    <span
                      className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md shadow-sm flex items-center ${
                        item.crowd_level === "high"
                          ? "bg-red-100 text-red-800 border border-red-200"
                          : item.crowd_level === "medium"
                            ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                            : item.crowd_level === "low"
                              ? "bg-green-100 text-green-800 border border-green-200"
                              : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {item.crowd_level || "No Data"}
                    </span>
                  </div>

                  <div className="flex items-center gap-8 mt-4 border-t border-slate-400 pt-5">
                    <div>
                      <div className="text-sm font-medium text-slate-600 mb-1">
                        Samples
                      </div>
                      <div className="text-2xl font-bold text-slate-900">
                        {item.count ?? 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-600 mb-1">
                        Avg Crowd
                      </div>
                      <div className="text-2xl font-bold text-slate-900">
                        {item.avgCrowd != null
                          ? Math.round(item.avgCrowd)
                          : "—"}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-300 border-dashed border-2 border-slate-400 rounded-3xl flex items-center justify-center p-16 text-base font-medium text-slate-600">
              No historical data available
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Home;
