import type { EQSettings } from "../../types";

/**
 * Creates a simple single-band parametric EQ effect.
 * @param audioContext The global AudioContext.
 * @param settings Initial EQ settings.
 * @returns An object containing the configured BiquadFilterNode.
 */
export const createEQNode = (audioContext: AudioContext, settings?: EQSettings) => {
  const eqNode = audioContext.createBiquadFilter();

  eqNode.type = 'peaking';
  
  // Set values from settings or defaults
  eqNode.frequency.setValueAtTime(settings?.frequency ?? 1000, audioContext.currentTime);
  eqNode.gain.setValueAtTime(settings?.gain ?? 0, audioContext.currentTime);
  eqNode.Q.setValueAtTime(settings?.q ?? 1.0, audioContext.currentTime);

  return { eqNode };
};
