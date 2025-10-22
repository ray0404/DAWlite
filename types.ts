export interface EQSettings {
  frequency: number;
  gain: number;
  q: number;
}

export interface CompressorSettings {
  threshold: number;
  ratio: number;
  attack: number;
  release: number;
  knee: number;
}

export type Effect = {
  id: string; // Unique ID for each instance
} & (
  | { type: 'EQ'; params: EQSettings }
  | { type: 'Compressor'; params: CompressorSettings }
);

export interface AudioClip {
  clipId: string; // Unique ID for each clip instance
  fileId: string; // ID linking to audio data in IndexedDB
  name: string;
  startTime: number; // Start time in seconds within the timeline
  startOffset: number; // Start offset in seconds within the source audio file (for trimming)
  duration: number; // Duration in seconds on the timeline
  sourceDuration: number; // Total duration of the source audio file
  isSelected: boolean;
}

export interface Track {
  id: number;
  name:string;
  trackType: 'audio' | 'midi';
  volume: number;
  pan: number;
  isMuted: boolean;
  isSoloed: boolean;
  effects: Effect[];
  clips: AudioClip[];
}

export interface ProjectState {
  tracks: Track[];
  loopRegion: { start: number; end: number } | null;
}
