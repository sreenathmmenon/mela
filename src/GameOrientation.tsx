import { GAME_GUIDES } from "./productExperience";
import "./productExperience.css";

export function GameOrientation({
  game,
  spectator = false,
  complete = false,
}: {
  game: string;
  spectator?: boolean;
  complete?: boolean;
}) {
  const guide = GAME_GUIDES[game];
  if (!guide || complete) return null;
  return (
    <details className="game-orientation">
      <summary>
        <span>{spectator ? "You're in the crowd" : "How to play"}</span>
      </summary>
      <div>
        <p>
          <strong>{guide.goal}</strong>
        </p>
        <p>{spectator ? guide.crowd : guide.input}</p>
        <p>
          {spectator
            ? "Energy is shared with the crowd; your cooldown is yours. Pending powers stay with spectators until the game reveals their effect."
            : "Crowd powers can change a move. You'll see their effect when it resolves, not the crowd's hidden choices."}
        </p>
      </div>
    </details>
  );
}
