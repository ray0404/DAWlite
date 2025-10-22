
import React, { useState, useRef, useCallback, useEffect } from 'react';

interface KnobProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
}

const Knob: React.FC<KnobProps> = ({ value, onChange, min = 0, max = 100, step = 1 }) => {
    const knobRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const getRotationFromValue = useCallback((val: number) => {
        const range = max - min;
        const percentage = (val - min) / range;
        // Map value to a -135 to 135 degree range
        return percentage * 270 - 135;
    }, [min, max]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging || !knobRef.current) return;
        
        const rect = knobRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
        
        let rotation = angle + 90; // Adjust to start from top
        if (rotation < -135) rotation = -135;
        if (rotation > 135) rotation = 135;

        const percentage = (rotation + 135) / 270;
        const range = max - min;
        let newValue = min + percentage * range;
        
        // Snap to step
        newValue = Math.round(newValue / step) * step;

        // Clamp value
        newValue = Math.max(min, Math.min(max, newValue));

        onChange(newValue);

    }, [isDragging, min, max, step, onChange]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, handleMouseMove, handleMouseUp]);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };
    
    const rotation = getRotationFromValue(value);

    return (
        <div 
            ref={knobRef}
            onMouseDown={handleMouseDown}
            className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center cursor-pointer select-none relative border-2 border-gray-900"
            style={{ transform: `rotate(${rotation}deg)`}}
        >
            <div className="w-1 h-4 bg-gray-300 rounded-full absolute top-1"></div>
        </div>
    );
};

export default Knob;
