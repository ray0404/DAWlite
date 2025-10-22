import React, { useState } from 'react';
import type { Track, Effect, EQSettings, CompressorSettings } from '../types';
import Fader from './ui/Fader';
import Knob from './ui/Knob';

// Reusable KnobControl component for consistent UI
const KnobControl: React.FC<{label: string, value: number, unit: string, onChange: (v: number) => void, min: number, max: number, step: number}> = 
({label, value, unit, onChange, ...props}) => (
    <div className="flex flex-col items-center space-y-1">
        <span className="text-xs text-[var(--color-text-secondary)] font-bold">{label}</span>
        <Knob value={value} onChange={onChange} {...props} />
        <span className="text-xs font-mono bg-black/30 px-1.5 py-0.5 rounded">{value.toFixed(label === 'Freq' ? 0 : 2)}{unit}</span>
    </div>
);

// EQ Effect UI Block
const EQControlBlock: React.FC<{params: EQSettings, onChange: (newParams: EQSettings) => void}> = ({ params, onChange }) => (
    <div className="flex justify-around w-full">
        <KnobControl label="Freq" value={params.frequency} unit="hz" onChange={(v) => onChange({...params, frequency: v})} min={20} max={20000} step={1} />
        <KnobControl label="Gain" value={params.gain} unit="db" onChange={(v) => onChange({...params, gain: v})} min={-12} max={12} step={0.1} />
        <KnobControl label="Q" value={params.q} unit="" onChange={(v) => onChange({...params, q: v})} min={0.1} max={18} step={0.1} />
    </div>
);

// Compressor Effect UI Block
const CompressorControlBlock: React.FC<{params: CompressorSettings, onChange: (newParams: CompressorSettings) => void}> = ({ params, onChange }) => (
     <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-4 w-full">
        <KnobControl label="Thresh" value={params.threshold} unit="db" onChange={(v) => onChange({...params, threshold: v})} min={-100} max={0} step={1} />
        <KnobControl label="Ratio" value={params.ratio} unit=":1" onChange={(v) => onChange({...params, ratio: v})} min={1} max={20} step={0.1} />
        <KnobControl label="Attack" value={params.attack} unit="s" onChange={(v) => onChange({...params, attack: v})} min={0} max={1} step={0.001} />
        <KnobControl label="Release" value={params.release} unit="s" onChange={(v) => onChange({...params, release: v})} min={0} max={1} step={0.01} />
    </div>
);

interface ChannelStripDetailProps {
  track: Track;
  trackColor: string;
  onTrackChange: (track: Track) => void;
  onClose: () => void;
}

const ChannelStripDetail: React.FC<ChannelStripDetailProps> = ({ track, trackColor, onTrackChange, onClose }) => {
  const [draggedEffectId, setDraggedEffectId] = useState<string | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  const handlePropChange = <K extends keyof Track>(prop: K, value: Track[K]) => {
    onTrackChange({ ...track, [prop]: value });
  };
  
  const handleEffectParamsChange = (effectId: string, newParams: any) => {
    const newEffects = track.effects.map(e => e.id === effectId ? { ...e, params: newParams } : e);
    onTrackChange({ ...track, effects: newEffects });
  };
  
  const handleAddEffect = (type: 'EQ' | 'Compressor') => {
      let newEffect: Effect;
      if (type === 'EQ') {
          newEffect = { id: crypto.randomUUID(), type: 'EQ', params: { frequency: 1000, gain: 0, q: 1 } };
      } else {
          newEffect = { id: crypto.randomUUID(), type: 'Compressor', params: { threshold: -24, ratio: 12, attack: 0.003, release: 0.25, knee: 30 } };
      }
      onTrackChange({ ...track, effects: [...track.effects, newEffect] });
  };

  const handleRemoveEffect = (effectId: string) => {
      const newEffects = track.effects.filter(e => e.id !== effectId);
      onTrackChange({ ...track, effects: newEffects });
  };
  
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, effectId: string) => {
      setDraggedEffectId(effectId);
      e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
      e.preventDefault();
      if (index !== dropTargetIndex) {
          setDropTargetIndex(index);
      }
  };
  
  const handleDrop = (dropIndex: number) => {
      if (draggedEffectId === null) return;
      
      const effects = [...track.effects];
      const draggedItemIndex = effects.findIndex(e => e.id === draggedEffectId);
      if (draggedItemIndex === -1 || draggedItemIndex === dropIndex) return;

      const [draggedItem] = effects.splice(draggedItemIndex, 1);
      effects.splice(dropIndex, 0, draggedItem);
      
      onTrackChange({ ...track, effects });
      setDraggedEffectId(null);
      setDropTargetIndex(null);
  };
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center" onClick={onClose}>
      <div 
        className="bg-[var(--color-bg-surface-light)] w-full max-w-4xl rounded-xl shadow-2xl border border-[var(--color-border)] overflow-hidden flex flex-col max-h-[90vh]"
        style={{ borderTop: `6px solid ${trackColor}`}}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)] flex-shrink-0">
          <h2 className="text-xl font-bold text-white">{track.name} - Channel Strip</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 text-[var(--color-text-secondary)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-y-auto">
            <div className="flex flex-col items-center space-y-4 bg-[var(--color-bg-surface)] p-4 rounded-lg md:row-span-2">
                 <h3 className="font-semibold text-center mb-2 text-[var(--color-text-primary)]">Main</h3>
                 <div className="flex items-start justify-center space-x-6">
                    <div className="flex flex-col items-center">
                        <span className="text-xs text-[var(--color-text-secondary)] font-bold mb-2">Volume</span>
                        <Fader value={track.volume} onChange={(v) => handlePropChange('volume', v)} />
                        <span className="text-sm mt-2 font-mono">{ (track.volume > 0.001 ? 20 * Math.log10(track.volume) : -Infinity).toFixed(1) } dB</span>
                    </div>
                    <div className="flex flex-col items-center space-y-4">
                        <KnobControl label="Pan" value={track.pan} unit="" onChange={(v) => handlePropChange('pan', v)} min={-1} max={1} step={0.01} />
                        <div className="flex items-center space-x-2 pt-4">
                           <button onClick={() => handlePropChange('isMuted', !track.isMuted)} className={`w-10 h-10 rounded text-sm font-bold ${track.isMuted ? 'bg-[var(--color-accent-blue)] text-white' : 'bg-gray-600 text-gray-300'} transition-colors`}>Mute</button>
                           <button onClick={() => handlePropChange('isSoloed', !track.isSoloed)} className={`w-10 h-10 rounded text-sm font-bold ${track.isSoloed ? 'bg-[var(--color-accent-yellow)] text-black' : 'bg-gray-600 text-gray-300'} transition-colors`}>Solo</button>
                        </div>
                    </div>
                 </div>
            </div>
            
            <div className="md:col-span-2 bg-[var(--color-bg-surface)] p-4 rounded-lg flex flex-col">
                <h3 className="font-semibold mb-4 text-[var(--color-text-primary)]">Effects Chain</h3>
                <div className="space-y-2 flex-grow" onDragLeave={() => setDropTargetIndex(null)}>
                    {track.effects.map((effect, index) => (
                        <React.Fragment key={effect.id}>
                            <div 
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDrop={() => handleDrop(index)}
                                className={`h-2 transition-all ${dropTargetIndex === index ? 'bg-[var(--color-accent-blue)]' : ''}`}
                            ></div>
                            <div
                                draggable
                                onDragStart={(e) => handleDragStart(e, effect.id)}
                                onDragEnd={() => { setDraggedEffectId(null); setDropTargetIndex(null); }}
                                className={`bg-[var(--color-bg-surface-light)] p-3 rounded-lg border border-transparent transition-all cursor-grab active:cursor-grabbing ${draggedEffectId === effect.id ? 'opacity-50' : ''}`}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 mr-2"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                                        <h4 className="font-bold text-sm text-white">{effect.type}</h4>
                                    </div>
                                    <button onClick={() => handleRemoveEffect(effect.id)} className="p-1 rounded-full hover:bg-white/10 text-gray-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                    </button>
                                </div>
                                {effect.type === 'EQ' && <EQControlBlock params={effect.params} onChange={(p) => handleEffectParamsChange(effect.id, p)} />}
                                {effect.type === 'Compressor' && <CompressorControlBlock params={effect.params} onChange={(p) => handleEffectParamsChange(effect.id, p)} />}
                            </div>
                        </React.Fragment>
                    ))}
                    <div 
                        onDragOver={(e) => handleDragOver(e, track.effects.length)}
                        onDrop={() => handleDrop(track.effects.length)}
                        className={`h-2 transition-all ${dropTargetIndex === track.effects.length ? 'bg-[var(--color-accent-blue)]' : ''}`}
                    ></div>
                </div>
                 <div className="mt-4 pt-4 border-t border-[var(--color-border)] flex items-center justify-center space-x-2">
                    <button onClick={() => handleAddEffect('EQ')} className="text-xs bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded transition-colors">
                        + Add EQ
                    </button>
                    <button onClick={() => handleAddEffect('Compressor')} className="text-xs bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded transition-colors">
                        + Add Compressor
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ChannelStripDetail;
