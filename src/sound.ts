/**
 * Mela's sound is entirely synthesised — there is not a single audio asset in
 * the bundle. Mela is a QR-code-and-a-phone game played in loud rooms at
 * demos, and shipping a folder of .mp3s would cost more bytes than the whole
 * app. Everything below is a few oscillators and a burst of noise.
 *
 * There are exactly six sounds, at the six moments where the game state
 * changes in a way the player already feels in their thumb: the flick, the
 * hit, the wobble, the fall, the six, the out. Nothing narrates, nothing
 * decorates, nothing plays on a tick or a hover. The vocabulary is a school
 * desk — pen taps, paper, wood — not an arcade.
 */

export type MelaSound = "flick" | "contact" | "teeter" | "fall" | "six" | "out";

const MUTE_KEY = "mela.sound.muted";

/**
 * A ceiling on every voice in the file. Phones at a demo are held close to the
 * face with the volume already up for the room; sound here is a confirmation,
 * not an announcement.
 */
const MASTER_GAIN = 0.14;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
/** Once the browser has told us audio is impossible, stop trying entirely. */
let audioUnavailable = false;
let noise: AudioBuffer | null = null;

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/**
 * Reduced-motion is the closest signal a browser gives us for "this person
 * does not want to be startled", so it decides the default. An explicit choice
 * stored by the player always wins over it.
 */
let muted: boolean = (() => {
  try {
    const stored = localStorage.getItem(MUTE_KEY);
    if (stored === "true") return true;
    if (stored === "false") return false;
  } catch {
    // Private mode / blocked storage: fall through to the motion preference.
  }
  return prefersReducedMotion();
})();

export function isMuted(): boolean {
  return muted;
}

export function setMuted(next: boolean): void {
  muted = next;
  try {
    localStorage.setItem(MUTE_KEY, String(next));
  } catch {
    // Preference simply will not survive a reload. Not worth breaking over.
  }
  if (next && ctx) {
    // Cut anything mid-flight so muting is instant rather than "after this tail".
    try {
      master?.gain.cancelScheduledValues(ctx.currentTime);
      master?.gain.setValueAtTime(0, ctx.currentTime);
    } catch {
      // Ignore — the node may already be gone.
    }
  } else if (!next && ctx && master) {
    try {
      master.gain.setValueAtTime(MASTER_GAIN, ctx.currentTime);
    } catch {
      // Ignore.
    }
  }
}

export function toggleMuted(): boolean {
  setMuted(!muted);
  return muted;
}

type AudioContextCtor = new () => AudioContext;

/**
 * Built on the first play() and never before: browsers refuse to start audio
 * outside a user gesture, and a context created at module load would land in
 * a suspended state we would then have to babysit. Returns null forever once
 * the platform has shown it cannot do this.
 */
function getContext(): AudioContext | null {
  if (audioUnavailable) return null;
  if (ctx) {
    // Backgrounding a tab (or an iOS interruption) suspends the context; nudge
    // it awake on the next gesture-driven sound rather than going silent.
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
    return ctx;
  }
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: AudioContextCtor })
        .webkitAudioContext;
    if (!Ctor) {
      audioUnavailable = true;
      return null;
    }
    const created = new Ctor();
    const bus = created.createGain();
    bus.gain.value = muted ? 0 : MASTER_GAIN;
    bus.connect(created.destination);
    ctx = created;
    master = bus;
    if (created.state === "suspended") void created.resume().catch(() => {});
    return ctx;
  } catch {
    audioUnavailable = true;
    return null;
  }
}

/** One second of white noise, reused by every sound that needs a transient. */
function getNoise(ac: AudioContext): AudioBuffer {
  if (noise && noise.sampleRate === ac.sampleRate) return noise;
  const buf = ac.createBuffer(1, Math.floor(ac.sampleRate), ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  noise = buf;
  return buf;
}

interface ToneOptions {
  type?: OscillatorType;
  /** Starting frequency in Hz. */
  from: number;
  /** Optional glide target; omit for a steady pitch. */
  to?: number;
  /** Peak gain, relative to the master bus. */
  gain: number;
  start: number;
  duration: number;
  /** Fraction of the duration spent rising to peak. Percussive = tiny. */
  attack?: number;
  /** Exponential glide reads as a physical pitch drop; linear reads as a slide. */
  glide?: "exponential" | "linear";
  /** Optional low-pass, to take the buzz off a saw or square. */
  lowpass?: number;
  /** Optional vibrato: [depth in Hz, rate in Hz]. */
  wobble?: [number, number];
}

function tone(ac: AudioContext, bus: GainNode, o: ToneOptions): void {
  const osc = ac.createOscillator();
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(o.from, o.start);
  if (o.to !== undefined) {
    // Exponential ramps cannot pass through or reach zero.
    const target = Math.max(o.to, 0.0001);
    if (o.glide === "linear") {
      osc.frequency.linearRampToValueAtTime(target, o.start + o.duration);
    } else {
      osc.frequency.exponentialRampToValueAtTime(target, o.start + o.duration);
    }
  }

  if (o.wobble) {
    const [depth, rate] = o.wobble;
    const lfo = ac.createOscillator();
    const lfoGain = ac.createGain();
    lfo.frequency.value = rate;
    lfoGain.gain.value = depth;
    lfo.connect(lfoGain).connect(osc.frequency);
    lfo.start(o.start);
    lfo.stop(o.start + o.duration);
  }

  const env = ac.createGain();
  const attack = Math.max((o.attack ?? 0.02) * o.duration, 0.002);
  env.gain.setValueAtTime(0.0001, o.start);
  env.gain.linearRampToValueAtTime(o.gain, o.start + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, o.start + o.duration);

  let tail: AudioNode = env;
  if (o.lowpass !== undefined) {
    const filter = ac.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = o.lowpass;
    env.connect(filter);
    tail = filter;
  }

  osc.connect(env);
  tail.connect(bus);
  osc.start(o.start);
  osc.stop(o.start + o.duration + 0.02);
}

interface BurstOptions {
  gain: number;
  start: number;
  duration: number;
  /** Band-pass centre. Low = wood/thud, high = plastic/click. */
  centre: number;
  /** Higher Q is a narrower, more "tuned" tick. */
  q?: number;
  /** Optional band sweep, for noise that falls with the object making it. */
  centreTo?: number;
}

/** A filtered noise transient — the physical "material" of a hit. */
function burst(ac: AudioContext, bus: GainNode, o: BurstOptions): void {
  const src = ac.createBufferSource();
  src.buffer = getNoise(ac);
  src.playbackRate.value = 1;

  const band = ac.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = o.q ?? 1;
  band.frequency.setValueAtTime(o.centre, o.start);
  if (o.centreTo !== undefined) {
    band.frequency.exponentialRampToValueAtTime(
      Math.max(o.centreTo, 20),
      o.start + o.duration,
    );
  }

  const env = ac.createGain();
  env.gain.setValueAtTime(0.0001, o.start);
  env.gain.linearRampToValueAtTime(o.gain, o.start + 0.002);
  env.gain.exponentialRampToValueAtTime(0.0001, o.start + o.duration);

  src.connect(band).connect(env).connect(bus);
  // Start at a random offset so repeated taps are never bit-identical.
  src.start(o.start, Math.random() * 0.5, o.duration + 0.05);
  src.stop(o.start + o.duration + 0.05);
}

type Voice = (ac: AudioContext, bus: GainNode, t: number) => void;

const VOICES: Record<MelaSound, Voice> = {
  /**
   * FLICK — the moment your finger leaves the pen. A nail-on-plastic tick with
   * the pitch collapsing under it, so it reads as energy leaving your hand and
   * entering the pen. Dry and over in 70ms; you flick a lot, and anything with
   * a tail would turn a rally into a rattle.
   */
  flick(ac, bus, t) {
    burst(ac, bus, {
      start: t,
      duration: 0.045,
      gain: 0.5,
      centre: 2600,
      centreTo: 1100,
      q: 1.1,
    });
    tone(ac, bus, {
      type: "triangle",
      from: 620,
      to: 180,
      gain: 0.35,
      start: t,
      duration: 0.07,
      attack: 0.01,
    });
  },

  /**
   * CONTACT — plastic striking plastic. Brighter, harder and a touch louder
   * than the flick, with a high square blip on top so a hit can never be
   * mistaken for the flick that caused it a fraction of a second earlier.
   * That confusability is the only real design risk in the Pen Fight set.
   */
  contact(ac, bus, t) {
    burst(ac, bus, {
      start: t,
      duration: 0.03,
      gain: 0.75,
      centre: 4200,
      centreTo: 2400,
      q: 0.8,
    });
    tone(ac, bus, {
      type: "square",
      from: 1500,
      to: 900,
      gain: 0.22,
      start: t,
      duration: 0.05,
      attack: 0.005,
      lowpass: 5200,
    });
    // A short body under the click: the pens have mass, not just surfaces.
    tone(ac, bus, {
      type: "sine",
      from: 340,
      to: 220,
      gain: 0.3,
      start: t,
      duration: 0.11,
      attack: 0.01,
    });
  },

  /**
   * TEETER — the pen balanced on the desk edge, and the only sound in the set
   * that is a sustained tone rather than a hit. Detuned sines beating against
   * each other and a slow vibrato give it a rocking, seasick instability: it
   * has not fallen yet, so it must feel unresolved rather than final.
   */
  teeter(ac, bus, t) {
    tone(ac, bus, {
      type: "sine",
      from: 430,
      to: 395,
      gain: 0.18,
      start: t,
      duration: 0.5,
      attack: 0.14,
      glide: "linear",
      wobble: [16, 7],
    });
    tone(ac, bus, {
      type: "sine",
      from: 437,
      to: 402,
      gain: 0.15,
      start: t,
      duration: 0.5,
      attack: 0.18,
      glide: "linear",
      wobble: [13, 5.5],
    });
    // A faint scrape of the pen shifting on the laminate.
    burst(ac, bus, {
      start: t + 0.02,
      duration: 0.28,
      gain: 0.07,
      centre: 1800,
      centreTo: 900,
      q: 2.4,
    });
  },

  /**
   * FALL — gravity, then the floor. A pitch that drops away for 200ms and
   * lands on a dull low-passed knock, so the ear hears the drop and the
   * arrival as one gesture. This is the losing sound in Pen Fight, so it is
   * flat and unmusical on purpose.
   */
  fall(ac, bus, t) {
    tone(ac, bus, {
      type: "triangle",
      from: 300,
      to: 62,
      gain: 0.4,
      start: t,
      duration: 0.2,
      attack: 0.04,
      lowpass: 1400,
    });
    // The landing: wide low noise, no ring, no pitch.
    burst(ac, bus, {
      start: t + 0.19,
      duration: 0.13,
      gain: 0.55,
      centre: 240,
      centreTo: 110,
      q: 0.7,
    });
    tone(ac, bus, {
      type: "sine",
      from: 95,
      to: 55,
      gain: 0.45,
      start: t + 0.19,
      duration: 0.18,
      attack: 0.01,
    });
  },

  /**
   * SIX — bright and celebratory, but deliberately short. A rising major
   * arpeggio (C–E–G–C) of clean sines, roughly 40ms apart, done in 300ms. A
   * six happens often enough in Book Cricket that a long fanfare would wear
   * out inside one over; the reward has to land and get out of the way.
   */
  six(ac, bus, t) {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((hz, i) => {
      tone(ac, bus, {
        type: "sine",
        from: hz,
        gain: 0.24 - i * 0.02,
        start: t + i * 0.042,
        duration: 0.2,
        attack: 0.03,
      });
    });
    // A small bat-on-ball tick at the front so the arpeggio has a cause.
    burst(ac, bus, {
      start: t,
      duration: 0.035,
      gain: 0.35,
      centre: 3000,
      centreTo: 1600,
      q: 1,
    });
  },

  /**
   * OUT — the book closing on you. One low, flat, slightly falling thud with
   * no harmony and no sparkle: the deliberate opposite of the six, which is
   * the only sound it will ever be compared against. Disappointment, not
   * punishment — it stays quiet.
   */
  out(ac, bus, t) {
    tone(ac, bus, {
      type: "sine",
      from: 160,
      to: 96,
      gain: 0.5,
      start: t,
      duration: 0.34,
      attack: 0.02,
      glide: "linear",
    });
    tone(ac, bus, {
      type: "triangle",
      from: 118,
      to: 80,
      gain: 0.22,
      start: t,
      duration: 0.3,
      attack: 0.03,
      lowpass: 700,
      glide: "linear",
    });
    // Paper-ish thump: the book shutting, no metallic edge.
    burst(ac, bus, {
      start: t,
      duration: 0.1,
      gain: 0.3,
      centre: 520,
      centreTo: 200,
      q: 0.9,
    });
  },
};

/**
 * Fire-and-forget. Never throws: a browser that blocks audio, a codec-less
 * environment or a lost context all end as silence, because a missing sound
 * effect must never take a game of Pen Fight with it.
 */
export function playSound(name: MelaSound): void {
  if (muted) return;
  try {
    const ac = getContext();
    if (!ac || !master) return;
    if (ac.state !== "running") return; // Gesture hasn't unlocked audio yet.
    const voice = VOICES[name];
    if (!voice) return;
    // A hair in the future so every node in a voice shares one start time.
    voice(ac, master, ac.currentTime + 0.005);
  } catch {
    // Deliberately silent.
  }
}
