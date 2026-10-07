import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  Crosshair,
  Database,
  Download,
  History,
  LoaderCircle,
  LogOut,
  RefreshCw,
  Settings,
  User,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ImageDropzone from "../components/dashboard/ImageDropzone";
import { cn } from "../utils/cn";

type Result = {
  score: number;
  label: string;
  isAnomaly: boolean;
  threshold: number;
  images: { original: string; reconstructed: string; heatmap: string };
};
type Model = {
  architecture: string;
  threshold: number;
  parameters: number;
  image_size: number;
  best_epoch: number | null;
  normal_class: string;
  anomaly_class: string;
  history: { epoch: number; train: number; validation: number }[];
};
type Scan = {
  id: string;
  name: string;
  time: string;
  score: number;
  threshold: number;
  label: string;
};
type UserProfile = { name?: string; email?: string; picture?: string };
const HISTORY_KEY = "satellite-scans-v1";
const panel = "rounded-2xl border border-zinc-800 bg-[#0a0a0a] p-6";
const button =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      typeof error?.detail === "string"
        ? error.detail
        : `Model service returned ${response.status}. Check that the API is running.`,
    );
  }
  return response.json();
}

function readHistory(): Scan[] {
  try {
    const items = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(items)
      ? items
          .filter(
            (item) =>
              typeof item?.score === "number" &&
              typeof item?.name === "string" &&
              typeof item?.time === "string" &&
              typeof item?.threshold === "number" &&
              typeof item?.label === "string",
          )
          .slice(0, 50)
      : [];
  } catch {
    return [];
  }
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [user] = useState<UserProfile | null>(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });
  const [tab, setTab] = useState("scan");
  const [model, setModel] = useState<Model | null>(null);
  const [serviceError, setServiceError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [override, setOverride] = useState(false);
  const [threshold, setThreshold] = useState("");
  const [history, setHistory] = useState<Scan[]>(readHistory);
  const [logs, setLogs] = useState<string[]>([]);
  const [view, setView] = useState<keyof Result["images"]>("heatmap");
  const [opacity, setOpacity] = useState(65);

  async function refreshModel() {
    try {
      const data = await request<Model>("/model");
      setModel(data);
      setServiceError("");
    } catch (e) {
      setModel(null);
      setServiceError(
        e instanceof Error ? e.message : "Model service unavailable",
      );
    }
  }
  useEffect(() => {
    void refreshModel();
  }, []);
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function selectFile(next: File) {
    if (busy) return;
    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(next.type)) {
      setError("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (next.size > 10 * 1024 * 1024) {
      setError("Image must be no larger than 10 MiB.");
      return;
    }
    setFile(next);
    setResult(null);
    setLogs([]);
  }
  async function analyze() {
    if (!file || busy) return;
    const value = Number(threshold);
    if (override && (!Number.isFinite(value) || value <= 0 || value > 1)) {
      setError("Threshold must be greater than zero and at most 1.");
      return;
    }
    setBusy(true);
    setError("");
    setResult(null);
    setLogs([
      `Uploading ${file.name}`,
      "Waiting for reconstruction and anomaly scoring…",
    ]);
    try {
      const body = new FormData();
      body.append("file", file);
      const prediction = await request<Result>(
        `/analyze${override ? `?threshold=${value}` : ""}`,
        { method: "POST", body },
      );
      setResult(prediction);
      setView("heatmap");
      setLogs((prev) => [
        ...prev,
        `Reconstruction complete. MSE: ${prediction.score.toFixed(6)}`,
        `Threshold: ${prediction.threshold.toFixed(6)} · ${prediction.label}`,
      ]);
      const scan = {
        id: crypto.randomUUID(),
        name: file.name,
        time: new Date().toISOString(),
        score: prediction.score,
        threshold: prediction.threshold,
        label: prediction.label,
      };
      const updated = [scan, ...history].slice(0, 50);
      setHistory(updated);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      } catch {
        setLogs((prev) => [
          ...prev,
          "Browser storage unavailable; history is retained only for this session.",
        ]);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Analysis failed";
      setError(message);
      setLogs((prev) => [...prev, `Analysis failed: ${message}`]);
    } finally {
      setBusy(false);
    }
  }
  function exportHistory() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(history, null, 2)], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "satellite-scan-history.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  const titles: Record<string, string> = {
    scan: "Live analysis workspace",
    history: "Scan history",
    models: "Trained model",
    settings: "Workspace settings",
  };
  return (
    <div className="min-h-screen bg-[#020202] text-zinc-50 font-sans md:flex">
      <aside className="md:fixed md:inset-y-0 md:w-60 bg-[#0a0a0a] border-b md:border-r border-zinc-800 z-20 flex flex-col">
        <Link
          to="/"
          className="flex items-center gap-3 p-6 border-b border-zinc-800"
        >
          <Crosshair className="text-emerald-400" />
          <div>
            <strong className="text-sm">Satellite Anomaly</strong>
            <p className="text-[10px] text-emerald-500 tracking-[.2em] uppercase mt-1">
              Earth observation
            </p>
          </div>
        </Link>
        <nav
          aria-label="Workspace"
          className="flex md:flex-col gap-2 p-3 md:p-4 overflow-x-auto"
        >
          {[
            { id: "scan", label: "Current Scan", icon: Activity },
            { id: "history", label: "Scan History", icon: History },
            { id: "models", label: "AI Model", icon: Database },
            { id: "settings", label: "Settings", icon: Settings },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-current={tab === id ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl p-3 text-sm whitespace-nowrap border",
                tab === id
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : "border-transparent text-zinc-400 hover:bg-zinc-900",
              )}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        <div className="hidden md:block mt-auto p-4 text-xs text-zinc-500 border-t border-zinc-800">
          <div className="flex items-center gap-3 p-2 mb-3">
            {user?.picture ? (
              <img
                src={user.picture}
                alt="User avatar"
                className="w-9 h-9 rounded-full border border-zinc-700"
              />
            ) : (
              <span className="w-9 h-9 rounded-full border border-zinc-700 bg-zinc-900 flex items-center justify-center">
                <User size={16} />
              </span>
            )}
            <div className="min-w-0">
              <p className="text-zinc-200 truncate">
                {user?.name || "Authenticated user"}
              </p>
              <p className="truncate mt-1">{user?.email || "Local session"}</p>
            </div>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem("user");
              navigate("/login", { replace: true });
            }}
            className="w-full flex items-center gap-2 rounded-lg p-2 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 md:ml-60 p-4 md:p-8 xl:p-10">
        <div className="max-w-7xl mx-auto">
          <header className="flex flex-wrap justify-between gap-4 items-center border-b border-zinc-800 pb-6 mb-8">
            <div>
              <p className="text-emerald-500 text-xs font-mono uppercase tracking-widest mb-3">
                Mission control / {tab}
              </p>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                {titles[tab]}
              </h1>
              <p className="text-sm text-zinc-400 mt-2">
                Explore satellite imagery with your trained convolutional
                autoencoder.
              </p>
            </div>
            <button
              onClick={refreshModel}
              className="flex items-center gap-2 text-xs text-zinc-400"
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  model ? "bg-emerald-400" : "bg-amber-400",
                )}
              />
              {model ? "Model connected" : "Model unavailable"}
              <RefreshCw size={14} />
            </button>
          </header>
          {serviceError && (
            <div
              role="alert"
              className="mb-6 p-4 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/20"
            >
              {serviceError}{" "}
              <button className="underline ml-2" onClick={refreshModel}>
                Retry connection
              </button>
            </div>
          )}
          {tab === "scan" && (
            <>
              <div className="grid xl:grid-cols-[290px_minmax(0,1fr)] gap-6">
                <div className="space-y-6">
                  <section className={panel}>
                    <h2 className="text-sm font-semibold mb-5 flex gap-2">
                      <Settings size={17} className="text-emerald-400" />
                      Model parameters
                    </h2>
                    <p className="text-xs text-zinc-500">
                      Calibrated threshold
                    </p>
                    <p className="text-2xl font-mono text-emerald-400 mt-2">
                      {model?.threshold.toFixed(6) ?? "—"}
                    </p>
                    <p className="text-xs text-zinc-500 mt-3 leading-relaxed">
                      Scores above the threshold indicate unfamiliar imagery.
                    </p>
                    <label className="flex items-center gap-2 text-xs mt-6">
                      <input
                        type="checkbox"
                        checked={override}
                        disabled={busy}
                        onChange={(e) => {
                          setOverride(e.target.checked);
                          setThreshold(String(model?.threshold ?? ""));
                        }}
                      />
                      Override threshold
                    </label>
                    {override && (
                      <input
                        aria-label="Custom threshold"
                        type="number"
                        min="0.00000001"
                        max="1"
                        step="0.000001"
                        value={threshold}
                        disabled={busy}
                        onChange={(e) => setThreshold(e.target.value)}
                        className="mt-3 p-2 w-full rounded bg-zinc-900 border border-zinc-700"
                      />
                    )}
                    <dl className="mt-6 border-t border-zinc-800 pt-5 space-y-3 text-xs">
                      <div className="flex justify-between">
                        <dt className="text-zinc-500">Architecture</dt>
                        <dd>{model?.architecture ?? "—"} autoencoder</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-zinc-500">Input</dt>
                        <dd>128 × 128 RGB</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-zinc-500">Parameters</dt>
                        <dd>{model?.parameters.toLocaleString() ?? "—"}</dd>
                      </div>
                    </dl>
                  </section>
                  <section className={panel}>
                    <h2 className="text-xs uppercase tracking-widest font-mono text-zinc-400 mb-4">
                      Activity log
                    </h2>
                    <div
                      aria-live="polite"
                      className="space-y-3 text-xs font-mono text-zinc-500 break-words"
                    >
                      {logs.length ? (
                        logs.map((log, i) => (
                          <p key={i}>
                            <span className="text-emerald-600 mr-2">›</span>
                            {log}
                          </p>
                        ))
                      ) : (
                        <p>Upload an image to begin.</p>
                      )}
                    </div>
                  </section>
                </div>
                <div className="min-w-0 space-y-5">
                  {error && (
                    <div
                      role="alert"
                      className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl"
                    >
                      {error}
                    </div>
                  )}
                  {!file ? (
                    <ImageDropzone onImageSelect={selectFile} />
                  ) : (
                    <section className={panel}>
                      <div className="flex items-center justify-between gap-3 mb-5">
                        <div className="min-w-0">
                          <h2 className="font-semibold truncate">
                            {file.name}
                          </h2>
                          <p className="text-xs text-zinc-500 mt-1">
                            {(file.size / 1024).toFixed(1)} KB · RGB satellite
                            image
                          </p>
                        </div>
                        <button
                          aria-label="Remove image"
                          disabled={busy}
                          onClick={() => {
                            setFile(null);
                            setResult(null);
                            setLogs([]);
                            setError("");
                          }}
                          className="p-2 text-zinc-500 hover:text-white disabled:opacity-30"
                        >
                          <X size={18} />
                        </button>
                      </div>
                      {result && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {(
                            ["original", "reconstructed", "heatmap"] as const
                          ).map((key) => (
                            <button
                              key={key}
                              onClick={() => setView(key)}
                              className={cn(
                                "px-3 py-2 text-xs rounded-lg capitalize",
                                view === key
                                  ? "bg-emerald-500/15 text-emerald-400"
                                  : "text-zinc-400 bg-zinc-900",
                              )}
                            >
                              {key}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="relative h-72 md:h-96 bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800 flex items-center justify-center">
                        <img
                          src={
                            result
                              ? result.images[
                                  view === "heatmap" ? "original" : view
                                ]
                              : preview || undefined
                          }
                          alt={
                            result
                              ? `${view} satellite image`
                              : "Selected satellite image"
                          }
                          className="h-full w-full object-contain"
                        />
                        {result && view === "heatmap" && (
                          <img
                            src={result.images.heatmap}
                            alt="Reconstruction error overlay"
                            className="absolute inset-0 h-full w-full object-contain"
                            style={{ opacity: opacity / 100 }}
                          />
                        )}
                        {busy && (
                          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-4">
                            <LoaderCircle
                              className="animate-spin text-emerald-400"
                              size={32}
                            />
                            <p role="status" className="text-sm">
                              Analyzing image…
                            </p>
                          </div>
                        )}
                      </div>
                      {result && view === "heatmap" && (
                        <label className="flex items-center gap-4 text-xs text-zinc-400 mt-4">
                          Overlay opacity
                          <input
                            aria-label="Overlay opacity"
                            type="range"
                            min="0"
                            max="100"
                            value={opacity}
                            onChange={(e) => setOpacity(Number(e.target.value))}
                            className="flex-1 accent-emerald-500"
                          />
                          {opacity}%
                        </label>
                      )}
                      <div className="flex flex-wrap justify-between items-center gap-3 mt-5">
                        <p className="text-xs text-zinc-500">
                          {result
                            ? "Analysis complete. Results use the threshold shown below."
                            : "Ready for model inference."}
                        </p>
                        <button
                          disabled={busy || !model}
                          onClick={analyze}
                          className={cn(
                            button,
                            "bg-emerald-500 text-zinc-950 hover:bg-emerald-400",
                          )}
                        >
                          {busy
                            ? "Analyzing…"
                            : result
                              ? "Analyze again"
                              : "Analyze image"}
                          <ArrowRight size={16} />
                        </button>
                      </div>
                    </section>
                  )}
                  {result && (
                    <div
                      data-testid="analysis-result"
                      className="grid sm:grid-cols-3 gap-3"
                    >
                      {[
                        { label: "Classification", value: result.label },
                        {
                          label: "Reconstruction MSE",
                          value: result.score.toFixed(6),
                        },
                        {
                          label: "Threshold used",
                          value: result.threshold.toFixed(6),
                        },
                      ].map((item) => (
                        <div key={item.label} className={cn(panel, "!p-5")}>
                          <p className="text-xs text-zinc-500 mb-2">
                            {item.label}
                          </p>
                          <p
                            className={cn(
                              "text-xl font-mono",
                              result.isAnomaly
                                ? "text-amber-400"
                                : "text-emerald-400",
                            )}
                          >
                            {item.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Validated on EuroSAT Forest versus Industrial imagery. A
                    high score signals unfamiliar land cover; it does not
                    identify a specific hazard. Heatmaps show reconstruction
                    error.
                  </p>
                </div>
              </div>
              {model && <TrainingChart model={model} />}
            </>
          )}
          {tab === "history" && (
            <section className={panel}>
              <div className="flex justify-between items-center gap-4 mb-5">
                <h2 className="font-semibold">
                  Recent analyses{" "}
                  <span className="text-zinc-500">({history.length})</span>
                </h2>
                <button
                  disabled={!history.length}
                  onClick={exportHistory}
                  className={cn(button, "bg-zinc-900")}
                >
                  <Download size={16} />
                  Export JSON
                </button>
              </div>
              <p className="text-xs text-zinc-500 mb-6">
                Last 50 results saved in this browser. Image files are not
                stored.
              </p>
              {!history.length ? (
                <p className="text-zinc-400 py-12 text-center">
                  Your completed analyses will appear here.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-zinc-500">
                      <tr>
                        {["Image", "Time", "Result", "MSE", "Threshold"].map(
                          (text) => (
                            <th key={text} className="p-3">
                              {text}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((scan) => (
                        <tr key={scan.id} className="border-t border-zinc-800">
                          <td className="p-3 max-w-64 truncate">{scan.name}</td>
                          <td className="p-3 text-zinc-500 whitespace-nowrap">
                            {new Date(scan.time).toLocaleString()}
                          </td>
                          <td
                            className={cn(
                              "p-3",
                              scan.label === "Anomaly"
                                ? "text-amber-400"
                                : "text-emerald-400",
                            )}
                          >
                            {scan.label}
                          </td>
                          <td className="p-3 font-mono">
                            {scan.score.toFixed(6)}
                          </td>
                          <td className="p-3 font-mono">
                            {scan.threshold.toFixed(6)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
          {tab === "models" &&
            (model ? (
              <>
                <section className={panel}>
                  <Database className="text-emerald-400 mb-4" />
                  <h2 className="text-xl font-semibold capitalize">
                    {model.architecture} convolutional autoencoder
                  </h2>
                  <p className="text-zinc-400 text-sm mt-3">
                    {model.parameters.toLocaleString()} parameters ·{" "}
                    {model.image_size} × {model.image_size} RGB input · Selected
                    epoch {model.best_epoch ?? "unknown"}
                  </p>
                  <p className="text-zinc-500 text-sm mt-3">
                    Normal class: {model.normal_class}. Benchmark anomaly class:{" "}
                    {model.anomaly_class}.
                  </p>
                </section>
                <TrainingChart model={model} />
              </>
            ) : (
              <p className="text-zinc-400">
                Connect the model service to view its details.
              </p>
            ))}
          {tab === "settings" && (
            <section className={cn(panel, "max-w-2xl")}>
              <h2 className="font-semibold mb-4">Local workspace</h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                The dashboard uses the local model service. Uploads are
                processed in memory. This workspace has no sign-in requirement.
              </p>
              <div className="mt-6 border-t border-zinc-800 pt-6">
                <h3 className="text-sm font-semibold">Browser history</h3>
                <p className="text-xs text-zinc-500 my-3">
                  Clear saved filenames and analysis summaries from this
                  browser.
                </p>
                <button
                  onClick={() => {
                    try {
                      localStorage.removeItem(HISTORY_KEY);
                      setHistory([]);
                    } catch {
                      setError("Browser storage is unavailable.");
                    }
                  }}
                  className={cn(
                    button,
                    "border border-zinc-700 hover:bg-zinc-900",
                  )}
                >
                  Clear scan history
                </button>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

function TrainingChart({ model }: { model: Model }) {
  return (
    <section className={cn(panel, "mt-6")}>
      <h2 className="font-semibold">Training & validation loss</h2>
      <p className="text-xs text-zinc-500 mt-2 mb-6">
        Recorded during training · {model.history.length} epochs · Does not
        change when you upload an image.
      </p>
      {model.history.length ? (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={model.history}>
              <XAxis dataKey="epoch" stroke="#71717a" fontSize={11} />
              <YAxis
                stroke="#71717a"
                fontSize={11}
                tickFormatter={(value) => value.toFixed(3)}
                width={60}
              />
              <Tooltip
                contentStyle={{
                  background: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="train"
                name="Training"
                stroke="#34d399"
                dot={false}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="validation"
                name="Validation"
                stroke="#f59e0b"
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-sm text-zinc-500">
          Training history is unavailable for this checkpoint.
        </p>
      )}
      <div className="flex gap-5 text-xs mt-3">
        <span className="text-emerald-400">Training loss</span>
        <span className="text-amber-400">Validation loss</span>
      </div>
    </section>
  );
}
