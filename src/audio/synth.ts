/**
 * Low-level Web Audio helpers. Sounds are built only from oscillators,
 * noise buffers, gains, filters and convolvers. No audio files.
 */

export interface Envelope {
  /** Seconds to rise from 0 to `peak`. */
  attack: number;
  /** Gain reached at the end of the attack. */
  peak: number;
  /** Seconds to fall from `peak` back to 0. */
  decay: number;
}

export function createOscillator(
  ctx: AudioContext,
  type: OscillatorType,
  frequency: number,
): OscillatorNode {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = frequency;
  return osc;
}

export function createGain(ctx: AudioContext, value: number): GainNode {
  const gain = ctx.createGain();
  gain.gain.value = value;
  return gain;
}

export function createFilter(
  ctx: AudioContext,
  type: BiquadFilterType,
  frequency: number,
  q = 1,
): BiquadFilterNode {
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = frequency;
  filter.Q.value = q;
  return filter;
}

/** A white-noise source lasting `duration` seconds. Caller connects and starts it. */
export function createNoise(ctx: AudioContext, duration: number): AudioBufferSourceNode {
  const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  return source;
}

/** A decaying-noise impulse response for a ConvolverNode (cheap synthetic reverb). */
export function createImpulse(ctx: AudioContext, duration: number, decayPower = 2): ConvolverNode {
  const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decayPower);
  }
  const convolver = ctx.createConvolver();
  convolver.buffer = buffer;
  return convolver;
}

/**
 * Schedules a linear attack/decay envelope on an AudioParam.
 * Returns the time at which the envelope reaches 0.
 */
export function scheduleEnvelope(param: AudioParam, startTime: number, env: Envelope): number {
  const peakTime = startTime + env.attack;
  const endTime = peakTime + env.decay;
  param.setValueAtTime(0, startTime);
  param.linearRampToValueAtTime(env.peak, peakTime);
  param.linearRampToValueAtTime(0, endTime);
  return endTime;
}
