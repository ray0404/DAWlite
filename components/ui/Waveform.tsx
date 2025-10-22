import React, { useRef, useEffect } from 'react';

interface WaveformProps {
  buffer: AudioBuffer;
  color: string;
  startOffset: number; // in seconds
  duration: number; // in seconds
}

const Waveform: React.FC<WaveformProps> = ({ buffer, color, startOffset, duration }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !buffer) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    
    const channelData = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    
    const startIndex = Math.floor(startOffset * sampleRate);
    const endIndex = Math.floor((startOffset + duration) * sampleRate);
    const visibleSamples = endIndex - startIndex;

    if (visibleSamples <= 0) {
      ctx.clearRect(0, 0, width, height);
      return;
    }

    const step = Math.ceil(visibleSamples / width);
    const amp = height / 2;

    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 1;
    ctx.strokeStyle = color;
    ctx.beginPath();
    
    // Draw center line
    ctx.moveTo(0, amp);
    ctx.lineTo(width, amp);
    ctx.stroke();
    
    ctx.beginPath();

    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;
      const sampleIndexStart = startIndex + (i * step);

      for (let j = 0; j < step; j++) {
        const sampleIndex = sampleIndexStart + j;
        if (sampleIndex < endIndex) {
          const datum = channelData[sampleIndex];
          if (datum < min) min = datum;
          if (datum > max) max = datum;
        }
      }
      
      const yMin = (1 + min) * amp;
      const yMax = (1 + max) * amp;

      ctx.moveTo(i, yMin);
      ctx.lineTo(i, yMax);
    }
    ctx.stroke();

  }, [buffer, color, startOffset, duration]);


  return (
    <canvas 
        ref={canvasRef} 
        className="w-full h-full absolute inset-0 opacity-70"
    ></canvas>
  );
};

export default Waveform;