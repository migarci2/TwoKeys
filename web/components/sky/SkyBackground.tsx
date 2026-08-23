"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * The sky, behind the entire page rather than just the hero.
 *
 * Two layers. The fixed footage carries the colour and the slow drift: Seedance
 * 2.5 at 720p, upscaled by Topaz to 1080p with 2x frame-interpolated slow
 * motion, then ping-ponged so the 32s loop has no seam. Over it, on desktop
 * only, sit volumetric clouds.
 *
 * The WebGL layer is the expensive part, so it is gated three ways: lazily
 * imported so it never blocks first paint, mounted only above `lg` where there
 * is both the room and the GPU budget for it, and skipped entirely when the
 * reader has asked for reduced motion. Phones keep the video sky on its own.
 */

const VolumetricClouds = dynamic(() => import("./VolumetricClouds"), {
  ssr: false,
});

export function SkyBackground() {
  const volumetric = usePathname() !== "/demo";
  const [motionOk, setMotionOk] = useState(true);
  const [small, setSmall] = useState(false);
  const [heavyOk, setHeavyOk] = useState(false);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const phone = window.matchMedia("(max-width: 767px)");
    const read = () => {
      setMotionOk(!motion.matches);
      setSmall(phone.matches);
      // Clouds everywhere now, phones included: the volumetric ones stay
      // readable at small sizes in a way the image cut-outs did not. Reduced
      // motion is still the one hard stop.
      setHeavyOk(!motion.matches);
    };
    read();

    motion.addEventListener("change", read);
    phone.addEventListener("change", read);

    return () => {
      motion.removeEventListener("change", read);
      phone.removeEventListener("change", read);
    };
  }, []);

  const src = `/sky/day-loop${small ? "-sm" : ""}.mp4`;
  const poster = "/sky/day-poster.jpg";

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {motionOk ? (
        <video
          key={src}
          className="h-full w-full object-cover"
          src={src}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt=""
          className="h-full w-full object-cover opacity-70"
        />
      )}

      {/* Multiply keeps the footage's cloud structure while forcing the whole
          frame back to the brand blue, instead of the pale sky the camera
          actually saw. */}
      <div className="absolute inset-0 bg-[var(--sky-tint)] mix-blend-multiply" />

      {volumetric && heavyOk && (
        <div className="absolute inset-0 opacity-70">
          <VolumetricClouds small={small} />
        </div>
      )}

      <div className="absolute inset-0 bg-[var(--sky-veil)]" />
    </div>
  );
}
