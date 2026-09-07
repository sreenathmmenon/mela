import { useEffect, useId, useLayoutEffect, useRef } from "react";
import type { DeskPoint, PenMotion } from "../spacetimedb/src/penFightMotion";
import { playSound } from "./sound";
import { HUMAN_PEN_YAW } from "./penFightInput";
import { contactFlashPoint, directionGuide } from "./penContactPresentation";
import type { DeskInput } from "./PenDesk";
import "./penDesk.css";

export const SHOT_DURATION = 880;
const clampVisual = (v: number) => Math.max(-95, Math.min(1095, v));
const penAngle = (_point: DeskPoint, human: boolean) =>
  -90 - ((human ? 1 : -1) * HUMAN_PEN_YAW * 180) / Math.PI;
const position = (p: DeskPoint, angle = 0, scale = 1) =>
  `translate(${clampVisual(p.x)}px, ${clampVisual(p.y)}px) rotate(${angle}deg) scale(${scale})`;

function PenShape({
  color,
  name,
  id,
  metal,
  fountain = false,
}: {
  color: string;
  name: string;
  id: string;
  metal: boolean;
  fountain?: boolean;
}) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-barrel`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#172326" />
          <stop offset=".24" stopColor={color} />
          <stop offset=".4" stopColor="#f2ffff" />
          <stop offset=".49" stopColor={color} />
          <stop offset="1" stopColor="#122227" />
        </linearGradient>
        <linearGradient id={`${id}-chrome`} x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#424e54" />
          <stop offset=".35" stopColor="#ffffff" />
          <stop offset=".54" stopColor="#b2c3c4" />
          <stop offset="1" stopColor="#47535a" />
        </linearGradient>
      </defs>
      <ellipse
        cx="4"
        cy="19"
        rx="85"
        ry="11"
        fill="#20120c"
        opacity=".3"
        style={{ filter: "blur(5px)" }}
      />
      {fountain ? (
        <g>
          <path
            d="M-91 0 -70-15 -58-9 -58 9 -70 15Z"
            fill="#edca74"
            stroke="#7f5a28"
            strokeWidth="1.5"
          />
          <path d="M-90 0h20" stroke="#49311a" />
          <circle cx="-69" r="2.5" fill="#49311a" />
        </g>
      ) : (
        <path d="M-86 0 -64-12 -64 12Z" fill={`url(#${id}-chrome)`} />
      )}
      <path d="M-88 0 -81-3 -81 3Z" fill="#16202c" />
      <rect
        x="-65"
        y="-13"
        width="136"
        height="26"
        rx="5"
        fill={`url(#${id}-barrel)`}
        stroke="#162626"
        strokeWidth="1.5"
      />
      <rect
        x="-63"
        y="-13"
        width="31"
        height="26"
        rx="3"
        fill={metal ? `url(#${id}-chrome)` : "#172e34"}
      />
      {[0, 1, 2, 3, 4].map((n) => (
        <path
          key={n}
          d={`M${-59 + n * 5} -10v20`}
          stroke={metal ? "#66757a" : "#538987"}
          opacity=".7"
          strokeWidth="2"
        />
      ))}
      <rect
        x="41"
        y="-14"
        width="33"
        height="28"
        rx="5"
        fill={`url(#${id}-barrel)`}
        stroke="#243e44"
      />
      <path
        d="M67-13v-7H30q-6 0-6 5"
        fill="none"
        stroke={`url(#${id}-chrome)`}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <rect x="35" y="-13" width="5" height="26" fill={`url(#${id}-chrome)`} />
      <path d="M-26-8H28" stroke="white" opacity=".65" strokeWidth="2" />
      <text
        x="4"
        y="4"
        textAnchor="middle"
        fill="white"
        fontSize="9"
        fontWeight="700"
        letterSpacing="2"
      >
        {name}
      </text>
      <circle cx="0" cy="0" r="3" fill="white" opacity=".65" />
    </>
  );
}

export function PenDeskFallback({
  human,
  bot,
  motion,
  aim,
  pull,
  power,
  interactive,
  aiming,
  pen,
  humanName,
  onMoving,
  onImpact,
  onFall,
  replayKey = 0,
  completed,
  mirrored = false,
  botName = "MelaBot",
  inputRef,
}: {
  human: DeskPoint;
  bot: DeskPoint;
  motion?: PenMotion;
  aim: DeskPoint;
  pull: DeskPoint | null;
  power: number;
  interactive: boolean;
  aiming: boolean;
  pen: string;
  humanName: string;
  onMoving: (moving: boolean) => void;
  onImpact?: (motion: PenMotion) => void;
  onFall?: (motion: PenMotion) => void;
  replayKey?: number;
  completed: boolean;
  mirrored?: boolean;
  botName?: string;
  inputRef?: { current: DeskInput | null };
}) {
  const uid = useId().replace(/:/g, "");
  const svgRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!inputRef) return;
    const project: DeskInput = (clientX, clientY) => {
      const svg = svgRef.current,
        matrix = svg?.getScreenCTM();
      if (!svg || !matrix) return null;
      const point = svg.createSVGPoint();
      point.x = clientX;
      point.y = clientY;
      const world = point.matrixTransform(matrix.inverse());
      return { x: world.x, y: world.y };
    };
    inputRef.current = project;
    return () => {
      if (inputRef.current === project) inputRef.current = null;
    };
  }, [inputRef]);
  const humanRef = useRef<SVGGElement>(null);
  const botRef = useRef<SVGGElement>(null);
  const impactRef = useRef<SVGGElement>(null);
  // Entering recovery shows the current committed board, not an old shot.
  const lastMotion = useRef<string | undefined>(
    motion ? `${motion.sequence}:${replayKey}` : undefined,
  );
  const activeAnimations = useRef<Animation[]>([]);
  useLayoutEffect(() => {
    const sequence = motion ? `${motion.sequence}:${replayKey}` : undefined;
    if (!motion || lastMotion.current === sequence) {
      // An effect replay/reconnect must never leave the input lock behind
      // after its animation cleanup has already cancelled the shot.
      onMoving(false);
      return;
    }
    lastMotion.current = sequence;
    activeAnimations.current.forEach((animation) => animation.cancel());
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onMoving(false);
      return;
    }
    const actor = motion.actor === "human" ? humanRef.current : botRef.current;
    const target = motion.actor === "human" ? botRef.current : humanRef.current;
    if (!actor || !target) return;
    onMoving(true);
    const actorAngle = penAngle(
      motion.from,
      (motion.actor === "human") !== mirrored,
    );
    const targetSide = motion.actor === "human" ? "melabot" : "human";
    const targetAngle = penAngle(
      motion.targetFrom,
      (targetSide === "human") !== mirrored,
    );
    const actorEndAngle = actorAngle;
    const targetEndAngle = targetAngle;
    const actorFrames = [
      {
        transform: position(motion.from, actorAngle),
        offset: 0,
        opacity: 1,
        easing: "cubic-bezier(.15,.7,.3,1)",
      },
      {
        transform: position(
          motion.hit ? motion.contact : motion.end,
          actorAngle,
        ),
        offset: 0.38,
        opacity: 1,
        easing: "cubic-bezier(.1,.65,.2,1)",
      },
      {
        transform: position(
          motion.end,
          motion.actorOut ? actorAngle + 160 : actorEndAngle,
          motion.actorOut ? 0.65 : 1,
        ),
        offset: 1,
        opacity: motion.actorOut ? 0 : 1,
      },
    ];
    const targetFrames = [
      {
        transform: position(motion.targetFrom, targetAngle),
        offset: 0,
        opacity: 1,
      },
      {
        transform: position(motion.targetFrom, targetAngle),
        offset: 0.38,
        opacity: 1,
        easing: "cubic-bezier(.08,.65,.2,1)",
      },
      {
        transform: position(
          motion.targetEnd,
          motion.targetOut ? targetAngle + 210 : targetEndAngle,
          motion.targetOut ? 0.65 : 1,
        ),
        offset: 1,
        opacity: motion.targetOut ? 0 : 1,
      },
    ];
    const animations = [
      actor.animate(actorFrames, { duration: SHOT_DURATION, fill: "forwards" }),
      target.animate(targetFrames, {
        duration: SHOT_DURATION,
        fill: "forwards",
      }),
    ];
    if (motion.hit && impactRef.current)
      animations.push(
        impactRef.current.animate(
          [
            { opacity: 0, transform: "scale(.4)" },
            { opacity: 1, offset: 0.1 },
            { opacity: 0, transform: "scale(2.1)" },
          ],
          { delay: SHOT_DURATION * 0.38, duration: 300, fill: "both" },
        ),
      );
    activeAnimations.current = animations;
    playSound("flick");
    const contactTimer = window.setTimeout(() => {
      if (motion.hit) {
        playSound("contact");
        onImpact?.(motion);
      }
    }, SHOT_DURATION * 0.38);
    const fallTimer = window.setTimeout(() => {
      if (motion.actorOut || motion.targetOut) {
        playSound("fall");
        onFall?.(motion);
      }
    }, SHOT_DURATION * 0.75);
    const endTimer = window.setTimeout(() => {
      animations.forEach((animation) => animation.cancel());
      onMoving(false);
    }, SHOT_DURATION + 40);
    return () => {
      window.clearTimeout(contactTimer);
      window.clearTimeout(fallTimer);
      window.clearTimeout(endTimer);
      animations.forEach((animation) => animation.cancel());
    };
  }, [motion, onMoving, onImpact, onFall, replayKey, mirrored]);
  useEffect(
    () => () =>
      activeAnimations.current.forEach((animation) => animation.cancel()),
    [],
  );
  const guide = directionGuide(human, aim);
  const length = Math.min(160, guide?.distance ?? 0);
  const end = {
    x: human.x + (guide?.x ?? 0) * length,
    y: human.y + (guide?.y ?? 0) * length,
  };
  const flash = motion ? contactFlashPoint(motion, mirrored) : null;
  const color =
    pen === "pen-metal"
      ? "#94b3b9"
      : pen === "pen-fountain"
        ? "#203b69"
        : pen === "pen-gel"
          ? "#22bab8"
          : "#e7ecda";
  const ink = power > 75 ? "#c74624" : power > 40 ? "#df9524" : "#16b7a8";
  return (
    <svg
      ref={svgRef}
      className="physical-desk"
      data-motion-sequence={motion?.sequence}
      viewBox="0 0 1000 1000"
      aria-label={`Pen Fight desk. ${humanName}'s pen and ${botName}'s pen.`}
      role="img"
    >
      <defs>
        <linearGradient id={`${uid}-wood`} x2=".8" y2="1">
          <stop stopColor="#e6b87c" />
          <stop offset=".52" stopColor="#c88b4e" />
          <stop offset="1" stopColor="#a76536" />
        </linearGradient>
        <radialGradient id={`${uid}-light`} cx=".2" cy=".1" r="1">
          <stop stopColor="#fff9d5" stopOpacity=".42" />
          <stop offset="1" stopColor="#713816" stopOpacity=".06" />
        </radialGradient>
        <pattern
          id={`${uid}-grain`}
          width="210"
          height="90"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M-20 19Q60-4 210 22M-20 25Q60 2 220 29M0 70Q80 32 210 60M-10 79Q80 41 220 69"
            fill="none"
            stroke="#673b22"
            strokeWidth="1.5"
            opacity=".17"
          />
        </pattern>
        <marker
          id={`${uid}-arrow`}
          markerWidth="5"
          markerHeight="5"
          refX="3"
          refY="2.5"
          orient="auto"
        >
          <path d="M0 0 4 2.5 0 5 1 2.5Z" fill={ink} />
        </marker>
      </defs>
      <rect width="1000" height="1000" rx="12" fill={`url(#${uid}-wood)`} />
      <rect width="1000" height="1000" rx="12" fill={`url(#${uid}-grain)`} />
      {[250, 510, 760].map((y) => (
        <path
          key={y}
          d={`M0 ${y}H1000`}
          stroke="#633316"
          strokeOpacity=".15"
          strokeWidth="3"
        />
      ))}
      <rect width="1000" height="1000" rx="12" fill={`url(#${uid}-light)`} />
      <rect
        x="8"
        y="8"
        width="984"
        height="984"
        rx="8"
        fill="none"
        stroke="#fff0c3"
        strokeWidth="4"
        opacity=".6"
      />
      <path
        d="M16 976H978V18"
        fill="none"
        stroke="#70401e"
        strokeWidth="12"
        opacity=".35"
      />
      <text
        x="52"
        y="76"
        fill="#694624"
        opacity=".65"
        fontFamily="monospace"
        fontSize="23"
        letterSpacing="7"
      >
        MELA / PEN FIGHT
      </text>
      <path
        d="m804 91 45-15m-34 31 52-17m-63 725 65 15m-46-25 42 9"
        stroke="#6c4324"
        opacity=".32"
        strokeWidth="2"
      />
      <text
        x="930"
        y="940"
        textAnchor="end"
        fill="#654326"
        opacity=".6"
        fontSize="20"
        fontStyle="italic"
      >
        one more round?
      </text>
      {interactive && (
        <g className={aiming ? "desk-aim is-pulling" : "desk-aim"}>
          <line
            x1={human.x}
            y1={human.y}
            x2={aim.x}
            y2={aim.y}
            stroke="#fff0c5"
            strokeWidth="3"
            strokeDasharray="15 12"
          />
          <circle
            cx={aim.x}
            cy={aim.y}
            r="15"
            fill="none"
            stroke="#fff0c5"
            strokeWidth="4"
          />
          <circle
            cx={human.x}
            cy={human.y}
            r={aiming ? 72 : 62}
            fill="#eaffed"
            fillOpacity=".12"
            stroke="#f5ffe8"
            strokeWidth="3"
            strokeDasharray={aiming ? undefined : "5 9"}
          />
          <line
            x1={human.x}
            y1={human.y}
            x2={end.x}
            y2={end.y}
            stroke="#fff8de"
            strokeWidth="13"
            opacity=".65"
          />
          <line
            x1={human.x}
            y1={human.y}
            x2={end.x}
            y2={end.y}
            stroke={ink}
            strokeWidth="7"
            strokeLinecap="round"
            markerEnd={`url(#${uid}-arrow)`}
          />
          {pull && aiming && (
            <>
              <line
                x1={human.x}
                y1={human.y}
                x2={pull.x}
                y2={pull.y}
                stroke="#fff9dc"
                strokeWidth="4"
                strokeDasharray="8 9"
              />
              <circle
                cx={pull.x}
                cy={pull.y}
                r="24"
                fill="#183c39"
                fillOpacity=".7"
                stroke="#fff9dc"
                strokeWidth="3"
              />
            </>
          )}
        </g>
      )}
      <g
        ref={humanRef}
        data-pen="human"
        style={{
          transform: position(human, penAngle(human, !mirrored)),
          opacity:
            completed &&
            motion &&
            (motion.actor === "human" ? motion.actorOut : motion.targetOut)
              ? 0
              : 1,
        }}
      >
        <g transform="scale(2.54545 1.71428) translate(8.5 0)">
          <PenShape
            color={color}
            name={humanName.slice(0, 8).toUpperCase()}
            id={`${uid}-human`}
            metal={pen === "pen-metal"}
            fountain={pen === "pen-fountain"}
          />
        </g>
      </g>
      <g
        ref={botRef}
        data-pen="melabot"
        style={{
          transform: position(bot, penAngle(bot, mirrored)),
          opacity:
            completed &&
            motion &&
            (motion.actor === "melabot" ? motion.actorOut : motion.targetOut)
              ? 0
              : 1,
        }}
      >
        <g transform="scale(2.54545 1.71428) translate(8.5 0)">
          <PenShape
            color="#bf5140"
            name={botName.slice(0, 8)}
            id={`${uid}-bot`}
            metal
          />
        </g>
      </g>
      {motion?.hit && flash && (
        <g transform={`translate(${flash.x},${flash.y})`}>
          <g ref={impactRef} opacity="0">
            <circle
              r="34"
              fill="none"
              stroke={motion.guarded ? "#78e6cd" : "#fff6c6"}
              strokeWidth="5"
            />
            {[0, 60, 120, 180, 240, 300].map((a) => (
              <path
                key={a}
                d="M45 0h20"
                transform={`rotate(${a})`}
                stroke="#fff6c6"
                strokeWidth="6"
                strokeLinecap="round"
              />
            ))}
          </g>
        </g>
      )}
    </svg>
  );
}
