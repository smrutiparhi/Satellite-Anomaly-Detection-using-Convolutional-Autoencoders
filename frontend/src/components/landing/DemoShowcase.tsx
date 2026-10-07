import { motion } from "motion/react";
import { Eye, Layers3, ScanSearch } from "lucide-react";

const panels = [
  {
    title: "Input scene",
    caption: "Original RGB tile",
    style:
      "bg-[linear-gradient(140deg,#163326,#31543f_35%,#14281e_36%,#4b624d_68%,#1b3025)]",
  },
  {
    title: "Reconstruction",
    caption: "Model expectation",
    style:
      "bg-[linear-gradient(140deg,#1d382a,#35503f_35%,#1c3025_36%,#435947_68%,#203529)]",
  },
  {
    title: "Error map",
    caption: "Where the model disagrees",
    style:
      "bg-[radial-gradient(circle_at_58%_55%,#ef4444_0_8%,#f97316_9%,transparent_24%),radial-gradient(circle_at_72%_28%,#facc15_0_4%,transparent_12%),linear-gradient(140deg,#092b38,#075985_40%,#172554)]",
  },
];

export default function DemoShowcase() {
  return (
    <section
      id="product"
      className="relative border-b border-white/5 bg-[#080a09] px-6 py-24 md:py-32"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[.78fr_1.22fr] lg:items-end">
          <div>
            <p className="text-xs font-mono uppercase tracking-[.24em] text-emerald-400">
              One scan, three views
            </p>
            <h2 className="mt-5 max-w-xl text-4xl font-semibold tracking-[-.04em] text-white md:text-5xl">
              Inspect the evidence behind every score.
            </h2>
          </div>
          <p className="max-w-xl text-base leading-7 text-zinc-400 lg:justify-self-end">
            Compare the input with the model’s reconstruction, then use the
            error map to focus review. The interface keeps classification,
            score, and calibrated threshold in the same frame.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          className="mt-12 rounded-[28px] border border-white/10 bg-[#0d100f] p-3 shadow-2xl shadow-black/30 md:p-5"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-2 pb-4">
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
              <ScanSearch size={17} className="text-emerald-400" />
              Industrial_1.jpg
            </div>
            <div className="flex items-center gap-2 rounded-full bg-amber-400/10 px-3 py-1.5 text-xs text-amber-300">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
              Score exceeds threshold
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {panels.map((panel, index) => (
              <div
                key={panel.title}
                className="overflow-hidden rounded-2xl border border-white/8 bg-black/20"
              >
                <div className={`relative h-64 ${panel.style}`}>
                  <div className="absolute inset-0 opacity-35 [background-image:repeating-linear-gradient(20deg,transparent_0_16px,rgba(255,255,255,.08)_17px_18px)]" />
                  {index === 2 && (
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_58%_55%,rgba(239,68,68,.45),transparent_27%)]" />
                  )}
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-200">
                      {panel.title}
                    </p>
                    <p className="mt-1 text-xs text-zinc-600">
                      {panel.caption}
                    </p>
                  </div>
                  {index === 0 ? (
                    <Eye size={16} className="text-zinc-500" />
                  ) : (
                    <Layers3
                      size={16}
                      className={
                        index === 2 ? "text-amber-400" : "text-zinc-500"
                      }
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
