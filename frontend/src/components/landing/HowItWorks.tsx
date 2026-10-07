import { motion } from "motion/react";
import { Boxes, ImageUp, Radar, SlidersHorizontal } from "lucide-react";

const steps = [
  {
    icon: ImageUp,
    title: "Upload",
    copy: "Choose a JPEG, PNG, or WebP satellite image. The API validates size and image integrity before inference.",
  },
  {
    icon: Boxes,
    title: "Reconstruct",
    copy: "The compact convolutional autoencoder resizes the scene to 128 × 128 RGB and rebuilds it from a 512-value latent representation.",
  },
  {
    icon: Radar,
    title: "Score",
    copy: "Mean squared reconstruction error becomes an image-level novelty score and a spatial error map.",
  },
  {
    icon: SlidersHorizontal,
    title: "Decide",
    copy: "The score is compared with the saved 95th-percentile calibration threshold, with an optional request-level override.",
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative overflow-hidden border-y border-white/5 bg-[#090c0b] px-6 py-24 md:py-32"
    >
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:linear-gradient(to_bottom,transparent,black,transparent)]" />
      <div className="relative mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-mono uppercase tracking-[.24em] text-emerald-400">
              Inference workflow
            </p>
            <h2 className="mt-5 text-4xl font-semibold tracking-[-.04em] text-white md:text-5xl">
              From tile to decision in four steps.
            </h2>
          </div>
          <p className="max-w-lg text-sm leading-6 text-zinc-500">
            The same inference path powers the dashboard, API evaluation, and
            standalone interface.
          </p>
        </div>
        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ icon: Icon, title, copy }, index) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className="relative rounded-2xl border border-white/8 bg-black/20 p-6"
            >
              <div className="flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300">
                  <Icon size={19} />
                </span>
                <span className="font-mono text-xs text-zinc-600">
                  0{index + 1}
                </span>
              </div>
              <h3 className="mt-8 text-lg font-semibold text-white">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-500">{copy}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
