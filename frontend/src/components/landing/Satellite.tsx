import { useEffect, useRef } from "react";
import * as THREE from "three";

/** Small, self-contained Earth observation spacecraft, rendered with real geometry. */
export default function Satellite() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(4, 3.2, 10);
    camera.lookAt(0, 0.15, 0);
    const craft = new THREE.Group();
    craft.rotation.z = -0.26;
    scene.add(craft);
    scene.add(new THREE.HemisphereLight(0xcbeaff, 0x203c35, 2.8));
    const sun = new THREE.DirectionalLight(0xfff2d1, 5);
    sun.position.set(-3, 5, 7);
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0x6ee7c4, 3);
    rim.position.set(3, -1, -4);
    scene.add(rim);

    // Fine creases in the thermal blanket catch the light without an external asset.
    const foilCanvas = document.createElement("canvas");
    foilCanvas.width = foilCanvas.height = 128;
    const context = foilCanvas.getContext("2d")!;
    context.fillStyle = "#8c8c8c";
    context.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 70; i++) {
      const x = (i * 37) % 128;
      const y = (i * 53) % 128;
      context.strokeStyle = i % 2 ? "#a9a9a9" : "#686868";
      context.lineWidth = 0.7;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo((x + 17 + i * 3) % 128, (y + 35) % 128);
      context.stroke();
    }
    const foil = new THREE.CanvasTexture(foilCanvas);
    const gold = new THREE.MeshStandardMaterial({ color: 0xd2a64e, metalness: 0.72, roughness: 0.4, bumpMap: foil, bumpScale: 0.035 });
    const aluminum = new THREE.MeshStandardMaterial({ color: 0xc4cdd6, metalness: 0.8, roughness: 0.32 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x17232f, metalness: 0.7, roughness: 0.35 });
    const solar = new THREE.MeshStandardMaterial({ color: 0x123369, metalness: 0.58, roughness: 0.25 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x12465b, metalness: 0.9, roughness: 0.12, emissive: 0x082b38, emissiveIntensity: 0.35 });
    const box = (w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      mesh.position.set(x, y, z);
      craft.add(mesh);
      return mesh;
    };
    const cylinder = (radius: number, height: number, material: THREE.Material, x: number, y: number, z: number) => {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 32), material);
      mesh.position.set(x, y, z);
      mesh.rotation.x = Math.PI / 2;
      craft.add(mesh);
      return mesh;
    };

    box(1.15, 1.35, 1.05, gold, 0, 0, 0);
    box(1.2, 0.1, 1.1, aluminum, 0, 0.68, 0);
    box(1.2, 0.1, 1.1, aluminum, 0, -0.68, 0);
    // Silver structural rails and a side radiator give the bus a believable silhouette.
    for (const x of [-0.56, 0.56]) box(0.055, 1.3, 0.05, aluminum, x, 0, 0.55);
    box(0.04, 0.85, 0.75, dark, 0.59, -0.05, 0);
    for (let i = 0; i < 7; i++) box(0.055, 0.025, 0.7, aluminum, 0.62, -0.38 + i * 0.11, 0);
    cylinder(0.34, 0.32, dark, 0, -0.12, 0.69);
    cylinder(0.28, 0.035, aluminum, 0, -0.12, 0.87);
    cylinder(0.235, 0.045, glass, 0, -0.12, 0.9);
    cylinder(0.065, 0.15, dark, 0.36, 0.4, 0.6);

    for (const side of [-1, 1]) {
      box(0.5, 0.075, 0.075, aluminum, side * 0.81, 0, 0);
      box(2.15, 1.48, 0.06, aluminum, side * 2.1, 0, 0);
      box(2.08, 1.4, 0.065, dark, side * 2.1, 0, 0.015);
      // Individual cells, thin gaps, and bus bars rather than a flat blue rectangle.
      for (let col = 0; col < 6; col++) {
        for (let row = 0; row < 4; row++) {
          const x = side * 2.1 - 0.86 + col * 0.344;
          const y = -0.51 + row * 0.34;
          box(0.32, 0.315, 0.014, solar, x, y, 0.058);
          box(0.006, 0.3, 0.016, aluminum, x, y, 0.068);
        }
      }
      box(0.035, 1.45, 0.08, aluminum, side * 2.1, 0, 0.06);
    }

    const dishGroup = new THREE.Group();
    dishGroup.position.set(-0.13, 0.94, 0.1);
    dishGroup.rotation.x = 0.65;
    const profile = [new THREE.Vector2(0, 0), new THREE.Vector2(0.1, 0.015), new THREE.Vector2(0.22, 0.055), new THREE.Vector2(0.34, 0.14), new THREE.Vector2(0.43, 0.25)];
    const dish = new THREE.Mesh(new THREE.LatheGeometry(profile, 40), new THREE.MeshStandardMaterial({ color: 0xe4e9ec, metalness: 0.65, roughness: 0.32, side: THREE.DoubleSide }));
    dishGroup.add(dish);
    const feed = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.4, 12), dark);
    feed.position.y = 0.24;
    dishGroup.add(feed);
    craft.add(dishGroup);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.35, 12), aluminum);
    mast.position.set(-0.13, 0.8, 0.1);
    craft.add(mast);

    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      renderer.setSize(width, height);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = true;
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    intersection.observe(container);
    let frame = 0;
    const animate = (time: number) => {
      if (visible && !document.hidden) {
        const t = reduced.matches ? 0 : time * 0.00045;
        craft.rotation.y = Math.sin(t) * 0.12;
        craft.rotation.z = -0.26 + Math.sin(t * 0.7) * 0.035;
        craft.position.y = Math.sin(t * 1.2) * 0.08;
        renderer.render(scene, camera);
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      intersection.disconnect();
      const materials = new Set<THREE.Material>();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
        }
      });
      materials.forEach((material) => material.dispose());
      foil.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={host} className="satellite-render" aria-hidden="true" />;
}
