import { useRef, useCallback, useEffect } from 'react';

interface AudioProcessingConfig {
  distortion: number; // 0-1, controls distortion amount
  noise: number; // 0-1, controls radio static level
  lowpass: number; // 0-1, controls lowpass filter frequency
  highpass: number; // 0-1, controls highpass filter frequency
  reverb: number; // 0-1, controls reverb amount
  tuningDrift: number; // 0-1, controls frequency drift simulation
  signalModulation: number; // 0-1, controls how much noise modulates with signal
}

const defaultConfig: AudioProcessingConfig = {
  distortion: 0.5,
  noise: 0.25,
  lowpass: 0.7,
  highpass: 0.1,
  reverb: 0.2,
  tuningDrift: 0.1,
  signalModulation: 0.4,
};

export const useAudioProcessing = (
  config: Partial<AudioProcessingConfig> = {}
) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const distortionNodeRef = useRef<WaveShaperNode | null>(null);
  const lowpassNodeRef = useRef<BiquadFilterNode | null>(null);
  const highpassNodeRef = useRef<BiquadFilterNode | null>(null);
  const reverbNodeRef = useRef<ConvolverNode | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const connectedAudioElementRef = useRef<HTMLAudioElement | null>(null);

  // New nodes for realistic radio effects
  const signalAnalyzerRef = useRef<AnalyserNode | null>(null);
  const noiseModulatorRef = useRef<GainNode | null>(null);
  const tuningOscillatorRef = useRef<OscillatorNode | null>(null);
  const tuningGainRef = useRef<GainNode | null>(null);
  const signalModulatorRef = useRef<GainNode | null>(null);
  const noiseGeneratorRef = useRef<ScriptProcessorNode | null>(null);

  const mergedConfig = { ...defaultConfig, ...config };

  // Create realistic radio distortion curve
  const createDistortionCurve = useCallback((amount: number) => {
    const samples = 44100;
    const curve = new Float32Array(samples);

    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // Stronger soft clipping with asymmetric distortion for radio-like character
      const softClip = Math.tanh(x * (1 + amount * 5));
      // Add more pronounced harmonic distortion
      const harmonic = Math.sin(x * Math.PI * 2) * amount * 0.2;
      // Add additional radio-like saturation
      const saturation =
        Math.sign(x) * Math.min(Math.abs(x) * (1 + amount * 2), 1);
      curve[i] = softClip + harmonic + saturation * 0.3;
    }

    return curve;
  }, []);

  // Create realistic radio noise generator
  const createRadioNoiseProcessor = useCallback(
    (audioContext: AudioContext, config: AudioProcessingConfig) => {
      const bufferSize = 4096;
      const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);

      processor.onaudioprocess = (event) => {
        const inputBuffer = event.inputBuffer;
        const outputBuffer = event.outputBuffer;
        const inputData = inputBuffer.getChannelData(0);
        const outputData = outputBuffer.getChannelData(0);

        // Analyze input signal strength for modulation
        let signalStrength = 0;
        for (let i = 0; i < inputData.length; i++) {
          signalStrength += Math.abs(inputData[i]);
        }
        signalStrength /= inputData.length;

        for (let i = 0; i < inputData.length; i++) {
          // Generate noise that modulates with signal strength
          const baseNoise = (Math.random() * 2 - 1) * config.noise;
          const signalModulatedNoise =
            baseNoise * (1 + signalStrength * config.signalModulation);

          // Add frequency-dependent noise (more noise in mid frequencies)
          const freqNoise = Math.sin(i * 0.01) * config.noise * 0.5;

          // Add crackling noise for more realistic radio static
          const crackle =
            Math.random() < 0.05
              ? (Math.random() * 2 - 1) * config.noise * 2
              : 0;

          // Apply distortion to the noise itself for more character
          const distortedNoise = Math.tanh(
            (signalModulatedNoise + freqNoise + crackle) * 1.5
          );

          // Combine original signal with distorted noise
          outputData[i] = inputData[i] + distortedNoise;
        }
      };

      return processor;
    },
    []
  );

  // Create tuning drift oscillator for realistic radio effects
  const createTuningDrift = useCallback(
    (audioContext: AudioContext, amount: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = 0.1 + amount * 0.5; // Very slow drift
      gainNode.gain.value = amount * 0.02; // Subtle frequency modulation

      oscillator.connect(gainNode);
      oscillator.start();

      return { oscillator, gainNode };
    },
    []
  );

  // Create reverb impulse response
  const createReverbImpulse = useCallback(
    (audioContext: AudioContext, duration: number = 2) => {
      const sampleRate = audioContext.sampleRate;
      const length = sampleRate * duration;
      const impulse = audioContext.createBuffer(2, length, sampleRate);

      for (let channel = 0; channel < 2; channel++) {
        const channelData = impulse.getChannelData(channel);
        for (let i = 0; i < length; i++) {
          const decay = Math.pow(1 - i / length, 2);
          channelData[i] = (Math.random() * 2 - 1) * decay;
        }
      }

      return impulse;
    },
    []
  );

  const initializeAudioContext = useCallback(
    async (audioElement: HTMLAudioElement) => {
      // If we already have a context and source node for this exact element, return it
      if (
        audioContextRef.current &&
        sourceNodeRef.current &&
        connectedAudioElementRef.current === audioElement
      ) {
        return audioContextRef.current;
      }

      // Clean up existing context if it exists
      if (audioContextRef.current) {
        cleanup();
      }

      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      // Create source node from audio element
      let sourceNode: MediaElementAudioSourceNode;
      try {
        console.log(
          'Creating MediaElementSourceNode for audio element:',
          audioElement.src
        );
        sourceNode = audioContext.createMediaElementSource(audioElement);
        sourceNodeRef.current = sourceNode;
        connectedAudioElementRef.current = audioElement;
        console.log('Successfully created MediaElementSourceNode');
      } catch (error) {
        console.error(
          'Audio element already connected to another MediaElementSourceNode:',
          error
        );
        // If the audio element is already connected, we can't use it for audio processing
        // Return null to indicate that audio processing cannot be initialized
        return null;
      }

      // Create gain nodes
      const inputGain = audioContext.createGain();
      const outputGain = audioContext.createGain();
      gainNodeRef.current = inputGain;
      outputNodeRef.current = outputGain;

      // Create signal analyzer for modulation
      const signalAnalyzer = audioContext.createAnalyser();
      signalAnalyzer.fftSize = 256;
      signalAnalyzerRef.current = signalAnalyzer;

      // Create realistic radio noise processor
      const noiseProcessor = createRadioNoiseProcessor(
        audioContext,
        mergedConfig
      );
      noiseGeneratorRef.current = noiseProcessor;

      // Create distortion node with realistic radio curve
      const distortionNode = audioContext.createWaveShaper();
      distortionNode.curve = createDistortionCurve(mergedConfig.distortion);
      distortionNode.oversample = '4x';
      distortionNodeRef.current = distortionNode;

      // Create filters with more realistic radio characteristics
      const highpassFilter = audioContext.createBiquadFilter();
      highpassFilter.type = 'highpass';
      highpassFilter.frequency.value = 80 * mergedConfig.highpass;
      highpassFilter.Q.value = 0.5; // Gentler rolloff
      highpassNodeRef.current = highpassFilter;

      const lowpassFilter = audioContext.createBiquadFilter();
      lowpassFilter.type = 'lowpass';
      lowpassFilter.frequency.value = 8000 + 12000 * mergedConfig.lowpass; // More realistic radio bandwidth
      lowpassFilter.Q.value = 0.7; // Gentler rolloff
      lowpassNodeRef.current = lowpassFilter;

      // Create tuning drift for realistic radio effects
      const tuningDrift = createTuningDrift(
        audioContext,
        mergedConfig.tuningDrift
      );
      tuningOscillatorRef.current = tuningDrift.oscillator;
      tuningGainRef.current = tuningDrift.gainNode;

      // Create reverb with more subtle radio-like characteristics
      const reverbImpulse = createReverbImpulse(audioContext, 0.8); // Shorter, more subtle
      const reverbNode = audioContext.createConvolver();
      reverbNode.buffer = reverbImpulse;
      reverbNodeRef.current = reverbNode;

      const reverbGain = audioContext.createGain();
      reverbGain.gain.value = mergedConfig.reverb * 0.15; // More subtle

      // Connect realistic radio audio graph
      sourceNode
        .connect(inputGain)
        .connect(signalAnalyzer) // Analyze signal for modulation
        .connect(noiseProcessor) // Apply realistic noise processing
        .connect(distortionNode) // Apply radio distortion
        .connect(highpassFilter) // Remove low frequencies
        .connect(lowpassFilter) // Limit high frequencies
        .connect(outputGain);

      // Add tuning drift modulation to lowpass filter
      tuningDrift.gainNode.connect(lowpassFilter.frequency);

      // Add subtle reverb send
      inputGain.connect(reverbGain);
      reverbGain.connect(reverbNode);
      reverbNode.connect(outputGain);

      // Connect to destination
      outputGain.connect(audioContext.destination);

      return audioContext;
    },
    [
      mergedConfig,
      createDistortionCurve,
      createRadioNoiseProcessor,
      createTuningDrift,
      createReverbImpulse,
    ]
  );

  const updateDistortion = useCallback(
    (amount: number) => {
      if (distortionNodeRef.current) {
        distortionNodeRef.current.curve = createDistortionCurve(amount);
      }
    },
    [createDistortionCurve]
  );

  const updateNoise = useCallback((amount: number) => {
    // Noise is now handled by the script processor, so we need to recreate it
    // This is a limitation of the Web Audio API - we can't easily update script processors
    console.log('Noise level updated to:', amount);
  }, []);

  const updateLowpass = useCallback((amount: number) => {
    if (lowpassNodeRef.current) {
      lowpassNodeRef.current.frequency.value = 8000 + 12000 * amount;
    }
  }, []);

  const updateHighpass = useCallback((amount: number) => {
    if (highpassNodeRef.current) {
      highpassNodeRef.current.frequency.value = 80 * amount;
    }
  }, []);

  const updateReverb = useCallback((amount: number) => {
    if (reverbNodeRef.current) {
      // Reverb gain is handled by a separate gain node in the connection
      // This would need to be updated if we had a reference to it
    }
  }, []);

  const updateTuningDrift = useCallback((amount: number) => {
    if (tuningOscillatorRef.current && tuningGainRef.current) {
      tuningOscillatorRef.current.frequency.value = 0.1 + amount * 0.5;
      tuningGainRef.current.gain.value = amount * 0.02;
    }
  }, []);

  const updateSignalModulation = useCallback((amount: number) => {
    // Signal modulation is handled by the script processor
    // This would require recreating the processor to update
    console.log('Signal modulation updated to:', amount);
  }, []);

  const updateVolume = useCallback((volume: number) => {
    if (outputNodeRef.current) {
      outputNodeRef.current.gain.value = volume;
    }
  }, []);

  const cleanup = useCallback(() => {
    if (tuningOscillatorRef.current) {
      tuningOscillatorRef.current.stop();
      tuningOscillatorRef.current = null;
    }

    if (noiseGeneratorRef.current) {
      noiseGeneratorRef.current.disconnect();
      noiseGeneratorRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    sourceNodeRef.current = null;
    gainNodeRef.current = null;
    distortionNodeRef.current = null;
    lowpassNodeRef.current = null;
    highpassNodeRef.current = null;
    reverbNodeRef.current = null;
    outputNodeRef.current = null;
    connectedAudioElementRef.current = null;
    signalAnalyzerRef.current = null;
    noiseModulatorRef.current = null;
    tuningGainRef.current = null;
    signalModulatorRef.current = null;
  }, []);

  // Update effects when config changes
  useEffect(() => {
    updateDistortion(mergedConfig.distortion);
    updateNoise(mergedConfig.noise);
    updateLowpass(mergedConfig.lowpass);
    updateHighpass(mergedConfig.highpass);
    updateReverb(mergedConfig.reverb);
    updateTuningDrift(mergedConfig.tuningDrift);
    updateSignalModulation(mergedConfig.signalModulation);
  }, [
    mergedConfig,
    updateDistortion,
    updateNoise,
    updateLowpass,
    updateHighpass,
    updateReverb,
    updateTuningDrift,
    updateSignalModulation,
  ]);

  return {
    initializeAudioContext,
    updateDistortion,
    updateNoise,
    updateLowpass,
    updateHighpass,
    updateReverb,
    updateTuningDrift,
    updateSignalModulation,
    updateVolume,
    cleanup,
  };
};

export default useAudioProcessing;
