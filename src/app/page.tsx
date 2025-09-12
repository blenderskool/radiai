'use client';
import { Radio } from '@/components/Radio';
import { ContactShadows, Environment, OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';

export default function Home() {
  return (
    <div className="h-full">
      <Canvas
        shadows="soft"
        camera={{
          position: [3, 0.5, 5],
          fov: 35,
        }}
      >
        <color attach="background" args={['#27201d']} />
        <Environment preset="city" />
        <ambientLight intensity={0.5} />
        <directionalLight
          intensity={8}
          position={[-10, 10, 5]}
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.00001}
          castShadow
        >
          <orthographicCamera
            attach="shadow-camera"
            args={[-10, 10, -10, 10]}
          />
        </directionalLight>

        <Radio />
        <ContactShadows
          opacity={1}
          scale={10}
          blur={4}
          far={0.8}
          color="#27201d"
        />

        <OrbitControls
          target={[0, 1.25, 0]}
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI / 2.5}
          maxPolarAngle={Math.PI / 2}
          minAzimuthAngle={-Math.PI / 4}
          maxAzimuthAngle={Math.PI / 4}
          makeDefault
        />
      </Canvas>

      <div className="fixed bottom-4 right-4 flex flex-col gap-2 items-end">
        <a
          href="https://akashhamirwasia.com"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white/10 py-1.5 px-2.5 rounded-full text-xs font-medium text-[#e4dccf] hover:bg-white/20 hover:text-white transition-colors outline-[#e4dccf]"
        >
          Built by Akash Hamirwasia
        </a>
        <a
          href="https://elevenlabs.io/music"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white/10 py-1.5 px-2.5 rounded-full text-xs font-medium text-[#e4dccf] hover:bg-white/20 hover:text-white transition-colors outline-[#e4dccf]"
        >
          Music by ElevenLabs
        </a>
      </div>
    </div>
  );
}
