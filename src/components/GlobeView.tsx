import { useEffect, useRef } from "react";
import * as THREE from "three";
import albedoUrl from "../assets/mars/mars-albedo.jpg";
import bumpUrl from "../assets/mars/mars-bump.jpg";
import { bodyFixedToThree, composeGlobeAlbedo, jezeroUnitFixed } from "../lib/globe";
import { JEZERO } from "../lib/jezero";
import type { Vec3 } from "../lib/math";

type Props = {
  ls: number;
  sunFixed: Vec3;
  approach: number;
  className?: string;
  onEnterSurface: () => void;
};

const ATMOS_VERT = `
varying vec3 vNormal;
varying vec3 vView;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

const ATMOS_FRAG = `
uniform vec3 uColor;
uniform float uPower;
uniform float uOpacity;
varying vec3 vNormal;
varying vec3 vView;
void main() {
  float f = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), uPower);
  gl_FragColor = vec4(uColor, f * uOpacity);
}
`;

export function GlobeView({ ls, sunFixed, approach, className, onEnterSurface }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const sunRef = useRef(sunFixed);
  const approachRef = useRef(approach);
  const onEnterRef = useRef(onEnterSurface);
  const mapRef = useRef<THREE.CanvasTexture | null>(null);
  const albedoSrcRef = useRef<CanvasImageSource | null>(null);
  const lsRef = useRef(ls);
  sunRef.current = sunFixed;
  approachRef.current = approach;
  onEnterRef.current = onEnterSurface;
  lsRef.current = ls;

  useEffect(() => {
    const host = hostRef.current;
    const overlay = overlayRef.current;
    if (!host || !overlay) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x07060a, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 40);
    camera.up.set(0, 1, 0);

    const starGeo = new THREE.BufferGeometry();
    const starCount = 900;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const z = Math.random() * 2 - 1;
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - z * z);
      starPos[i * 3] = r * Math.cos(a) * 18;
      starPos[i * 3 + 1] = z * 18;
      starPos[i * 3 + 2] = r * Math.sin(a) * 18;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({
        color: 0xd8d4cc,
        size: 0.9,
        sizeAttenuation: false,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      }),
    );
    scene.add(stars);

    const marsGroup = new THREE.Group();
    scene.add(marsGroup);

    const placeholder = document.createElement("canvas");
    placeholder.width = 4;
    placeholder.height = 2;
    const pctx = placeholder.getContext("2d")!;
    pctx.fillStyle = "#7a4a32";
    pctx.fillRect(0, 0, 4, 2);

    const map = new THREE.CanvasTexture(placeholder);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.ClampToEdgeWrapping;
    mapRef.current = map;

    const bump = new THREE.Texture();
    bump.wrapS = THREE.RepeatWrapping;
    bump.wrapT = THREE.ClampToEdgeWrapping;
    bump.anisotropy = 8;

    const marsMat = new THREE.MeshStandardMaterial({
      map,
      bumpMap: bump,
      bumpScale: 0.028,
      roughness: 0.92,
      metalness: 0.02,
      color: 0xffffff,
    });
    const mars = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), marsMat);
    marsGroup.add(mars);

    const loader = new THREE.TextureLoader();
    void Promise.all([loader.loadAsync(albedoUrl), loader.loadAsync(bumpUrl)]).then(
      ([albedoTex, bumpTex]) => {
        const src = albedoTex.image as CanvasImageSource;
        albedoSrcRef.current = src;
        const canvas = composeGlobeAlbedo(src, lsRef.current);
        map.image = canvas;
        map.needsUpdate = true;
        albedoTex.dispose();

        bump.image = bumpTex.image;
        bump.needsUpdate = true;
        bumpTex.dispose();
      },
    );

    const atmosMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0xc48a62) },
        uPower: { value: 2.7 },
        uOpacity: { value: 0.48 },
      },
      vertexShader: ATMOS_VERT,
      fragmentShader: ATMOS_FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });
    const atmos = new THREE.Mesh(new THREE.SphereGeometry(1.045, 64, 48), atmosMat);
    marsGroup.add(atmos);

    const hazeMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0xe0a878) },
        uPower: { value: 4.2 },
        uOpacity: { value: 0.12 },
      },
      vertexShader: ATMOS_VERT,
      fragmentShader: ATMOS_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    marsGroup.add(new THREE.Mesh(new THREE.SphereGeometry(1.02, 64, 48), hazeMat));

    const jezeroBf = jezeroUnitFixed();
    const jezero = bodyFixedToThree(jezeroBf);
    const pinPos = new THREE.Vector3(jezero.x, jezero.y, jezero.z).multiplyScalar(1.012);

    const pin = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xf0d2b0 }),
    );
    pin.position.copy(pinPos);
    marsGroup.add(pin);

    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xc47a4a,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 16), glowMat);
    glow.position.copy(pinPos);
    marsGroup.add(glow);

    const label = document.createElement("div");
    label.textContent = JEZERO.name;
    label.className =
      "pointer-events-none absolute left-0 top-0 text-[10px] uppercase tracking-[0.22em] text-ink/70";
    overlay.appendChild(label);

    const sun = new THREE.DirectionalLight(0xffe4c8, 1.85);
    scene.add(sun);
    const fill = new THREE.AmbientLight(0x1c1612, 0.1);
    scene.add(fill);
    const rim = new THREE.HemisphereLight(0x5a4034, 0x070605, 0.2);
    scene.add(rim);

    const userYaw = { current: 0 };
    const targetYaw = { current: 0 };
    let dragging = false;
    let lastX = 0;

    const tmp = new THREE.Vector3();
    const look = new THREE.Vector3();
    const cam = new THREE.Vector3();
    const jezeroV = new THREE.Vector3(jezero.x, jezero.y, jezero.z);
    const north = new THREE.Vector3(0, 1, 0);
    const tangent = new THREE.Vector3().crossVectors(north, jezeroV).normalize();
    if (tangent.lengthSq() < 0.01) tangent.set(1, 0, 0);

    const applySun = () => {
      const s = bodyFixedToThree(sunRef.current);
      sun.position.set(s.x, s.y, s.z).multiplyScalar(6);
    };
    applySun();

    const placeLabel = () => {
      tmp.copy(pinPos).applyMatrix4(marsGroup.matrixWorld).project(camera);
      const w = host.clientWidth;
      const h = host.clientHeight;
      const visible = tmp.z < 1 && tmp.x > -0.95 && tmp.x < 0.95 && tmp.y > -0.9 && tmp.y < 0.9;
      label.style.display = visible && approachRef.current < 0.82 ? "block" : "none";
      label.style.transform = `translate(-50%, -140%) translate(${(tmp.x * 0.5 + 0.5) * w}px, ${(-tmp.y * 0.5 + 0.5) * h}px)`;
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

    const onDown = (e: PointerEvent) => {
      if (approachRef.current > 0.12) return;
      dragging = true;
      lastX = e.clientX;
      host.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      targetYaw.current += (e.clientX - lastX) * 0.005;
      lastX = e.clientX;
    };
    const onUp = () => {
      dragging = false;
    };
    const onClick = (e: PointerEvent) => {
      if (approachRef.current > 0.05) return;
      const rect = host.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      const ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2(nx, ny), camera);
      const hits = ray.intersectObjects([pin, glow, mars], false);
      if (hits[0] && (hits[0].object === pin || hits[0].object === glow)) {
        onEnterRef.current();
      }
    };
    host.addEventListener("pointerdown", onDown);
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerup", onUp);
    host.addEventListener("pointercancel", onUp);
    host.addEventListener("click", onClick);

    let raf = 0;
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const tick = () => {
      const a = approachRef.current;
      if (a > 0.08) targetYaw.current += (0 - targetYaw.current) * 0.06;
      userYaw.current += (targetYaw.current - userYaw.current) * 0.12;
      marsGroup.rotation.y = userYaw.current;
      if (a < 0.08 && !reduced && !dragging) {
        targetYaw.current += 0.0014;
      }

      const dist = 3.35 * (1 - a) + 1.08 * a;
      const toward = 0.28 + 0.72 * a;
      const side = 0.72 * (1 - a) + 0.08 * a;
      cam.copy(jezeroV).multiplyScalar(toward).addScaledVector(tangent, side).setLength(dist);
      look.copy(jezeroV).multiplyScalar(0.04 + 0.96 * a);
      camera.position.copy(cam);
      camera.lookAt(look);
      camera.fov = 40 + 14 * a;
      camera.updateProjectionMatrix();

      atmosMat.uniforms.uOpacity!.value = 0.4 + 0.18 * a;
      glowMat.opacity = 0.28 + 0.2 * Math.sin(performance.now() * 0.002);
      applySun();
      placeLabel();
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
      host.removeEventListener("click", onClick);
      map.dispose();
      bump.dispose();
      mars.geometry.dispose();
      marsMat.dispose();
      atmos.geometry.dispose();
      atmosMat.dispose();
      hazeMat.dispose();
      pin.geometry.dispose();
      (pin.material as THREE.Material).dispose();
      glow.geometry.dispose();
      (glow.material as THREE.Material).dispose();
      starGeo.dispose();
      (stars.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.domElement.remove();
      overlay.replaceChildren();
    };
  }, []);

  useEffect(() => {
    sunRef.current = sunFixed;
  }, [sunFixed]);

  useEffect(() => {
    const map = mapRef.current;
    const src = albedoSrcRef.current;
    if (!map || !src) return;
    map.image = composeGlobeAlbedo(src, ls);
    map.needsUpdate = true;
  }, [ls]);

  return (
    <div className={`relative overflow-hidden bg-dusk ${className ?? ""}`}>
      <div ref={hostRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />
      <div ref={overlayRef} className="pointer-events-none absolute inset-0 font-sans" />
    </div>
  );
}
