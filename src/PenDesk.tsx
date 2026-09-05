import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { DeskPoint, PenMotion } from "../spacetimedb/src/penFightMotion";
import type { createDeskScene, DeskFrame } from "./penDeskScene";
import { PenDeskFallback } from "./PenDeskFallback";
import { playSound } from "./sound";
import { shotCue } from "./penFightInput";

export const SHOT_DURATION = 880;
export type DeskInput = (clientX: number, clientY: number) => DeskPoint | null;
type Props = DeskFrame & {
  pull: DeskPoint | null;
  humanName: string;
  botName?: string;
  onMoving: (moving: boolean) => void;
  inputRef?: { current: DeskInput | null };
};

export function PenDesk(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const cue = useRef<HTMLSpanElement>(null);
  const humanLabel = useRef<HTMLSpanElement>(null),
    botLabel = useRef<HTMLSpanElement>(null);
  const scene = useRef<ReturnType<typeof createDeskScene>>();
  const latest = useRef(props);
  latest.current = props;
  const active = useRef<{ motion: PenMotion; start: number }>();
  const raf = useRef(0);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let disposed = false;
    const container = host.current!;
    const lost = (event: Event) => {
      event.preventDefault();
      setFailed(true);
      latest.current.onMoving(false);
    };
    import("./penDeskScene")
      .then(({ createDeskScene }) => {
        if (disposed) return;
        try {
          scene.current = createDeskScene(container, [
            humanLabel.current!,
            botLabel.current!,
          ]);
          container
            .querySelector("canvas")
            ?.addEventListener("webglcontextlost", lost);
          if (latest.current.inputRef)
            latest.current.inputRef.current = scene.current.point;
          scene.current.draw(latest.current);
          setReady(true);
        } catch {
          setFailed(true);
          latest.current.onMoving(false);
        }
      })
      .catch(() => {
        if (!disposed) setFailed(true);
      });
    return () => {
      disposed = true;
      cancelAnimationFrame(raf.current);
      container
        .querySelector("canvas")
        ?.removeEventListener("webglcontextlost", lost);
      scene.current?.dispose();
      scene.current = undefined;
      if (latest.current.inputRef) latest.current.inputRef.current = null;
    };
  }, []);
  useEffect(() => {
    if (!active.current) scene.current?.draw(props);
  }, [props]);
  useLayoutEffect(() => {
    if (
      !ready ||
      failed ||
      !props.motion ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      if (cue.current) cue.current.hidden = true;
      props.onMoving(false);
      return;
    }
    const motion = props.motion;
    active.current = { motion, start: performance.now() };
    scene.current?.draw({ ...latest.current, motion }, 0);
    props.onMoving(true);
    const updateCue = (progress: number) => {
      if (!cue.current) return;
      const text = shotCue(
        motion,
        progress,
        latest.current.humanName,
        latest.current.botName,
      );
      cue.current.hidden = !text;
      if (cue.current.textContent !== text) cue.current.textContent = text;
      cue.current.dataset.phase =
        progress < 0.38 ? "launch" : progress < 0.75 ? "contact" : "settle";
    };
    updateCue(0);
    playSound("flick");
    let contact = false,
      fall = false;
    const step = (now: number) => {
      if (!active.current) return;
      const progress = Math.min(
        1,
        (now - active.current.start) / SHOT_DURATION,
      );
      scene.current?.draw({ ...latest.current, motion }, progress);
      updateCue(progress);
      if (progress >= 0.38 && !contact) {
        contact = true;
        if (motion.hit) playSound("contact");
      }
      if (progress >= 0.75 && !fall) {
        fall = true;
        if (motion.actorOut || motion.targetOut) playSound("fall");
      }
      if (progress < 1) raf.current = requestAnimationFrame(step);
      else {
        active.current = undefined;
        latest.current.onMoving(false);
      }
    };
    raf.current = requestAnimationFrame(step);
    // A background tab may suspend animation frames. Never make input depend
    // on the browser delivering the final frame (or a development hot reload).
    const settle = window.setTimeout(() => {
      cancelAnimationFrame(raf.current);
      active.current = undefined;
      scene.current?.draw(latest.current);
      updateCue(1);
      latest.current.onMoving(false);
    }, SHOT_DURATION + 40);
    return () => {
      window.clearTimeout(settle);
      cancelAnimationFrame(raf.current);
      active.current = undefined;
      updateCue(1);
      latest.current.onMoving(false);
    };
  }, [props.motion, props.onMoving, ready, failed]);

  useEffect(() => {
    if (!failed) return;
    scene.current?.dispose();
    scene.current = undefined;
    if (props.inputRef) props.inputRef.current = null;
  }, [failed, props.inputRef]);
  if (failed)
    return (
      <>
        <PenDeskFallback {...props} />
        <span className="desk-render-notice">
          3D unavailable on this device · simplified view
        </span>
      </>
    );
  return (
    <>
      <div
        className="three-desk"
        ref={host}
        data-renderer="three-webgl"
        data-motion-sequence={props.motion?.sequence}
        role="img"
        aria-label={`3D Pen Fight desk. ${props.humanName}'s pen and ${props.botName ?? "MelaBot"}'s pen.`}
      >
        {!ready && (
          <span className="desk-render-notice">
            Setting your pens on the desk…
          </span>
        )}
        <span className="desk-name human-name" ref={humanLabel}>
          {props.humanName}
          <small>{props.interactive ? "YOUR FLICK" : "PLAYER"}</small>
        </span>
        <span className="desk-name bot-name" ref={botLabel}>
          {props.botName ?? "MelaBot"}
          <small>THE CHALLENGER</small>
        </span>
      </div>
      <span
        className="desk-shot-cue"
        ref={cue}
        hidden
        role="status"
        aria-live="polite"
      />
    </>
  );
}
