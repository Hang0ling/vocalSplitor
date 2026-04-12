import React, { useState, useEffect, useRef } from 'react';
import { Upload, Play, Pause, AlertCircle, Wand2, Music2, AlertTriangle } from 'lucide-react';
import { INITIAL_TRACKS } from './constants';
import { TrackState, StemType, SongAnalysis } from './types';
import MixerTrack from './components/MixerTrack';
import Visualizer from './components/Visualizer';
import { AudioProcessor } from './services/audioProcessor';
import { analyzeSong } from './services/geminiService';

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [tracks, setTracks] = useState<TrackState[]>(INITIAL_TRACKS);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [analysis, setAnalysis] = useState<SongAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Audio Engine Ref
  const engineRef = useRef<AudioProcessor>(new AudioProcessor());
  const rafRef = useRef<number>();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    if (uploadedFile.size > 20 * 1024 * 1024) {
      setErrorMsg("File too large. Please upload < 20MB for this demo.");
      return;
    }

    setFile(uploadedFile);
    setIsLoading(true);
    setErrorMsg(null);
    setAnalysis(null);
    
    // Stop previous playback
    engineRef.current.stop();
    setIsPlaying(false);

    try {
      // 1. Load Audio into Engine
      const audioDuration = await engineRef.current.loadAudio(uploadedFile);
      setDuration(audioDuration);

      // 2. Start Gemini Analysis (Async)
      setIsAnalyzing(true);
      analyzeSong(uploadedFile)
        .then(setAnalysis)
        .catch(err => console.error(err))
        .finally(() => setIsAnalyzing(false));

    } catch (error) {
      console.error(error);
      setErrorMsg("Failed to process audio file.");
    } finally {
      setIsLoading(false);
    }
  };

  // Sync Logic
  useEffect(() => {
    const syncUI = () => {
      const time = engineRef.current.getCurrentTime();
      setCurrentTime(time);
      if (time >= duration && duration > 0 && isPlaying) {
        setIsPlaying(false);
        engineRef.current.stop();
      }
      rafRef.current = requestAnimationFrame(syncUI);
    };

    if (isPlaying) {
      rafRef.current = requestAnimationFrame(syncUI);
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, duration]);

  // Track Control Handlers
  const handleVolumeChange = (id: StemType, val: number) => {
    setTracks(prev => prev.map(t => t.id === id ? { ...t, volume: val } : t));
    engineRef.current.setTrackVolume(id, val);
  };

  const handleMute = (id: StemType) => {
    setTracks(prev => {
      const newTracks = prev.map(t => t.id === id ? { ...t, muted: !t.muted } : t);
      const target = newTracks.find(t => t.id === id);
      if (target) {
        // If muted, set vol to 0, else restore
        engineRef.current.setTrackVolume(id, target.muted ? 0 : target.volume);
      }
      return newTracks;
    });
  };

  const handleSolo = (id: StemType) => {
    setTracks(prev => {
      const isSoloing = !prev.find(t => t.id === id)?.soloed;
      
      const newTracks = prev.map(t => ({
        ...t,
        soloed: t.id === id ? isSoloing : false
      }));

      // Apply logic to engine
      newTracks.forEach(t => {
        if (isSoloing) {
           // If we are soloing THIS track, it is ON.
           // If we are soloing SOME OTHER track, this is OFF.
           const vol = t.id === id ? t.volume : 0;
           engineRef.current.setTrackVolume(t.id, vol);
        } else {
           // No one is soloed, revert to normal volume/mute state
           engineRef.current.setTrackVolume(t.id, t.muted ? 0 : t.volume);
        }
      });

      return newTracks;
    });
  };

  const togglePlay = () => {
    if (isPlaying) {
      engineRef.current.pause();
    } else {
      engineRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    engineRef.current.seek(time);
  };

  const handleExport = async (id: StemType) => {
    setExportingId(id);
    try {
      const blob = await engineRef.current.exportTrack(id);
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sonic-split-${id.toLowerCase()}-${Date.now()}.wav`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error(e);
      alert("Export failed");
    } finally {
      setExportingId(null);
    }
  };

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-20">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Music2 size={20} className="text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">SonicSplit AI</h1>
          </div>
          <div className="flex items-center gap-4">
            {!file && (
               <span className="text-zinc-500 text-sm">Powered by Gemini 2.5</span>
            )}
             {file && (
              <label className="cursor-pointer bg-zinc-800 hover:bg-zinc-700 text-xs font-medium px-4 py-2 rounded-full transition-colors flex items-center gap-2">
                <Upload size={14} />
                New Upload
                <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
              </label>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 flex flex-col gap-8">
        
        {/* Error Banner */}
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-xl flex items-center gap-3">
            <AlertCircle size={20} />
            {errorMsg}
          </div>
        )}

        {/* Hero / Upload Section */}
        {!file ? (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-800 rounded-3xl bg-zinc-900/30">
            <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mb-6 animate-pulse">
              <Upload size={40} className="text-zinc-400" />
            </div>
            <h2 className="text-3xl font-bold text-center mb-4">Upload a song to split stems</h2>
            <p className="text-zinc-400 text-center max-w-md mb-8">
              Separate vocals, drums, bass, and other instruments using our advanced audio engine. 
              Supports MP3, WAV, M4A.
            </p>
            <label className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-full font-bold text-lg cursor-pointer transition-all hover:scale-105 shadow-lg shadow-blue-900/20">
              Select Audio File
              <input type="file" accept="audio/*" onChange={handleFileUpload} className="hidden" />
            </label>
            <p className="mt-4 text-xs text-zinc-600">Max file size: 20MB</p>
          </div>
        ) : (
          <>
            {/* Top Control Bar: Visualization & Metadata */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Visualizer Card */}
              <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden flex flex-col">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                <div className="flex justify-between items-center mb-4">
                   <h3 className="font-semibold text-zinc-300 flex items-center gap-2">
                     <Wand2 size={16} className="text-blue-400"/>
                     {isLoading ? "Processing Audio..." : file.name}
                   </h3>
                   <span className="text-xs font-mono text-zinc-500">{formatTime(currentTime)} / {formatTime(duration)}</span>
                </div>
                
                <div className="flex-1 bg-black/50 rounded-lg mb-4 relative min-h-[120px]">
                   <Visualizer analyzer={engineRef.current.getAnalyzer()} isPlaying={isPlaying} />
                   {isLoading && (
                     <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                       <div className="text-blue-400 animate-pulse font-mono">Decoding Audio Data...</div>
                     </div>
                   )}
                </div>

                <div className="flex items-center gap-4">
                  <button 
                    onClick={togglePlay}
                    disabled={isLoading}
                    className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50"
                  >
                    {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1"/>}
                  </button>
                  <input 
                    type="range" 
                    min="0" 
                    max={duration || 100} 
                    value={currentTime} 
                    onChange={handleSeek}
                    className="flex-1 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full"
                  />
                </div>
              </div>

              {/* Analysis Card */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                   <Music2 size={100} />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-4">AI Analysis</h3>
                
                {isAnalyzing ? (
                   <div className="flex flex-col items-center justify-center flex-1 gap-3">
                     <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                     <span className="text-xs text-zinc-400 animate-pulse">Gemini is listening...</span>
                   </div>
                ) : analysis ? (
                  <div className="flex flex-col gap-4 z-10">
                    <div>
                      <span className="text-xs text-zinc-500">Genre</span>
                      <p className="text-lg font-medium text-white">{analysis.genre}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs text-zinc-500">BPM</span>
                        <p className="font-mono text-blue-400">{analysis.bpm || "N/A"}</p>
                      </div>
                      <div>
                        <span className="text-xs text-zinc-500">Key</span>
                        <p className="font-mono text-purple-400">{analysis.key || "N/A"}</p>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-zinc-500">Mood</span>
                      <p className="text-sm text-zinc-300">{analysis.mood}</p>
                    </div>
                    <div className="pt-2 border-t border-zinc-800">
                      <p className="text-xs text-zinc-400 italic">"{analysis.description}"</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center flex-1 text-zinc-600 text-sm">
                    No analysis available
                  </div>
                )}
              </div>
            </div>

            {/* Mixer Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Stem Mixer</h2>
                <div className="flex items-center gap-2 text-xs text-yellow-500/80 bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20">
                  <AlertTriangle size={12} />
                  <span>Preview Mode: Separation is simulated using EQ filters.</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 overflow-x-auto pb-4">
                {tracks.map(track => (
                  <MixerTrack
                    key={track.id}
                    track={track}
                    onVolumeChange={handleVolumeChange}
                    onMuteToggle={handleMute}
                    onSoloToggle={handleSolo}
                    onExport={handleExport}
                    isExporting={exportingId === track.id}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default App;
