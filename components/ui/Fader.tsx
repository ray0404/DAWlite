
import React from 'react';

interface FaderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

const Fader: React.FC<FaderProps> = ({ value, onChange, min = 0, max = 1, step = 0.01 }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseFloat(e.target.value));
  };

  return (
    <div className="relative w-8 h-48 flex justify-center">
      {/* Fader Track */}
      <div className="absolute top-0 bottom-0 w-1 bg-gray-900 rounded-full"></div>
      
      {/* Fader Input */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        className="w-48 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 appearance-none bg-transparent cursor-pointer"
        style={{ margin: 0 }}
      />
      
      {/* Fader Thumb/Handle */}
      <div 
        className="absolute w-8 h-4 bg-gray-400 border-t-2 border-gray-200 rounded-sm pointer-events-none"
        style={{ 
          bottom: `${((value - min) / (max - min)) * 90}%` // 90% to account for handle height
        }}
      >
        <div className="w-full h-1 bg-gray-800"></div>
      </div>
    </div>
  );
};

export default Fader;
