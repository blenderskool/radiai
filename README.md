<div align="center">
  <br />
  <h1>📻 Radiai</h1>
  <p>
    A vintage 3D tunable radio experience that plays AI generated music!
  </p>
  <br />
</div>

![](https://github.com/blenderskool/radiai/blob/main/public/site-preview.jpg)

This is a small experiment of building an AI music radio as a vintage 3D radio experience.
- You can **interact** with the radio model's buttons and knobs to change stations, and control the volume, bass, and tuning, mimicking the look and feel of a real radio.
- The audio output is processed with Web Audio API to add distortions and noise.
- A hash-based logic is used to determine the active track in each station so that all listeners get a **live** listening experience.
- Currently, the music library is small and static in nature, but the ability to have music generated dynamically should be possible to add.
- Music was generated using [ElevenLabs Music](https://elevenlabs.io/music)

### Stack
- Next.js
- TypeScript
- Three.js with React Three Fiber
- Web Audio API
- Appwrite storage bucket, sites for deployment.

### Development

Start the development server:
```bash
npm run dev
```

Open [http://localhost:4321](http://localhost:4321) on the browser to see the webpage.
