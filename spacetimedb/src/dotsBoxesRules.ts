/** Small, pure rules for a 4×4-dot Dots & Boxes board. */
export const DOTS_RULES = { dots: 4, boxes: 9, edges: 24 } as const;

export type DotsSide = "human" | "melabot";
export type DotsResolution = {
  edges: string;
  boxes: string;
  claimed: number;
  nextTurn: DotsSide;
  complete: boolean;
  winner?: DotsSide | "draw";
};

const edgeKey = (a: number, b: number) => `${Math.min(a, b)}-${Math.max(a, b)}`;
const allEdges = new Set<string>();
for (let row = 0; row < DOTS_RULES.dots; row++)
  for (let col = 0; col < DOTS_RULES.dots; col++) {
    const dot = row * DOTS_RULES.dots + col;
    if (col < DOTS_RULES.dots - 1) allEdges.add(edgeKey(dot, dot + 1));
    if (row < DOTS_RULES.dots - 1)
      allEdges.add(edgeKey(dot, dot + DOTS_RULES.dots));
  }
const boxEdges = Array.from({ length: 9 }, (_, box) => {
  const row = Math.floor(box / 3),
    col = box % 3,
    tl = row * 4 + col;
  return [
    edgeKey(tl, tl + 1),
    edgeKey(tl, tl + 4),
    edgeKey(tl + 1, tl + 5),
    edgeKey(tl + 4, tl + 5),
  ];
});
const readSet = (value: string) => new Set(value ? value.split(",") : []);

export function legalDotsEdge(from: number, to: number) {
  return (
    Number.isInteger(from) &&
    Number.isInteger(to) &&
    allEdges.has(edgeKey(from, to))
  );
}

export function resolveDotsMove(input: {
  edges: string;
  boxes: string;
  from: number;
  to: number;
  side: DotsSide;
}): DotsResolution {
  if (!legalDotsEdge(input.from, input.to))
    throw new Error("Choose two neighbouring dots.");
  const edge = edgeKey(input.from, input.to),
    edges = readSet(input.edges);
  const owned = input.boxes ? input.boxes.split(",").filter(Boolean) : [];
  const boxes = new Set(owned.map((box) => box.slice(0, -1)));
  if (edges.has(edge)) throw new Error("That line is already drawn.");
  edges.add(edge);
  let claimed = 0;
  boxEdges.forEach((needs, box) => {
    const key = String(box);
    if (!boxes.has(key) && needs.every((item) => edges.has(item))) {
      boxes.add(key);
      claimed++;
    }
  });
  const complete = boxes.size === DOTS_RULES.boxes;
  const claimedIds = [...boxes].filter(
    (box) => !owned.some((old) => old.slice(0, -1) === box),
  );
  const nextBoxes = [
    ...owned,
    ...claimedIds.map((box) => `${box}${input.side === "human" ? "h" : "b"}`),
  ].join(",");
  const hScore = nextBoxes.split(",").filter((box) => box.endsWith("h")).length;
  const bScore = nextBoxes.split(",").filter((box) => box.endsWith("b")).length;
  return {
    edges: [...edges].join(","),
    boxes: nextBoxes,
    claimed,
    nextTurn: claimed
      ? input.side
      : input.side === "human"
        ? "melabot"
        : "human",
    complete,
    winner: complete
      ? hScore === bScore
        ? "draw"
        : hScore > bScore
          ? "human"
          : "melabot"
      : undefined,
  };
}

/** Deterministic: take a box first, otherwise first legal edge in board order. */
export function decideDotsMove(edges: string): [number, number] {
  const current = readSet(edges);
  const legal = [...allEdges].filter((edge) => !current.has(edge));
  const capture = legal.find((edge) => {
    const [from, to] = edge.split("-").map(Number);
    return (
      resolveDotsMove({ edges, boxes: "", from, to, side: "melabot" }).claimed >
      0
    );
  });
  return (capture ?? legal[0]).split("-").map(Number) as [number, number];
}
