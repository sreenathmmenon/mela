import "./homeDiscovery.css";

export const HOME_GAMES = [
  {
    kind: "pen_fight",
    name: "Pen Fight",
    tag: "THE SCHOOL-DESK SHOWDOWN",
    copy: "Aim. Flick. Knock MelaBot off the desk.",
    crowd: "The crowd can tilt the odds.",
    art: "pens",
  },
  {
    kind: "book_cricket",
    name: "Book Cricket",
    tag: "ONE BOOK. A WHOLE STADIUM.",
    copy: "Six balls. Two wickets. One score to chase.",
    crowd: "Every cheer can change the next ball.",
    art: "book",
  },
  {
    kind: "dots_boxes",
    name: "Dots & Boxes",
    tag: "JUST ONE MORE SQUARE",
    copy: "Join the dots. Close a box. Keep the pencil.",
    crowd: "Watch out for a crowd chain break.",
    art: "dots",
  },
  {
    kind: "gilli_danda",
    name: "Gilli Danda",
    tag: "BACK TO THE COURTYARD",
    copy: "Lift the gilli. Time your strike. Send it flying.",
    crowd: "A drumbeat or a heckle changes the hit.",
    art: "gilli",
  },
  {
    kind: "four_row",
    name: "Four in a Row",
    tag: "MAKE A LITTLE CONNECTION",
    copy: "Drop a disc. Connect four before MelaBot.",
    crowd: "A sidewind can change where it lands.",
    art: "four",
  },
  {
    kind: "last_stick",
    name: "Last Stick",
    tag: "SMALL PILE. BIG MIND GAME.",
    copy: "Take one, two or three. The last stick wins.",
    crowd: "One crowd spark changes the arithmetic.",
    art: "sticks",
  },
] as const;

export function HomeDiscovery({
  onChoose,
  onSignIn,
  live,
}: {
  onChoose: (name: string) => void;
  onSignIn: () => void;
  live: Array<{ id: bigint; host: string; game: string; watching: number }>;
}) {
  return (
    <div className="home-discovery">
      <section className="home-invitation" aria-labelledby="home-promise">
        <p className="eyebrow">SIX GAMES. ONE SHARED PLAYGROUND.</p>
        <h2 id="home-promise">
          Come for a game.
          <br />
          <em>Stay for the crowd.</em>
        </h2>
        <p>
          Challenge MelaBot. Pull your friends into the crowd. Their moves
          change yours—and Mela remembers the result.
        </p>
        <div className="home-actions">
          <a className="primary" href="#explore-games">
            Find your game ↓
          </a>
          <button className="secondary" onClick={onSignIn}>
            Already in Mela? Sign in
          </button>
        </div>
        <div className="home-principles">
          <span>YOU PLAY</span>
          <span>FRIENDS INFLUENCE</span>
          <span>MELABOT PLAYS BACK</span>
        </div>
      </section>
      <section
        id="explore-games"
        className="home-games"
        aria-labelledby="home-games-title"
      >
        <div className="home-section-heading">
          <h2 id="home-games-title">What are we playing?</h2>
          <p>Browse first. Join when something catches your eye.</p>
        </div>
        <div className="home-game-grid">
          {HOME_GAMES.map((game) => (
            <button
              key={game.kind}
              className="home-game"
              onClick={() => onChoose(game.name)}
              aria-label={`Join to play ${game.name}`}
            >
              <span
                className={`home-art home-art-${game.art}`}
                aria-hidden="true"
              >
                {game.art === "pens" ? (
                  <>
                    <i className="home-pen one" />
                    <i className="home-pen two" />
                    <span className="home-chalk">YOUR MOVE ↗</span>
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
                <small>{game.tag}</small>
                <strong>{game.name}</strong>
                <span>{game.copy}</span>
                <em>{game.crowd}</em>
                <b>Join to play →</b>
              </span>
            </button>
          ))}
        </div>
      </section>
      <section className="home-live" aria-labelledby="home-live-title">
        <p className="eyebrow">PLAYING IS ONLY HALF THE FUN</p>
        <h2 id="home-live-title">There’s a place in the crowd, too.</h2>
        <p>
          Join a live match. Choose a side. Spend shared Crowd Energy to
          influence the next move.
        </p>
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
            Your match could start the next crowd. Pick a game, then share its
            QR with a friend.
          </p>
        )}
      </section>
    </div>
  );
}
