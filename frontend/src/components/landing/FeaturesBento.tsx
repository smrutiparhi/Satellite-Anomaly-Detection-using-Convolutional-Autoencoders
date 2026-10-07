import { motion } from "motion/react";
import { Binary, Fingerprint, Gauge, ShieldCheck } from "lucide-react";

const features = [
  {
    icon: Fingerprint,
    eyebrow: "Calibrated decisions",
    title: "A threshold saved with the model",
    copy: "Inference and evaluation use the same calibration, removing silent differences between development and production runs.",
  },
  {
    icon: Binary,
    eyebrow: "One-class learning",
    title: "Train from normal imagery",
    copy: "The model learns a compact representation of expected scenes and flags inputs with unusually high reconstruction error.",
  },
  {
    icon: Gauge,
    eyebrow: "Reviewable output",
    title: "Score and spatial error together",
    copy: "Every result pairs a scalar MSE score with a reconstruction and heatmap so an analyst can inspect what changed.",
  },
  {
    icon: ShieldCheck,
    eyebrow: "Reproducible pipeline",
    title: "Dataset drift is detected",
    copy: "Split manifests, file fingerprints, calibration metadata, and training history travel with the checkpoint.",
  },
];

export default function FeaturesBento() {
  return (
    <section id="features" className="bg-[#050706] px-6 py-24 md:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <p className="text-xs font-mono uppercase tracking-[.24em] text-emerald-400">
            Built for trustworthy experiments
          </p>
          <h2 className="mt-5 text-4xl font-semibold tracking-[-.04em] text-white md:text-5xl">
            The model and its evidence stay connected.
          </h2>
          <p className="mt-5 text-base leading-7 text-zinc-400">
            From split creation to browser inference, the pipeline keeps the
            information needed to understand how a result was produced.
          </p>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {features.map(({ icon: Icon, eyebrow, title, copy }, index) => (
            <motion.article
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.06 }}
              className="group rounded-3xl border border-white/8 bg-white/[.025] p-7 transition hover:-translate-y-1 hover:border-emerald-400/20 hover:bg-emerald-400/[.035] md:p-8"
            >
              <div className="flex items-start justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-2xl border border-emerald-400/15 bg-emerald-400/8 text-emerald-300">
                  <Icon size={20} />
                </span>
                <span className="font-mono text-xs text-zinc-700">
                  0{index + 1}
                </span>
              </div>
              <p className="mt-8 text-xs uppercase tracking-[.18em] text-emerald-300/70">
                {eyebrow}
              </p>
              <h3 className="mt-3 text-xl font-semibold text-white md:text-2xl">
                {title}
              </h3>
              <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-500">
                {copy}
              </p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
