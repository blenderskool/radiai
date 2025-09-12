import { create } from 'zustand';

interface RadioControlsStore {
  channel: number;
  volume: number;
  bass: number;
  setChannel: (channel: number) => void;
  setVolume: (volume: number) => void;
  setBass: (bass: number) => void;
}

const useRadioControlsStore = create<RadioControlsStore>()((set) => ({
  channel: 88,
  volume: 0,
  bass: 0,
  setChannel: (channel: number) => set({ channel }),
  setVolume: (volume: number) => set({ volume }),
  setBass: (bass: number) => set({ bass }),
}));

export default useRadioControlsStore;
