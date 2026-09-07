export type DuelCard = {
  human: string;
  opponent: string;
  humanRounds: number;
  botRounds: number;
  moment: string;
  crowdActions: number;
  matchId: string;
};

/** A keepsake drawn from the saved result; never a new score or outcome. */
export async function saveDuelCard(result: DuelCard) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const c = canvas.getContext("2d");
  if (!c) throw new Error("Image export unavailable");
  c.fillStyle = "#102d2b";
  c.fillRect(0, 0, 1080, 1350);
  c.strokeStyle = "#dbc49a";
  c.lineWidth = 2;
  c.strokeRect(32, 32, 1016, 1286);
  c.fillStyle = "#edce8e";
  c.font = "700 24px system-ui";
  c.fillText("MELA / THE DESK REMEMBERS", 76, 108);
  c.fillStyle = "#fff6df";
  c.font = "bold 94px Georgia";
  c.fillText("PEN FIGHT", 70, 235);
  const wood = c.createLinearGradient(0, 300, 1080, 780);
  wood.addColorStop(0, "#cb9b61");
  wood.addColorStop(1, "#956233");
  c.fillStyle = wood;
  c.fillRect(76, 300, 928, 455);
  for (let i = 0; i < 70; i++) {
    c.strokeStyle = "#49301a20";
    c.beginPath();
    c.moveTo(76, 305 + i * 6.5);
    c.bezierCurveTo(
      400,
      310 + i * 6.5,
      700,
      300 + i * 6.5,
      1004,
      308 + i * 6.5,
    );
    c.stroke();
  }
  const drawPen = (x: number, y: number, angle: number, color: string) => {
    c.save();
    c.translate(x, y);
    c.rotate(angle);
    c.shadowColor = "#21140780";
    c.shadowBlur = 16;
    c.shadowOffsetY = 14;
    c.fillStyle = color;
    c.beginPath();
    c.roundRect(-190, -19, 340, 38, 12);
    c.fill();
    c.shadowBlur = 0;
    c.shadowOffsetY = 0;
    c.fillStyle = "#193b44";
    c.fillRect(89, -19, 60, 38);
    c.fillStyle = "#d3dbd7";
    c.beginPath();
    c.moveTo(150, -18);
    c.lineTo(190, 0);
    c.lineTo(150, 18);
    c.fill();
    c.fillStyle = "#ffffff70";
    c.fillRect(-168, -11, 230, 3);
    c.restore();
  };
  drawPen(345, 530, -0.6, "#f3f0dd");
  drawPen(735, 526, 0.9, "#bf482f");
  c.textAlign = "center";
  c.fillStyle = "#edce8e";
  c.font = "bold 134px Georgia";
  c.fillText(`${result.humanRounds} — ${result.botRounds}`, 540, 917);
  const fit = (text: string, width: number) => {
    let size = 34;
    c.font = `700 ${size}px system-ui`;
    while (c.measureText(text).width > width && size > 18)
      c.font = `700 ${--size}px system-ui`;
  };
  c.fillStyle = "#fff6df";
  fit(result.human, 400);
  c.fillText(result.human, 290, 983);
  fit(result.opponent, 400);
  c.fillText(result.opponent, 790, 983);
  c.font = "26px system-ui";
  const words = result.moment.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = `${line} ${word}`.trim();
    if (c.measureText(next).width > 880 && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  lines.slice(0, 3).forEach((text, i) => c.fillText(text, 540, 1060 + i * 37));
  c.fillStyle = "#b4ccc1";
  c.font = "23px system-ui";
  c.fillText(
    `${result.crowdActions} crowd move${result.crowdActions === 1 ? "" : "s"} · Match ${result.matchId}`,
    540,
    1226,
  );
  c.font = "700 20px system-ui";
  c.fillText("mela-web-production.up.railway.app", 540, 1270);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (value) =>
        value ? resolve(value) : reject(new Error("Image export failed")),
      "image/png",
    ),
  );
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = `mela-pen-fight-${result.matchId}.png`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(href), 1000);
}
