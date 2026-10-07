import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

import OrbitalScene from "./OrbitalScene";

const facts = [
  ["128 × 128", "RGB input"],
  ["78,235", "parameters"],
  ["0.000483", "saved threshold"],
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-white/5 px-6 pb-20 pt-32 md:pb-28 md:pt-40">
      <div className="absolute inset-0 -z-20 bg-[#050706]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_15%,rgba(16,185,129,.13),transparent_34%),radial-gradient(circle_at_86%_30%,rgba(34,211,238,.09),transparent_28%)]" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent_88%)]" />

      <div className="mx-auto grid w-full min-w-0 max-w-7xl items-center gap-16 lg:grid-cols-[1.02fr_.98fr]">
        <div className="min-w-0 max-w-full">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/8 px-3 py-1.5 text-xs font-medium text-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
            Calibrated model ready for analysis
          </div>

          <h1 className="max-w-3xl text-5xl font-semibold leading-[.98] tracking-[-.055em] text-white sm:text-6xl lg:text-[76px]">
            Find the scenes that{" "}
            <span className="text-emerald-300">don’t belong.</span>
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-zinc-400 md:text-xl">
            A one-class convolutional autoencoder turns satellite imagery into a
            reconstruction score and a visual error map—so unfamiliar land cover
            is easier to inspect.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/dashboard"
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-6 py-3.5 font-semibold text-zinc-950 shadow-[0_14px_50px_-16px_rgba(52,211,153,.7)] transition hover:bg-emerald-300"
            >
              Analyze an image{" "}
              <ArrowRight
                size={17}
                className="transition group-hover:translate-x-1"
              />
            </Link>
            <a
              href="#benchmark"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[.035] px-6 py-3.5 font-medium text-zinc-200 transition hover:border-white/25 hover:bg-white/[.07]"
            >
              View benchmark evidence
            </a>
          </div>

          <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-xs text-zinc-500">
            {["Runs locally", "Saved calibration", "Explainable heatmap"].map(
              (item) => (
                <span key={item} className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  {item}
                </span>
              ),
            )}
          </div>
        </div>

        <OrbitalScene />
      </div>

      <div className="mx-auto mt-16 grid max-w-7xl grid-cols-1 divide-y divide-white/8 border-y border-white/8 bg-white/[.018] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {facts.map(([value, label]) => (
          <div key={label} className="px-3 py-5 text-center">
            <p className="text-sm font-semibold text-white sm:text-lg">
              {value}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-widest text-zinc-600 sm:text-xs">
              {label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
