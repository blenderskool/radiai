import { useEffect, useRef, useState } from 'react';
import { clamp } from 'three/src/math/MathUtils.js';
import useRadioControlsStore from './useRadioControls';

const useRadio = () => {
  const channel = useRadioControlsStore((state) => state.channel);
  const volume = useRadioControlsStore((state) => state.volume);

  const [liveData, setLiveData] = useState<any>(null);
  const [currentSong, setCurrentSong] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const currentSongDataRef = useRef<any>(null);

  // Fetch live data from API
  const fetchLiveData = async () => {
    try {
      const response = await fetch(`/api/live?station=${channel}`);
      if (!response.ok) {
        throw new Error('Failed to fetch live data');
      }
      const data = await response.json();
      setLiveData(data);
      return data;
    } catch (error) {
      console.error('Error fetching live data:', error);
      return null;
    }
  };

  // Find and set the current song from live data
  const findCurrentSong = (data: any) => {
    if (!data || !data.song || !data.song.url) {
      console.log('Invalid song data:', data);
      return null;
    }

    const song = {
      url: data.song.url,
      duration: data.totalDuration,
      currentPart: data.part,
      remainingTime: data.remainingTime,
      station: data.station,
      timestamp: data.timestamp,
    };

    setCurrentSong(song);
    return song;
  };

  // Calculate time offset between API and client
  const calculateTimeOffset = (apiTimestamp: string) => {
    const apiTime = new Date(apiTimestamp).getTime();
    const clientTime = Date.now();
    return clientTime - apiTime;
  };

  // Start playing the current song at the correct position
  const playCurrentSong = async (song: any) => {
    if (!song || !song.url) {
      console.log('No song or URL provided');
      return;
    }

    // Store current song data for use in event listeners
    currentSongDataRef.current = song;

    // If we don't have an audio element yet, create one
    const audio = audioRef || new Audio();
    setAudioRef(audio);
    // Pause current audio and change source
    audio.pause();
    audio.src = song.url;
    audio.load();
  };

  // Fetch next song when current song finishes
  const fetchNextSong = async () => {
    const data = await fetchLiveData();
    if (data) {
      const nextSong = findCurrentSong(data);
      if (nextSong) {
        playCurrentSong(nextSong); // Auto-play next song since user already started
      }
    }
  };

  useEffect(() => {
    if (!audioRef) return;
    const onLoadedMetadata = () => {
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

      audioRef.play().then(() => {
        setIsPlaying(true);
      });
    };

    const onEnded = () => {
      setIsPlaying(false);
      // Fetch next song when current song ends
      fetchNextSong();
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
  }, [audioRef, fetchNextSong, setIsPlaying]);

  // Initialize radio when channel changes
  useEffect(() => {
    const initializeRadio = async () => {
      const data = await fetchLiveData();
      if (data) {
        const song = findCurrentSong(data);
        if (song) {
          playCurrentSong(song);
        }
      }
    };

    initializeRadio();

    // Cleanup on unmount or channel change
    return () => {
      if (audioRef) {
        audioRef.pause();
        audioRef.src = '';
      }
    };
  }, [channel]);

  useEffect(() => {
    if (audioRef) {
      audioRef.volume = volume;
    }
  }, [volume, audioRef]);

  return {
    liveData,
    currentSong,
    isPlaying,
    audioRef,
    hasUserInteracted,
    fetchLiveData,
    playCurrentSong,
    play: () => {
      setHasUserInteracted(true);
      if (audioRef && !isPlaying && audioRef.src) {
        audioRef
          .play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch((error) => {
            console.error('Playback failed:', error);
          });
      } else if (!audioRef || !audioRef.src) {
        console.log('Audio not ready or no source available');
      }
    },
    stop: () => {
      if (audioRef) {
        audioRef.pause();
        setIsPlaying(false);
      }
    },
  };
};

export default useRadio;
