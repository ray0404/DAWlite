
/**
 * A volume meter processor that calculates the root mean square (RMS) of incoming audio
 * and posts the value back to the main thread at a regular interval.
 */
class VolumeMeterProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    // Default to 100ms update interval if not specified
    this._updateIntervalInMS = options?.processorOptions?.updateIntervalInMS || 100;
    this._nextUpdateFrame = this._updateIntervalInMS;
    
    this.port.onmessage = event => {
      if (event.data.updateIntervalInMS) {
        this._updateIntervalInMS = event.data.updateIntervalInMS;
      }
    };
  }

  /**
   * Calculate the number of frames based on the sample rate, 
   * which is a global variable in the AudioWorklet scope.
   */
  get intervalInFrames() {
    return this._updateIntervalInMS / 1000 * sampleRate;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];

    // The processor can handle multiple channels, but we only need one for a mono RMS value.
    if (input && input.length > 0) {
      const samples = input[0];
      let sum = 0;
      
      // Calculate the sum of squares
      for (let i = 0; i < samples.length; ++i) {
        sum += samples[i] * samples[i];
      }
      
      const rms = Math.sqrt(sum / samples.length);

      // Post the RMS value back to the main thread if the update interval has passed.
      this._nextUpdateFrame -= samples.length;
      if (this._nextUpdateFrame < 0) {
        this._nextUpdateFrame += this.intervalInFrames;
        this.port.postMessage({ rms });
      }
    }
    
    // Return true to keep the processor alive.
    return true;
  }
}

registerProcessor('volume-meter-processor', VolumeMeterProcessor);
