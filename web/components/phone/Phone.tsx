"use client";

import type { ReactNode } from "react";
import { DeviceFrameset } from "react-device-frameset";
import "react-device-frameset/styles/marvel-devices.min.css";

/**
 * Real device frame from `react-device-frameset` (MIT), which ships Marvel's
 * devices.css — notch, speaker, side buttons and all, drawn in pure CSS so it
 * stays crisp at any size.
 *
 * The frame is a fixed 375x812, so it is scaled down rather than reflowed. The
 * wrapper reserves the scaled height so the layout does not keep the full
 * unscaled box.
 */
export function Phone({ children }: { children: ReactNode }) {
  return (
    <div className="phone-scale">
      <DeviceFrameset device="iPhone X">
        <div className="h-full overflow-hidden bg-surface">{children}</div>
      </DeviceFrameset>
    </div>
  );
}
