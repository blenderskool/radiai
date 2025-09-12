interface Song {
  url: string;
  duration: number;
}

const stations: Record<string, { name: string; songs: Song[] }> = {
  '88': {
    name: 'Lofi Beats',
    songs: [
      {
        url: '/songs/lofi/lofi-1.mp3',
        duration: 120,
      },
      {
        url: '/songs/lofi/lofi-2.mp3',
        duration: 120,
      },
      {
        url: '/songs/lofi/lofi-3.mp3',
        duration: 120,
      },
      {
        url: '/songs/lofi/lofi-4.mp3',
        duration: 120,
      },
    ],
  },
};

function getCurrentSongForStation(
  station: { name: string; songs: Song[] },
  secondsSinceStartOfDay: number
) {
  // Use a stable seed based on the day and station ID for consistent daily patterns
  const dayOfYear = Math.floor(secondsSinceStartOfDay / 86400);
  const stationSeed = station.name.charCodeAt(0) + station.name.charCodeAt(1);
  const stableSeed = (dayOfYear * 1000 + stationSeed) % 1000000;

  // Create a deterministic random number generator
  let randomState = stableSeed;
  const lcg = () => {
    randomState = (randomState * 9301 + 49297) % 233280;
    return randomState / 233280;
  };

  // Simulate the entire day's playlist to find current song
  let accumulatedTime = 0;
  let currentSongIndex = 0;
  let songStartTime = 0;
  let previousSongIndex = -1;

  while (accumulatedTime <= secondsSinceStartOfDay) {
    // Generate a truly random song selection
    let nextSongIndex = Math.floor(lcg() * station.songs.length);

    // Avoid consecutive repeats
    if (station.songs.length > 1 && nextSongIndex === previousSongIndex) {
      nextSongIndex = (nextSongIndex + 1) % station.songs.length;
    }

    currentSongIndex = nextSongIndex;
    const currentSong = station.songs[currentSongIndex];

    // Check if this song would still be playing
    if (accumulatedTime + currentSong.duration > secondsSinceStartOfDay) {
      // This song is still playing
      songStartTime = accumulatedTime;
      break;
    } else {
      // This song has ended, move to next
      previousSongIndex = currentSongIndex;
      accumulatedTime += currentSong.duration;
    }
  }

  const currentSong = station.songs[currentSongIndex];
  const songPart = secondsSinceStartOfDay - songStartTime;

  return {
    song: currentSong,
    part: songPart,
    station: station.name,
    totalDuration: currentSong.duration,
    remainingTime: currentSong.duration - songPart,
    timestamp: new Date().toISOString(),
  };
}

export async function GET(request: Request) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const secondsSinceStartOfDay = Math.floor(
    (now.getTime() - startOfDay.getTime()) / 1000
  );

  // Get station from URL params
  const url = new URL(request.url);
  const stationId = url.searchParams.get('station');

  if (stationId) {
    // Return data for specific station
    const station = stations[stationId];
    if (!station) {
      return new Response(JSON.stringify({ error: 'Station not found' }), {
        status: 404,
      });
    }

    const stationData = getCurrentSongForStation(
      station,
      secondsSinceStartOfDay
    );
    return new Response(JSON.stringify(stationData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });
  } else {
    // Return data for all stations
    const allStationsData: Record<string, any> = {};

    for (const [id, station] of Object.entries(stations)) {
      allStationsData[id] = getCurrentSongForStation(
        station,
        secondsSinceStartOfDay
      );
    }

    return new Response(JSON.stringify(allStationsData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });
  }
}
