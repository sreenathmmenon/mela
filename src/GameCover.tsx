import { useId } from "react";

/** Lightweight cover illustrations. Decorative, never a simulated match. */
export function GameCover({ kind }: { kind: string }) {
  const id = useId().replace(/:/g, "");
  const palette: Record<string, [string, string]> = {
    pen_fight: ["#bac7ff", "#e0e7ff"],
    stick_cricket: ["#a8e6c8", "#d0f4d8"],
    book_cricket: ["#ffbb9c", "#ffdcc0"],
    crown_run: ["#e2c3ff", "#f3e3ff"],
    bridge_breakers: ["#97d7eb", "#c8edf5"],
    mela_heist: ["#a9badc", "#d4ddf0"],
    four_row: ["#f9da77", "#ffedb5"],
    dots_boxes: ["#bde2d1", "#e1f2dd"],
    gilli_danda: ["#f6c69c", "#ffe8c9"],
    last_stick: ["#ffc2c8", "#ffe4e1"],
  };
  const [base, light] = palette[kind] ?? ["#cbd5e1", "#e2e8f0"];
  const shadow = { filter: `url(#${id}-shadow)` };
  return (
    <svg
      className="game-cover"
      viewBox="0 0 400 260"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-bg`} x2="1" y2="1">
          <stop stopColor={light} />
          <stop offset="1" stopColor={base} />
        </linearGradient>
        <linearGradient id={`${id}-pen`}>
          <stop stopColor="#283ab1" />
          <stop offset=".45" stopColor="#748dff" />
          <stop offset="1" stopColor="#293cbb" />
        </linearGradient>
        <linearGradient id={`${id}-red`}>
          <stop stopColor="#b93b33" />
          <stop offset=".45" stopColor="#ff9974" />
          <stop offset="1" stopColor="#e35a42" />
        </linearGradient>
        <linearGradient id={`${id}-wood`}>
          <stop stopColor="#a76a35" />
          <stop offset=".45" stopColor="#f9d798" />
          <stop offset="1" stopColor="#c08647" />
        </linearGradient>
        <filter
          id={`${id}-shadow`}
          x="-40%"
          y="-40%"
          width="180%"
          height="200%"
        >
          <feDropShadow
            dx="0"
            dy="12"
            stdDeviation="8"
            floodColor="#152043"
            floodOpacity=".18"
          />
        </filter>
      </defs>
      <rect width="400" height="260" fill={`url(#${id}-bg)`} />
      <circle cx="320" cy="45" r="123" fill="white" opacity=".16" />
      <circle cx="45" cy="240" r="90" fill="white" opacity=".18" />
      {kind === "pen_fight" && (
        <>
          <g transform="translate(200 145) rotate(-9)" {...shadow}>
            <rect
              x="-145"
              y="-68"
              width="290"
              height="140"
              rx="12"
              fill="#9e71c9"
            />
            <rect
              x="-145"
              y="-77"
              width="290"
              height="140"
              rx="12"
              fill="#f0ddbe"
            />
            {[-48, -18, 12, 42].map((y) => (
              <path
                key={y}
                d={`M-130 ${y} H130`}
                stroke="#ceb494"
                opacity=".55"
              />
            ))}
            <path
              d="M-126 -60h24m-24 0v24M126 48h-24m24 0v-24"
              fill="none"
              stroke="#b39772"
              strokeWidth="3"
            />
          </g>
          <g className="cover-object" {...shadow}>
            <g transform="translate(145 132) rotate(40)">
              <rect
                x="-11"
                y="-93"
                width="22"
                height="177"
                rx="8"
                fill={`url(#${id}-pen)`}
              />
              <rect
                x="-11"
                y="-93"
                width="22"
                height="49"
                rx="7"
                fill="#202a71"
              />
              <path d="M-6 84h12l-6 16z" fill="#e8ecf8" />
              <path d="M-4 -83v29" stroke="#a3b1e8" strokeWidth="3" />
            </g>
            <g transform="translate(256 125) rotate(-35)">
              <rect
                x="-11"
                y="-87"
                width="22"
                height="171"
                rx="8"
                fill={`url(#${id}-red)`}
              />
              <rect
                x="-11"
                y="-87"
                width="22"
                height="45"
                rx="7"
                fill="#892c35"
              />
              <path d="M-6 84h12l-6 16z" fill="#e8ecf8" />
              <path d="M-4 -77v28" stroke="#ffc7b5" strokeWidth="3" />
            </g>
          </g>
          <path
            d="m192 68 5-15m10 22 14-6m-41-1-8-9"
            stroke="#fff"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </>
      )}
      {kind === "book_cricket" && (
        <g
          className="cover-object"
          transform="translate(195 126) rotate(-12)"
          {...shadow}
        >
          <path
            d="M-124-68Q-60-91 0-57Q65-86 124-66V91Q57 78 0 97Q-56 75-124 91z"
            fill="#b95644"
          />
          <path
            d="M-119-73Q-60-92 0-60Q60-89 119-72V76Q57 63 0 85Q-57 60-119 77z"
            fill="#fffdf5"
          />
          <path d="M0-60v145" stroke="#e0c9aa" strokeWidth="3" />
          {[-38, -20, 0, 20, 40].map((y) => (
            <path
              key={y}
              d={`M-103 ${y}q42-10 82 6 M20 ${y + 6}q39-14 82-6`}
              fill="none"
              stroke="#dedccf"
              strokeWidth="2"
            />
          ))}
          <text
            x="55"
            y="49"
            textAnchor="middle"
            fontFamily="Arial,sans-serif"
            fontSize="75"
            fontWeight="800"
            fill="#ed6747"
          >
            6
          </text>
          <g transform="translate(117 78)">
            <circle r="24" fill="#c93a43" />
            <path
              d="M-13-20q24 16 12 42"
              fill="none"
              stroke="#ffbb9a"
              strokeWidth="2"
              strokeDasharray="3 3"
            />
          </g>
        </g>
      )}
      {kind === "stick_cricket" && (
        <>
          <ellipse
            cx="204"
            cy="205"
            rx="140"
            ry="27"
            fill="#589e7a"
            opacity=".2"
          />
          <path d="M190 70h58l54 151H140z" fill="#ead6a4" opacity=".75" />
          <g stroke="#fffceb" strokeWidth="8" strokeLinecap="round" {...shadow}>
            <path d="M257 115v96m16-96v96m16-96v96M251 112h44" />
          </g>
          <g
            className="cover-object"
            transform="translate(159 141) rotate(-30)"
            {...shadow}
          >
            <rect
              x="-9"
              y="-110"
              width="18"
              height="68"
              rx="7"
              fill="#173c41"
            />
            <rect
              x="-22"
              y="-49"
              width="44"
              height="128"
              rx="13"
              fill={`url(#${id}-wood)`}
            />
            <rect
              x="-15"
              y="-35"
              width="30"
              height="30"
              rx="4"
              fill="#255aee"
            />
            <path d="M-12 14v42" stroke="#fff5d4" strokeWidth="3" />
          </g>
          <g transform="translate(275 75)" {...shadow}>
            <circle r="25" fill="#e34e50" />
            <path
              d="M-17-18q29 14 12 40"
              fill="none"
              stroke="#fff3dc"
              strokeWidth="2"
              strokeDasharray="4 3"
            />
          </g>
          <path
            d="m315 63 27-10m-24 29 27-3"
            stroke="#fff"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </>
      )}
      {kind === "four_row" && (
        <g
          className="cover-object"
          transform="translate(197 125) rotate(-8)"
          {...shadow}
        >
          <rect
            x="-116"
            y="-83"
            width="244"
            height="180"
            rx="17"
            fill="#263794"
          />
          <rect
            x="-124"
            y="-92"
            width="244"
            height="180"
            rx="17"
            fill="#435df4"
          />
          {Array.from({ length: 35 }, (_, i) => (
            <circle
              key={i}
              cx={-99 + (i % 7) * 32}
              cy={-65 + Math.floor(i / 7) * 32}
              r="12"
              fill={
                i >= 28 && i < 32
                  ? "#ffcf55"
                  : [22, 23, 26, 32, 34].includes(i)
                    ? "#ff886b"
                    : "#243892"
              }
              stroke={i >= 28 && i < 32 ? "#ffe399" : "#344ac5"}
              strokeWidth="2"
            />
          ))}
          <path
            d="M-99 63h96"
            stroke="#fff7c5"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
      )}
      {kind === "dots_boxes" && (
        <g
          className="cover-object"
          transform="translate(200 129) rotate(-7)"
          {...shadow}
        >
          <rect
            x="-115"
            y="-100"
            width="230"
            height="202"
            rx="12"
            fill="#fffdf5"
          />
          {[-70, -35, 0, 35, 70].map((y) => (
            <path key={y} d={`M-115 ${y}h230`} stroke="#d3e8e5" />
          ))}
          <rect x="-70" y="-57" width="48" height="48" fill="#bdc8ff" />
          <rect x="26" y="-9" width="48" height="48" fill="#ffcc9c" />
          <path
            d="M-70-57h48v48h-48zM-22-9h48v48h48v-48H26"
            fill="none"
            stroke="#4b60e9"
            strokeWidth="5"
            strokeLinecap="round"
          />
          {Array.from({ length: 16 }, (_, i) => (
            <circle
              key={i}
              cx={-70 + (i % 4) * 48}
              cy={-57 + Math.floor(i / 4) * 48}
              r="4.5"
              fill="#24334a"
            />
          ))}
        </g>
      )}
      {(kind === "gilli_danda" || kind === "last_stick") && (
        <g className="cover-object" {...shadow}>
          {kind === "gilli_danda" ? (
            <>
              <ellipse
                cx="200"
                cy="209"
                rx="129"
                ry="19"
                fill="#bd8556"
                opacity=".22"
              />
              <g transform="translate(180 147) rotate(48)">
                <rect
                  x="-10"
                  y="-102"
                  width="20"
                  height="210"
                  rx="10"
                  fill={`url(#${id}-wood)`}
                />
                <path d="M-4-75V74" stroke="#fff0c1" strokeWidth="2" />
              </g>
              <g transform="translate(270 76) rotate(-35)">
                <path
                  d="M0-42 12-23V24L0 43-12 24v-47z"
                  fill={`url(#${id}-wood)`}
                />
              </g>
              <path
                d="m291 98 17 21m-7-40 22 8"
                stroke="#fff7e8"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </>
          ) : (
            <g transform="translate(98 55) rotate(9 100 70)">
              {Array.from({ length: 7 }, (_, i) => (
                <g key={i} transform={`translate(${i * 29} ${(i % 2) * 14})`}>
                  <rect
                    width="11"
                    height="147"
                    rx="5"
                    fill={`url(#${id}-wood)`}
                  />
                  <rect
                    x="-1"
                    y="-4"
                    width="13"
                    height="26"
                    rx="7"
                    fill={i === 6 ? "#445cf0" : "#c84c52"}
                  />
                </g>
              ))}
            </g>
          )}
        </g>
      )}
      {["crown_run", "bridge_breakers", "mela_heist"].includes(kind) && (
        <g className="cover-object" {...shadow}>
          <g transform="translate(200 70)">
            <path
              d="m0-37 149 83v19L0 148-149 65V46z"
              fill={kind === "mela_heist" ? "#49597e" : "#668bb5"}
            />
            {Array.from({ length: 25 }, (_, i) => {
              const x = i % 5,
                y = Math.floor(i / 5),
                px = (x - y) * 29,
                py = (x + y) * 16;
              return (
                <path
                  key={i}
                  d={`M${px} ${py - 32}l29 16-29 16-29-16z`}
                  fill={
                    kind === "bridge_breakers" && x === 2
                      ? "#6ca8d1"
                      : (x + y) % 2
                        ? "#c0d6e6"
                        : "#e5eff0"
                  }
                  stroke="#859cbd"
                  strokeWidth=".7"
                />
              );
            })}
            <g transform="translate(-58 18)">
              <ellipse cy="30" rx="16" ry="8" fill="#476291" opacity=".3" />
              <path d="M-12 7q12-9 24 0v24q-12 9-24 0z" fill="#fb885e" />
              <circle r="13" fill="#ffc197" />
            </g>
            <g transform="translate(58 48)">
              <ellipse cy="30" rx="16" ry="8" fill="#476291" opacity=".3" />
              <path d="M-12 7q12-9 24 0v24q-12 9-24 0z" fill="#4059e5" />
              <circle r="13" fill="#7f99ff" />
            </g>
            {kind === "crown_run" ? (
              <g transform="translate(0 3)">
                <path
                  d="m-28-19 13 12 15-25 15 25 13-12-5 40h-46z"
                  fill="#ffc94d"
                  stroke="#ce931c"
                  strokeWidth="2"
                />
                <circle cy="7" r="4" fill="#ff794d" />
              </g>
            ) : kind === "mela_heist" ? (
              <g transform="translate(0 8)">
                <path d="m-23-23 26-9 23 14v35l-26 10-23-14z" fill="#c58b3c" />
                <path d="m-23-23 23 13 26-8-23-14z" fill="#ffde88" />
                <path d="M0-10v37" stroke="#ffcf65" strokeWidth="5" />
                <rect
                  x="-4"
                  y="0"
                  width="11"
                  height="12"
                  rx="2"
                  fill="#785924"
                />
              </g>
            ) : (
              <g transform="translate(0 10)">
                <path d="m-28-12 15-8 41 23-15 9z" fill="#f5c784" />
                <path d="m-28-12v16l41 24V12m15-9v16l-15 9" fill="#c8935d" />
              </g>
            )}
          </g>
        </g>
      )}
    </svg>
  );
}
