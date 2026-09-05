import { PEN_FIGHT_RULES, penTravelForForce } from "./penFightRules";

export interface PenFightAIObservation {
  humanX: number;
  humanY: number;
  botX: number;
  botY: number;
  turnsInRound: number;
}

export interface PenFightAIProposal {
  aimX: number;
  aimY: number;
  force: number;
  contact: number;
  rationale: string;
}

const ARENA = PEN_FIGHT_RULES.arenaSize;
const clampForce = (value: number, cap: number) =>
  Math.max(PEN_FIGHT_RULES.minForce, Math.min(cap, Math.round(value)));

/** Force needed to travel a given distance, inverting the travel formula. */
const forceForTravel = (travel: number) => (travel - 30) / 8.2;

/** Distance from a point to the desk edge along a direction. */
function roomAlong(x: number, y: number, dx: number, dy: number) {
  let room = Infinity;
  if (dx > 1e-6) room = Math.min(room, (ARENA - x) / dx);
  if (dx < -1e-6) room = Math.min(room, -x / dx);
  if (dy > 1e-6) room = Math.min(room, (ARENA - y) / dy);
  if (dy < -1e-6) room = Math.min(room, -y / dy);
  return Number.isFinite(room) ? room : ARENA;
}

/**
 * MelaBot plays the real physical game: it lines a flick up through the human's
 * pen toward the nearest edge, then picks the largest force that still keeps
 * its own pen on the desk. It reads only public board state, proposes one legal
 * flick, and the reducer resolves it through the same physics a human uses — so
 * it can never cheat, teleport, or act twice.
 *
 * A small deterministic wobble derived from the visible positions makes it
 * beatable without introducing randomness.
 */
export class DeterministicPenFightAIProvider {
  decideAction(state: PenFightAIObservation): PenFightAIProposal {
    const { humanX: fx, humanY: fy, botX: mx, botY: my } = state;

    // Nearest edge to the human pen — the direction we want to shove it.
    const edges = [
      { dist: fx, nx: -1, ny: 0 },
      { dist: ARENA - fx, nx: 1, ny: 0 },
      { dist: fy, nx: 0, ny: -1 },
      { dist: ARENA - fy, nx: 0, ny: 1 },
    ];
    const edge = edges.reduce((best, e) => (e.dist < best.dist ? e : best));

    // Aim through the foe, biased toward that edge.
    let hx = fx + edge.nx * 88 - mx;
    let hy = fy + edge.ny * 88 - my;
    const hLen = Math.max(1e-6, Math.hypot(hx, hy));
    hx /= hLen;
    hy /= hLen;

    // Deterministic aim imperfection: a pure function of the visible board.
    // Tuned so MelaBot is a real opponent but beatable: a human who aims and
    // manages force well wins a fair share of matches. Deterministic, so the
    // same board always produces the same shot — no hidden randomness.
    const wobble =
      ((Math.round(mx * 7 + my * 13 + fx * 3 + fy * 5) % 101) / 100 - 0.5) *
      0.34;
    const cos = Math.cos(wobble);
    const sin = Math.sin(wobble);
    const ax = hx * cos - hy * sin;
    const ay = hx * sin + hy * cos;

    // How far along the aim line the foe sits, minus the contact back-off.
    const reach = Math.max(
      0,
      (fx - mx) * ax + (fy - my) * ay - PEN_FIGHT_RULES.contactRadius * 0.5,
    );
    const fReach = forceForTravel(reach);
    // Force that stays safe if the flick misses entirely.
    const fSafe = forceForTravel(roomAlong(mx, my, ax, ay) * 0.955 - 26);
    // Force that stays safe through the follow-through after a hit. The room
    // that matters is our own path past the contact point, not the foe's — the
    // foe being pinned against a wall must not veto our own shot.
    const roomPastContact = Math.max(0, roomAlong(mx, my, ax, ay) - reach);
    const fFollow = forceForTravel(reach + (roomPastContact * 0.92 - 20) / 0.52);
    // Force that actually shoves the foe over its nearest edge.
    const fKill = forceForTravel(reach + (edge.dist + 24) / 0.95);

    const left = PEN_FIGHT_RULES.maxTurnsPerRound - state.turnsInRound;
    // Same measure the round tiebreak uses: desk left under the pen.
    const margin = (x: number, y: number) =>
      Math.min(x, y, ARENA - x, ARENA - y);
    const losing = margin(mx, my) < margin(fx, fy);
    const riskBudget = losing && left <= 2 ? 26 : losing && left <= 4 ? 12 : 0;
    const cap = PEN_FIGHT_RULES.maxForce;
    const ceiling = Math.min(cap, fSafe - 3 + riskBudget, fFollow + riskBudget);

    // A kill shot only counts if it also keeps our own pen on the desk — the
    // winner check resolves actor-out first, so following the foe off the edge
    // loses the round even though they went out too.
    const killIsSafe = fKill <= Math.min(cap, fSafe - 2, fFollow);

    let force: number;
    let rationale: string;
    if (killIsSafe) {
      force = clampForce(Math.max(fKill + 2, PEN_FIGHT_RULES.minForce), cap);
      rationale = "MelaBot lines up the edge and commits to the knockout.";
    } else if (fKill + 3 <= ceiling) {
      force = clampForce(fKill + 3, cap);
      rationale = "MelaBot lines up the edge and commits to the knockout.";
    } else if (fReach + 4 <= ceiling) {
      force = clampForce(Math.min(ceiling, fReach + 12), cap);
      rationale = "MelaBot presses the contact without overrunning the desk.";
    } else if (fReach + 2 <= cap && fReach <= fSafe - 8 + riskBudget) {
      force = clampForce(fReach + 2, cap);
      rationale = losing
        ? "MelaBot is behind and takes the risky shot."
        : "MelaBot reaches for contact.";
    } else {
      // Nothing safe is on: retreat toward the centre, which wins a tiebreak.
      let rx = 500 - mx;
      let ry = 500 - my;
      const rLen = Math.max(1e-6, Math.hypot(rx, ry));
      rx /= rLen;
      ry /= rLen;
      const park = clampForce(
        forceForTravel(Math.min(220, rLen * 0.6)),
        PEN_FIGHT_RULES.maxForce,
      );
      return {
        aimX: Math.round(Math.max(0, Math.min(ARENA, mx + rx * 400))),
        aimY: Math.round(Math.max(0, Math.min(ARENA, my + ry * 400))),
        force: park,
        contact: 50,
        rationale: "MelaBot backs off and plays for desk position.",
      };
    }

    // Spin toward the edge we want the human pen to leave by.
    const perpX = -ay;
    const perpY = ax;
    const contact = Math.max(
      0,
      Math.min(100, Math.round(50 + 34 * (edge.nx * perpX + edge.ny * perpY))),
    );

    return {
      aimX: Math.round(Math.max(0, Math.min(ARENA, mx + ax * hLen * 1.35))),
      aimY: Math.round(Math.max(0, Math.min(ARENA, my + ay * hLen * 1.35))),
      force,
      contact,
      rationale,
    };
  }
}
