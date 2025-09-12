import { create } from 'zustand';

interface RadioControlsStore {
  isOn: boolean;
  channel: number;
  volume: number;
  bass: number;
  setIsOn: (isOn: boolean) => void;
  setChannel: (channel: number) => void;
  setVolume: (volume: number) => void;
  setBass: (bass: number) => void;
}

const useRadioControlsStore = create<RadioControlsStore>()((set) => ({
  isOn: false,
  channel: 88,
  volume: 1,
  bass: 0.5,
  setIsOn: (isOn: boolean) => set({ isOn }),
  setChannel: (channel: number) => set({ channel }),
  setVolume: (volume: number) => set({ volume }),
  setBass: (bass: number) => set({ bass }),
}));

export default useRadioControlsStore;
