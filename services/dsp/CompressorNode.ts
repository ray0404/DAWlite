import type { CompressorSettings } from "../../types";

/**
 * Creates a simple compressor effect chain.
 * @param audioContext The global AudioContext.
 * @param settings Initial compressor settings.
 * @returns An object containing the compressor and a makeup gain node.
 */
export const createCompressorNode = (audioContext: AudioContext, settings?: CompressorSettings) => {
  const compressor = audioContext.createDynamicsCompressor();
  
  // Set compressor values from settings or defaults
  compressor.threshold.setValueAtTime(settings?.threshold ?? -24, audioContext.currentTime);
  compressor.knee.setValueAtTime(settings?.knee ?? 30, audioContext.currentTime);
  compressor.ratio.setValueAtTime(settings?.ratio ?? 12, audioContext.currentTime);
  compressor.attack.setValueAtTime(settings?.attack ?? 0.003, audioContext.currentTime);
  compressor.release.setValueAtTime(settings?.release ?? 0.25, audioContext.currentTime);

  // Makeup gain is often needed after compression
  const makeupGain = audioContext.createGain();
  makeupGain.gain.setValueAtTime(1.0, audioContext.currentTime);
  
  return { compressor, makeupGain };
};
