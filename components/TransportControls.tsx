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
    onZoomChange: (newZoom: number) => void;
    onPanLeft: () => void;
    onPanRight: () => void;
    onNudgeLeft: () => void;
    onNudgeRight: () => void;
}

const TransportControls: React.FC<TransportControlsProps> = ({ 
    isPlaying, isRecording, onPlay, onStop, onRecord, onReturnToZero, 
    currentTime, isLooping, onToggleLoop, zoomLevel, onZoomIn, onZoomOut,
    onZoomChange, onPanLeft, onPanRight, onNudgeLeft, onNudgeRight
}) => {
    // Use a logarithmic scale for the slider to provide more intuitive control
    const zoomMinLog = Math.log(0.1);
    const zoomMaxLog = Math.log(32);

    return (
        <div className="flex items-center justify-between p-2 bg-[var(--color-bg-transport)] border-b-2 border-[var(--color-border)] shadow-md flex-shrink-0 flex-wrap gap-2 h-auto md:h-16">
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
            <div className="flex flex-col items-center flex-grow">
                <div className="text-3xl font-mono bg-black px-4 py-1 rounded-md border border-gray-900 shadow-inner text-green-400">
                    {currentTime.toFixed(2)}
                </div>
                 <div className="hidden md:flex items-center space-x-1 mt-1">
                    <button onClick={onNudgeLeft} title="Nudge Left (Alt+Left)" className="px-1 rounded text-xs text-gray-400 hover:bg-white/10">«</button>
                    <span className="text-xs text-gray-500">NUDGE</span>
                    <button onClick={onNudgeRight} title="Nudge Right (Alt+Right)" className="px-1 rounded text-xs text-gray-400 hover:bg-white/10">»</button>
                </div>
            </div>
            <div className="items-center space-x-2 hidden md:flex">
                 <button onClick={onPanLeft} title="Pan Left (←)" className="p-2 rounded hover:bg-white/10 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                 </button>
                 <button onClick={onZoomOut} title="Zoom Out (-)" className="p-2 rounded hover:bg-white/10 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                 </button>
                 <input
                    type="range"
                    min={zoomMinLog}
                    max={zoomMaxLog}
                    step="any"
                    value={Math.log(zoomLevel)}
                    onChange={(e) => onZoomChange(Math.exp(parseFloat(e.target.value)))}
                    className="w-24 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-gray-300 [&::-webkit-slider-thumb]:rounded-full"
                    aria-label="Zoom slider"
                 />
                 <button onClick={onZoomIn} title="Zoom In (+)" className="p-2 rounded hover:bg-white/10 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                 </button>
                 <button onClick={onPanRight} title="Pan Right (→)" className="p-2 rounded hover:bg-white/10 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                 </button>
            </div>
             <div className="flex md:hidden text-xs text-gray-400 font-sans">
                 Pinch to zoom
            </div>
        </div>
    );
};

export default TransportControls;