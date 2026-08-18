"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Cloud, Clouds } from "@react-three/drei";
import { MeshBasicMaterial, type Group } from "three";

/**
 * Volumetric clouds via drei's `<Cloud>`, which billboards a stack of soft
 * sprites into something with real depth and parallax.
 *
 * The canvas is fixed but the cloud field is not: it is a tall column of
 * clouds spread over a long Y range, and scrolling slides that column past the
 * camera. So a cloud belongs to a place in the page rather than a place in the
 * viewport, and different ones drift through as you go down — without paying
 * for a second WebGL context or a document-height canvas.
 *
 * Everything is banked left and right of centre; the middle of frame stays
 * open blue because that is where the headlines sit.
 */

const MATERIAL = MeshBasicMaterial;

/**
 * World units the field travels over the whole page. The column spans y=2 down
 * to y=-47, so travelling its own length lands the last cloud where the first
 * one started, and no scroll position falls past the end of the field.
 * ponytail: tied to the hardcoded cloud positions below; move one, move this.
 */
const TRAVEL = 49;

function Field({ small }: { small: boolean }) {
  const group = useRef<Group>(null);

  useFrame(() => {
    if (!group.current) return;
    // Fraction of the document scrolled, not of a viewport: a page-height unit
    // ran the field out halfway down a ten-screen page and left the bottom
    // half bare blue.
    const scrollable =
      document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
    // Lerp rather than snap, so a flung scroll does not tear the field.
    group.current.position.y +=
      (progress * TRAVEL - group.current.position.y) * 0.08;
  });

  return (
    <group ref={group}>
      <Clouds
        material={MATERIAL}
        limit={small ? 130 : 260}
        frustumCulled={false}
      >
        <Cloud
          seed={3}
          segments={small ? 10 : 20}
          bounds={[7, 2.2, 2]}
          volume={5}
          concentrate="outside"
          color="#eaf2ff"
          opacity={0.34}
          growth={4.6}
          speed={0.08}
          position={[-13, 2, -4]}
        />
        <Cloud
          seed={17}
          segments={small ? 9 : 18}
          bounds={[6.5, 2, 2]}
          volume={5}
          concentrate="outside"
          color="#dce9ff"
          opacity={0.34}
          growth={4.2}
          speed={0.055}
          position={[13.5, -7, -4]}
        />
        <Cloud
          seed={41}
          segments={small ? 8 : 16}
          bounds={[6, 1.8, 2]}
          volume={5}
          concentrate="outside"
          color="#ffffff"
          opacity={0.34}
          growth={4}
          speed={0.045}
          position={[-12.5, -17, -4]}
        />
        <Cloud
          seed={73}
          segments={small ? 9 : 18}
          bounds={[7, 2, 2]}
          volume={5}
          concentrate="outside"
          color="#e6f0ff"
          opacity={0.34}
          growth={4.4}
          speed={0.06}
          position={[13, -27, -4]}
        />
        <Cloud
          seed={101}
          segments={small ? 8 : 16}
          bounds={[6.5, 1.8, 2]}
          volume={5}
          concentrate="outside"
          color="#ffffff"
          opacity={0.34}
          growth={4}
          speed={0.05}
          position={[-13, -37, -4]}
        />
        <Cloud
          seed={137}
          segments={small ? 9 : 18}
          bounds={[7, 2.2, 2]}
          volume={5}
          concentrate="outside"
          color="#dce9ff"
          opacity={0.34}
          growth={4.4}
          speed={0.065}
          position={[12.5, -47, -4]}
        />
      </Clouds>
    </group>
  );
}

export default function VolumetricClouds({
  small = false,
}: {
  small?: boolean;
}) {
  return (
    <Canvas
      // fov is vertical, so a narrow viewport crops the field horizontally and
      // the same clouds fill the screen. Stand further back on a phone.
      // ponytail: one distance knob, tune it here if it still reads too close.
      camera={{ position: [0, 0, small ? 19 : 12], fov: 52 }}
      gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
      dpr={small ? [1, 1] : [1, 1.5]}
      style={{ pointerEvents: "none" }}
    >
      <Field small={small} />
    </Canvas>
  );
}
