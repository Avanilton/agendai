"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
  gravity: number;
  shape: "circle" | "spark";
}

const COLORS = [
  "#FF914D",
  "#2563EB",
  "#FACC15",
  "#EC4899",
  "#10B981",
  "#A855F7",
  "#F43F5E",
  "#38BDF8",
];

interface BirthdayFireworksProps {
  active: boolean;
  onComplete?: () => void;
}

export function BirthdayFireworks({
  active,
  onComplete,
}: BirthdayFireworksProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const particles: Particle[] = [];

    const spawnBurst = (cx: number, cy: number, count: number) => {
      const baseColor = COLORS[Math.floor(Math.random() * COLORS.length)]!;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.25;
        const speed = 2.5 + Math.random() * 6.5;
        const useAccent = Math.random() > 0.35;
        particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.2,
          color: useAccent
            ? COLORS[Math.floor(Math.random() * COLORS.length)]!
            : baseColor,
          size: 2.2 + Math.random() * 2.8,
          alpha: 1,
          decay: 0.011 + Math.random() * 0.012,
          gravity: 0.09 + Math.random() * 0.04,
          shape: Math.random() > 0.45 ? "spark" : "circle",
        });
      }
    };

    const w = () => window.innerWidth;
    const h = () => window.innerHeight;

    // Schedule multiple festive bursts across the viewport
    const burstTimeouts: number[] = [
      window.setTimeout(() => spawnBurst(w() * 0.25, h() * 0.28, 46), 40),
      window.setTimeout(() => spawnBurst(w() * 0.75, h() * 0.26, 46), 220),
      window.setTimeout(() => spawnBurst(w() * 0.5, h() * 0.2, 56), 460),
      window.setTimeout(() => spawnBurst(w() * 0.32, h() * 0.42, 42), 820),
      window.setTimeout(() => spawnBurst(w() * 0.68, h() * 0.38, 42), 1120),
      window.setTimeout(() => spawnBurst(w() * 0.5, h() * 0.32, 54), 1520),
    ];

    let rafId = 0;
    const startedAt = performance.now();
    const maxDurationMs = 4500;

    const tick = (now: number) => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]!;
        p.vx *= 0.985;
        p.vy = p.vy * 0.985 + p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;

        if (p.alpha <= 0.02) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.strokeStyle = p.color;

        if (p.shape === "spark") {
          ctx.lineWidth = p.size * 0.7;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 2.2, p.y - p.vy * 2.2);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      if (now - startedAt < maxDurationMs || particles.length > 0) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        onComplete?.();
      }
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(rafId);
      for (const id of burstTimeouts) {
        window.clearTimeout(id);
      }
    };
  }, [active, onComplete]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[70]"
    />
  );
}

