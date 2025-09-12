import { mapRange } from '@/utils/number';
import { useEffect, useRef, useState } from 'react';
import { clamp } from 'three/src/math/MathUtils.js';

import useAudioProcessing from './useAudioProcessing';
import useRadioControlsStore from './useRadioControls';

// Find and set the current song from live data

const fetchLiveData = async (): Promise<any> => {
  const response = await fetch(`/api/live`);
  if (!response.ok) {
    throw new Error('Failed to fetch live data');
  }
  const data = await response.json();
  return data;
};

const getAudioProcessingConfig = (channelOffset: number, bass: number) => {
  return {
    distortion: mapRange(channelOffset, [0, 1], [0.05, 0.8]), // 0-1, higher = more distortion (0.2 = subtle, 0.6 = heavy)
    noise: mapRange(channelOffset, [0.5, 3], [0, 0.015]), // 0-1, higher = more static noise (0.1 = clean, 0.4 = very noisy)
    lowpass: 1, // 0-1, lower = more muffled sound (0.3 = very muffled, 0.8 = clear)
    highpass: mapRange(bass, [0, 1], [10, 0.1], false), // 0-1, higher = removes more bass (0.05 = full bass, 0.3 = thin)
    reverb: 0.1, // 0-1, higher = more echo/reverb (0.1 = dry, 0.5 = very echoey)
    tuningDrift: 0.6, // 0-1, higher = more frequency drift (0.05 = stable, 0.3 = wobbly)
    signalModulation: 0.8, // 0-1, higher = noise modulates more with signal (0.1 = constant, 0.5 = very dynamic)
  };
};

const findNearestSong = (data: Record<string, any>, channel: number) => {
  let station = data[channel.toString()];
  let channelOffset = 0;

  if (!station) {
    const stations = Object.keys(data).map((station) => Number(station));
    // Find closest station from channel
    const closestStation = stations.reduce((closest: any, station: any) => {
      return Math.abs(station - channel) < Math.abs(closest - channel)
        ? station
        : closest;
    }, stations[0]);
    channelOffset = Math.abs(closestStation - channel);
    station = data[closestStation.toString()];
  }

  const song = {
    url: station.song.url,
    duration: station.totalDuration,
    currentPart: station.part,
    remainingTime: station.remainingTime,
    station: station.station,
    timestamp: station.timestamp,
  };

  return [song, channelOffset] as const;
};

// Calculate time offset between API and client
const calculateTimeOffset = (apiTimestamp: string) => {
  const apiTime = new Date(apiTimestamp).getTime();
  const clientTime = Date.now();
  return clientTime - apiTime;
};

const useRadio = () => {
  const overallVolume = useRadioControlsStore((state) => state.volume);
  const channel = useRadioControlsStore((state) => state.channel);
  const bass = useRadioControlsStore((state) => state.bass);

  const [liveData, setLiveData] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const currentSongDataRef = useRef<any>(null);
  const [channelOffset, setChannelOffset] = useState(0);

  const offsetVolume = clamp(
    mapRange(channelOffset, [0, 2], [overallVolume, 0], false),
    0,
    overallVolume
  );

  const audioProcessingConfig = getAudioProcessingConfig(channelOffset, bass);

  const { initializeAudioContext, updateVolume } = useAudioProcessing(
    audioProcessingConfig,
    overallVolume
  );

  const play = async () => {
    await audioRef?.play();
    await audioContext?.resume();
    setIsPlaying(true);
  };

  const getSong = async (shouldFetch: boolean = false) => {
    try {
      let data = liveData;
      if (!data || shouldFetch) {
        data = await fetchLiveData();
        setLiveData(data);
      }
      return findNearestSong(data, channel);
    } catch (error) {
      console.error('Error fetching live data:', error);
      return null;
    }
  };

  // Start playing the current song at the correct position
  const playCurrentSong = async (song: any) => {
    if (!song || !song.url) {
      console.log('No song or URL provided');
      return;
    }

    // Store current song data for use in event listeners
    currentSongDataRef.current = song;

    // Always create a new audio element to avoid MediaElementSourceNode conflicts
    // Once an audio element is connected to a MediaElementSourceNode, it can never be reused
    let audio = audioRef;
    if (!audio) {
      audio = new Audio();
      // Initialize audio processing
      try {
        const audioContext = await initializeAudioContext(audio);
        setAudioContext(audioContext);
        if (!audioContext) {
          console.warn(
            'Audio processing could not be initialized - audio element already connected'
          );
          // Fall back to regular audio playback without processing
        }
      } catch (error) {
        console.error('Failed to initialize audio processing:', error);
        // Fall back to regular audio playback without processing
      }
    }
    setAudioRef(audio);

    // Set the source and load
    audio.pause();
    audio.src = song.url;
    audio.load();
  };

  // Fetch next song when current song finishes
  const playNextSong = async (
    shouldFetch: boolean = false,
    forcePlay: boolean = false
  ) => {
    const [nextSong, channelOffset] = (await getSong(shouldFetch)) ?? [];
    setChannelOffset(channelOffset ?? 0);
    if (
      nextSong &&
      (nextSong.url !== currentSongDataRef.current?.url || forcePlay)
    ) {
      playCurrentSong(nextSong); // Auto-play next song since user already started
    }
  };

  useEffect(() => {
    if (!audioRef) return;
    const onLoadedMetadata = async () => {
      // Use the stored song data
      const songData = currentSongDataRef.current;
      if (!songData) return;

      // Calculate the correct start position accounting for time differences
      const timeOffset = calculateTimeOffset(songData.timestamp);
      const seekTime = clamp(
        songData.currentPart + timeOffset / 1000,
        0,
        audioRef.duration - 1
      );

      audioRef.currentTime = seekTime;

      try {
        await play();
      } catch {
        // Failed due to autoplay policy
      }
    };

    const onEnded = () => {
      setIsPlaying(false);
      // Fetch next song when current song ends
      playNextSong(true);
    };

    const onError = (e: any) => {
      console.error('Audio error:', audioRef.error || e);
      setIsPlaying(false);
    };

    audioRef.addEventListener('loadedmetadata', onLoadedMetadata);
    audioRef.addEventListener('ended', onEnded);
    audioRef.addEventListener('error', onError);

    return () => {
      audioRef.removeEventListener('loadedmetadata', onLoadedMetadata);
      audioRef.removeEventListener('ended', onEnded);
      audioRef.removeEventListener('error', onError);
    };
  }, [audioRef, playNextSong, setIsPlaying]);

  // Initialize radio when channel changes
  useEffect(() => {
    playNextSong();
  }, [channel]);

  useEffect(() => {
    if (audioRef) {
      audioRef.volume = offsetVolume * 0.75;
    }
    // Also update the audio processing volume
    updateVolume(overallVolume);
  }, [offsetVolume, overallVolume, audioRef, updateVolume]);

  return {
    liveData,
    isPlaying,
    audioRef,
    hasUserInteracted,
    playCurrentSong,
    play: async () => {
      setHasUserInteracted(true);
      if (audioRef && !isPlaying && audioRef.src) {
        try {
          await playNextSong(false, true);
          await play();
        } catch (error) {
          console.error('Failed to play audio:', error);
        }
      } else if (!audioRef || !audioRef.src) {
        console.log('Audio not ready or no source available');
      }
    },
    stop: () => {
      if (audioRef) {
        audioRef.pause();
        setIsPlaying(false);
        setLiveData(null);
        audioContext?.suspend();
      }
    },
  };
};

export default useRadio;
