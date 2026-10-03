"use client";

import { useEffect, useRef } from "react";

export interface FieldPoint {
  /** 0 to 1 across: slower to faster first reply. */
  x: number;
  /** 0 to 1 in depth: lower to higher outside merge rate. */
  z: number;
  /** Outside pull requests measured; sets the height of the column. */
  n: number;
}

const PALETTES = {
  dark: {
    dim: "#1a1f25",
    ramp: ["#174f4d", "#23807b", "#3fb8b0"],
    lit: "#93f2ea",
    sky: "#cfd8e3",
    ground: "#050607",
    key: 2.4,
    fill: 0.55,
  },
  light: {
    dim: "#dedbd3",
    ramp: ["#b5dcd8", "#7cc4bf", "#3d9d97"],
    lit: "#0f5a55",
    sky: "#ffffff",
    ground: "#cfcabf",
    key: 1.9,
    fill: 1.25,
  },
};

const WIDTH = 64;
const DEPTH = 22;
const MAX_HEIGHT = 6.5;
const INTRO_SECONDS = 1.2;

/**
 * The index as a skyline: one column per measured repository. Faster replies are to
 * the right, higher merge rates further back, and taller columns rest on more pull
 * requests. Columns in `lit` rise and brighten. three.js is loaded on demand.
 */
export function FieldScene({
  points,
  lit,
  searching,
  onUnavailable,
  className = "",
}: {
  points: FieldPoint[];
  lit: boolean[];
  searching: boolean;
  /** Called when WebGL cannot be used, so the caller can draw the flat version. */
  onUnavailable: () => void;
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const state = useRef({ lit, searching });
  const refresh = useRef<() => void>(() => {});
  const unavailable = useRef(onUnavailable);
  useEffect(() => {
    unavailable.current = onUnavailable;
  }, [onUnavailable]);

  useEffect(() => {
    state.current = { lit, searching };
    refresh.current();
  }, [lit, searching]);

  useEffect(() => {
    const el = container.current;
    if (!el || points.length === 0) return;
    let disposed = false;
    let cleanup = () => {};

    import("three").then((THREE) => {
      if (disposed) return;
      let renderer: import("three").WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      } catch {
        unavailable.current();
        return;
      }
      const canvas = renderer.domElement;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      canvas.style.cssText = "display:block;width:100%;height:100%";
      el.appendChild(canvas);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(22, 1, 0.1, 600);
      const group = new THREE.Group();
      scene.add(group);

      const geometry = new THREE.BoxGeometry(0.62, 1, 0.62);
      geometry.translate(0, 0.5, 0);
      const material = new THREE.MeshStandardMaterial({
        roughness: 0.5,
        metalness: 0.05,
      });
      const mesh = new THREE.InstancedMesh(geometry, material, points.length);
      group.add(mesh);

      const hemisphere = new THREE.HemisphereLight(0xffffff, 0x000000, 1);
      const key = new THREE.DirectionalLight(0xffffff, 2);
      key.position.set(-30, 60, 40);
      const rim = new THREE.DirectionalLight(0x9fe8e2, 0.7);
      rim.position.set(40, 20, -50);
      scene.add(hemisphere, key, rim);

      const peak = Math.log10(1 + Math.max(1, ...points.map((p) => p.n)));
      const heights = points.map(
        (p) => 0.5 + (Math.log10(1 + p.n) / peak) * MAX_HEIGHT * 0.7,
      );
      // Where each column is between resting (0) and lit (1).
      const level = new Float32Array(points.length);
      const colour = new THREE.Color();
      const dim = new THREE.Color();
      const litColour = new THREE.Color();
      let ramp: import("three").Color[] = [];
      const dummy = new THREE.Object3D();
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const pointer = { x: 0 };

      function applyTheme() {
        const palette =
          PALETTES[document.documentElement.dataset.theme === "light" ? "light" : "dark"];
        ramp = palette.ramp.map((hex) => new THREE.Color(hex));
        dim.set(palette.dim);
        litColour.set(palette.lit);
        hemisphere.color.set(palette.sky);
        hemisphere.groundColor.set(palette.ground);
        hemisphere.intensity = palette.fill;
        key.intensity = palette.key;
      }

      function layout(elapsed: number): boolean {
        const { lit: on, searching: active } = state.current;
        let moving = false;
        for (let i = 0; i < points.length; i += 1) {
          const target = on[i] ? 1 : 0;
          if (reduceMotion) level[i] = target;
          else if (Math.abs(level[i] - target) > 0.01) {
            level[i] += (target - level[i]) * 0.14;
            moving = true;
          } else level[i] = target;

          // Columns rise in a sweep from left to right when the scene first appears.
          const intro = reduceMotion
            ? 1
            : Math.min(1, Math.max(0, (elapsed - points[i].x * 0.8) / INTRO_SECONDS));
          if (intro < 1) moving = true;
          const eased = 1 - Math.pow(1 - intro, 4);
          const height = heights[i] * eased * (1 + level[i] * 0.7);

          dummy.position.set((points[i].x - 0.5) * WIDTH, 0, (0.5 - points[i].z) * DEPTH);
          dummy.scale.set(1 + level[i] * 0.5, Math.max(0.02, height), 1 + level[i] * 0.5);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);

          const t = (heights[i] / MAX_HEIGHT) * (ramp.length - 1);
          const low = Math.min(ramp.length - 1, Math.floor(t));
          colour.copy(ramp[low]).lerp(ramp[Math.min(low + 1, ramp.length - 1)], t - low);
          // While searching, everything that does not match steps back.
          if (active) colour.lerp(dim, 0.85 * (1 - level[i]));
          colour.lerp(litColour, level[i]);
          mesh.setColorAt(i, colour);
        }
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        return moving;
      }

      function resize() {
        const { clientWidth: w, clientHeight: h } = el!;
        if (w === 0 || h === 0) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        const elevation = 0.5;
        const vFov = (camera.fov * Math.PI) / 180;
        const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
        // On a phone the field runs off both edges instead of shrinking to a strip.
        const fitWidth =
          ((WIDTH * 1.04) / 2 / Math.tan(hFov / 2)) * Math.min(1, camera.aspect / 2.2);
        const span = DEPTH * Math.sin(elevation) + MAX_HEIGHT * Math.cos(elevation);
        const distance = Math.max(fitWidth, (span / 2 / Math.tan(vFov / 2)) * 1.15);
        camera.position.set(
          0,
          distance * Math.sin(elevation),
          distance * Math.cos(elevation),
        );
        camera.lookAt(0, MAX_HEIGHT * 0.2, 0);
        camera.updateProjectionMatrix();
      }

      let frame = 0;
      let visible = true;
      let start: number | null = null;
      function render(now: number) {
        frame = 0;
        if (disposed) return;
        start ??= now;
        const elapsed = (now - start) / 1000;
        const moving = layout(elapsed);
        if (!reduceMotion) {
          const sway = Math.sin(elapsed * 0.2) * 0.04 + pointer.x * 0.08;
          group.rotation.y += (sway - 0.1 - group.rotation.y) * 0.06;
        }
        renderer.render(scene, camera);
        if (visible && !document.hidden && (moving || !reduceMotion)) schedule();
      }
      function schedule() {
        if (!frame) frame = requestAnimationFrame(render);
      }
      refresh.current = schedule;

      group.rotation.y = -0.1;
      applyTheme();
      resize();
      schedule();

      const onPointer = (event: PointerEvent) => {
        pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      };
      const resizeObserver = new ResizeObserver(() => {
        resize();
        schedule();
      });
      resizeObserver.observe(el);
      const themeObserver = new MutationObserver(() => {
        applyTheme();
        schedule();
      });
      themeObserver.observe(document.documentElement, {
        attributeFilter: ["data-theme"],
      });
      const visibilityObserver = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) schedule();
      });
      visibilityObserver.observe(el);
      const onVisibility = () => !document.hidden && schedule();
      document.addEventListener("visibilitychange", onVisibility);
      if (!reduceMotion)
        window.addEventListener("pointermove", onPointer, { passive: true });

      cleanup = () => {
        cancelAnimationFrame(frame);
        refresh.current = () => {};
        resizeObserver.disconnect();
        themeObserver.disconnect();
        visibilityObserver.disconnect();
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("pointermove", onPointer);
        geometry.dispose();
        material.dispose();
        mesh.dispose();
        renderer.dispose();
        canvas.remove();
      };
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, [points]);

  return <div ref={container} className={className} aria-hidden="true" />;
}
