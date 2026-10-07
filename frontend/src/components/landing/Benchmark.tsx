import { motion } from "motion/react";
import { ArrowRight, CheckCircle2, Info } from "lucide-react";
import { Link } from "react-router-dom";

const metrics = [
  ["99.70%", "F1 score"],
  ["100%", "Industrial recall"],
  ["5.00%", "Forest false-positive rate"],
  ["2,800", "Held-out images"],
];

export default function Benchmark() {
  return (
    <section id="benchmark" className="bg-[#050706] px-6 py-24 md:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,.1),transparent_35%),#0b0e0d] p-6 md:p-10 lg:p-12">
          <div className="grid gap-10 lg:grid-cols-[.88fr_1.12fr] lg:items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-xs font-mono uppercase tracking-[.24em] text-emerald-400">
                Verified local benchmark
              </p>
              <h2 className="mt-5 text-4xl font-semibold tracking-[-.04em] text-white md:text-5xl">
                Strong separation, stated with its limits.
              </h2>
              <p className="mt-6 text-base leading-7 text-zinc-400">
                The included checkpoint was evaluated on held-out EuroSAT
                imagery with Forest as normal and Industrial as anomalous. The
                fixed calibration threshold was not tuned on the test set.
              </p>
              <div className="mt-7 space-y-3 text-sm text-zinc-400">
                <p className="flex gap-3">
                  <CheckCircle2
                    size={17}
                    className="mt-0.5 shrink-0 text-emerald-400"
                  />
                  2,500 of 2,500 Industrial scenes detected
                </p>
                <p className="flex gap-3">
                  <CheckCircle2
                    size={17}
                    className="mt-0.5 shrink-0 text-emerald-400"
                  />
                  285 of 300 Forest scenes classified normally
                </p>
                <p className="flex gap-3">
                  <Info size={17} className="mt-0.5 shrink-0 text-amber-300" />
                  This does not validate oil-spill, illegal-construction, or
                  deforestation detection.
                </p>
              </div>
              <Link
                to="/dashboard"
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300"
              >
                Try the calibrated model <ArrowRight size={16} />
              </Link>
            </motion.div>
            <div className="grid grid-cols-2 gap-3">
              {metrics.map(([value, label], index) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, scale: 0.97 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.06 }}
                  className="rounded-2xl border border-white/8 bg-white/[.03] p-5 md:p-7"
                >
                  <p className="text-2xl font-semibold tracking-tight text-white md:text-4xl">
                    {value}
                  </p>
                  <p className="mt-2 text-xs text-zinc-500 md:text-sm">
                    {label}
                  </p>
                </motion.div>
              ))}
              <div className="col-span-2 rounded-2xl border border-emerald-400/15 bg-emerald-400/[.04] p-5 text-sm leading-6 text-emerald-100/65">
                Benchmark scope: land-cover novelty on a random image split.
                Geographic independence and near-duplicate overlap still require
                further study.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
