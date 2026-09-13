import { useState } from "react";
import { GameCover } from "./GameCover";
import {
  launchLabel,
  supportsIntent,
  type PlayIntent,
} from "./productExperience";

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
    copy: "Race to the other side.",
    crowd: "Every crossing can change.",
    art: "bridge",
  },
  {
    kind: "mela_heist",
    name: "Mela Heist",
    tag: "",
    copy: "Bring the treasure home together.",
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
    copy: "One over. Two wickets.",
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
    copy: "Time your strike. Send it flying.",
    crowd: "A drumbeat or a heckle changes the hit.",
    art: "gilli",
  },
  {
    kind: "four_row",
    name: "Four in a Row",
    tag: "MAKE A LITTLE CONNECTION",
    copy: "Connect four to win.",
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

const SHELF_ORDER = [
  "pen_fight",
  "stick_cricket",
  "crown_run",
  "four_row",
  "book_cricket",
  "bridge_breakers",
  "dots_boxes",
  "gilli_danda",
  "mela_heist",
  "last_stick",
];
export function HomeDiscovery({
  onChoose,
  live,
  busy = false,
  onWatch,
  intent = "solo",
}: {
  onChoose: (name: string) => void;
  busy?: boolean;
  intent?: PlayIntent;
  onWatch: (id: bigint) => void;
  live: Array<{ id: bigint; host: string; game: string; watching: number }>;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const games = [...HOME_GAMES]
    .sort((a, b) => SHELF_ORDER.indexOf(a.kind) - SHELF_ORDER.indexOf(b.kind))
    .filter((game) => supportsIntent(game.kind, intent));
  return (
    <div className="home-discovery">
      <section id="explore-games" className="home-games" aria-label="Games">
        <div className="home-game-grid">
          {games.map((game) => (
            <button
              key={game.kind}
              className="home-game"
              onClick={() => {
                setSelected(game.kind);
                onChoose(game.kind);
              }}
              aria-busy={busy && selected === game.kind}
              disabled={busy}
            >
              {intent === "solo" && (
                <span className="discovery-sr-only">
                  {busy && selected === game.kind ? "Opening " : "Play "}
                </span>
              )}
              <span className="home-cover">
                <GameCover kind={game.kind} />
                <span className="home-cover-action" aria-hidden="true">
                  {busy && selected === game.kind ? (
                    "…"
                  ) : intent === "solo" ? (
                    <svg
                      viewBox="0 0 20 20"
                      width="16"
                      height="16"
                      fill="currentColor"
                    >
                      <path d="m6 3 11 7-11 7z" />
                    </svg>
                  ) : (
                    "→"
                  )}
                </span>
              </span>
              <span className="home-game-copy">
                <strong>{game.name}</strong>
                <span>{game.copy}</span>
                {intent !== "solo" && (
                  <b>
                    {busy && selected === game.kind
                      ? "Opening…"
                      : launchLabel(game.kind, intent)}
                  </b>
                )}
              </span>
            </button>
          ))}
        </div>
      </section>
      {live.length > 0 && (
        <section className="home-live" aria-label="Join a crowd">
          <h2>Join a crowd</h2>
          {live.map((room) => (
            <button
              key={String(room.id)}
              disabled={busy}
              onClick={() => onWatch(room.id)}
            >
              Watch {room.host} · {room.game}
            </button>
          ))}
        </section>
      )}
    </div>
  );
}
