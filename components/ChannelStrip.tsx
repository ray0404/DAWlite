import React, { useContext, useEffect, useRef, useState } from 'react';
import { AudioContextContext } from '../App';
import { createCompressorNode } from '../services/dsp/CompressorNode';
import { createEQNode } from '../services/dsp/EQNode';
import { createMeterNode } from '../services/dsp/MeterNode';
import type { Track, AudioClip } from '../types';
import Fader from './ui/Fader';
import Knob from './ui/Knob';
import AudioClipUI from './AudioClipUI';
import Meter from './ui/Meter';

type EditingActionStartHandler = (
    type: 'move' | 'trim-start' | 'trim-end', 
    clip: AudioClip, 
    trackId: number, 
    e: React.MouseEvent | React.TouchEvent
) => void;

interface ChannelStripProps {
  track: Track;
  trackColor: string;
  onTrackChange: (track: Track) => void;
  onOpenDetail: () => void;
  onRemoveTrack: () => void;
  onSelectClip: (clipId: string, trackId: number) => void;
  isAnyTrackSoloed: boolean;
  sourceNodes: Map<string, AudioBufferSourceNode>;
  pixelsPerSecond: number;
  runtimeAudioBuffers: Map<string, AudioBuffer>;
  onClipActionStart: EditingActionStartHandler;
  onOpenContextMenu: (x: number, y: number, clip: AudioClip, trackId: number) => void;
}

const RAMP_TIME = 0.01;

const ChannelStrip: React.FC<ChannelStripProps> = (props) => {
  const { 
    track, trackColor, onTrackChange, onOpenDetail, onRemoveTrack, sourceNodes, 
    pixelsPerSecond, runtimeAudioBuffers, onSelectClip, isAnyTrackSoloed,
    onClipActionStart, onOpenContextMenu
  } = props;
  
  const audioContext = useContext(AudioContextContext);
  const gainNodeRef = useRef<GainNode | null>(null);
  const pannerNodeRef = useRef<StereoPannerNode | null>(null);
  const effectNodesRef = useRef<Map<string, AudioNode>>(new Map());
  const meterNodeRef = useRef<AudioWorkletNode | null>(null);
  const [meterLevel, setMeterLevel] = useState(0);

  // Initial setup for gain, panner, and meter nodes
  useEffect(() => {
    if (!audioContext) return;
    gainNodeRef.current = audioContext.createGain();
    pannerNodeRef.current = audioContext.createStereoPanner();
    let meterIsActive = true;
    createMeterNode(audioContext, (rms) => {
        if (meterIsActive) setMeterLevel(prev => Math.max(rms, prev * 0.9));
    }).then(node => {
        if (meterIsActive && node) {
            meterNodeRef.current = node;
            if (gainNodeRef.current) gainNodeRef.current.connect(node);
        }
    });
    return () => {
      meterIsActive = false;
      gainNodeRef.current?.disconnect();
      pannerNodeRef.current?.disconnect();
      meterNodeRef.current?.port.close();
      meterNodeRef.current?.disconnect();
    };
  }, [audioContext]);

  // Connect audio graph for each clip
  useEffect(() => {
    if (!audioContext || !pannerNodeRef.current || !gainNodeRef.current) return;
    
    sourceNodes.forEach((source, clipId) => {
        if (track.clips.some(c => c.clipId === clipId)) try { source.disconnect(); } catch(e) {}
    });
    effectNodesRef.current.forEach(node => { try { node.disconnect() } catch(e) {} });

    const newEffectNodes = new Map<string, AudioNode>();
    let lastNodeForChain: AudioNode = pannerNodeRef.current;

    track.effects.slice().reverse().forEach(effect => {
      let node: AudioNode | undefined;
      if (effect.type === 'EQ') node = createEQNode(audioContext, effect.params).eqNode;
      else if (effect.type === 'Compressor') node = createCompressorNode(audioContext, effect.params).compressor;
      
      if (node) {
          node.connect(lastNodeForChain);
          lastNodeForChain = node;
          newEffectNodes.set(effect.id, node);
      }
    });

    track.clips.forEach(clip => {
        const sourceNode = sourceNodes.get(clip.clipId);
        if(sourceNode) sourceNode.connect(lastNodeForChain);
    });

    pannerNodeRef.current.connect(gainNodeRef.current);
    gainNodeRef.current.connect(audioContext.destination);
    if(meterNodeRef.current) gainNodeRef.current.connect(meterNodeRef.current);
    
    effectNodesRef.current = newEffectNodes;
  }, [sourceNodes, track.clips, track.effects, audioContext]);
  
  // Update audio params when track properties change
  useEffect(() => {
    if(!audioContext || !gainNodeRef.current) return;
    const now = audioContext.currentTime;
    const targetGain = (track.isMuted || (isAnyTrackSoloed && !track.isSoloed)) ? 0 : track.volume;
    gainNodeRef.current.gain.setTargetAtTime(targetGain, now, RAMP_TIME);
  }, [track.volume, track.isMuted, track.isSoloed, isAnyTrackSoloed, audioContext]);

  useEffect(() => {
    if(!audioContext || !pannerNodeRef.current) return;
    const now = audioContext.currentTime;
    pannerNodeRef.current.pan.setTargetAtTime(track.pan, now, RAMP_TIME);
  }, [track.pan, audioContext]);

  useEffect(() => {
    if(!audioContext) return;
    const now = audioContext.currentTime;
    track.effects.forEach(effect => {
      const node = effectNodesRef.current.get(effect.id);
      if (!node) return;
      if (effect.type === 'EQ' && node instanceof BiquadFilterNode) {
        node.frequency.setTargetAtTime(effect.params.frequency, now, RAMP_TIME);
        node.gain.setTargetAtTime(effect.params.gain, now, RAMP_TIME);
        node.Q.setTargetAtTime(effect.params.q, now, RAMP_TIME);
      } else if (effect.type === 'Compressor' && node instanceof DynamicsCompressorNode) {
        node.threshold.setTargetAtTime(effect.params.threshold, now, RAMP_TIME);
        node.ratio.setTargetAtTime(effect.params.ratio, now, RAMP_TIME);
        node.attack.setTargetAtTime(effect.params.attack, now, RAMP_TIME);
        node.release.setTargetAtTime(effect.params.release, now, RAMP_TIME);
        node.knee.setTargetAtTime(effect.params.knee, now, RAMP_TIME);
      }
    });
  }, [track.effects, audioContext]);
  
  const toggleMute = () => onTrackChange({ ...track, isMuted: !track.isMuted });
  const toggleSolo = () => onTrackChange({ ...track, isSoloed: !track.isSoloed });
  const isSelected = track.clips.some(c => c.isSelected);

  return (
    <div className={`flex items-stretch border-b-2 bg-[var(--color-bg-surface)] min-h-[120px] ${isSelected ? 'outline-2 outline -outline-offset-2 outline-[var(--color-accent-blue)]' : 'border-[var(--color-border)]'}`}>
        <div className="w-48 md:w-64 flex-shrink-0 bg-[var(--color-bg-surface-light)] p-2 flex flex-col md:flex-row border-r-2 border-[var(--color-border)] sticky left-0 z-10" style={{ borderLeft: `5px solid ${trackColor}`}}>
            <div className="flex flex-col justify-between w-full md:w-2/3 pr-2" onClick={() => onSelectClip('', track.id)}>
                 <div>
                    <h3 className="text-sm font-semibold truncate text-white">{track.name}</h3>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-[var(--color-text-secondary)]">{track.trackType.charAt(0).toUpperCase() + track.trackType.slice(1)} Track</p>
                      <div className="flex items-center">
                        <button onClick={(e) => { e.stopPropagation(); onOpenDetail(); }} className="p-1 rounded-full hover:bg-white/10 transition-colors" title="Open channel strip details">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onRemoveTrack(); }} className="p-1 rounded-full hover:bg-red-500/20 text-red-400 transition-colors" title="Remove Track">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                      </div>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                     <button onClick={(e) => { e.stopPropagation(); toggleMute(); }} className={`w-7 h-7 rounded text-xs font-bold ${track.isMuted ? 'bg-[var(--color-accent-blue)] text-white' : 'bg-gray-600 text-gray-300'} transition-colors`}>M</button>
                    <button onClick={(e) => { e.stopPropagation(); toggleSolo(); }} className={`w-7 h-7 rounded text-xs font-bold ${track.isSoloed ? 'bg-[var(--color-accent-yellow)] text-black' : 'bg-gray-600 text-gray-300'} transition-colors`}>S</button>
                </div>
                <Knob value={track.pan} onChange={(v) => onTrackChange({ ...track, pan: v })} min={-1} max={1} step={0.01} />
            </div>
             <div className="w-full md:w-1/3 flex items-center justify-center md:px-2 space-x-2 pt-2 md:pt-0">
                <Fader value={track.volume} onChange={(v) => onTrackChange({ ...track, volume: v })} />
                <Meter level={meterLevel} />
            </div>
        </div>

        <div className="relative flex-grow h-auto bg-[var(--color-bg-surface)] group">
             {track.trackType === 'audio' && track.clips.map(clip => (
                 <AudioClipUI
                    key={clip.clipId} clip={clip} trackId={track.id} pixelsPerSecond={pixelsPerSecond}
                    audioBuffer={runtimeAudioBuffers.get(clip.fileId)} trackColor={trackColor}
                    onActionStart={onClipActionStart} onOpenContextMenu={onOpenContextMenu}
                 />
             ))}
             {track.trackType === 'midi' && (
                <div className="h-full flex items-center pl-4">
                  <span className="text-gray-500 text-xs select-none">MIDI clips can be placed here</span>
                </div>
             )}
        </div>
    </div>
  );
};

export default ChannelStrip;