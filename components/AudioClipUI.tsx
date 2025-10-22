import React, { useRef, useEffect } from 'react';
import type { AudioClip } from '../types';
import Waveform from './ui/Waveform';

type ActionStartHandler = (
    type: 'move' | 'trim-start' | 'trim-end', 
    clip: AudioClip, 
    trackId: number, 
    e: React.MouseEvent | React.TouchEvent
) => void;

interface AudioClipUIProps {
    clip: AudioClip;
    trackId: number;
    pixelsPerSecond: number;
    audioBuffer?: AudioBuffer;
    trackColor: string;
    onActionStart: ActionStartHandler;
    onOpenContextMenu: (x: number, y: number, clip: AudioClip, trackId: number) => void;
}

const AudioClipUI: React.FC<AudioClipUIProps> = ({ clip, trackId, pixelsPerSecond, audioBuffer, trackColor, onActionStart, onOpenContextMenu }) => {
    const longPressTimeout = useRef<number | null>(null);

    const handleInteractionStart = (e: React.MouseEvent | React.TouchEvent, type: 'move' | 'trim-start' | 'trim-end') => {
        e.stopPropagation(); // Prevent track deselection
        
        // Context Menu via Long Press
        if ('touches' in e) {
            longPressTimeout.current = window.setTimeout(() => {
                const touch = e.touches[0];
                onOpenContextMenu(touch.clientX, touch.clientY, clip, trackId);
                longPressTimeout.current = null;
            }, 500); // 500ms for long press
        }
        
        onActionStart(type, clip, trackId, e);
    };

    const clearLongPress = () => {
        if (longPressTimeout.current) {
            clearTimeout(longPressTimeout.current);
            longPressTimeout.current = null;
        }
    };
    
    // Clear timeout on move or release to prevent context menu after dragging
    useEffect(() => {
        const handleMove = () => clearLongPress();
        window.addEventListener('touchmove', handleMove);
        window.addEventListener('touchend', handleMove);
        return () => {
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleMove);
        };
    }, []);

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onOpenContextMenu(e.clientX, e.clientY, clip, trackId);
    };

    return (
        <div 
            onMouseDown={(e) => handleInteractionStart(e, 'move')}
            onTouchStart={(e) => handleInteractionStart(e, 'move')}
            onContextMenu={handleContextMenu}
            className={`absolute top-1/2 -translate-y-1/2 h-24 rounded-md shadow-lg border flex items-center justify-start p-0.5 cursor-grab active:cursor-grabbing overflow-hidden group
                ${clip.isSelected ? 'border-yellow-400 border-2' : 'border-black/50'}`}
            style={{ 
                left: `${clip.startTime * pixelsPerSecond}px`,
                width: `${clip.duration * pixelsPerSecond}px`,
                background: `linear-gradient(135deg, ${trackColor}40, ${trackColor}80)`
            }}
        >
            {audioBuffer && (
                <Waveform buffer={audioBuffer} color={trackColor} startOffset={clip.startOffset} duration={clip.duration} />
            )}
            <span className="absolute top-1 left-2 text-white text-xs font-medium truncate pointer-events-none drop-shadow-md">{clip.name}</span>
            
            {/* Trim Handles */}
            <div 
                onMouseDown={(e) => handleInteractionStart(e, 'trim-start')}
                onTouchStart={(e) => handleInteractionStart(e, 'trim-start')}
                className="absolute left-0 top-0 bottom-0 w-6 cursor-ew-resize group-hover:bg-white/20 transition-colors"
                title="Trim start"
            ></div>
             <div 
                onMouseDown={(e) => handleInteractionStart(e, 'trim-end')}
                onTouchStart={(e) => handleInteractionStart(e, 'trim-end')}
                className="absolute right-0 top-0 bottom-0 w-6 cursor-ew-resize group-hover:bg-white/20 transition-colors"
                title="Trim end"
            ></div>
        </div>
    );
};

export default React.memo(AudioClipUI);