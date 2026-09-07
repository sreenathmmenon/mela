import "./homeDiscovery.css";
import { useState } from "react";

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
      <section className="home-stage" aria-labelledby="home-stage-title">
        <div className="home-stage-copy">
          <p className="home-stage-kicker">A SHARED GAME ROOM</p>
          <h2 id="home-stage-title">
            A game is better when <em>everyone has a move.</em>
          </h2>
          <p>
            Pick a classic. Bring a rival. Let the crowd change what happens
            next.
          </p>
          <a className="home-stage-action" href="#explore-games">
            Pick a game <span aria-hidden="true">↓</span>
          </a>
        </div>
        <div className="home-stage-table" aria-hidden="true">
          <span className="stage-pencil stage-pencil-a" />
          <span className="stage-pencil stage-pencil-b" />
          <span className="stage-disc stage-disc-gold" />
          <span className="stage-disc stage-disc-teal" />
          <span className="stage-note">YOUR MOVE</span>
          <span className="stage-crowd">
            <i />
            <i />
            <i />
          </span>
        </div>
      </section>
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
