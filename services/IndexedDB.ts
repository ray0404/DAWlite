import type { ProjectState, Track, AudioClip } from '../types';

const DB_NAME = 'WebLogicDB';
const DB_VERSION = 3; // Version remains the same as schema structure is compatible
const PROJECT_STORE_NAME = 'projects';
const AUDIO_STORE_NAME = 'audioFiles';

class IndexedDBManager {
  private db: IDBDatabase | null = null;

  constructor() {
    this.init();
  }

  private init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject('Error opening DB');
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(PROJECT_STORE_NAME)) {
          db.createObjectStore(PROJECT_STORE_NAME, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(AUDIO_STORE_NAME)) {
          db.createObjectStore(AUDIO_STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }

  private async getDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    return this.db!;
  }

  public async saveProject(id: string, projectState: ProjectState): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(PROJECT_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(PROJECT_STORE_NAME);
      const request = store.put({ id, ...projectState });

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error('Error saving project:', request.error);
        reject('Error saving project');
      };
    });
  }

  public async getProject(id: string): Promise<ProjectState | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(PROJECT_STORE_NAME, 'readonly');
      const store = transaction.objectStore(PROJECT_STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        let project = request.result;
        if (project) {
            // Migration for older project structures
            if (Array.isArray(project)) { // Very old format: project was just the tracks array
                project = { tracks: project, loopRegion: null };
            }
            if (!project.loopRegion) {
                project.loopRegion = null;
            }

            project.tracks = project.tracks.map((t: any) => {
                const newTrack = { ...t };
                if (!newTrack.trackType) newTrack.trackType = 'audio';
                if (newTrack.audioClip && !newTrack.clips) {
                    const clip: AudioClip = {
                        clipId: crypto.randomUUID(), fileId: newTrack.audioClip.fileId, name: newTrack.audioClip.name,
                        startTime: newTrack.audioClip.startTime, startOffset: 0, duration: newTrack.audioClip.duration,
                        sourceDuration: newTrack.audioClip.duration, isSelected: false
                    };
                    newTrack.clips = [clip];
                } else if (!newTrack.clips) {
                    newTrack.clips = [];
                }
                newTrack.clips = newTrack.clips.map((c: any) => ({...c, isSelected: false }));
                delete newTrack.audioClip;
                return newTrack;
            });
        }
        resolve(project ? project : null);
      };
      request.onerror = () => {
        console.error('Error getting project:', request.error);
        reject('Error getting project');
      };
    });
  }
  
  public async saveAudioFile(id: string, data: ArrayBuffer): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(AUDIO_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(AUDIO_STORE_NAME);
      const request = store.put({ id, data });
      request.onsuccess = () => resolve();
      request.onerror = () => reject('Error saving audio file');
    });
  }

  public async getAudioFile(id: string): Promise<ArrayBuffer | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(AUDIO_STORE_NAME, 'readonly');
      const store = transaction.objectStore(AUDIO_STORE_NAME);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result ? request.result.data : null);
      request.onerror = () => reject('Error getting audio file');
    });
  }
}

export const db = new IndexedDBManager();
