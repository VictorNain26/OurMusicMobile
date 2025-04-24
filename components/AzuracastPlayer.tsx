import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, Pressable, ActivityIndicator, StyleSheet, FlatList } from 'react-native';
import { Audio } from 'expo-av';
import RNEventSource from 'react-native-event-source';
import { Ionicons } from '@expo/vector-icons';

interface Song {
  artist: string;
  title: string;
  art?: string;
}

interface Station {
  name: string;
  listen_url: string;
}

interface NowPlayingData {
  station?: Station;
  now_playing?: { song: Song };
  song_history?: { song: Song }[];
}

const AzuracastPlayer: React.FC = () => {
  const sseUri = 'https://ourmusic-azuracast.ovh/api/live/nowplaying/sse?cf_connect=%7B%22subs%22%3A%7B%22station%3Aourmusic%22%3A%7B%22recover%22%3Atrue%7D%7D%7D';

  const [nowPlaying, setNowPlaying] = useState<NowPlayingData | null>(null);
  const [history, setHistory] = useState<Song[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  const sseRef = useRef<RNEventSource | null>(null);

  const connectSSE = () => {
    if (sseRef.current) sseRef.current.close();

    const sse = new RNEventSource(sseUri);
    sseRef.current = sse;

    sse.addEventListener('message', (e) => {
      if (!e.data || e.data.trim() === '.') return;

      try {
        const data = JSON.parse(e.data);
        const np = data.pub?.data?.np as NowPlayingData;
        setNowPlaying(np);
        setHistory(np.song_history?.slice(0, 5).map((item: any) => item.song) || []);
      } catch (err) {
        console.warn('[SSE] Parse error', err);
      }
    });

    sse.addEventListener('error', () => {
      setTimeout(connectSSE, 5000); // retry silently
    });
  };

  useEffect(() => {
    connectSSE();
    return () => sseRef.current?.close();
  }, []);

  const handlePlayPause = async () => {
    if (isPlaying) {
      await sound?.stopAsync();
      await sound?.unloadAsync();
      setSound(null);
      setIsPlaying(false);
    } else if (nowPlaying?.station?.listen_url) {
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: nowPlaying.station.listen_url },
        { shouldPlay: true }
      );
      setSound(newSound);
      setIsPlaying(true);
    }
  };

  if (!nowPlaying) return <ActivityIndicator size="large" />;

  return (
    <View style={styles.card}>
      {nowPlaying.now_playing?.song?.art && (
        <Image source={{ uri: nowPlaying.now_playing.song.art }} style={styles.cover} />
      )}
      <Text style={styles.title}>{nowPlaying.station?.name}</Text>
      <Text style={styles.subtitle}>
        {nowPlaying.now_playing?.song?.artist} - {nowPlaying.now_playing?.song?.title}
      </Text>

      <Pressable style={styles.button} onPress={handlePlayPause}>
        <Ionicons name={isPlaying ? 'pause' : 'play'} size={24} color="#fff" />
      </Pressable>

      <Text style={styles.historyLabel}>Derniers morceaux</Text>
      <FlatList
        data={history}
        scrollEnabled={false}
        keyExtractor={(item, index) => `${item.artist}-${index}`}
        renderItem={({ item }) => (
          <Text style={styles.historyItem}>
            {item.artist} - {item.title}
          </Text>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    marginTop: 20,
  },
  cover: {
    width: 150,
    height: 150,
    borderRadius: 12,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#0a7ea4',
    padding: 12,
    borderRadius: 50,
    marginBottom: 16,
  },
  historyLabel: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  historyItem: {
    fontSize: 14,
    color: '#444',
    alignSelf: 'flex-start',
  },
});

export default AzuracastPlayer;
