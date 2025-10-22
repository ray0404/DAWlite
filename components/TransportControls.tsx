import React from 'react';

interface TransportControlsProps {
    isPlaying: boolean;
    isRecording: boolean;
    isLooping: boolean;
    onPlay: () => void;
    onStop: () => void;
    onRecord: () => void;
    onReturnToZero: () => void;
    onToggleLoop: () => void;
    currentTime: number;
    zoomLevel: number;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onNudgeLeft: () => void;
    onNudgeRight: () => void;
}

const TransportControls: React.FC<TransportControlsProps> = ({ 
    isPlaying, isRecording, onPlay, onStop, onRecord, onReturnToZero, 
    currentTime, isLooping, onToggleLoop, zoomLevel, onZoomIn, onZoomOut,
    onNudgeLeft, onNudgeRight
}) => {
    return (
        <div className="flex items-center justify-between p-2 bg-[var(--color-bg-transport)] border-b-2 border-[var(--color-border)] shadow-md flex-shrink-0 h-16">
            <div className="flex items-center space-x-1">
                <button onClick={onReturnToZero} title="Return to Zero (Enter)" className="p-2 rounded hover:bg-white/10 transition-colors">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4L4 12L12 20V14H18V10H12V4ZM20 4V20H18V4H20Z"/></svg>
                </button>
                <button onClick={onStop} title="Stop (Space)" className="p-2 rounded hover:bg-white/10 transition-colors" disabled={!isPlaying}>
                     <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" /></svg>
                </button>
                 <button onClick={onPlay} title="Play (Space)" className="p-2 rounded hover:bg-white/10 transition-colors" disabled={isPlaying}>
                     <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5V19L19 12L8 5Z" /></svg>
                </button>
                <button onClick={onRecord} title="Record (R)" className={`p-2 rounded hover:bg-white/10 transition-colors ${isRecording ? 'text-[var(--color-accent-red)]' : ''}`} disabled={isPlaying && !isRecording}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="6" /></svg>
                </button>
                 <button onClick={onToggleLoop} title="Toggle Loop (L)" className={`p-2 rounded transition-colors ${isLooping ? 'bg-blue-500/50 text-white' : 'hover:bg-white/10'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                </button>
            </div>
            <div className="flex flex-col items-center">
                <div className="text-3xl font-mono bg-black px-4 py-1 rounded-md border border-gray-900 shadow-inner text-green-400">
                    {currentTime.toFixed(2)}
                </div>
                 <div className="flex items-center space-x-1 mt-1">
                    <button onClick={onNudgeLeft} title="Nudge Left (Alt+Left)" className="px-1 rounded text-xs text-gray-400 hover:bg-white/10">«</button>
                    <span className="text-xs text-gray-500">NUDGE</span>
                    <button onClick={onNudgeRight} title="Nudge Right (Alt+Right)" className="px-1 rounded text-xs text-gray-400 hover:bg-white/10">»</button>
                </div>
            </div>
            <div className="flex items-center space-x-1">
                 <button onClick={onZoomOut} title="Zoom Out" className="p-2 rounded hover:bg-white/10 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                 </button>
                 <span className="text-sm font-mono text-gray-400 w-12 text-center">x{zoomLevel.toFixed(1)}</span>
                 <button onClick={onZoomIn} title="Zoom In" className="p-2 rounded hover:bg-white/10 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                 </button>
            </div>
        </div>
    );
};

export default TransportControls;
