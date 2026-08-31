"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * The sky, behind the entire page rather than just the hero.
 *
 * Two layers. The fixed footage carries the colour and the slow drift: Seedance
 * 2.5 at 720p, upscaled by Topaz to 1080p with 2x frame-interpolated slow
 * motion, then ping-ponged so the 32s loop has no seam. Two local cloud cut-outs
 * sail over it, so the effect does not depend on WebGL or a remote texture.
 *
 * Motion is skipped entirely when the reader has asked for reduced motion.
 */

export function SkyBackground() {
  const volumetric = usePathname() !== "/demo";
  const [motionOk, setMotionOk] = useState(true);
  const [small, setSmall] = useState(false);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const phone = window.matchMedia("(max-width: 767px)");
    const read = () => {
      setMotionOk(!motion.matches);
      setSmall(phone.matches);
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

      {volumetric && motionOk && (
        <div className="absolute inset-0 overflow-hidden">
          <div
            className={`absolute bg-contain bg-center bg-no-repeat opacity-[0.16] ${
              small
                ? "-left-[96vw] top-[14vh] h-[38vh] w-[145vw]"
                : "-left-[42vw] top-[12vh] h-[50vh] w-[72vw]"
            }`}
            style={{
              backgroundImage: "url('/sky/cloud1.webp')",
              animation: "sail 60s linear -20s infinite alternate",
            }}
          />
          <div
            className={`absolute bg-contain bg-center bg-no-repeat opacity-[0.14] ${
              small
                ? "-right-[102vw] top-[48vh] h-[32vh] w-[150vw]"
                : "-right-[48vw] top-[50vh] h-[40vh] w-[78vw]"
            }`}
            style={{
              backgroundImage: "url('/sky/cloud2.webp')",
              animation: "sail 84s linear -50s infinite alternate-reverse",
            }}
          />
        </div>
      )}

      <div className="absolute inset-0 bg-[var(--sky-veil)]" />
    </div>
  );
}
