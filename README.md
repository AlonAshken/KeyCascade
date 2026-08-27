# KeyCascade — Pro 4K 60 FPS Piano MIDI Visualizer & Video Generator

**KeyCascade** is a high-performance web-based Piano MIDI Visualizer and 60 FPS Video Studio developed by **Alon Ashkenazi**. Inspired by *Grim Cat Piano*, *Rousseau*, and *SeeMusic*, it transforms standard MIDI files into cinematic visual spectacles with crystal facet diamond notes, winding stardust vortex dissolves, glowing strike lines, and offline 4K 60 FPS rendering.

GitHub Repository: [https://github.com/AlonAshken/KeyCascade](https://github.com/AlonAshken/KeyCascade)

---

## ✨ Features & Capabilities

### 💎 Note Appearance Styles (Grim Cat Signature)
- **Crystal Diamond Facets (Grim Cat Style)**: Notes rendered with internal geometric facets, specular glints, and white-hot refraction cores that sparkle as they cascade down.
- **Neon Capsule (Rousseau Style)**: Smooth rounded pills with dual-hand color gradients and 3D highlight borders.
- **Frosted Glass**: Translucent milky glass with high-intensity neon borders.
- **Clean Flat Modern**: Crisp, minimalist solid tone bars.

### 🌌 Dissolving Stardust & Particle Physics
- **Ethereal Stardust Vortex (Grim Cat Signature)**: As notes strike the keyboard, they dissolve into ascending ribbons of sparkling stardust motes with sinuous vortex winding motion and twinkling luminance.
- **Collision Spark Bursts**: Physics-based explosive spark bursts scaling with MIDI velocity, air drag, and gravity.
- **Ambient Floating Bokeh**: Cinematic out-of-focus glowing dust spheres gently floating in the dark atmosphere.
- **Strike Line / Saber Bar**: Glowing neon laser line with dynamic radial flares above active keys.

### 🎹 Authentic 88-Key Steinway Piano Geometry
- Full 88-key acoustic grand piano layout (MIDI 21 to 108: A0 to C8).
- 52 ivory white keys and 36 ebony black keys with natural acoustic spacing in groups of 2 (C#, D#) and 3 (F#, G#, A#).
- Strict horizontal note-to-key width and center alignment.
- Interactive virtual keys: click or tap keys to audition acoustic grand piano tones in real time.

### 🎬 Offline 60 FPS Video Studio (1080p & 4K)
- **Deterministic Frame-by-Frame Recording**: Offline non-real-time renderer guaranteeing **zero dropped frames**.
- **Full Song Export**: Full duration export with synchronized grand piano audio track.
- **Lockstep Interleaved Audio-Video Muxing**: Guarantees playback compatibility across Windows Media Player, QuickTime, VLC, DaVinci Resolve, and Premiere Pro.
- **Resolutions**: 4K Ultra HD (3840×2160), 1080p Full HD (1920×1080), and 720p at 60 FPS.
- **Formats**:
  - `MP4` (H.264 / AVC) for YouTube and video editing suites.
  - `WebM` (VP9) supporting alpha transparent backgrounds for video overlays.
- **Background Modes**: Pure Black (`#000000`) for "Screen" blending in Premiere/DaVinci, Alpha Transparent, Green Screen (`#00FF00`), and Dark Studio Vignette.

### 🎵 MIDI & Audio Synthesis
- Multi-track and single-track `.mid` / `.midi` parser using `@tonejs/midi` with automatic hand splitting.
- Built-in classical and virtuoso demo library (*Für Elise*, *Moonlight Sonata*, *KeyCascade Crystal Virtuoso Run*).
- Polyphonic grand piano synthesis engine with velocity envelopes, acoustic soundboard lowpass filtering, and concert hall reverberation.

---

## 🛠️ Architecture

```
KeyCascade/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── src/
│   ├── types/
│   │   └── visualizer.ts          # Note, Key, Theme, Particle, and Export types
│   ├── services/
│   │   ├── midiParser.ts          # @tonejs/midi parser, track extraction, hand separation
│   │   ├── pianoGeometry.ts       # 88-key acoustic layout math and note coordinates
│   │   ├── particleSystem.ts      # Grim Cat stardust vortex and spark physics
│   │   ├── visualizerRenderer.ts  # 60 FPS Canvas render loop, crystal facets, saber line
│   │   ├── audioSynth.ts          # Web Audio synth and offline audio renderer
│   │   ├── videoExporter.ts       # Deterministic 60 FPS 1080p/4K offline video exporter
│   │   ├── demoSongs.ts           # Classical and virtuoso demo pieces
│   │   └── themePresets.ts        # Grim Cat Amethyst, Cyberpunk Neon, Rousseau Fire, etc.
│   ├── components/
│   │   ├── Header.tsx             # Brand header, file upload, demo songs, export trigger
│   │   ├── CanvasViewport.tsx     # High-DPI canvas preview with FPS counter
│   │   ├── TransportControls.tsx  # Play/pause, scrubber, speed, volume, loop
│   │   ├── CustomizationSidebar.tsx # Note styles, stardust, glow, particles, colors
│   │   └── ExportModal.tsx        # Video export progress dialog and download
│   ├── App.tsx                    # Main state coordinator
│   └── main.tsx                   # React root mount
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### Build for Production
```bash
npm run build
```

---

## 👤 Author
**Alon Ashkenazi**
- GitHub: [@AlonAshken](https://github.com/AlonAshken)
- Repository: [AlonAshken/KeyCascade](https://github.com/AlonAshken/KeyCascade)
