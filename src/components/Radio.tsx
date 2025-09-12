import useRadio from '@/hooks/useRadio';
import useRadioControlsStore from '@/hooks/useRadioControls';
import { useCursor, useGLTF } from '@react-three/drei';
import { ObjectMap, useThree } from '@react-three/fiber';
import { animate } from 'motion';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTF, OrbitControls } from 'three-stdlib';
import { clamp } from 'three/src/math/MathUtils.js';
import useSound from 'use-sound';

function TunerButton({
  geometry,
  material,
  position,
  isActive,
  onClick,
}: {
  geometry: any;
  material: any;
  position: any;
  isActive: boolean;
  onClick: (e: any) => void;
}) {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  const mesh = useRef<THREE.Mesh>(null);
  const [buttonPressed] = useSound('/sfx/button-pressed.mp3');
  const [buttonReleased] = useSound('/sfx/button-released.mp3');

  useEffect(() => {
    if (!mesh.current) return;
    if (isActive) {
      animate([
        [mesh.current.position, { z: 0.33 }, { duration: 0.12 }],
        [mesh.current.position, { z: 0.37 }, { duration: 0.08 }],
      ]);
      buttonPressed();
    } else {
      animate([
        [mesh.current.position, { z: 0.33 }, { duration: 0.08 }],
        [mesh.current.position, { z: 0.435 }, { duration: 0.12 }],
      ]);
    }
  }, [isActive]);

  return (
    <mesh
      ref={mesh}
      castShadow
      receiveShadow
      geometry={geometry}
      material={material}
      position={position}
      scale={[0.065, 0.032, 0.066]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
        if (isActive) {
          buttonReleased();
        }
      }}
    />
  );
}

const mapRange = (
  value: number,
  [fromMin, fromMax]: [number, number],
  [toMin, toMax]: [number, number]
) => {
  return toMin + ((value - fromMin) * (toMax - toMin)) / (fromMax - fromMin);
};

function TunerMarker({
  geometry,
  material,
  channel,
}: {
  geometry: any;
  material: any;
  channel: number;
}) {
  const mesh = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (!mesh.current) return;
    const x = mapRange(channel, [87, 108], [0.39, 1]);
    const controller = animate(
      mesh.current.position,
      { x },
      { type: 'spring', mass: 0.4, stiffness: 150, damping: 12 }
    );
    () => controller.stop();
  }, [channel]);

  return (
    <mesh
      ref={mesh}
      castShadow
      receiveShadow
      geometry={geometry}
      material={material}
      position={[0.831, 1.031, 0.396]}
      scale={[0.004, 0.05, 0.004]}
    />
  );
}

const Antena = ({ gltf }: { gltf: GLTF & ObjectMap }) => {
  const controls = useThree((state) => state.controls as OrbitControls);
  const mesh = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered, 'grab');

  const [isSoundPlaying, setIsSoundPlaying] = useState(false);
  const [antennaHinge] = useSound('/sfx/antenna-hinge.mp3', {
    volume: 0.1,
    onplay: () => setIsSoundPlaying(true),
    onend: () => setIsSoundPlaying(false),
  });

  return (
    <>
      <mesh
        ref={mesh}
        castShadow
        receiveShadow
        geometry={gltf.nodes.Antenna.geometry}
        material={gltf.materials.Metal}
        position={[-1.017, 1.829, -0.22]}
        rotation={[0, 0, -1.174]}
        scale={0.022}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
        onPointerDown={(e) => {
          e.stopPropagation();
          e.target?.setPointerCapture(e.pointerId);
          controls.enabled = false;
        }}
        onPointerMove={(e) => {
          if (!mesh.current) return;
          if (!e.target?.hasPointerCapture(e.pointerId)) return;

          const newRotation = clamp(
            mesh.current.rotation.z - e.movementY * 0.005,
            -Math.PI / 2.5,
            -Math.PI / 4
          );

          if (
            !isSoundPlaying &&
            Math.random() > 0.97 &&
            mesh.current.rotation.z !== newRotation
          ) {
            antennaHinge();
          }

          mesh.current.rotation.z = newRotation;
        }}
        onPointerUp={(e) => {
          e.stopPropagation();
          e.target?.releasePointerCapture(e.pointerId);
          controls.enabled = true;
        }}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={gltf.nodes.Antenna_Holder.geometry}
        material={gltf.materials.Metal}
        position={[-1.034, 1.823, -0.247]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={0.026}
      />
    </>
  );
};

const Knob = ({
  children,
  onChange,
}: {
  children?: React.ReactNode;
  onChange: (delta: number) => void;
}) => {
  const mesh = useRef<THREE.Group>(null);
  const controls = useThree((state) => state.controls as OrbitControls);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered, 'grab');

  return (
    <group
      ref={mesh}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
      onPointerDown={(e) => {
        e.stopPropagation();
        e.target?.setPointerCapture(e.pointerId);
        controls.enabled = false;
      }}
      onPointerMove={(e) => {
        if (!mesh.current) return;
        if (!e.target?.hasPointerCapture(e.pointerId)) return;

        const dist = e.movementX;
        const delta = Math.round(dist * 0.01 * 50) / 50;
        onChange(delta);
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        e.target?.releasePointerCapture(e.pointerId);
        controls.enabled = true;
      }}
    >
      {children}
    </group>
  );
};

export function Radio(props: any) {
  const { channel, setChannel, volume, setVolume, bass, setBass } =
    useRadioControlsStore((state) => state);
  const [channelKnob, setChannelKnob] = useState(0);
  const [knobTick] = useSound('/sfx/knob-tick.mp3', { volume: 0.2 });

  // Use the radio hook for live audio functionality
  const radio = useRadio();

  // Apply volume to the audio element
  const gltf = useGLTF('/radio-1.glb');
  const { nodes, materials } = gltf;
  return (
    <group {...props} dispose={null}>
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Radio_Box.geometry}
        material={materials.Wood}
        material-map-colorSpace={THREE.SRGBColorSpace}
        position={[-0.004, 0.938, 0]}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Radio_Box_Frame.geometry}
        material={materials.Cream}
        position={[-0.004, 0.938, 0]}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Speaker_Padding.geometry}
        material={materials.Frame}
        position={[-0.705, 0.933, 0.513]}
        scale={[0.997, 0.998, 1]}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Controls_Padding.geometry}
        material={materials.Frame}
        position={[-0.004, 0.938, 0]}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Bottom_Padding.geometry}
        material={materials.Frame}
        position={[-0.004, 0.938, 0]}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Speaker_Grill.geometry}
        material={materials['Wood.001']}
        position={[-0.705, 0.933, 0.488]}
        scale={0.985}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Speaker_Backplate.geometry}
        material={materials.Material}
        position={[-0.004, 0.938, 0.293]}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Tuner_Backplate.geometry}
        material={materials['Material.001']}
        position={[-0.004, 0.938, 0]}
      />

      <TunerMarker
        geometry={nodes.Tuner_Marker.geometry}
        material={materials['Material.002']}
        channel={channel}
      />

      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Tuner_Marking_Lines.geometry}
        material={materials['Material.003']}
        position={[0.73, 0.961, 0.384]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[0.377, 0.003, 0.001]}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Tuner_Button_Markings.geometry}
        material={materials['Material.003']}
        position={[1.102, 0.901, 0.384]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={[0.002, 0.002, 0.008]}
      />

      <Antena gltf={gltf} />

      <Knob
        onChange={(delta) => {
          const newVolume = clamp(volume + delta, 0, 1);
          if (newVolume !== volume) {
            knobTick();
            setVolume(newVolume);
            // Start playback when user adjusts volume
            radio.play();
          }
        }}
      >
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.Knob_1.geometry}
          material={materials.Metal}
          position={[0.314, 1.413, 0.57]}
          rotation={[Math.PI / 2, volume * -1.65 * Math.PI, 0]}
        >
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.Knob_1_Indicator.geometry}
            material={materials.Metal}
            position={[-0.036, -0.005, 0.059]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[0.007, 0.007, 0.004]}
          />
        </mesh>
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.Knob_1_Front.geometry}
          material={materials.Anisotropy}
          position={[0.314, 1.413, 0.57]}
          rotation={[Math.PI / 2, 0, 0]}
        />
      </Knob>
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Knob_1_Marking.geometry}
        material={materials['Cream.001']}
        position={[0.314, 1.413, 0.442]}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Knob_1_Ring.geometry}
        material={materials.Metal}
        position={[0.314, 1.413, 0.452]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={0.111}
      />

      <Knob
        onChange={(delta) => {
          const newChannelKnob = channelKnob + delta;
          if (newChannelKnob !== channelKnob) {
            knobTick();
            setChannelKnob(newChannelKnob);
            const newChannel = clamp(channel + delta * 3, 87, 108);
            setChannel(newChannel);
            // Start playback when user changes channel
            radio.play();
          }
        }}
      >
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.Knob_2.geometry}
          material={materials.Metal}
          position={[0.699, 1.413, 0.57]}
          rotation={[Math.PI / 2, channelKnob * -1.65 * Math.PI, 0]}
        >
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.Knob_2_Indicator.geometry}
            material={materials.Metal}
            position={[-0.036, -0.005, 0.059]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[0.007, 0.007, 0.004]}
          />
        </mesh>
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.Knob_2_Front.geometry}
          material={materials.Anisotropy}
          position={[0.699, 1.413, 0.57]}
          rotation={[Math.PI / 2, 0, 0]}
        />
      </Knob>
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Knob_2_Marking.geometry}
        material={materials['Cream.001']}
        position={[0.699, 1.413, 0.442]}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Knob_2_Ring.geometry}
        material={materials.Metal}
        position={[0.699, 1.413, 0.452]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={0.111}
      />

      <Knob
        onChange={(delta) => {
          setBass(clamp(bass + delta, 0, 1));
          const newBass = clamp(bass + delta, 0, 1);
          if (newBass !== bass) {
            knobTick();
            setBass(newBass);
            // Start playback when user adjusts bass
            radio.play();
          }
        }}
      >
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.Knob_3.geometry}
          material={materials.Metal}
          position={[1.091, 1.413, 0.57]}
          rotation={[Math.PI / 2, bass * -1.65 * Math.PI, 0]}
        >
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.Knob_3_Indicator.geometry}
            material={materials.Metal}
            position={[-0.036, -0.005, 0.059]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={[0.007, 0.007, 0.004]}
          />
        </mesh>
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.Knob_3_Front.geometry}
          material={materials.Anisotropy}
          position={[1.091, 1.413, 0.57]}
          rotation={[Math.PI / 2, 0, 0]}
        />
      </Knob>

      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Knob_3_Marking.geometry}
        material={materials['Cream.001']}
        position={[1.091, 1.413, 0.442]}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Knob_3_Ring.geometry}
        material={materials.Metal}
        position={[1.091, 1.413, 0.452]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={0.111}
      />
      <group position={[1.089, 1.864, -0.006]} scale={0.893}>
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.Circle002.geometry}
          material={materials.Metal}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.Circle002_1.geometry}
          material={materials.Anisotropy}
        />
      </group>
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Knob_4_Ring.geometry}
        material={materials.Metal}
        position={[1.089, 1.809, -0.006]}
        scale={0.097}
      />
      <group
        position={[1.56, 1.339, -0.033]}
        rotation={[0, 0, -Math.PI / 2]}
        scale={[1.556, 1.081, 1.556]}
      >
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.Circle002.geometry}
          material={materials.Metal}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.Circle002_1.geometry}
          material={materials.Anisotropy}
        />
      </group>
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Knob_5_Ring.geometry}
        material={materials.Metal}
        position={[1.497, 1.339, -0.033]}
        rotation={[0, 0, -Math.PI / 2]}
        scale={0.169}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Leg_1.geometry}
        material={materials['Wood.002']}
        position={[-1.157, 0.041, 0.002]}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Leg_2.geometry}
        material={materials['Wood.002']}
        position={[1.123, 0.041, 0.002]}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Tuner_Markings_Text.geometry}
        material={materials['Material.003']}
        position={[0.421, 0.929, 0.384]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={0.028}
      />

      {/* Tuner Buttons */}
      <TunerButton
        geometry={nodes.Tuner_Button_1.geometry}
        material={materials['Cream.001']}
        position={[0.324, 0.867, 0.435]}
        onClick={() => {
          setChannel(channel === 88 ? 87 : 88);
          radio.play();
        }}
        isActive={channel === 88}
      />
      <TunerButton
        geometry={nodes.Tuner_Button_2.geometry}
        material={materials['Cream.001']}
        position={[0.457, 0.867, 0.435]}
        onClick={() => {
          setChannel(channel === 92 ? 87 : 92);
          radio.play();
        }}
        isActive={channel === 92}
      />
      <TunerButton
        geometry={nodes.Tuner_Button_3.geometry}
        material={materials['Cream.001']}
        position={[0.59, 0.867, 0.435]}
        onClick={() => {
          setChannel(channel === 94 ? 87 : 94);
          radio.play();
        }}
        isActive={channel === 94}
      />
      <TunerButton
        geometry={nodes.Tuner_Button_4.geometry}
        material={materials['Cream.001']}
        position={[0.723, 0.867, 0.435]}
        onClick={() => {
          setChannel(channel === 96 ? 87 : 96);
          radio.play();
        }}
        isActive={channel === 96}
      />
      <TunerButton
        geometry={nodes.Tuner_Button_5.geometry}
        material={materials['Cream.001']}
        position={[0.856, 0.867, 0.435]}
        onClick={() => {
          setChannel(channel === 102 ? 87 : 102);
          radio.play();
        }}
        isActive={channel === 102}
      />
      <TunerButton
        geometry={nodes.Tuner_Button_6.geometry}
        material={materials['Cream.001']}
        position={[0.988, 0.867, 0.435]}
        onClick={() => {
          setChannel(channel === 104 ? 87 : 104);
          radio.play();
        }}
        isActive={channel === 104}
      />
      <TunerButton
        geometry={nodes.Tuner_Button_7.geometry}
        material={materials['Cream.001']}
        position={[1.121, 0.867, 0.435]}
        onClick={() => {
          setChannel(channel === 107 ? 87 : 107);
          radio.play();
        }}
        isActive={channel === 107}
      />

      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Text001.geometry}
        material={materials['Cream.001']}
        position={[0.702, 1.586, 0.442]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={0.041}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Text.geometry}
        material={materials['Cream.001']}
        position={[0.318, 1.586, 0.442]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={0.041}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Text002.geometry}
        material={materials['Cream.001']}
        position={[1.094, 1.586, 0.442]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={0.041}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Text003.geometry}
        material={materials['Cream.001']}
        position={[0.233, 1.275, 0.442]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={0.03}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Text004.geometry}
        material={materials['Cream.001']}
        position={[0.404, 1.275, 0.442]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={0.03}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Text005.geometry}
        material={materials['Cream.001']}
        position={[1.011, 1.275, 0.442]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={0.03}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Text006.geometry}
        material={materials['Cream.001']}
        position={[1.182, 1.275, 0.442]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={0.03}
      />
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Controls_Backplate.geometry}
        material={materials.Wood}
        material-map-colorSpace={THREE.SRGBColorSpace}
        position={[-0.004, 0.938, 0]}
      />
    </group>
  );
}

useGLTF.preload('/radio-1.glb');
