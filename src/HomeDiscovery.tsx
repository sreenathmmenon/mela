import "./homeDiscovery.css";

export const HOME_GAMES = [
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
  returning = false,
}: {
  onChoose: (name: string) => void;
  busy?: boolean;
  returning?: boolean;
  live: Array<{ id: bigint; host: string; game: string; watching: number }>;
}) {
  return (
    <div className="home-discovery">
      <section id="explore-games" className="home-games" aria-label="Games">
        <div className="home-game-grid">
          {HOME_GAMES.map((game) => (
            <button
              key={game.kind}
              className="home-game"
              onClick={() => onChoose(game.kind)}
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
                ) : game.art === "dots" ? (
                  <span className="home-dot-board">
                    {Array.from({ length: 9 }, (_, i) => (
                      <i key={i}>{i === 4 ? "M" : "•"}</i>
                    ))}
                  </span>
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
                <strong>{game.name}</strong>
                <span>{game.copy}</span>
                <b>{busy ? "Opening…" : "Play →"}</b>
              </span>
            </button>
          ))}
        </div>
      </section>
      {!returning && (
        <section className="home-live" aria-labelledby="home-live-title">
          <h2 id="home-live-title">Join a crowd</h2>
          {live.length ? (
            <ul>
              {live.map((match) => (
                <li key={match.id.toString()}>
                  <span>
                    <strong>{match.host}</strong>
                    <span>
                      {match.game} · {match.watching} watching
                    </span>
                  </span>
                  <a
                    href={`?join=${match.id}`}
                    aria-label={`Join ${match.host}'s ${match.game} crowd`}
                  >
                    Join crowd →
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="home-empty">
              Start a game. Invite a friend with its QR.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
