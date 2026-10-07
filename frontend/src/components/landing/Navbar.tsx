import { useEffect, useState } from "react";
import { ArrowUpRight, Crosshair, Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../../utils/cn";
import { readUser } from "../../utils/session";

const links = [
  ["Product", "#product"],
  ["Capabilities", "#features"],
  ["Workflow", "#how-it-works"],
  ["Results", "#benchmark"],
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const authenticated = Boolean(readUser());

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 16);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <nav className="fixed inset-x-0 top-0 z-50 px-3 pt-3 md:px-6">
      <div
        className={cn(
          "mx-auto w-full max-w-7xl rounded-2xl border px-4 transition-all duration-300 md:px-5",
          scrolled || open
            ? "border-white/10 bg-[#080b0a]/90 shadow-2xl shadow-black/30 backdrop-blur-xl"
            : "border-transparent bg-transparent",
        )}
      >
        <div className="flex h-16 items-center justify-between">
          <Link
            to="/"
            className="flex min-w-0 items-center gap-3"
            aria-label="Satellite Anomaly home"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-emerald-400/25 bg-emerald-400/10 text-emerald-300">
              <Crosshair size={18} />
            </span>
            <span className="leading-none">
              <strong className="block text-sm font-semibold tracking-tight text-white">
                Satellite Anomaly
              </strong>
              <span className="mt-1 block text-[9px] font-mono uppercase tracking-[0.25em] text-emerald-400">
                Earth intelligence
              </span>
            </span>
          </Link>

          <div className="hidden items-center gap-7 lg:flex">
            {links.map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="text-sm text-zinc-400 transition hover:text-white"
              >
                {label}
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            {!authenticated && (
              <Link
                to="/login"
                className="px-3 py-2 text-sm text-zinc-300 transition hover:text-white"
              >
                Sign in
              </Link>
            )}
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300"
            >
              {authenticated ? "Return to workspace" : "Open workspace"}
              <ArrowUpRight size={15} />
            </Link>
          </div>

          <button
            className="shrink-0 rounded-lg p-2 text-zinc-300 lg:hidden"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label="Toggle navigation"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {open && (
          <div className="border-t border-white/8 py-4 lg:hidden">
            <div className="grid gap-1">
              {links.map(([label, href]) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm text-zinc-300 hover:bg-white/5"
                >
                  {label}
                </a>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/8 pt-4">
              <Link
                to="/login"
                className="rounded-xl border border-white/10 px-4 py-3 text-center text-sm text-zinc-200"
              >
                Sign in
              </Link>
              <Link
                to="/dashboard"
                className="rounded-xl bg-emerald-400 px-4 py-3 text-center text-sm font-semibold text-zinc-950"
              >
                Workspace
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
