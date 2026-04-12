import React from 'react';
import { TrackState, StemType } from '../types';
import { Volume2, VolumeX, Download, Headphones, Mic2 } from 'lucide-react';

interface MixerTrackProps {
  track: TrackState;
  onVolumeChange: (id: StemType, val: number) => void;
  onMuteToggle: (id: StemType) => void;
  onSoloToggle: (id: StemType) => void;
  onExport: (id: StemType) => void;
  isExporting: boolean;
}

const MixerTrack: React.FC<MixerTrackProps> = ({ 
  track, 
  onVolumeChange, 
  onMuteToggle, 
  onSoloToggle,
  onExport,
  isExporting
}) => {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex flex-col items-center gap-4 transition-all hover:border-zinc-700 min-w-[140px]">
      
      {/* Icon & Name */}
      <div className="flex flex-col items-center gap-2">
        <div className={`p-3 rounded-full ${track.color} bg-opacity-20 text-white`}>
            {track.id === StemType.VOCALS && <Mic2 size={20} />}
            {track.id === StemType.ORIGINAL && <Headphones size={20} />}
            {track.id !== StemType.VOCALS && track.id !== StemType.ORIGINAL && <div className={`w-5 h-5 rounded-full ${track.color}`} />}
        </div>
        <span className="font-semibold text-sm tracking-wide">{track.name}</span>
      </div>

      {/* Volume Slider (Vertical) */}
      <div className="h-48 relative flex items-center justify-center py-2">
        <div className="absolute w-1 h-full bg-zinc-800 rounded-full"></div>
        <div 
            className={`absolute bottom-2 w-1 rounded-full ${track.color.replace('bg-', 'bg-')}`} 
            style={{ height: `${track.muted ? 0 : track.volume * 100}%`, opacity: 0.6 }}
        ></div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={track.volume}
          onChange={(e) => onVolumeChange(track.id, parseFloat(e.target.value))}
          className="absolute h-full w-8 appearance-none bg-transparent cursor-pointer rotate-180"
          style={{ writingMode: 'vertical-lr' as any, WebkitAppearance: 'slider-vertical' }} 
        />
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-2 w-full">
        <div className="flex justify-between gap-1">
          <button 
            onClick={() => onMuteToggle(track.id)}
            className={`flex-1 py-1 text-xs rounded font-bold uppercase tracking-wider transition-colors ${track.muted ? 'bg-red-500/80 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
          >
            M
          </button>
          <button 
            onClick={() => onSoloToggle(track.id)}
            className={`flex-1 py-1 text-xs rounded font-bold uppercase tracking-wider transition-colors ${track.soloed ? 'bg-yellow-500/80 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
          >
            S
          </button>
        </div>

        <button
          onClick={() => onExport(track.id)}
          disabled={isExporting}
          className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
        >
          <Download size={14} />
          {isExporting ? '...' : 'Export'}
        </button>
      </div>
    </div>
  );
};

export default MixerTrack;
