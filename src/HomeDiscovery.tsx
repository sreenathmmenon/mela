import "./homeDiscovery.css";
import { useState } from "react";

export const HOME_GAMES = [
  {
    kind: "crown_run",
    name: "Crown Run",
    tag: "",
    copy: "Steal the crown. Bring it home.",
    crowd: "The crowd moves the crossing.",
    art: "crown",
  },
  {
    kind: "bridge_breakers",
    name: "Bridge Breakers",
    tag: "",
    copy: "Race across. Build your own course.",
    crowd: "Every crossing can change.",
    art: "bridge",
  },
  {
    kind: "mela_heist",
    name: "Mela Heist",
    tag: "",
    copy: "Two partners. One treasure to rescue.",
    crowd: "Help the team get home.",
    art: "heist",
  },
  {
    kind: "pen_fight",
    name: "Pen Fight",
    tag: "THE SCHOOL-DESK SHOWDOWN",
    copy: "Flick your rival off the desk.",
    crowd: "The crowd can tilt the odds.",
    art: "pens",
  },
  {
    kind: "book_cricket",
    name: "Book Cricket",
    tag: "ONE BOOK. A WHOLE STADIUM.",
    copy: "Six balls. Make them count.",
    crowd: "Every cheer can change the next ball.",
    art: "book",
  },
  {
    kind: "stick_cricket",
    name: "Stick Cricket",
    tag: "BAT. BOWL. ONE OVER.",
    copy: "Six balls each. Beat MelaBot's score.",
    crowd: "Every cheer can shape the next ball.",
    art: "cricket",
  },
  {
    kind: "dots_boxes",
    name: "Dots & Boxes",
    tag: "JUST ONE MORE SQUARE",
    copy: "Join the dots. Claim the boxes.",
    crowd: "Watch out for a crowd chain break.",
    art: "dots",
  },
  {
    kind: "gilli_danda",
    name: "Gilli Danda",
    tag: "BACK TO THE COURTYARD",
    copy: "Time your hit. Send it flying.",
    crowd: "A drumbeat or a heckle changes the hit.",
    art: "gilli",
  },
  {
    kind: "four_row",
    name: "Four in a Row",
    tag: "MAKE A LITTLE CONNECTION",
    copy: "Connect four before your rival.",
    crowd: "A sidewind can change where it lands.",
    art: "four",
  },
  {
    kind: "last_stick",
    name: "Last Stick",
    tag: "SMALL PILE. BIG MIND GAME.",
    copy: "Take the last stick to win.",
    crowd: "One crowd spark changes the arithmetic.",
    art: "sticks",
  },
] as const;

export function HomeDiscovery({
  onChoose,
  live,
  busy = false,
  onWatch,
}: {
  onChoose: (name: string) => void;
  busy?: boolean;
  onWatch: (id: bigint) => void;
  live: Array<{ id: bigint; host: string; game: string; watching: number }>;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <div className="home-discovery">
      <section id="explore-games" className="home-games" aria-label="Games">
        <div className="home-game-grid">
          {HOME_GAMES.map((game, index) => (
            <button
              key={game.kind}
              className={`home-game ${index === 0 ? "home-game-featured" : ""}`}
              onClick={() => {
                setSelected(game.kind);
                onChoose(game.kind);
              }}
              aria-busy={busy && selected === game.kind}
              disabled={busy}
              aria-label={`Play ${game.name}`}
            >
              <span
                className={`home-art home-art-${game.art}`}
                aria-hidden="true"
              >
                {game.art === "pens" ? (
                  <>
                    <i className="home-pen one" />
                    <i className="home-pen two" />
                  </>
                ) : game.art === "book" ? (
                  <>
                    <i className="home-book">6</i>
                    <i className="home-ball" />
                  </>
                ) : game.art === "cricket" ? (
                  <span className="home-cricket">
                    <i className="home-cricket-bat" />
                    <i className="home-cricket-ball" />
                    <i className="home-cricket-stumps" />
                  </span>
                ) : game.art === "dots" ? (
                  <span className="home-dot-board">
                    {Array.from({ length: 9 }, (_, i) => (
                      <i key={i}>{i === 4 ? "M" : "•"}</i>
                    ))}
                  </span>
                ) : ["crown", "bridge", "heist"].includes(game.art) ? (
                  <svg
                    viewBox="0 0 240 170"
                    width="220"
                    height="156"
                    style={{ maxWidth: "100%" }}
                  >
                    {Array.from({ length: 25 }, (_, i) => {
                      const x = i % 5,
                        y = Math.floor(i / 5),
                        px = 120 + (x - y) * 21,
                        py = 30 + (x + y) * 12;
                      return (
                        <path
                          key={i}
                          d={`M${px},${py}l21,12 -21,12 -21,-12z`}
                          fill={
                            x === 2
                              ? "#cda776"
                              : (x + y) % 2
                                ? "#779e8a"
                                : "#b2c4a4"
                          }
                          stroke="#4e7363"
                          strokeWidth="1.5"
                        />
                      );
                    })}
                    <g fill="#eea264">
                      <ellipse cx="62" cy="91" rx="11" ry="5" />
                      <rect x="55" y="68" width="14" height="22" rx="6" />
                      <circle cx="62" cy="65" r="9" />
                    </g>
                    <g fill="#2e9d90">
                      <ellipse cx="180" cy="91" rx="11" ry="5" />
                      <rect x="173" y="68" width="14" height="22" rx="6" />
                      <circle cx="180" cy="65" r="9" />
                    </g>
                    {game.art === "crown" ? (
                      <path
                        d="M106 80l-2-15 10 7 6-16 6 16 10-7-2 15z"
                        fill="#e4ad3f"
                        stroke="#846323"
                        strokeWidth="2"
                      />
                    ) : game.art === "heist" ? (
                      <g>
                        <rect
                          x="107"
                          y="64"
                          width="26"
                          height="19"
                          rx="4"
                          fill="#dca947"
                        />
                        <path
                          d="M109 70h22M120 65v17"
                          stroke="#715835"
                          strokeWidth="3"
                        />
                      </g>
                    ) : (
                      <g fill="#bd895b">
                        <path d="M99 55l18 10v21l-18-10z" />
                        <path d="M99 55l18-10 18 10-18 10z" fill="#e4bf86" />
                      </g>
                    )}
                  </svg>
                ) : game.art === "four" ? (
                  <span className="home-disc-board">
                    {Array.from({ length: 21 }, (_, i) => (
                      <i
                        className={i > 13 ? (i % 2 ? "gold" : "teal") : ""}
                        key={i}
                      />
                    ))}
                  </span>
                ) : (
                  <span className={`home-wood ${game.art}`}>
                    {Array.from(
                      { length: game.art === "gilli" ? 2 : 7 },
                      (_, i) => (
                        <i key={i} />
                      ),
                    )}
                  </span>
                )}
              </span>
              <span className="home-game-copy">
                {index === 0 && <small>START HERE</small>}
                <strong>{game.name}</strong>
                <span>{game.copy}</span>
                <b>{busy && selected === game.kind ? "Opening…" : "Play →"}</b>
              </span>
            </button>
          ))}
        </div>
      </section>
      {live.length > 0 && (
        <section className="home-live" aria-labelledby="home-live-title">
          <h2 id="home-live-title">Join a crowd</h2>
          <ul>
            {live.map((match) => (
              <li key={match.id.toString()}>
                <span>
                  <strong>{match.game}</strong>
                  <span>
                    {match.host} · {match.watching} watching
                  </span>
                </span>
                <button
                  disabled={busy}
                  onClick={() => onWatch(match.id)}
                  aria-label={`Join ${match.host}'s ${match.game} crowd`}
                >
                  Watch →
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
