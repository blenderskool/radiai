class NoiseProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.noiseLevel = 0.25;
    this.signalModulation = 0.4;

    // Listen for parameter updates from the main thread
    this.port.onmessage = (event) => {
      if (event.data.type === 'updateNoise') {
        this.noiseLevel = event.data.value;
      } else if (event.data.type === 'updateSignalModulation') {
        this.signalModulation = event.data.value;
      }
    };
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];

    if (input.length === 0) return true;

    // Process both left and right channels for stereo
    const numChannels = Math.min(input.length, output.length);

    for (let channel = 0; channel < numChannels; channel++) {
      const inputChannel = input[channel];
      const outputChannel = output[channel];

      if (!inputChannel || !outputChannel) continue;

      // Analyze input signal strength for modulation (use left channel for consistency)
      let signalStrength = 0;
      if (channel === 0) {
        for (let i = 0; i < inputChannel.length; i++) {
          signalStrength += Math.abs(inputChannel[i]);
        }
        signalStrength /= inputChannel.length;
      }

      for (let i = 0; i < inputChannel.length; i++) {
        // Generate noise that modulates with signal strength
        const baseNoise = (Math.random() * 2 - 1) * this.noiseLevel;
        const signalModulatedNoise =
          baseNoise * (1 + signalStrength * this.signalModulation);

        // Add frequency-dependent noise (more noise in mid frequencies)
        const freqNoise = Math.sin(i * 0.01) * this.noiseLevel * 0.5;

        // Add crackling noise for more realistic radio static
        const crackle =
          Math.random() < 0.05
            ? (Math.random() * 2 - 1) * this.noiseLevel * 2
            : 0;

        // Apply distortion to the noise itself for more character
        const distortedNoise = Math.tanh(
          (signalModulatedNoise + freqNoise + crackle) * 1.5
        );

        // Combine original signal with distorted noise
        outputChannel[i] = inputChannel[i] + distortedNoise;
      }
    }

    return true;
  }
}

registerProcessor('noise-processor', NoiseProcessor);
