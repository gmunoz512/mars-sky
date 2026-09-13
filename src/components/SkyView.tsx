import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { SkyLabel, SkyModel, SkyStar } from "../lib/sky";

type Mode = "locked" | "look";

type Props = {
  sky: SkyModel;
  mode: Mode;
  className?: string;
};

type LabelEl = {
  el: HTMLDivElement;
  label: SkyLabel;
};

const MAG_BINS: { max: number; size: number }[] = [
  { max: 0.5, size: 8.4 },
  { max: 1.5, size: 5.6 },
  { max: 2.5, size: 3.8 },
  { max: 3.5, size: 2.6 },
  { max: 4.5, size: 1.8 },
  { max: 99, size: 1.2 },
];

function bvToColor(bv: number): THREE.Color {
  const t = Math.min(2, Math.max(-0.4, bv));
  const c = new THREE.Color();
  if (t < 0.0) c.setRGB(0.72, 0.8, 1.0);
  else if (t < 0.45) c.setRGB(0.86, 0.9, 0.98);
  else if (t < 0.85) c.setRGB(1.0, 0.96, 0.88);
  else if (t < 1.4) c.setRGB(1.0, 0.82, 0.62);
  else c.setRGB(1.0, 0.66, 0.48);
  return c;
}

function fillStarGeometry(stars: SkyStar[]): THREE.BufferGeometry {
  const pos = new Float32Array(stars.length * 3);
  const col = new Float32Array(stars.length * 3);
  stars.forEach((s, i) => {
    pos[i * 3] = s.dir.x;
    pos[i * 3 + 1] = s.dir.y;
    pos[i * 3 + 2] = s.dir.z;
    const c = bvToColor(s.bv);
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return geo;
}

export function SkyView({ sky, mode, className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const applyRef = useRef<(model: SkyModel) => void>(() => undefined);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    const host = hostRef.current;
    const overlay = overlayRef.current;
    if (!host || !overlay) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x07060a, 1);
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(58, 1, 0.05, 20);
    camera.up.set(0, 1, 0);

    // Azimuth 0 = north (Mars NCP). Elevation in radians above the horizon.
    const yaw = { current: 0.12 };
    const pitch = { current: 0.72 };
    const targetYaw = { current: 0.12 };
    const targetPitch = { current: 0.72 };

    const look = () => {
      const el = pitch.current;
      const az = yaw.current;
      camera.position.set(0, 0.02, 0);
      camera.lookAt(
        Math.sin(az) * Math.cos(el),
        Math.sin(el) + 0.02,
        -Math.cos(az) * Math.cos(el),
      );
    };

    const starLayers: THREE.Points[] = MAG_BINS.map((bin) => {
      const points = new THREE.Points(
        new THREE.BufferGeometry(),
        new THREE.PointsMaterial({
          size: bin.size,
          sizeAttenuation: false,
          vertexColors: true,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      scene.add(points);
      return points;
    });

    const lineGeo = new THREE.BufferGeometry();
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xb7c4d4,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    });
    scene.add(new THREE.LineSegments(lineGeo, lineMat));

    const bodyGroup = new THREE.Group();
    scene.add(bodyGroup);

    const skyDome = makeMartianSkyDome();
    scene.add(skyDome);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(8, 96),
      new THREE.MeshBasicMaterial({ color: 0x2a160e }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.012;
    scene.add(ground);

    const haze = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 4.2, 96),
      new THREE.MeshBasicMaterial({
        color: 0xd49258,
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    haze.rotation.x = -Math.PI / 2;
    haze.position.y = -0.006;
    scene.add(haze);

    const twilight = new THREE.Mesh(
      new THREE.RingGeometry(0.86, 1.55, 96),
      new THREE.MeshBasicMaterial({
        color: 0xf0b478,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    twilight.rotation.x = -Math.PI / 2;
    twilight.position.y = 0.01;
    scene.add(twilight);

    scene.add(
      new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(
          Array.from({ length: 128 }, (_, i) => {
            const a = (i / 128) * Math.PI * 2;
            return new THREE.Vector3(Math.sin(a) * 0.995, 0, Math.cos(a) * 0.995);
          }),
        ),
        new THREE.LineBasicMaterial({ color: 0xc47a4a, transparent: true, opacity: 0.28 }),
      ),
    );

    for (const c of [
      { t: "N", a: 0 },
      { t: "E", a: 90 },
      { t: "S", a: 180 },
      { t: "W", a: 270 },
    ]) {
      const az = (c.a * Math.PI) / 180;
      const sprite = makeTextSprite(c.t);
      sprite.position.set(Math.sin(az) * 0.92, 0.028, -Math.cos(az) * 0.92);
      sprite.scale.setScalar(0.08);
      scene.add(sprite);
    }

    const labels: LabelEl[] = [];

    const applySky = (model: SkyModel) => {
      MAG_BINS.forEach((bin, index) => {
        const lo = index === 0 ? -99 : MAG_BINS[index - 1]!.max;
        const subset = model.stars.filter((s) => s.mag > lo && s.mag <= bin.max);
        const next = fillStarGeometry(subset);
        const layer = starLayers[index]!;
        layer.geometry.dispose();
        layer.geometry = next;
      });

      lineGeo.setAttribute(
        "position",
        new THREE.BufferAttribute(new Float32Array(model.lineSegments), 3),
      );
      lineGeo.computeBoundingSphere();

      while (bodyGroup.children.length) {
        const child = bodyGroup.children[0]!;
        bodyGroup.remove(child);
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          const mat = child.material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat.dispose();
        }
      }

      for (const body of model.bodies) {
        const radius =
          body.kind === "sun"
            ? 0.018
            : body.id === "earth"
              ? 0.012
              : body.kind === "satellite"
                ? 0.01
                : 0.0075;
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(radius, 16, 16),
          new THREE.MeshBasicMaterial({ color: body.color }),
        );
        mesh.position.set(body.dir.x, body.dir.y, body.dir.z);
        bodyGroup.add(mesh);
        if (body.kind === "sun") {
          const glow = new THREE.Mesh(
            new THREE.SphereGeometry(radius * 2.4, 16, 16),
            new THREE.MeshBasicMaterial({
              color: body.color,
              transparent: true,
              opacity: 0.18,
              depthWrite: false,
            }),
          );
          glow.position.copy(mesh.position);
          bodyGroup.add(glow);
        }
      }

      overlay.replaceChildren();
      labels.length = 0;
      for (const label of model.labels) {
        const el = document.createElement("div");
        el.textContent = label.text;
        el.className =
          label.kind === "constellation"
            ? "pointer-events-none absolute left-0 top-0 text-[10px] uppercase tracking-[0.22em] text-ink/45"
            : label.kind === "body"
              ? "pointer-events-none absolute left-0 top-0 text-[11px] tracking-[0.14em] text-ink/80"
              : "pointer-events-none absolute left-0 top-0 text-[10px] tracking-[0.16em] text-ink/55";
        overlay.appendChild(el);
        labels.push({ el, label });
      }
    };

    applyRef.current = applySky;
    applySky(sky);

    const tmp = new THREE.Vector3();
    const placeLabels = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      for (const item of labels) {
        tmp.set(item.label.dir.x, item.label.dir.y, item.label.dir.z);
        tmp.project(camera);
        const visible = tmp.z < 1 && tmp.x > -1.1 && tmp.x < 1.1 && tmp.y > -1.1 && tmp.y < 1.1;
        if (!visible) {
          item.el.style.display = "none";
          continue;
        }
        item.el.style.display = "block";
        const yOff = item.label.kind === "constellation" ? 0 : -16;
        item.el.style.transform = `translate(-50%, -50%) translate(${(tmp.x * 0.5 + 0.5) * w}px, ${(-tmp.y * 0.5 + 0.5) * h + yOff}px)`;
      }
    };

    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (w < 2 || h < 2) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const onDown = (e: PointerEvent) => {
      if (modeRef.current !== "look") return;
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      host.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging || modeRef.current !== "look") return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      targetYaw.current -= dx * 0.005;
      targetPitch.current = Math.min(1.35, Math.max(0.06, targetPitch.current + dy * 0.004));
    };
    const onUp = () => {
      dragging = false;
    };
    host.addEventListener("pointerdown", onDown);
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerup", onUp);
    host.addEventListener("pointercancel", onUp);

    let raf = 0;
    let last = performance.now();
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (modeRef.current === "locked" && !reduced) {
        targetYaw.current += dt * 0.012;
      }
      yaw.current += (targetYaw.current - yaw.current) * 0.12;
      pitch.current += (targetPitch.current - pitch.current) * 0.12;
      look();
      placeLabels();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerup", onUp);
      host.removeEventListener("pointercancel", onUp);
      skyDome.geometry.dispose();
      (skyDome.material as THREE.Material).dispose();
      starLayers.forEach((layer) => {
        layer.geometry.dispose();
        (layer.material as THREE.Material).dispose();
      });
      lineGeo.dispose();
      lineMat.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      overlay.replaceChildren();
    };
  }, []);

  useEffect(() => {
    applyRef.current(sky);
  }, [sky]);

  return (
    <div
      className={`relative overflow-hidden bg-dusk ${mode === "look" ? "cursor-grab active:cursor-grabbing" : ""} ${className ?? ""}`}
    >
      <div ref={hostRef} className="absolute inset-0" />
      <div ref={overlayRef} className="pointer-events-none absolute inset-0 font-sans" />
    </div>
  );
}

function makeMartianSkyDome(): THREE.Mesh {
  const geo = new THREE.SphereGeometry(6, 48, 32, 0, Math.PI * 2, 0, Math.PI / 2);
  const cols = new Float32Array((geo.attributes.position?.count ?? 0) * 3);
  const pos = geo.attributes.position!;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 6;
    const t = Math.min(1, Math.max(0, y));
    const hor = [0.78, 0.42, 0.22];
    const mid = [0.28, 0.12, 0.08];
    const zen = [0.03, 0.018, 0.02];
    const u = t < 0.28 ? t / 0.28 : 1;
    const a = t < 0.28 ? hor : mid;
    const b = t < 0.28 ? mid : zen;
    const s = t < 0.28 ? u : (t - 0.28) / 0.72;
    cols[i * 3] = a[0]! + (b[0]! - a[0]!) * s;
    cols[i * 3 + 1] = a[1]! + (b[1]! - a[1]!) * s;
    cols[i * 3 + 2] = a[2]! + (b[2]! - a[2]!) * s;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(cols, 3));
  return new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.BackSide,
      depthWrite: false,
      transparent: true,
      opacity: 0.52,
    }),
  );
}

function makeTextSprite(text: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 128, 64);
  ctx.fillStyle = "#c47a4a";
  ctx.font = "500 22px Outfit, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 64, 32);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  return new THREE.Sprite(mat);
}
