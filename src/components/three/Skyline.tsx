"use client";

import { useEffect, useRef } from "react";

interface SkylineProps {
  /** One value per cell, laid out in columns of seven, oldest column first. */
  values: number[];
  /** Accessible description. Omit when the canvas is purely decorative. */
  label?: string;
  /** "bottom" rests the bars on the lower edge of the canvas, for use as a backdrop. */
  anchor?: "center" | "bottom";
  /** Hover a bar to read it, drag to turn the scene. */
  interactive?: boolean;
  /** Bars swell under the cursor, wherever it is on the page. */
  reactive?: boolean;
  /**
   * Bars to bring forward, one flag per value. While any is set, the flagged bars
   * grow and brighten and the rest step back.
   */
  lit?: boolean[];
  /** Text shown when a bar is hovered. Return null for no tooltip. */
  tooltip?: (index: number, value: number) => string | null;
  className?: string;
}

const PALETTES = {
  dark: {
    empty: "#161a1f",
    ramp: ["#0c2f2f", "#14595a", "#25a39b", "#a6fbf0"],
    fog: "#08090b",
    highlight: "#ffffff",
    sky: "#cfd8e3",
    ground: "#050607",
    key: 2.4,
    fill: 0.55,
  },
  light: {
    empty: "#e4e2dc",
    ramp: ["#c9e6e2", "#86cbc5", "#35978f", "#0f5a55"],
    fog: "#faf9f6",
    highlight: "#0b2f2d",
    sky: "#ffffff",
    ground: "#cfcabf",
    key: 1.9,
    fill: 1.25,
  },
};

const STEP = 1.32;
const INTRO_SECONDS = 1.1;

/**
 * A 3D field of bars in the layout of a contribution calendar. The scene is drawn with
 * three.js, which is loaded on demand so it never blocks first paint.
 */
export function Skyline({
  values,
  label,
  anchor = "center",
  interactive = false,
  reactive = false,
  lit,
  tooltip,
  className = "",
}: SkylineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  // Kept in a ref so a new function identity does not rebuild the whole scene.
  const tooltipRef = useRef(tooltip);
  useEffect(() => {
    tooltipRef.current = tooltip;
  }, [tooltip]);
  // The same for the lit flags: a new set repaints the scene without rebuilding it.
  const litRef = useRef(lit);
  const repaint = useRef<() => void>(() => {});
  useEffect(() => {
    litRef.current = lit;
    repaint.current();
  }, [lit]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || values.length === 0) return;
    let disposed = false;
    let cleanup = () => {};

    const whenIdle = (run: () => void) => {
      const idle = (
        window as {
          requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
        }
      ).requestIdleCallback;
      if (idle) idle(run, { timeout: 800 });
      else setTimeout(run, 200);
    };
    whenIdle(() => {
      if (disposed) return;
      void start();
    });
    const start = () =>
      import("three").then((THREE) => {
        if (disposed) return;

        let renderer: import("three").WebGLRenderer;
        try {
          renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        } catch {
          return; // WebGL unavailable: the page simply renders without the scene.
        }
        const canvas = renderer.domElement;
        renderer.setPixelRatio(
          Math.min(window.devicePixelRatio, window.innerWidth < 640 ? 1.5 : 2),
        );
        canvas.style.cssText = "display:block;width:100%;height:100%;touch-action:pan-y";
        if (interactive) canvas.style.cursor = "grab";
        container.appendChild(canvas);

        const columns = Math.ceil(values.length / 7);
        const peak = Math.max(1, ...values);
        // A year reads as a long horizon; a few weeks read better as a compact block.
        const compact = columns <= 26;
        const maxHeight = compact ? 3.4 : 7.5;
        // Wider blocks are turned less, so their long side stays inside the frame.
        const baseYaw = !compact ? -0.16 : columns > 14 ? -0.4 : -0.62;
        const reduceMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        // Phones and tablets: no idle sway. The scene is drawn when something changes
        // and then left alone, which spares the battery and the main thread.
        const still = reduceMotion || window.matchMedia("(hover: none)").matches;
        let settling = true;

        const scene = new THREE.Scene();
        // Bars further from the camera fade into the page, which gives the field depth.
        const fog = new THREE.Fog(0x000000, 1, 1000);
        scene.fog = fog;
        const camera = new THREE.PerspectiveCamera(22, 1, 0.1, 600);
        const group = new THREE.Group();
        scene.add(group);

        const geometry = new THREE.BoxGeometry(1, 1, 1);
        geometry.translate(0, 0.5, 0); // scale bars up from their base
        const material = new THREE.MeshStandardMaterial({
          roughness: 0.34,
          metalness: 0.18,
        });
        const mesh = new THREE.InstancedMesh(geometry, material, values.length);
        group.add(mesh);

        const hemisphere = new THREE.HemisphereLight(0xffffff, 0x000000, 1);
        const key = new THREE.DirectionalLight(0xffffff, 2);
        key.position.set(-30, 60, 40);
        const rim = new THREE.DirectionalLight(0x9fe8e2, 1.5);
        rim.position.set(40, 20, -50);
        scene.add(hemisphere, key, rim);

        const heights = values.map((v) =>
          v <= 0 ? 0.16 : 0.6 + Math.pow(v / peak, 0.75) * maxHeight,
        );
        const colors = values.map(() => new THREE.Color());
        const highlight = new THREE.Color();
        let hovered = -1;

        // Where each bar is between resting (0) and lit (1).
        const level = new Float32Array(values.length);
        const dim = new THREE.Color();
        const litColor = new THREE.Color();
        const mixed = new THREE.Color();
        const anyLit = () => litRef.current?.some(Boolean) ?? false;

        function shade(index: number) {
          if (index === hovered) return highlight;
          if (!litRef.current) return colors[index];
          mixed.copy(colors[index]);
          if (anyLit()) mixed.lerp(dim, 0.8 * (1 - level[index]));
          return mixed.lerp(litColor, level[index] * 0.85);
        }

        function paint(index: number) {
          mesh.setColorAt(index, shade(index));
          if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        }

        function applyTheme() {
          const palette =
            PALETTES[
              document.documentElement.dataset.theme === "light" ? "light" : "dark"
            ];
          const ramp = palette.ramp.map((hex) => new THREE.Color(hex));
          values.forEach((v, i) => {
            if (v <= 0) {
              colors[i].set(palette.empty);
            } else {
              const t = Math.min(0.999, Math.sqrt(v / peak)) * (ramp.length - 1);
              const low = Math.floor(t);
              colors[i]
                .copy(ramp[low])
                .lerp(ramp[Math.min(low + 1, ramp.length - 1)], t - low);
            }
            mesh.setColorAt(i, colors[i]);
          });
          highlight.set(palette.highlight);
          fog.color.set(palette.fog);
          dim.set(palette.empty);
          litColor.set(palette.ramp[palette.ramp.length - 1]);
          if (hovered >= 0) mesh.setColorAt(hovered, highlight);
          if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
          hemisphere.color.set(palette.sky);
          hemisphere.groundColor.set(palette.ground);
          hemisphere.intensity = palette.fill;
          key.intensity = palette.key;
        }

        // Where the cursor meets the ground, in grid cells. Used by the reactive swell.
        const focus = { column: 0, row: 0, strength: 0, target: 0 };
        const dummy = new THREE.Object3D();
        function layout(elapsed: number) {
          // True while the intro sweep or a highlight is still easing into place.
          settling = elapsed < INTRO_SECONDS + 1.1;
          for (let i = 0; i < values.length; i++) {
            const column = Math.floor(i / 7);
            const row = i % 7;
            // Bars rise in a sweep from the first column to the last.
            const delay = (column / columns) * 0.9 + row * 0.012;
            const t = Math.min(1, Math.max(0, (elapsed - delay) / INTRO_SECONDS));
            let height = heights[i] * (1 - Math.pow(1 - t, 4));
            if (focus.strength > 0.001) {
              const d2 = (column - focus.column) ** 2 + (row - focus.row) ** 2;
              height *= 1 + focus.strength * 0.9 * Math.exp(-d2 / 14);
            }
            if (i === hovered) height *= 1.12;
            // A slow swell travels across the field while the page is idle.
            if (!still && t >= 1) {
              height *= 1 + 0.07 * Math.sin(elapsed * 0.8 + column * 0.33 + row * 0.6);
            }
            if (litRef.current) {
              const target = litRef.current[i] ? 1 : 0;
              if (reduceMotion) level[i] = target;
              else if (Math.abs(level[i] - target) > 0.01) {
                level[i] += (target - level[i]) * 0.14;
                settling = true;
              } else level[i] = target;
              height *= 1 + level[i] * 0.45;
              mesh.setColorAt(i, shade(i));
            }
            dummy.position.set((column - (columns - 1) / 2) * STEP, 0, (row - 3) * STEP);
            dummy.scale.set(1, Math.max(0.02, height), 1);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
          }
          mesh.instanceMatrix.needsUpdate = true;
          if (litRef.current && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        }

        function resize() {
          const { clientWidth: w, clientHeight: h } = container!;
          if (w === 0 || h === 0) return;
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          const elevation = 0.5;
          const vFov = (camera.fov * Math.PI) / 180;
          const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
          const tanV = Math.tan(vFov / 2);
          const width = compact
            ? (columns * Math.cos(baseYaw) + 7 * Math.abs(Math.sin(baseYaw))) *
              STEP *
              1.34
            : columns * STEP * 1.04;
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
          // A wide block sits closer to the camera at one end, so look a little lower to centre it.
          camera.lookAt(0, (compact && columns > 14 ? -1.6 : maxHeight * 0.22) + lift, 0);
          fog.near = distance * 0.97;
          fog.far = distance * (compact ? 1.9 : 1.3);
          camera.updateProjectionMatrix();
        }

        const raycaster = new THREE.Raycaster();
        const ndc = new THREE.Vector2();
        const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const hit = new THREE.Vector3();
        const pointer = { x: 0, y: 0 };
        const drag = { active: false, lastX: 0, yaw: 0 };
        const tip = tipRef.current;

        function toNdc(event: PointerEvent) {
          const rect = canvas.getBoundingClientRect();
          ndc.set(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1,
          );
          return rect;
        }

        function setHovered(next: number) {
          if (next === hovered) return;
          const previous = hovered;
          hovered = next;
          if (previous >= 0) paint(previous);
          if (hovered >= 0) paint(hovered);
        }

        const onWindowPointerMove = (event: PointerEvent) => {
          pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
          pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
          if (!reactive) return;
          toNdc(event);
          raycaster.setFromCamera(ndc, camera);
          if (Math.abs(ndc.y) > 1.4 || !raycaster.ray.intersectPlane(ground, hit)) {
            focus.target = 0;
            return;
          }
          group.worldToLocal(hit);
          focus.column = hit.x / STEP + (columns - 1) / 2;
          focus.row = hit.z / STEP + 3;
          focus.target = 1;
          schedule();
        };
        const onWindowPointerLeave = () => {
          focus.target = 0;
        };

        const onCanvasPointerMove = (event: PointerEvent) => {
          if (drag.active) {
            drag.yaw = Math.max(
              -1.3,
              Math.min(1.3, drag.yaw + (event.clientX - drag.lastX) * 0.006),
            );
            drag.lastX = event.clientX;
            schedule();
            return;
          }
          const rect = toNdc(event);
          raycaster.setFromCamera(ndc, camera);
          const [first] = raycaster.intersectObject(mesh);
          setHovered(first?.instanceId ?? -1);
          const text =
            hovered >= 0
              ? (tooltipRef.current?.(hovered, values[hovered]) ?? null)
              : null;
          if (tip) {
            if (text) {
              tip.textContent = text;
              tip.style.opacity = "1";
              tip.style.transform = `translate(${Math.min(rect.width - 16, Math.max(16, event.clientX - rect.left))}px, ${event.clientY - rect.top - 14}px) translate(-50%, -100%)`;
            } else {
              tip.style.opacity = "0";
            }
          }
          schedule();
        };
        const onCanvasPointerDown = (event: PointerEvent) => {
          drag.active = true;
          drag.lastX = event.clientX;
          canvas.setPointerCapture(event.pointerId);
          canvas.style.cursor = "grabbing";
          if (tip) tip.style.opacity = "0";
        };
        const onCanvasPointerUp = (event: PointerEvent) => {
          drag.active = false;
          if (canvas.hasPointerCapture(event.pointerId)) {
            canvas.releasePointerCapture(event.pointerId);
          }
          canvas.style.cursor = "grab";
        };
        const onCanvasPointerLeave = () => {
          if (drag.active) return;
          setHovered(-1);
          if (tip) tip.style.opacity = "0";
          schedule();
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
            group.rotation.y = baseYaw + drag.yaw;
          } else if (still) {
            layout(elapsed);
            group.rotation.y = baseYaw + drag.yaw;
          } else {
            focus.strength += (focus.target - focus.strength) * 0.08;
            layout(elapsed);
            const sway = interactive
              ? 0
              : Math.sin(elapsed * 0.22) * 0.05 + pointer.x * 0.1;
            const targetYaw = baseYaw + drag.yaw + sway;
            group.rotation.y +=
              (targetYaw - group.rotation.y) * (drag.active ? 0.35 : 0.06);
            if (!interactive) {
              group.rotation.x += (pointer.y * 0.04 - group.rotation.x) * 0.05;
            }
          }
          renderer.render(scene, camera);
          if (visible && !document.hidden && (still ? settling : true)) schedule();
        }
        function schedule() {
          if (!frame) frame = requestAnimationFrame(render);
        }

        repaint.current = schedule;
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

        if (!reduceMotion) {
          window.addEventListener("pointermove", onWindowPointerMove, { passive: true });
          document.documentElement.addEventListener("pointerleave", onWindowPointerLeave);
        }
        if (interactive) {
          canvas.addEventListener("pointermove", onCanvasPointerMove);
          canvas.addEventListener("pointerdown", onCanvasPointerDown);
          canvas.addEventListener("pointerup", onCanvasPointerUp);
          canvas.addEventListener("pointercancel", onCanvasPointerUp);
          canvas.addEventListener("pointerleave", onCanvasPointerLeave);
        }

        cleanup = () => {
          cancelAnimationFrame(frame);
          repaint.current = () => {};
          resizeObserver.disconnect();
          themeObserver.disconnect();
          visibilityObserver.disconnect();
          document.removeEventListener("visibilitychange", onVisibility);
          window.removeEventListener("pointermove", onWindowPointerMove);
          document.documentElement.removeEventListener(
            "pointerleave",
            onWindowPointerLeave,
          );
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
  }, [values, anchor, interactive, reactive]);

  return (
    <div
      ref={containerRef}
      className={className}
      // The tooltip is positioned against the container.
      style={interactive ? { position: "relative" } : undefined}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {interactive ? (
        <div
          ref={tipRef}
          className="border-hair-strong bg-bg text-ink pointer-events-none absolute top-0 left-0 z-10 rounded-md border px-2.5 py-1.5 font-mono text-[11px] whitespace-nowrap opacity-0 shadow-lg transition-opacity duration-150"
        />
      ) : null}
    </div>
  );
}
