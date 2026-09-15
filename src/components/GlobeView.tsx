import { useEffect, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import albedoUrl from "../assets/mars/mars-albedo.jpg";
import bumpUrl from "../assets/mars/mars-bump.jpg";
import {
  ORBIT_FOV_DEG,
  bodyFixedToThree,
  clampOrbitPitch,
  composeGlobeAlbedo,
  jezeroUnitFixed,
  orbitCameraDir,
  orbitCameraDistance,
  portraitFaceUnitFixed,
  yawToFaceCamera,
} from "../lib/globe";
import { fitRendererToHost } from "../lib/renderer";
import { JEZERO } from "../lib/jezero";
import type { Vec3 } from "../lib/math";
import type { CaptureFrame } from "../lib/shareImage";

type Props = {
  ls: number;
  sunFixed: Vec3;
  approach: number;
  className?: string;
  onEnterSurface: () => void;
  captureRef?: MutableRefObject<CaptureFrame | null>;
};

const ATMOS_VERT = `
varying vec3 vNormal;
varying vec3 vView;
varying vec3 vWorldNormal;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

const ATMOS_FRAG = `
uniform vec3 uColor;
uniform vec3 uSun;
uniform float uPower;
uniform float uOpacity;
varying vec3 vNormal;
varying vec3 vView;
varying vec3 vWorldNormal;
void main() {
  float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), uPower);
  float lit = clamp(dot(normalize(vWorldNormal), normalize(uSun)) * 0.55 + 0.45, 0.0, 1.0);
  gl_FragColor = vec4(uColor, rim * mix(0.12, 1.0, lit) * uOpacity);
}
`;

export function GlobeView({ ls, sunFixed, approach, className, onEnterSurface, captureRef }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const captureTarget = useRef(captureRef);
  captureTarget.current = captureRef;
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

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x07060a, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(ORBIT_FOV_DEG, 1, 0.08, 80);
    const aspectRef = { current: 1 };
    camera.up.set(0, 1, 0);

    const starGeo = new THREE.BufferGeometry();
    const starCount = 900;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const z = Math.random() * 2 - 1;
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - z * z);
      starPos[i * 3] = r * Math.cos(a) * 40;
      starPos[i * 3 + 1] = z * 40;
      starPos[i * 3 + 2] = r * Math.sin(a) * 40;
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

    const marsMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.02,
      bumpScale: 0.06,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.12,
    });
    const mars = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), marsMat);
    marsGroup.add(mars);

    const applyColorMap = (tex: THREE.Texture) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.needsUpdate = true;
      const prev = marsMat.map;
      marsMat.map = tex;
      marsMat.emissiveMap = tex;
      marsMat.needsUpdate = true;
      if (prev && prev !== tex) prev.dispose();
      mapRef.current = tex as THREE.CanvasTexture;
    };

    const loader = new THREE.TextureLoader();
    void Promise.all([loader.loadAsync(albedoUrl), loader.loadAsync(bumpUrl)])
      .then(([albedoTex, bumpTex]) => {
        albedoSrcRef.current = albedoTex.image as CanvasImageSource;
        try {
          applyColorMap(
            new THREE.CanvasTexture(composeGlobeAlbedo(albedoSrcRef.current, lsRef.current)),
          );
          albedoTex.dispose();
        } catch {
          applyColorMap(albedoTex);
        }

        bumpTex.colorSpace = THREE.NoColorSpace;
        bumpTex.wrapS = THREE.RepeatWrapping;
        bumpTex.wrapT = THREE.ClampToEdgeWrapping;
        bumpTex.anisotropy = 8;
        bumpTex.needsUpdate = true;
        marsMat.bumpMap = bumpTex;
        marsMat.needsUpdate = true;
      })
      .catch((err) => {
        console.error("mars globe textures failed to load", err);
      });

    const atmosMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0xf2c090) },
        uSun: { value: new THREE.Vector3(0.12, 0.88, 0.42) },
        uPower: { value: 2.2 },
        uOpacity: { value: 0.62 },
      },
      vertexShader: ATMOS_VERT,
      fragmentShader: ATMOS_FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });
    const atmos = new THREE.Mesh(new THREE.SphereGeometry(1.055, 64, 48), atmosMat);
    marsGroup.add(atmos);

    const hazeMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0xf6d0a8) },
        uSun: { value: new THREE.Vector3(0.12, 0.88, 0.42) },
        uPower: { value: 3.6 },
        uOpacity: { value: 0.18 },
      },
      vertexShader: ATMOS_VERT,
      fragmentShader: ATMOS_FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });
    marsGroup.add(new THREE.Mesh(new THREE.SphereGeometry(1.025, 64, 48), hazeMat));

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

    const sun = new THREE.DirectionalLight(0xfff2dc, 2.4);
    scene.add(sun);
    const fill = new THREE.AmbientLight(0x1a1410, 0.06);
    scene.add(fill);
    const rim = new THREE.HemisphereLight(0xc9a078, 0x080605, 0.16);
    scene.add(rim);
    const portraitSun = new THREE.Vector3(0.1, 0.7, 0.64).normalize();

    const userAz = { current: 0 };
    const userEl = { current: 0 };
    const targetAz = { current: 0 };
    const targetEl = { current: 0 };
    let dragging = false;
    let dragged = false;
    let lastX = 0;
    let lastY = 0;

    const tmp = new THREE.Vector3();
    const look = new THREE.Vector3();
    const cam = new THREE.Vector3();
    const sunDir = new THREE.Vector3();
    const jezeroV = new THREE.Vector3(jezero.x, jezero.y, jezero.z);
    const north = new THREE.Vector3(0, 1, 0);
    const tangent = new THREE.Vector3().crossVectors(north, jezeroV).normalize();
    if (tangent.lengthSq() < 0.01) tangent.set(1, 0, 0);

    const applySun = (blend = 0) => {
      const midnight = bodyFixedToThree(sunRef.current);
      sunDir.copy(portraitSun).lerp(new THREE.Vector3(midnight.x, midnight.y, midnight.z), blend);
      sunDir.normalize();
      sun.position.copy(sunDir).multiplyScalar(8);
      atmosMat.uniforms.uSun!.value.copy(sunDir);
      hazeMat.uniforms.uSun!.value.copy(sunDir);
    };
    applySun(0);

    const placeLabel = () => {
      tmp.copy(pinPos).applyMatrix4(marsGroup.matrixWorld).project(camera);
      const w = host.clientWidth;
      const h = host.clientHeight;
      const visible = tmp.z < 1 && tmp.x > -0.95 && tmp.x < 0.95 && tmp.y > -0.9 && tmp.y < 0.9;
      label.style.display = visible && approachRef.current < 0.82 ? "block" : "none";
      label.style.transform = `translate(-50%, -140%) translate(${(tmp.x * 0.5 + 0.5) * w}px, ${(-tmp.y * 0.5 + 0.5) * h}px)`;
    };

    const resize = () => {
      const { width: w, height: h } = fitRendererToHost(renderer, host);
      if (w < 2 || h < 2) return;
      aspectRef.current = w / h;
      camera.aspect = aspectRef.current;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    const onDown = (e: PointerEvent) => {
      if (approachRef.current > 0.12) return;
      dragging = true;
      dragged = false;
      lastX = e.clientX;
      lastY = e.clientY;
      host.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      if (dx * dx + dy * dy > 4) dragged = true;
      // Finger follows the mosaic: drag right / down spins that way.
      targetAz.current -= dx * 0.005;
      targetEl.current = clampOrbitPitch(targetEl.current + dy * 0.004);
    };
    const onUp = () => {
      dragging = false;
    };
    const onClick = (e: PointerEvent) => {
      if (approachRef.current > 0.05 || dragged) return;
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
    const vallesYaw = yawToFaceCamera(portraitFaceUnitFixed());
    const jezeroYaw = yawToFaceCamera(jezeroBf);
    const jezeroLook = new THREE.Vector3();
    const PORTRAIT_EL = 0.16;

    const paint = () => {
      const a = approachRef.current;
      if (a > 0.08) {
        targetAz.current += (0 - targetAz.current) * 0.06;
        targetEl.current += (0 - targetEl.current) * 0.06;
      }
      userAz.current += (targetAz.current - userAz.current) * 0.14;
      userEl.current += (targetEl.current - userEl.current) * 0.14;
      marsGroup.rotation.y = vallesYaw * (1 - a) + jezeroYaw * a;

      const orbitDist = orbitCameraDistance(aspectRef.current, ORBIT_FOV_DEG);
      const dist = orbitDist * (1 - a) + 1.12 * a;
      const toward = 0.28 + 0.72 * a;
      const side = 0.72 * (1 - a) + 0.08 * a;
      const jezeroCam = tmp.copy(jezeroV).multiplyScalar(toward).addScaledVector(tangent, side);
      jezeroCam.setLength(dist);
      const dir = orbitCameraDir(userAz.current, PORTRAIT_EL + userEl.current);
      cam.set(dir.x, dir.y, dir.z).setLength(dist).lerp(jezeroCam, a);
      jezeroLook.copy(jezeroV).multiplyScalar(0.04 + 0.96 * a);
      look.set(0, 0, 0).lerp(jezeroLook, a);
      camera.position.copy(cam);
      camera.up.set(0, 1, 0);
      camera.lookAt(look);
      camera.fov = ORBIT_FOV_DEG + 16 * a;
      camera.updateProjectionMatrix();

      atmosMat.uniforms.uOpacity!.value = 0.55 + 0.12 * a;
      glowMat.opacity = 0.22 + 0.16 * Math.sin(performance.now() * 0.002);
      applySun(a);
      placeLabel();
      renderer.render(scene, camera);
    };

    const tick = () => {
      paint();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const capture: CaptureFrame = () => {
      paint();
      const canvas = renderer.domElement;
      if (canvas.width < 2 || canvas.height < 2) return null;
      return canvas;
    };
    if (captureTarget.current) captureTarget.current.current = capture;

    return () => {
      if (captureTarget.current) captureTarget.current.current = null;
      cancelAnimationFrame(raf);
      ro.disconnect();
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerup", onUp);
      host.removeEventListener("pointercancel", onUp);
      host.removeEventListener("click", onClick);
      marsMat.map?.dispose();
      if (marsMat.bumpMap) marsMat.bumpMap.dispose();
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
      <div
        ref={hostRef}
        className="absolute inset-0 overflow-hidden touch-none cursor-grab active:cursor-grabbing"
      />
      <div ref={overlayRef} className="pointer-events-none absolute inset-0 font-sans" />
    </div>
  );
}
