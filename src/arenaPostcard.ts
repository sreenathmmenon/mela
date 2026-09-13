import type { ArenaState } from "../spacetimedb/src/arenaRules";

/** A portable picture of a real committed result, never a fabricated score. */
export async function downloadArenaPostcard(
  state: ArenaState,
  title: string,
  names: [string, string],
  url: string,
) {
  if (!state.winner)
    throw Error("Finish the match before making its postcard.");
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 1200;
  const c = canvas.getContext("2d");
  if (!c) throw Error("Your browser could not create the postcard.");
  c.fillStyle = "#133c38";
  c.fillRect(0, 0, 1200, 1200);
  c.fillStyle = "#b5cdbd";
  c.font = "700 23px sans-serif";
  c.fillText("MELA  /  A MATCH WORTH KEEPING", 70, 85);
  c.fillStyle = "#fff0cf";
  c.font = "bold 64px sans-serif";
  c.fillText(title, 70, 172);
  c.font = "28px sans-serif";
  const result =
    state.winner === "draw"
      ? "A draw. Settle it in the next round."
      : state.winner === "team"
        ? "Treasure rescued. Together."
        : state.winner === "timeout"
          ? "The vault closed. Try a different plan."
          : `${names[state.winner === "human" ? 0 : 1]} wins.`;
  c.fillText(result, 70, 228, 1060);
  const cell = 63,
    ox = 316,
    oy = 288;
  for (let y = 0; y < 9; y++)
    for (let x = 0; x < 9; x++) {
      c.fillStyle =
        x === 4 && Math.abs(y - state.bridge) > 1
          ? "#1e5358"
          : x === 4
            ? "#c6a46a"
            : (x + y) % 2
              ? "#477565"
              : "#557e6a";
      c.fillRect(ox + x * cell, oy + y * cell, cell - 3, cell - 3);
      if (state.walls.includes(y * 9 + x)) {
        c.fillStyle = "#e5c28e";
        c.fillRect(
          ox + x * cell + 10,
          oy + y * cell + 10,
          cell - 23,
          cell - 23,
        );
      }
    }
  state.pawns.forEach((p, i) => {
    c.fillStyle = i ? "#77d6c7" : "#ffb26e";
    c.beginPath();
    c.arc(
      ox +
        p.x * cell +
        30 +
        (state.pawns[0].x === state.pawns[1].x &&
        state.pawns[0].y === state.pawns[1].y
          ? i
            ? 12
            : -12
          : 0),
      oy + p.y * cell + 30,
      20,
      0,
      Math.PI * 2,
    );
    c.fill();
    c.fillStyle = "#123b36";
    c.font = "bold 22px sans-serif";
    c.fillText(i ? "T" : "A", ox + p.x * cell + 22, oy + p.y * cell + 38);
  });
  c.fillStyle = "#f5dfb5";
  c.font = "bold 36px sans-serif";
  c.fillText(names[0], 70, 932, 480);
  c.fillText(names[1], 650, 932, 480);
  c.font = "24px sans-serif";
  c.fillStyle = "#b5cdbd";
  c.fillText(
    `${state.beat} committed moves · ${state.eggs.length} discoveries`,
    70,
    985,
  );
  c.fillStyle = "#eed29b";
  c.font = "bold 28px sans-serif";
  c.fillText("Watch the replay. Bring your own character.", 70, 1062);
  c.fillStyle = "#b5cdbd";
  c.font = "20px sans-serif";
  c.fillText(url, 70, 1110, 1060);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) throw Error("The postcard could not be saved.");
  const href = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = href;
  a.download = `mela-${state.kind}-memory.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
