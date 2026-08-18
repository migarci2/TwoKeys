#!/usr/bin/env python3
"""Remove a flat green chroma-key background, with a soft matte and despill.

Usage: python3 dechroma.py file.png [file2.png ...]
Rewrites each file in place as RGBA with a transparent background.
"""
import sys

import numpy as np
from PIL import Image


def dechroma(path: str) -> None:
    im = Image.open(path).convert("RGBA")
    a = np.array(im).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]

    # Greenness: how far green rises above the strongest of the other channels.
    greenness = g - np.maximum(r, b)

    # Soft matte: fully transparent above hi, fully opaque below lo, ramp between.
    lo, hi = 20.0, 70.0
    alpha = 1.0 - np.clip((greenness - lo) / (hi - lo), 0.0, 1.0)

    # Despill: pull green down to the neighbouring channels wherever it spikes.
    spill = np.maximum(r, b)
    g_fixed = np.where(greenness > 0, np.minimum(g, spill + 8.0), g)

    out = np.stack([r, g_fixed, b, alpha * 255.0], axis=-1)
    Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA").save(path)

    opaque = int((alpha > 0.99).sum())
    print(f"{path}: {im.size} opaque={opaque} ({100 * opaque / alpha.size:.1f}%)")


if __name__ == "__main__":
    for arg in sys.argv[1:]:
        dechroma(arg)
