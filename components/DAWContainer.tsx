
import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import ChannelStrip from './ChannelStrip';
import TransportControls from './TransportControls';
import ChannelStripDetail from './ChannelStripDetail';
import MenuBar from './MenuBar';
import Toast from './ui/Toast';
import ContextMenu from './ui/ContextMenu';
import { AudioContextContext } from '../App';
import { db } from '../services/IndexedDB';
import { bufferToWave } from '../utils/audioExport';
import type { ProjectState, Track, AudioClip } from '../types';

type EditingAction = {
    type: 'move' | 'trim-start' | 'trim-end';
    clip: AudioClip;
    trackId: number;
    initialPointerTime: number;
    initialClipState: AudioClip;
} | {
    type: 'set-loop';
    startTime: number;
};

type ContextMenuState = {
    x: number;
    y: number;
    clip: AudioClip;
    trackId: number;
};

const createInitialProject = (): ProjectState => ({
  tracks: [
    { id: 1, name: 'Audio 1', trackType: 'audio', volume: 0.8, pan: 0, isMuted: false, isSoloed: false, effects: [], clips: [] },
    { id: 2, name: 'MIDI 1', trackType: 'midi', volume: 0.8, pan: 0, isMuted: false, isSoloed: false, effects: [], clips: [] },
  ],
  loopRegion: null,
});

const TRACK_COLORS = ['#3b82f6', '#10b981', '#f97316', '#ec4899', '#8b5cf6', '#d946ef'];
const INITIAL_PIXELS_PER_SECOND = 100;
const SONG_DURATION_SECONDS = 240;
const BPM = 120;
const TIME_SIGNATURE_TOP = 4;
const SECONDS_PER_BEAT = 60 / BPM;
const SECONDS_PER_BAR = SECONDS_PER_BEAT * TIME_SIGNATURE_TOP;
const TOTAL_BARS = Math.ceil(SONG_DURATION_SECONDS / SECONDS_PER_BAR);
const NUDGE_AMOUNT = 0.01; // seconds

const DAWContainer: React.FC = () => {
  const audioContext = useContext(AudioContextContext);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [playheadPosition, setPlayheadPosition] = useState(0);
  const [projectState, setProjectState] = useState<ProjectState>(createInitialProject());
  const [runtimeAudioBuffers, setRuntimeAudioBuffers] = useState<Map<string, AudioBuffer>>(new Map());
  const [editingTrackId, setEditingTrackId] = useState<number | null>(null);
  const [isSnapping, setIsSnapping] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [editingAction, setEditingAction] = useState<EditingAction | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [clipboard, setClipboard] = useState<AudioClip | null>(null);
  
  const sourcesRef = useRef<Map<string, AudioBufferSourceNode>>(new Map());
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);
  const playheadRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const prevPixelsPerSecondRef = useRef(INITIAL_PIXELS_PER_SECOND * zoomLevel);

  const pixelsPerSecond = INITIAL_PIXELS_PER_SECOND * zoomLevel;

  // Load project from DB on startup
  useEffect(() => {
    const loadProject = async () => {
      if (!audioContext) return;
      let savedProject = await db.getProject('currentProject');
      
      if (savedProject) {
        setProjectState(savedProject);
        const newBuffers = new Map<string, AudioBuffer>();
        for (const track of savedProject.tracks) {
            for (const clip of track.clips) {
                if (clip.fileId && !newBuffers.has(clip.fileId)) {
                     const audioData = await db.getAudioFile(clip.fileId);
                    if (audioData) {
                        try {
                            const audioBuffer = await audioContext.decodeAudioData(audioData.slice(0));
                            newBuffers.set(clip.fileId, audioBuffer);
                        } catch (e) { console.error(`Failed to decode audio data for fileId ${clip.fileId}`, e); }
                    }
                }
            }
        }
        setRuntimeAudioBuffers(newBuffers);
      } else {
        const newProject = createInitialProject();
        await db.saveProject('currentProject', newProject);
        setProjectState(newProject);
      }
    };
    loadProject();
  }, [audioContext]);
  
  // Effect to maintain scroll position on zoom
  useEffect(() => {
    const container = timelineContainerRef.current;
    if (!container) return;

    const oldPixelsPerSecond = prevPixelsPerSecondRef.current;
    const newPixelsPerSecond = INITIAL_PIXELS_PER_SECOND * zoomLevel;

    const scrollCenterPixels = container.scrollLeft + container.clientWidth / 2;
    const scrollCenterTime = scrollCenterPixels / oldPixelsPerSecond;
    const newScrollCenterPixels = scrollCenterTime * newPixelsPerSecond;
    const newScrollLeft = newScrollCenterPixels - container.clientWidth / 2;

    container.scrollLeft = Math.max(0, newScrollLeft);
    prevPixelsPerSecondRef.current = newPixelsPerSecond;
  }, [zoomLevel]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  
  const updateProjectState = async (newProjectState: ProjectState, save: boolean = true) => {
    setProjectState(newProjectState);
    if (save) await db.saveProject('currentProject', newProjectState);
  };

  const getSelectedClip = () => {
    for (const track of projectState.tracks) {
      const selected = track.clips.find(c => c.isSelected);
      if (selected) return { clip: selected, trackId: track.id };
    }
    return null;
  };
  
  const stopAnimationLoop = useCallback(() => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
  }, []);

  const stopPlayback = useCallback((shouldUpdatePosition = false) => {
    if (!audioContext) return;
    sourcesRef.current.forEach(source => { try { source.stop(); } catch(e) {} });
    sourcesRef.current.clear();
    if (isPlaying) setIsPlaying(false);
    stopAnimationLoop();
    if (shouldUpdatePosition) {
        const newPauseTime = audioContext.currentTime - startTimeRef.current;
        const validPauseTime = newPauseTime < SONG_DURATION_SECONDS ? newPauseTime : 0;
        pauseTimeRef.current = validPauseTime;
        setPlayheadPosition(validPauseTime);
    }
  }, [audioContext, stopAnimationLoop, isPlaying]);
  
  const handleSeek = (newTime: number) => {
    const wasPlaying = isPlaying;
    stopPlayback(false);
    pauseTimeRef.current = newTime;
    setPlayheadPosition(newTime);
    if (playheadRef.current) playheadRef.current.style.transform = `translateX(${newTime * pixelsPerSecond}px)`;
    if (wasPlaying) setTimeout(() => handlePlay(), 0);
  };

  const handleReturnToZero = useCallback(() => {
      handleSeek(0);
  }, []);

  const animationLoop = useCallback(() => {
    if (!audioContext) return;
    let elapsedTime = audioContext.currentTime - startTimeRef.current;
    
    if (isLooping && projectState.loopRegion && elapsedTime >= projectState.loopRegion.end) {
        const loopDuration = projectState.loopRegion.end - projectState.loopRegion.start;
        const newTime = projectState.loopRegion.start + ((elapsedTime - projectState.loopRegion.end) % loopDuration);
        handleSeek(newTime);
        return;
    }
    
    if (elapsedTime >= SONG_DURATION_SECONDS) {
      handleReturnToZero();
      return;
    }

    setPlayheadPosition(elapsedTime);
    if (playheadRef.current) playheadRef.current.style.transform = `translateX(${elapsedTime * pixelsPerSecond}px)`;
    animationFrameRef.current = requestAnimationFrame(animationLoop);
  }, [audioContext, handleReturnToZero, pixelsPerSecond, isLooping, projectState.loopRegion, handleSeek]);

  const startAnimationLoop = useCallback(() => {
    stopAnimationLoop();
    animationFrameRef.current = requestAnimationFrame(animationLoop);
  }, [animationLoop, stopAnimationLoop]);

  const handlePlay = async () => {
    if (!audioContext || isPlaying) return;
    if (audioContext.state === 'suspended') await audioContext.resume();
    
    if (isRecording) setIsRecording(false);

    startTimeRef.current = audioContext.currentTime - pauseTimeRef.current;
    
    projectState.tracks.forEach(track => {
      if (track.trackType !== 'audio' || track.isMuted || (isAnyTrackSoloed && !track.isSoloed)) return;

      track.clips.forEach(clip => {
        const buffer = runtimeAudioBuffers.get(clip.fileId);
        if (!buffer) return;
        
        const when = clip.startTime;
        const offset = clip.startOffset;
        const duration = clip.duration;
        
        if (pauseTimeRef.current >= when + duration) return; // Clip is fully before playhead
        
        const playStartTime = audioContext.currentTime + Math.max(0, when - pauseTimeRef.current);
        const playOffset = pauseTimeRef.current > when ? Math.min(offset + (pauseTimeRef.current - when), buffer.duration) : offset;
        const playDuration = pauseTimeRef.current > when ? Math.max(0, duration - (pauseTimeRef.current - when)) : duration;

        if (playDuration <= 0) return;
        
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        
        source.start(playStartTime, playOffset, playDuration);
        sourcesRef.current.set(clip.clipId, source);
      });
    });

    setIsPlaying(true);
    startAnimationLoop();
  };
  const handleStop = () => stopPlayback(true);
  const handleRecord = () => {
    if (isPlaying) stopPlayback(false);
    handleReturnToZero();
    setIsRecording(true);
    setTimeout(() => handlePlay(), 0);
  };
  const handleClipEditing = (e: MouseEvent | TouchEvent) => {
    if (!editingAction) return;
    // FIX: Add a type guard to ensure we don't try to access properties that don't exist on all union types of EditingAction.
    if (editingAction.type === 'set-loop') return;
    e.preventDefault();

    const timelineRect = timelineContainerRef.current!.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const pointerX = clientX - timelineRect.left + timelineContainerRef.current!.scrollLeft;
    let pointerTime = pointerX / pixelsPerSecond;
    if (isSnapping) pointerTime = Math.round(pointerTime / SECONDS_PER_BEAT) * SECONDS_PER_BEAT;

    const { type, clip, trackId, initialPointerTime, initialClipState } = editingAction;
    const delta = pointerTime - initialPointerTime;
    
    const newTracks = JSON.parse(JSON.stringify(projectState.tracks));
    const track = newTracks.find((t: Track) => t.id === trackId)!;
    const clipToUpdate = track.clips.find((c: AudioClip) => c.clipId === clip.clipId)!;

    if (type === 'move') {
      clipToUpdate.startTime = Math.max(0, initialClipState.startTime + delta);
    } else if (type === 'trim-start') {
        const newStartTime = Math.max(0, initialClipState.startTime + delta);
        const newDuration = initialClipState.duration - (newStartTime - initialClipState.startTime);
        const newStartOffset = initialClipState.startOffset + (newStartTime - initialClipState.startTime);
        if (newDuration > 0 && newStartOffset >= 0) {
            clipToUpdate.startTime = newStartTime;
            clipToUpdate.duration = newDuration;
            clipToUpdate.startOffset = newStartOffset;
        }
    } else if (type === 'trim-end') {
        const newDuration = Math.min(
            initialClipState.duration + delta,
            initialClipState.sourceDuration - initialClipState.startOffset
        );
        if (newDuration > 0) {
            clipToUpdate.duration = newDuration;
        }
    }
    updateProjectState({ ...projectState, tracks: newTracks }, false); // Update without saving for performance
  };
  const handleClipEditEnd = () => {
    if (editingAction) {
        db.saveProject('currentProject', projectState); // Save final state to DB
        setEditingAction(null);
    }
  };
  const handleTrackChange = (updatedTrack: Track) => {
    const newTracks = projectState.tracks.map(t => t.id === updatedTrack.id ? updatedTrack : t);
    updateProjectState({ ...projectState, tracks: newTracks });
  };
  const handleAddTrack = (type: 'audio' | 'midi') => {
    const newTrack: Track = {
        id: (projectState.tracks.reduce((maxId, t) => Math.max(t.id, maxId), 0) + 1),
        name: `${type === 'audio' ? 'Audio' : 'MIDI'} ${projectState.tracks.filter(t => t.trackType === type).length + 1}`,
        trackType: type,
        volume: 0.8, pan: 0, isMuted: false, isSoloed: false, effects: [], clips: []
    };
    updateProjectState({ ...projectState, tracks: [...projectState.tracks, newTrack] });
  };
  const handleRemoveTrack = (trackId: number) => {
    const newTracks = projectState.tracks.filter(t => t.id !== trackId);
    updateProjectState({ ...projectState, tracks: newTracks });
  };
  const handleSaveProject = () => { db.saveProject('currentProject', projectState); showToast('Project saved!'); };
  const handleImportAudio = () => fileInputRef.current?.click();
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0 || !audioContext) return;
      const file = e.target.files[0];
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));

      const fileId = crypto.randomUUID();
      await db.saveAudioFile(fileId, arrayBuffer);

      const newAudioClip: AudioClip = {
          clipId: crypto.randomUUID(), fileId, name: file.name, startTime: playheadPosition,
          startOffset: 0, duration: audioBuffer.duration, sourceDuration: audioBuffer.duration, isSelected: false,
      };

      const selected = getSelectedClip();
      let targetTrackId = selected?.trackId ?? projectState.tracks.find(t => t.trackType === 'audio')?.id ?? null;
      
      const newTracks = JSON.parse(JSON.stringify(projectState.tracks));
      let targetTrack = newTracks.find((t: Track) => t.id === targetTrackId && t.trackType === 'audio');
      
      if (!targetTrack) {
          targetTrack = newTracks.find((t: Track) => t.trackType === 'audio');
      }

      if (targetTrack) {
          targetTrack.clips.push(newAudioClip);
      } else {
          const newTrack: Track = {
            id: (projectState.tracks.reduce((maxId, t) => Math.max(t.id, maxId), 0) + 1),
            name: file.name.split('.')[0] || 'Audio', trackType: 'audio', volume: 0.8, pan: 0, 
            isMuted: false, isSoloed: false, effects: [], clips: [newAudioClip]
          };
          newTracks.push(newTrack);
      }
      
      setRuntimeAudioBuffers(prev => new Map(prev).set(fileId, audioBuffer));
      updateProjectState({ ...projectState, tracks: newTracks });
  };
  const handleExportAudio = async () => {
    if (!audioContext || projectState.tracks.length === 0) return;
    setIsExporting(true); showToast('Exporting audio...', 'success');
    const totalDuration = projectState.tracks.reduce((max, track) => track.clips.reduce((clipMax, clip) => Math.max(clipMax, clip.startTime + clip.duration), max), 0);
    if (totalDuration === 0) { setIsExporting(false); return; }

    const offlineCtx = new OfflineAudioContext(2, Math.ceil(totalDuration * audioContext.sampleRate), audioContext.sampleRate);
    const isAnySoloedExport = projectState.tracks.some(t => t.isSoloed);

    projectState.tracks.forEach(track => {
        if (track.trackType !== 'audio' || track.isMuted || (isAnySoloedExport && !track.isSoloed)) return;
        track.clips.forEach(clip => {
            const buffer = runtimeAudioBuffers.get(clip.fileId);
            if (!buffer) return;
            const source = offlineCtx.createBufferSource();
            source.buffer = buffer;
            source.connect(offlineCtx.destination);
            source.start(clip.startTime, clip.startOffset, clip.duration);
        });
    });

    try {
        const renderedBuffer = await offlineCtx.startRendering();
        const wavBlob = bufferToWave(renderedBuffer, renderedBuffer.length);
        const url = URL.createObjectURL(wavBlob);
        const a = document.createElement('a');
        a.href = url; a.download = 'weblogic-export.wav';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url); showToast('Export complete!');
    } catch (err) { console.error("Rendering failed: ", err); showToast('Export failed.', 'error'); } 
    finally { setIsExporting(false); }
  };
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev * 1.5, 32));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev / 1.5, 0.1));
  const handleNudge = (direction: 'left' | 'right') => {
    const amount = direction === 'left' ? -NUDGE_AMOUNT : NUDGE_AMOUNT;
    const selected = getSelectedClip();
    if (selected) {
        const newTracks = JSON.parse(JSON.stringify(projectState.tracks));
        const track = newTracks.find((t:Track) => t.id === selected.trackId)!;
        const clip = track.clips.find((c:AudioClip) => c.clipId === selected.clip.clipId)!;
        clip.startTime = Math.max(0, clip.startTime + amount);
        updateProjectState({ ...projectState, tracks: newTracks });
    } else {
        handleSeek(Math.max(0, playheadPosition + amount));
    }
  };
  const handleRulerInteraction = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x + timelineContainerRef.current!.scrollLeft) / pixelsPerSecond;
    if (e.altKey) {
        setEditingAction({ type: 'set-loop', startTime: time });
    } else {
        handleSeek(time);
    }
  };
  const handleRulerInteractionEnd = () => {
    if (editingAction?.type === 'set-loop') {
      setEditingAction(null);
      db.saveProject('currentProject', projectState);
    }
  };
  const onClipActionStart = (type: 'move' | 'trim-start' | 'trim-end', clip: AudioClip, trackId: number, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    handleSelectClip(clip.clipId, trackId);
    const timelineRect = timelineContainerRef.current!.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const pointerX = clientX - timelineRect.left + timelineContainerRef.current!.scrollLeft;
    const initialPointerTime = pointerX / pixelsPerSecond;
    
    setEditingAction({ type, clip, trackId, initialPointerTime, initialClipState: { ...clip } });
  };
  const handleOpenContextMenu = (x: number, y: number, clip: AudioClip, trackId: number) => {
    handleSelectClip(clip.clipId, trackId);
    setContextMenu({ x, y, clip, trackId });
  };
  const handleSelectClip = (clipIdToSelect: string, trackId: number) => {
    const newTracks = projectState.tracks.map(track => ({
        ...track,
        clips: track.clips.map(clip => ({ ...clip, isSelected: clip.clipId === clipIdToSelect }))
    }));
    updateProjectState({ ...projectState, tracks: newTracks }, false);
  };
  const handleDeleteSelected = () => {
    const selected = getSelectedClip();
    if (!selected) return;
    const newTracks = projectState.tracks.map(track => 
        track.id === selected.trackId 
        ? { ...track, clips: track.clips.filter(c => c.clipId !== selected.clip.clipId) } 
        : track
    );
    updateProjectState({ ...projectState, tracks: newTracks });
  };
  const handleCopy = () => {
    setClipboard(getSelectedClip()?.clip ?? null);
  };
  const handleCut = () => {
    handleCopy(); handleDeleteSelected();
  };
  const handlePaste = () => {
    if (!clipboard) return;
    const selectedTrack = projectState.tracks.find(t => t.clips.some(c => c.isSelected) && t.trackType === 'audio') 
        ?? projectState.tracks.find(t => t.trackType === 'audio');

    if (!selectedTrack) return;

    const newClip: AudioClip = {
        ...clipboard,
        clipId: crypto.randomUUID(),
        startTime: playheadPosition,
        isSelected: false,
    };

    const newTracks = projectState.tracks.map(t => 
        t.id === selectedTrack.id ? { ...t, clips: [...t.clips, newClip] } : t
    );
    updateProjectState({ ...projectState, tracks: newTracks });
  };
  const handleSplit = () => {
    const selected = getSelectedClip();
    if (!selected || playheadPosition <= selected.clip.startTime || playheadPosition >= selected.clip.startTime + selected.clip.duration) return;
    
    const { clip, trackId } = selected;
    const splitTime = playheadPosition;

    const clip1: AudioClip = {
        ...clip,
        duration: splitTime - clip.startTime,
        isSelected: true,
    };
    const clip2: AudioClip = {
        ...clip,
        clipId: crypto.randomUUID(),
        startTime: splitTime,
        startOffset: clip.startOffset + (splitTime - clip.startTime),
        duration: clip.duration - (splitTime - clip.startTime),
        isSelected: false,
    };
    
    const newTracks = projectState.tracks.map(track => {
        if (track.id !== trackId) return track;
        const clipIndex = track.clips.findIndex(c => c.clipId === clip.clipId);
        if (clipIndex === -1) return track;
        const newClips = [...track.clips];
        newClips.splice(clipIndex, 1, clip1, clip2);
        return { ...track, clips: newClips };
    });

    updateProjectState({ ...projectState, tracks: newTracks });
  };
  
  // UseEffects for global listeners and keyboard shortcuts
  useEffect(() => {
    if (!editingAction) return;
    window.addEventListener('mousemove', handleClipEditing as EventListener);
    window.addEventListener('mouseup', handleClipEditEnd);
    window.addEventListener('touchmove', handleClipEditing as EventListener);
    window.addEventListener('touchend', handleClipEditEnd);
    return () => {
      window.removeEventListener('mousemove', handleClipEditing as EventListener);
      window.removeEventListener('mouseup', handleClipEditEnd);
      window.removeEventListener('touchmove', handleClipEditing as EventListener);
      window.removeEventListener('touchend', handleClipEditEnd);
    };
  }, [editingAction]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || contextMenu) return;

        const selected = getSelectedClip();
        if (e.code === 'Space') { e.preventDefault(); isPlaying ? handleStop() : handlePlay(); } 
        else if (e.code === 'Enter') { e.preventDefault(); handleReturnToZero(); } 
        else if (e.key.toLowerCase() === 'r') { e.preventDefault(); handleRecord(); }
        else if (e.key.toLowerCase() === 'l') { e.preventDefault(); setIsLooping(p => !p); }
        else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); handleSaveProject(); } 
        else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') { e.preventDefault(); handleImportAudio(); } 
        else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e') { e.preventDefault(); handleExportAudio(); } 
        else if (e.code === 'Backspace' || e.code === 'Delete') { e.preventDefault(); if(selected) handleDeleteSelected(); } 
        else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'c') { e.preventDefault(); if (selected) handleCopy(); }
        else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'x') { e.preventDefault(); if (selected) handleCut(); }
        else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'v') { e.preventDefault(); handlePaste(); }
        else if (e.shiftKey && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') { e.preventDefault(); handleAddTrack('audio'); } 
        else if (e.shiftKey && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'm') { e.preventDefault(); handleAddTrack('midi'); }
        else if (e.code === 'ArrowLeft' && e.altKey) { e.preventDefault(); handleNudge('left'); }
        else if (e.code === 'ArrowRight' && e.altKey) { e.preventDefault(); handleNudge('right'); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, contextMenu, handleStop, handlePlay, handleReturnToZero, handleRecord, getSelectedClip]);

  if (!audioContext) return <div className="flex items-center justify-center h-screen">Loading audio engine...</div>;

  const timelineWidth = SONG_DURATION_SECONDS * pixelsPerSecond;
  const editingTrack = projectState.tracks.find(t => t.id === editingTrackId);
  const isAnyTrackSoloed = projectState.tracks.some(t => t.isSoloed);
  
  return (
    <div className="bg-[var(--color-bg-base)] rounded-lg shadow-2xl overflow-hidden flex flex-col h-screen" onMouseUp={handleRulerInteractionEnd} onTouchEnd={handleRulerInteractionEnd}>
      <MenuBar 
        onSave={handleSaveProject} onImport={handleImportAudio} onExport={handleExportAudio}
        onAddAudioTrack={() => handleAddTrack('audio')} onAddMidiTrack={() => handleAddTrack('midi')}
        onRemoveSelectedTrack={handleDeleteSelected} isTrackSelected={!!getSelectedClip()}
      />
      <TransportControls 
        isPlaying={isPlaying} isRecording={isRecording} onPlay={handlePlay} onStop={handleStop}
        onRecord={handleRecord} onReturnToZero={handleReturnToZero} currentTime={playheadPosition}
        isLooping={isLooping} onToggleLoop={() => setIsLooping(p => !p)}
        zoomLevel={zoomLevel} onZoomIn={handleZoomIn} onZoomOut={handleZoomOut}
        onNudgeLeft={() => handleNudge('left')} onNudgeRight={() => handleNudge('right')}
      />
      <input type="file" ref={fileInputRef} onChange={handleFileSelected} accept="audio/*" className="hidden" />

      <div ref={timelineContainerRef} className="w-full overflow-auto bg-[var(--color-bg-surface)] flex-grow" onMouseMove={(e) => {
          if (editingAction?.type === 'set-loop') {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const time = (x + e.currentTarget.scrollLeft) / pixelsPerSecond;
              const start = Math.min(editingAction.startTime, time);
              const end = Math.max(editingAction.startTime, time);
              updateProjectState({...projectState, loopRegion: {start, end}}, false);
          }
      }}>
        <div className="relative" style={{ width: `${timelineWidth}px`, minWidth: '100%' }}>
           <div className="h-8 flex items-stretch border-b-2 border-[var(--color-border)] sticky top-0 bg-[var(--color-bg-surface-light)] z-20">
                <div className="w-64 flex-shrink-0 border-r-2 border-[var(--color-border)] flex items-center justify-between pr-2 sticky left-0 bg-[var(--color-bg-surface-light)] z-30">
                    <span className="text-sm font-bold pl-3 text-[var(--color-text-secondary)]">Tracks</span>
                    <button onClick={() => setIsSnapping(prev => !prev)} title="Toggle Snapping" className={`p-1 rounded ${isSnapping ? 'bg-[var(--color-accent-blue)] text-white' : 'text-gray-400 hover:bg-white/10'} transition-colors`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 7v10a7 7 0 0 0 14 0V7"/><path d="M5 7h4"/><path d="M15 7h4"/></svg>
                    </button>
                </div>
                <div className="flex-grow relative h-full cursor-pointer" onMouseDown={handleRulerInteraction}>
                    {Array.from({ length: TOTAL_BARS * TIME_SIGNATURE_TOP }, (_, i) => (<div key={`beat-${i}`} className="absolute h-full" style={{ left: `${i * SECONDS_PER_BEAT * pixelsPerSecond}px` }}><div className={`w-px h-1 ${i % TIME_SIGNATURE_TOP === 0 ? 'bg-gray-500' : 'bg-gray-700'}`}></div></div>))}
                    {Array.from({ length: TOTAL_BARS + 1 }, (_, i) => (<div key={`bar-${i}`} className="absolute text-xs text-[var(--color-text-secondary)]" style={{ left: `${i * SECONDS_PER_BAR * pixelsPerSecond}px` }}><div className="h-2 w-px bg-gray-500"></div><span className="pl-1">{i + 1}</span></div>))}
                    {projectState.loopRegion && <div className="absolute top-0 h-full bg-blue-500/20" style={{ left: `${projectState.loopRegion.start * pixelsPerSecond}px`, width: `${(projectState.loopRegion.end - projectState.loopRegion.start) * pixelsPerSecond}px` }}></div>}
                </div>
            </div>
            <div className="relative z-10" onClick={() => handleSelectClip('', -1)}>
                {projectState.tracks.map((track, index) => (
                    <ChannelStrip
                        key={track.id} track={track} onTrackChange={handleTrackChange}
                        onOpenDetail={() => setEditingTrackId(track.id)}
                        onRemoveTrack={() => handleRemoveTrack(track.id)}
                        sourceNodes={sourcesRef.current} pixelsPerSecond={pixelsPerSecond}
                        runtimeAudioBuffers={runtimeAudioBuffers} trackColor={TRACK_COLORS[index % TRACK_COLORS.length]}
                        isAnyTrackSoloed={isAnyTrackSoloed} onClipActionStart={onClipActionStart}
                        onOpenContextMenu={handleOpenContextMenu} onSelectClip={handleSelectClip}
                    />
                ))}
            </div>
             <div ref={playheadRef} className="absolute top-0 bottom-0 w-0.5 bg-[var(--color-playhead)] z-30 pointer-events-none" style={{ transform: `translateX(${playheadPosition * pixelsPerSecond}px)` }} />
        </div>
      </div>
      {editingTrack && <ChannelStripDetail track={editingTrack} trackColor={TRACK_COLORS[(editingTrack.id - 1) % TRACK_COLORS.length] ?? '#3b82f6'} onTrackChange={handleTrackChange} onClose={() => setEditingTrackId(null)} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {isExporting && <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center text-white text-xl font-bold">Exporting Project...</div>}
      {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)}
        items={[
            { label: 'Cut', action: handleCut, shortcut: '⌘X' },
            { label: 'Copy', action: handleCopy, shortcut: '⌘C' },
            { label: 'Paste', action: handlePaste, shortcut: '⌘V', disabled: !clipboard },
            { label: 'Delete', action: handleDeleteSelected, shortcut: 'Del' },
            { label: 'Split at Playhead', action: handleSplit, disabled: (playheadPosition <= contextMenu.clip.startTime || playheadPosition >= contextMenu.clip.startTime + contextMenu.clip.duration) },
        ]}
      />}
    </div>
  );
};

export default DAWContainer;
