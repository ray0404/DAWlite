
import React, { useState, useEffect, createContext } from 'react';
import DAWContainer from './components/DAWContainer';

// Create a context to hold the AudioContext instance
export const AudioContextContext = createContext<AudioContext | null>(null);

const App: React.FC = () => {
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  useEffect(() => {
    // Initialize AudioContext with a hint for low latency, crucial for DAW applications.
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)({
        latencyHint: 'interactive'
      });
      setAudioContext(context);
    } catch (e) {
      console.error("Web Audio API is not supported in this browser", e);
    }

    return () => {
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AudioContextContext.Provider value={audioContext}>
      <div className="min-h-screen bg-[var(--color-bg-base)] text-[var(--color-text-primary)] font-sans">
        {audioContext ? (
          <DAWContainer />
        ) : (
          <div className="flex items-center justify-center h-screen text-center text-red-400">
            <div>
              <p className="text-xl">Loading Audio Engine...</p>
              <p>If this message persists, your browser may not support the Web Audio API.</p>
            </div>
          </div>
        )}
      </div>
    </AudioContextContext.Provider>
  );
};

export default App;
