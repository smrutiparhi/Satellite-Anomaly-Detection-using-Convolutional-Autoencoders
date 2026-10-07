import { ArrowUpRight, Crosshair, Github } from "lucide-react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="border-t border-white/7 bg-[#030504] px-6 py-12">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 md:flex-row md:items-end md:justify-between">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-3 text-sm font-semibold text-white"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-emerald-400/20 bg-emerald-400/8 text-emerald-300">
              <Crosshair size={17} />
            </span>
            Satellite Anomaly
          </Link>
          <p className="mt-4 max-w-md text-sm leading-6 text-zinc-600">
            A reproducible research implementation for reconstruction-based
            novelty detection in satellite imagery.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-zinc-500">
          <a href="#product" className="hover:text-white">
            Product
          </a>
          <a href="#benchmark" className="hover:text-white">
            Results
          </a>
          <Link to="/login" className="hover:text-white">
            Sign in
          </Link>
          <a
            href="https://github.com/smrutiparhi/Satellite-Anomaly-Detection-using-Convolutional-Autoencoders"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-white"
          >
            <Github size={15} />
            GitHub
            <ArrowUpRight size={13} />
          </a>
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-7xl border-t border-white/7 pt-6 text-xs text-zinc-700">
        © {new Date().getFullYear()} Satellite Anomaly Detection · KL
        University project
      </div>
    </footer>
  );
}
