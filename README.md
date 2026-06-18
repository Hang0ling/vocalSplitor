# SonicSplit AI

SonicSplit AI is a browser-based audio stem separation and analysis prototype. It combines local Web Audio processing with Gemini-powered song analysis to create an interactive mixer for vocals, drums, bass, and other stems.

Original AI Studio project:
https://ai.studio/apps/drive/13iSNCfjwgtqS5VmgLph_epEiZP8SxQXP

## What It Does

- Accepts an uploaded audio file from the browser.
- Creates simulated frequency-based stems for vocals, drums, bass, and other sounds.
- Provides a mixer interface for muting, soloing, volume control, and playback.
- Displays waveform and visual feedback while audio is playing.
- Sends audio context to Gemini for descriptive analysis.
- Shows analysis results such as song structure, likely instruments, and production notes.

## Tech Stack

- React 19
- TypeScript
- Vite
- Web Audio API
- `@google/genai`
- Lucide React icons

## Project Structure

- `App.tsx` - Upload flow, playback state, Gemini analysis state, and main UI.
- `services/audioProcessor.ts` - Local audio processing and simulated stem generation.
- `services/geminiService.ts` - Gemini audio analysis.
- `components/Visualizer.tsx` - Audio visualization.
- `components/MixerTrack.tsx` - Individual mixer track controls.
- `constants.ts` - Stem and UI constants.
- `types.ts` - Shared app types.

## Requirements

- Node.js 18 or newer
- A Gemini API key for AI analysis
- A modern browser with Web Audio support

Create `.env.local` in the project root:

```bash
GEMINI_API_KEY=your_gemini_api_key
```

## Run Locally

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite.

## Build

```bash
npm run build
npm run preview
```

## Notes

- Stem separation is a browser-side simulation, not a production-grade source separation model.
- Gemini analysis depends on API quota and supported media input behavior.
- Uploaded audio is handled in the browser for playback and processing.
