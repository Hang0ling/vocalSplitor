export enum StemType {
  ORIGINAL = 'ORIGINAL',
  VOCALS = 'VOCALS',
  DRUMS = 'DRUMS',
  BASS = 'BASS',
  PIANO = 'PIANO',
  OTHER = 'OTHER'
}

export interface TrackState {
  id: StemType;
  name: string;
  color: string;
  volume: number; // 0 to 1
  muted: boolean;
  soloed: boolean;
  isProcessing?: boolean;
}

export interface SongAnalysis {
  genre?: string;
  bpm?: string;
  key?: string;
  mood?: string;
  instruments?: string[];
  description?: string;
}

export interface AudioEngineState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}
