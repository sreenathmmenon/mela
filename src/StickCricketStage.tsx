type Props = {
  batting: "human" | "bot";
  battingName: string;
  bowlingName: string;
  ball: number;
  suspense: boolean;
  outcome?: string;
  crowdSwing?: string;
};

function call(outcome?: string) {
  if (!outcome) return "TAKE GUARD";
  if (outcome.includes("OUT")) return "WICKET";
  if (outcome.startsWith("6")) return "SIX";
  if (outcome.startsWith("4")) return "FOUR";
  return outcome;
}

/** Presentation driven strictly by a committed ball. This component has no
 * random source, scoring calculation or game mutation path. */
export function StickCricketStage({
  batting,
  battingName,
  bowlingName,
  ball,
  suspense,
  outcome,
  crowdSwing,
}: Props) {
  const result = call(outcome);
  return (
    <figure
      className={`stick-cricket-stage ${batting === "human" ? "human-batting" : "bot-batting"} ${suspense ? "delivery-live" : ""} ${outcome ? "delivery-resolved" : ""} ${outcome?.startsWith("4") || outcome?.startsWith("6") ? "boundary" : ""} ${outcome?.includes("OUT") ? "wicket" : ""}`}
      aria-label={`${battingName} batting against ${bowlingName}. ${suspense ? "Ball in play." : outcome ? `${result} on the last ball.` : "Ready for the next ball."}`}
    >
      <svg viewBox="0 0 900 430" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="stick-sky" x1="0" x2="0" y1="0" y2="1">
            <stop stopColor="#74bdd3" />
            <stop offset=".54" stopColor="#dce8be" />
            <stop offset=".55" stopColor="#4b965c" />
            <stop offset="1" stopColor="#174c37" />
          </linearGradient>
          <linearGradient id="stick-pitch" x1="0" x2="0" y1="0" y2="1">
            <stop stopColor="#dfc487" />
            <stop offset="1" stopColor="#ae7947" />
          </linearGradient>
          <radialGradient id="stick-ball">
            <stop stopColor="#ffd6bd" />
            <stop offset=".25" stopColor="#e3533c" />
            <stop offset="1" stopColor="#72191b" />
          </radialGradient>
        </defs>
        <rect width="900" height="430" rx="24" fill="url(#stick-sky)" />
        <path
          d="M0 224Q135 180 270 218T535 207T900 199V430H0Z"
          fill="#2f7549"
        />
        <g className="stick-crowd" opacity=".75">
          {Array.from({ length: 35 }, (_, i) => (
            <circle
              key={i}
              cx={15 + i * 26}
              cy={203 - ((i * 17) % 19)}
              r={7 + (i % 3)}
              fill={i % 2 ? "#f2c75f" : "#f8eee0"}
            />
          ))}
        </g>
        <path d="M322 430 410 201H490L579 430Z" fill="url(#stick-pitch)" />
        <path
          d="M410 201h80l89 229H322Z"
          fill="none"
          stroke="#ffefd0"
          strokeOpacity=".58"
          strokeWidth="3"
        />
        <path d="M417 219h66M423 381h54" stroke="#fff7db" strokeWidth="5" />
        <g className="stick-wickets far" transform="translate(450 222)">
          <path
            d="M-17 0v-28M0 0v-30M17 0v-28M-24-25h48"
            stroke="#f7e4ad"
            strokeWidth="4"
          />
        </g>
        <g className="stick-wickets near" transform="translate(450 382)">
          <path
            d="M-17 0v-34M0 0v-36M17 0v-34M-24-31h48"
            stroke="#f7e4ad"
            strokeWidth="5"
          />
        </g>
        <g className="stick-bowler" transform="translate(450 248)">
          <circle cy="-45" r="16" fill="#633b2a" />
          <path d="M-22-40q22-28 44 0" fill="#20395e" />
          <path
            d="M0-28v47M0-6l-37-18M0-7l31-37M0 19l-26 47M0 19l27 47"
            stroke="#efe8de"
            strokeWidth="13"
            strokeLinecap="round"
          />
          <path
            d="M0-27v44M0-6l-34-16M0-6l28-33M0 18l-22 43M0 18l23 43"
            stroke="#244d78"
            strokeWidth="9"
            strokeLinecap="round"
          />
        </g>
        <g className="stick-batter" transform="translate(450 347)">
          <circle cy="-60" r="18" fill="#71432c" />
          <path d="M-24-54q24-31 48 0" fill="#d5a52f" />
          <path
            d="M0-42v57M0-19l-31 27M0-18l37 4M0 14l-27 52M0 14l27 52"
            stroke="#f3ece1"
            strokeWidth="15"
            strokeLinecap="round"
          />
          <path
            d="M0-40v53M0-19l-28 25M0-18l34 3M0 13l-23 48M0 13l24 48"
            stroke="#194f78"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            className="stick-bat"
            d="M35-14 74 59"
            stroke="#e3b66d"
            strokeWidth="15"
            strokeLinecap="round"
          />
          <path
            d="M32-18 40-5"
            stroke="#302217"
            strokeWidth="7"
            strokeLinecap="round"
          />
        </g>
        <g className="stick-ball" key={`${ball}-${outcome ?? "ready"}`}>
          <circle r="11" fill="url(#stick-ball)" />
          <path
            d="M-7-8q8 8 14 16"
            fill="none"
            stroke="#ffe4ce"
            strokeWidth="1.5"
          />
        </g>
        {outcome && (
          <g className="stick-call" transform="translate(450 102)">
            <rect
              x="-76"
              y="-28"
              width="152"
              height="55"
              rx="27"
              fill="#123a30"
              fillOpacity=".92"
            />
            <text
              textAnchor="middle"
              y="9"
              fill="#fff3ce"
              fontSize="29"
              fontWeight="800"
              letterSpacing="3"
            >
              {result}
            </text>
          </g>
        )}
      </svg>
      <figcaption>
        <span>
          {suspense
            ? `${bowlingName} runs in…`
            : outcome
              ? `${battingName}: ${result}`
              : `${battingName} is ready.`}
        </span>
        <small>{crowdSwing || "1 over each · 2 wickets"}</small>
      </figcaption>
    </figure>
  );
}
