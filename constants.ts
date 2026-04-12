import { StemType, TrackState } from './types';

export const INITIAL_TRACKS: TrackState[] = [
  {
    id: StemType.ORIGINAL,
    name: 'Master',
    color: 'bg-white',
    volume: 0.8,
    muted: false,
    soloed: false,
  },
  {
    id: StemType.VOCALS,
    name: 'Vocals',
    color: 'bg-blue-500',
    volume: 1.0,
    muted: false,
    soloed: false,
  },
  {
    id: StemType.DRUMS,
    name: 'Drums',
    color: 'bg-red-500',
    volume: 1.0,
    muted: false,
    soloed: false,
  },
  {
    id: StemType.BASS,
    name: 'Bass',
    color: 'bg-yellow-500',
    volume: 1.0,
    muted: false,
    soloed: false,
  },
  {
    id: StemType.PIANO,
    name: 'Piano/Keys',
    color: 'bg-green-500',
    volume: 1.0,
    muted: false,
    soloed: false,
  },
  {
    id: StemType.OTHER,
    name: 'Synth/Other',
    color: 'bg-purple-500',
    volume: 1.0,
    muted: false,
    soloed: false,
  },
];
