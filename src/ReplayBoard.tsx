import { useId } from "react";
import type { ArenaState } from "../spacetimedb/src/arenaRules";

/** Lightweight replay projection, never a simulated/demo match. */
export function ReplayBoard({ state }: { state: ArenaState }) {
  const id = useId().replace(/:/g, "");
  const crown =
    state.crown.carrier >= 0 ? state.pawns[state.crown.carrier] : state.crown;
  const palette =
    state.kind === "mela_heist"
      ? ["#201d39", "#55506c", "#423e58"]
      : state.kind === "bridge_breakers"
        ? ["#142f40", "#aab6b0", "#8d9c9c"]
        : ["#40324a", "#d6b493", "#ba967d"];
  return (
    <svg
      className="replay-board"
      viewBox="0 0 440 260"
      role="img"
      aria-label={`Recorded board at move ${state.beat}`}
    >
      <defs>
        <radialGradient id={`sky-${id}`}>
          <stop stopColor={palette[1]} stopOpacity=".35" />
          <stop offset="1" stopColor={palette[0]} />
        </radialGradient>
      </defs>
      <rect width="440" height="260" fill={palette[0]} />
      <rect width="440" height="260" fill={`url(#sky-${id})`} />
      <g transform="translate(220 32) scale(1 .52) rotate(45)">
        {Array.from({ length: 81 }, (_, cell) => {
          const x = cell % 9,
            y = Math.floor(cell / 9);
          if (x === 4 && Math.abs(y - state.bridge) > 1) return null;
          return (
            <g key={cell}>
              <rect
                x={x * 29}
                y={y * 29}
                width="27"
                height="27"
                rx="2"
                fill={x === 4 ? "#d3a76d" : palette[1 + ((x + y) % 2)]}
              />
              {state.walls.includes(cell) && (
                <rect
                  x={x * 29 + 3}
                  y={y * 29 + 3}
                  width="21"
                  height="21"
                  rx="3"
                  fill="#635345"
                  stroke="#f0d5a9"
                  strokeWidth="2"
                />
              )}
            </g>
          );
        })}
        {[0, 8].map((x) => (
          <circle
            key={x}
            cx={x * 29 + 13}
            cy={4 * 29 + 13}
            r="10"
            fill="none"
            stroke={x ? "#58eee0" : "#ffb369"}
            strokeWidth="4"
          />
        ))}
        {state.kind === "mela_heist" &&
          [10, 70].map((cell) => (
            <rect
              key={cell}
              x={(cell % 9) * 29 + 5}
              y={Math.floor(cell / 9) * 29 + 5}
              width="17"
              height="17"
              rx="3"
              fill="#ffdf7b"
            />
          ))}
        {state.pawns.map((p, i) => (
          <g key={i} transform={`translate(${p.x * 29 + 13} ${p.y * 29 + 13})`}>
            <circle r="12" fill="#101b28" opacity=".35" />
            <circle
              cy="-5"
              r="10"
              fill={i ? "#4aeee0" : "#ffac67"}
              stroke="#fff4d5"
              strokeWidth="2"
            />
            {i ? (
              <path d="M0-9 4-5 0-1-4-5Z" fill="#14232f" />
            ) : (
              <circle cy="-5" r="3" fill="#14232f" />
            )}
          </g>
        ))}
        {state.kind !== "bridge_breakers" &&
          (state.kind !== "mela_heist" || state.switchMask === 3) && (
            <path
              transform={`translate(${crown.x * 29 + 4} ${crown.y * 29 + 3})`}
              d="M0 16 0 1 7 8 12 0 17 8 24 1 24 16Z"
              fill="#ffe07f"
              stroke="#654b2e"
            />
          )}
      </g>
    </svg>
  );
}
