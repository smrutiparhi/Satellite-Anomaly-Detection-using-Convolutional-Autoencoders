import { lazy, Suspense, useEffect, useRef, useState } from "react";
import createGlobe from "cobe";

const Satellite = lazy(() => import("./Satellite"));

export default function OrbitalScene() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<number | null>(null);
  const rotation = useRef(0.7);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!canvas.current) return;
    const element = canvas.current;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let visible = true;
    let globe: ReturnType<typeof createGlobe>;
    const size = () => Math.max(1, element.clientWidth);
    try {
      globe = createGlobe(element, {
        width: size(), height: size(), devicePixelRatio: Math.min(window.devicePixelRatio, 2),
        phi: rotation.current, theta: 0.22, dark: 1, diffuse: 1.8,
        mapSamples: 18000, mapBrightness: 5, mapBaseBrightness: 0.06,
        baseColor: [0.12, 0.26, 0.22], markerColor: [0.4, 1, 0.75],
        glowColor: [0.08, 0.25, 0.2],
        markers: [
          { location: [20.3, 85.8], size: 0.065 },
          { location: [37.8, -122.4], size: 0.045 },
          { location: [51.5, -0.1], size: 0.045 },
          { location: [-1.3, 36.8], size: 0.045 },
        ],
      });
      setReady(true);
    } catch {
      return;
    }
    const observer = new ResizeObserver(() => globe.update({ width: size(), height: size() }));
    observer.observe(element);
    const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    visibility.observe(element);
    const animate = () => {
      if (visible && !document.hidden) {
        if (!motion.matches && drag.current === null) rotation.current += 0.002;
        globe.update({ phi: rotation.current });
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      visibility.disconnect();
      globe.destroy();
    };
  }, []);

  return (
    <div className="orbital-scene" aria-label="Interactive 3D Earth with an orbiting satellite. Drag to rotate Earth.">
      <div className="orbital-stars" />
      <div className="orbit-ring orbit-ring-one" />
      <div className="orbit-ring orbit-ring-two" />
      <div className="globe-halo" />
      {!ready && <div className="globe-fallback" />}
      <canvas
        ref={canvas}
        className="orbital-globe"
        aria-label="Drag to rotate the globe"
        onPointerDown={(event) => { drag.current = event.clientX; event.currentTarget.setPointerCapture(event.pointerId); }}
        onPointerMove={(event) => {
          if (drag.current === null) return;
          rotation.current += (event.clientX - drag.current) * 0.008;
          drag.current = event.clientX;
        }}
        onPointerUp={() => { drag.current = null; }}
        onPointerCancel={() => { drag.current = null; }}
      />
      <div className="satellite-flight" aria-hidden="true">
        <Suspense fallback={null}><Satellite /></Suspense>
      </div>
      <div className="orbital-tag orbital-tag-top"><span className="orbital-dot" /> EARTH OBSERVATION <span className="text-zinc-600">/ 01</span></div>
      <div className="orbital-tag orbital-tag-bottom">
        <div className="mb-2 text-[10px] tracking-[.18em] text-emerald-300">A NEW PERSPECTIVE</div>
        <div className="text-sm text-zinc-200">See beyond the familiar.</div>
        <div className="mt-2 text-[10px] text-zinc-500">Illustrative orbital view · drag to explore</div>
      </div>
      <div className="orbital-coordinate" aria-hidden="true">20.30° N<br />85.80° E</div>
    </div>
  );
}
