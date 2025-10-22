
import React from 'react';

interface MeterProps {
  level: number; // Expects a linear RMS value, typically 0 to 1
}

const Meter: React.FC<MeterProps> = ({ level }) => {
  // Convert linear RMS value to dBFS. 0 RMS is -Infinity dB.
  const db = level > 0.00001 ? 20 * Math.log10(level) : -100;
  
  // Map a usable dB range (-60dB to 0dB) to a percentage for the meter's height
  const meterHeight = Math.max(0, Math.min(100, (db + 60) / 60 * 100));

  const isClipping = db > -0.1;

  return (
    <div className="relative w-5 h-48 bg-black/50 rounded overflow-hidden border border-gray-900 flex flex-col-reverse shadow-inner">
      <div 
        className="bg-gradient-to-t from-green-500 via-yellow-500 to-red-600 transition-[height] duration-50 ease-linear" 
        style={{ height: `${meterHeight}%` }}
      ></div>
      {/* A simple clipping indicator */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-red-600 transition-opacity duration-100 ${isClipping ? 'opacity-100' : 'opacity-0'}`}></div>
    </div>
  );
};

export default React.memo(Meter);
