/**
 * The TwoKeys mark: two mirrored open octagonal loops joined by a shared key
 * bar. Each loop is broken where the bar passes through, so the three pieces
 * only read as one object when the bar is there.
 *
 * Source of truth is public/twokeys-mark.svg; this is the inline copy so the
 * mark can take the surrounding text colour and ship without a request.
 *
 * Two tones. `brand` is the artwork as drawn, for the blue canvas. `mono`
 * collapses it to `currentColor` for surfaces where a white half would
 * disappear — the phone screen, a favicon, anything printed.
 */

const RING_LEFT = "M135 86V49L123 37H45L33 49V171L45 183H123L135 171V132";
const RING_RIGHT = "M185 86V49L197 37H275L287 49V171L275 183H197L185 171V132";
const BAR =
  "M80 98L86 92H100L106 98H210L216 92H232L238 98V112L232 118H216L210 112H106L100 118H86L80 112Z";

export function Mark({
  className = "",
  tone = "brand",
  id = "tk",
}: {
  className?: string;
  tone?: "brand" | "mono";
  /** Unique per instance: gradient ids are global, so two marks on one page
      must not share them. */
  id?: string;
}) {
  const mono = tone === "mono";

  return (
    <svg
      viewBox="0 0 320 220"
      role="img"
      aria-label="TwoKeys"
      className={className}
    >
      {!mono && (
        <defs>
          <linearGradient
            id={`${id}-ring`}
            x1="20"
            y1="28"
            x2="150"
            y2="192"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#3478ff" />
            <stop offset="1" stopColor="#1f5ef4" />
          </linearGradient>
          <linearGradient
            id={`${id}-bar`}
            x1="76"
            y1="0"
            x2="244"
            y2="0"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.5" stopColor="#c9d9ff" />
            <stop offset="1" stopColor="#5e8eff" />
          </linearGradient>
        </defs>
      )}

      <path
        d={RING_LEFT}
        fill="none"
        stroke={mono ? "currentColor" : `url(#${id}-ring)`}
        strokeWidth="20"
        strokeLinecap="butt"
        strokeLinejoin="bevel"
        opacity={mono ? 0.5 : 1}
      />
      <path
        d={RING_RIGHT}
        fill="none"
        stroke="currentColor"
        strokeWidth="20"
        strokeLinecap="butt"
        strokeLinejoin="bevel"
      />
      <path d={BAR} fill={mono ? "currentColor" : `url(#${id}-bar)`} />
    </svg>
  );
}

/** Symbol plus name, as one lockup. */
export function Lockup({
  className = "",
  tone,
  id,
}: {
  className?: string;
  tone?: "brand" | "mono";
  id?: string;
}) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <Mark tone={tone} id={id} className="h-[1.5em] w-auto" />
      <span className="text-[1.0625rem] font-semibold tracking-[-0.015em]">
        TwoKeys
      </span>
    </span>
  );
}
