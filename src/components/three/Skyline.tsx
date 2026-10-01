"use client";

import { useEffect, useRef } from "react";

interface SkylineProps {
  /** One value per day, oldest first. Laid out in columns of seven. */
  values: number[];
  /** Accessible description. Omit when the canvas is purely decorative. */
  label?: string;
  /** "bottom" rests the bars on the lower edge of the canvas, for use as a backdrop. */
  anchor?: "center" | "bottom";
  className?: string;
}

const PALETTES = {
  dark: {
    empty: "#161a1f",
    ramp: ["#174f4d", "#23807b", "#3fb8b0", "#93f2ea"],
    sky: "#cfd8e3",
    ground: "#050607",
    key: 2.4,
    fill: 0.55,
  },
  light: {
    empty: "#e4e2dc",
    ramp: ["#b5dcd8", "#7cc4bf", "#3d9d97", "#14645f"],
    sky: "#ffffff",
    ground: "#cfcabf",
    key: 1.9,
    fill: 1.25,
  },
};

const STEP = 1.32;
const INTRO_SECONDS = 1.1;

/**
 * A 3D field of bars, one per day, in the layout of a contribution calendar. The scene
 * is drawn with three.js, which is loaded on demand so it never blocks first paint.
 */
export function Skyline({ values, label, anchor = "center", className }: SkylineProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || values.length === 0) return;
    let disposed = false;
    let cleanup = () => {};

    import("three").then((THREE) => {
      if (disposed) return;

      let renderer: import("three").WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      } catch {
        return; // WebGL unavailable: the page simply renders without the scene.
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.domElement.style.cssText = "display:block;width:100%;height:100%";
      container.appendChild(renderer.domElement);

      const weeks = Math.ceil(values.length / 7);
      const peak = Math.max(1, ...values);
      // A year reads as a long horizon; a few weeks read better as a compact block.
      const compact = weeks <= 26;
      const maxHeight = compact ? 3.4 : 7.5;
      const baseYaw = compact ? -0.62 : -0.16;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(22, 1, 0.1, 600);
      const group = new THREE.Group();
      scene.add(group);

      const geometry = new THREE.BoxGeometry(1, 1, 1);
      geometry.translate(0, 0.5, 0); // scale bars up from their base
      const material = new THREE.MeshStandardMaterial({
        roughness: 0.5,
        metalness: 0.05,
      });
      const mesh = new THREE.InstancedMesh(geometry, material, values.length);
      group.add(mesh);

      const hemisphere = new THREE.HemisphereLight(0xffffff, 0x000000, 1);
      const key = new THREE.DirectionalLight(0xffffff, 2);
      key.position.set(-30, 60, 40);
      const rim = new THREE.DirectionalLight(0x9fe8e2, 0.7);
      rim.position.set(40, 20, -50);
      scene.add(hemisphere, key, rim);

      const heights = values.map((v) =>
        v <= 0 ? 0.16 : 0.6 + Math.pow(v / peak, 0.75) * maxHeight,
      );

      function applyTheme() {
        const palette =
          PALETTES[document.documentElement.dataset.theme === "light" ? "light" : "dark"];
        const ramp = palette.ramp.map((hex) => new THREE.Color(hex));
        const empty = new THREE.Color(palette.empty);
        const color = new THREE.Color();
        values.forEach((v, i) => {
          if (v <= 0) {
            mesh.setColorAt(i, empty);
            return;
          }
          const t = Math.min(0.999, Math.sqrt(v / peak)) * (ramp.length - 1);
          const low = Math.floor(t);
          color.copy(ramp[low]).lerp(ramp[Math.min(low + 1, ramp.length - 1)], t - low);
          mesh.setColorAt(i, color);
        });
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        hemisphere.color.set(palette.sky);
        hemisphere.groundColor.set(palette.ground);
        hemisphere.intensity = palette.fill;
        key.intensity = palette.key;
      }

      const dummy = new THREE.Object3D();
      function layout(elapsed: number) {
        for (let i = 0; i < values.length; i++) {
          const week = Math.floor(i / 7);
          const day = i % 7;
          // Bars rise in a sweep from the oldest week to the newest.
          const delay = (week / weeks) * 0.9 + day * 0.012;
          const t = Math.min(1, Math.max(0, (elapsed - delay) / INTRO_SECONDS));
          const eased = 1 - Math.pow(1 - t, 4);
          dummy.position.set((week - (weeks - 1) / 2) * STEP, 0, (day - 3) * STEP);
          dummy.scale.set(1, Math.max(0.02, heights[i] * eased), 1);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
      }

      function resize() {
        const { clientWidth: w, clientHeight: h } = container!;
        if (w === 0 || h === 0) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        const elevation = 0.6;
        const vFov = (camera.fov * Math.PI) / 180;
        const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
        const tanV = Math.tan(vFov / 2);
        const width = compact ? Math.hypot(weeks, 7) * STEP * 1.12 : weeks * STEP * 1.04;
        const height = 7 * STEP * Math.sin(elevation) + maxHeight * Math.cos(elevation);
        // On narrow screens the strip is allowed to run off both edges instead of shrinking.
        const fitWidth =
          (width / 2 / Math.tan(hFov / 2)) *
          (compact ? 1 : Math.min(1, camera.aspect / 2.4));
        const fitHeight = height / 2 / tanV;

        let distance = Math.max(fitWidth, fitHeight * (compact ? 1.5 : 1.25));
        let lift = 0;
        if (anchor === "bottom") {
          distance = Math.max(fitWidth * 0.9, fitHeight * 1.55);
          // Aim the camera above the bars so they settle against the bottom edge.
          const visible = 2 * distance * tanV;
          lift = ((visible - height) / 2 / Math.cos(elevation)) * 0.9;
        }
        camera.position.set(
          0,
          distance * Math.sin(elevation),
          distance * Math.cos(elevation),
        );
        camera.lookAt(0, maxHeight * 0.22 + lift, 0);
        camera.updateProjectionMatrix();
      }

      const pointer = { x: 0, y: 0 };
      const onPointerMove = (event: PointerEvent) => {
        pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
      };

      let frame = 0;
      let visible = true;
      let start: number | null = null;

      function render(now: number) {
        frame = 0;
        if (disposed) return;
        start ??= now;
        const elapsed = (now - start) / 1000;
        if (reduceMotion) {
          layout(Infinity);
          group.rotation.y = baseYaw;
        } else {
          if (elapsed < INTRO_SECONDS + 1.2) layout(elapsed);
          const targetYaw = baseYaw + Math.sin(elapsed * 0.22) * 0.05 + pointer.x * 0.1;
          group.rotation.y += (targetYaw - group.rotation.y) * 0.05;
          group.rotation.x += (pointer.y * 0.04 - group.rotation.x) * 0.05;
        }
        renderer.render(scene, camera);
        if (!reduceMotion && visible && !document.hidden) schedule();
      }
      function schedule() {
        if (!frame) frame = requestAnimationFrame(render);
      }

      group.rotation.y = baseYaw;
      applyTheme();
      layout(reduceMotion ? Infinity : 0);
      resize();
      schedule();

      const resizeObserver = new ResizeObserver(() => {
        resize();
        schedule();
      });
      resizeObserver.observe(container);
      const themeObserver = new MutationObserver(() => {
        applyTheme();
        schedule();
      });
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"],
      });
      const visibilityObserver = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) schedule();
      });
      visibilityObserver.observe(container);
      const onVisibility = () => !document.hidden && schedule();
      document.addEventListener("visibilitychange", onVisibility);
      if (!reduceMotion)
        window.addEventListener("pointermove", onPointerMove, { passive: true });

      cleanup = () => {
        cancelAnimationFrame(frame);
        resizeObserver.disconnect();
        themeObserver.disconnect();
        visibilityObserver.disconnect();
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("pointermove", onPointerMove);
        geometry.dispose();
        material.dispose();
        mesh.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, [values, anchor]);

  return (
    <div
      ref={containerRef}
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
