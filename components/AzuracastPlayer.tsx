import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, Button, ActivityIndicator, FlatList, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import RNEventSource from 'react-native-event-source';

// Si TypeScript, déclarer le module au besoin
// declare module 'react-native-event-source';

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
  now_playing?: {
    song: Song;
  };
  song_history?: { song: Song }[];
}

const AzuracastPlayer: React.FC = () => {
  // URL SSE d'AzuraCast
  const sseBaseUri = "https://ourmusic-azuracast.ovh/api/live/nowplaying/sse";
  const sseUriParams = new URLSearchParams({
    "cf_connect": JSON.stringify({ "subs": { "station:ourmusic": { "recover": true } } })
  });
  const sseUri = `${sseBaseUri}?${sseUriParams.toString()}`;

  // States "nowPlaying" et autres
  const [nowPlaying, setNowPlaying] = useState<NowPlayingData | null>(null);
  const [songHistory, setSongHistory] = useState<Song[]>([]);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [volume, setVolume] = useState<number>(1);

  // Ref pour l'EventSource
  const sseRef = useRef<RNEventSource | null>(null);

  // Connexion SSE (silencieuse en cas d'erreur)
  const connectSSE = () => {
    // Fermer la connexion précédente
    if (sseRef.current) {
      sseRef.current.close();
    }

    console.log('[connectSSE] Connecting SSE =>', sseUri);

    const sse = new RNEventSource(sseUri, {
      withCredentials: false, 
      headers: { "Accept": "text/event-stream" },
    });

    sseRef.current = sse;

    // Quand la connexion SSE s'ouvre
    sse.addEventListener("open", (evt: any) => {
      console.log('[SSE] open =>', evt);
    });

    // Quand on reçoit un nouveau message SSE
    sse.addEventListener("message", (evt: any) => {
      console.log('[SSE] message =>', evt);

      if (!evt.data || evt.data.trim() === '.') {
        // "." est un ping keep-alive d'AzuraCast
        return;
      }
      try {
        const jsonData = JSON.parse(evt.data);
        console.log('[SSE] parsed =>', jsonData);

        if (jsonData.pub && jsonData.pub.data?.np) {
          const np = jsonData.pub.data.np as NowPlayingData;
          setNowPlaying(np);

          // Derniers 5 morceaux
          const history = np.song_history
            ?.slice(0, 5)
            .map((item: { song: Song }) => item.song) || [];
          setSongHistory(history);

          console.log('[SSE] nowPlaying updated =>', np);
        }
      } catch (error) {
        console.warn('[SSE] JSON parse error =>', error);
      }
    });

    // En cas d'erreur, on ne met plus d'état "error" => on reconnecte silencieusement
    sse.addEventListener("error", (evt: any) => {
      console.warn('[SSE] error =>', evt);
      // Reconnextion silencieuse après 5 secondes
      setTimeout(() => {
        connectSSE();
      }, 5000);
    });

    // Certains environnements SSE n'émettent pas "close", mais on l'écoute au cas où
    sse.addEventListener("close", (evt: any) => {
      console.log('[SSE] close =>', evt);
    });
  };

  // Au montage, on lance la connexion SSE
  useEffect(() => {
    connectSSE();
    // Nettoyage au démontage
    return () => {
      console.log('[useEffect cleanup] Closing SSE');
      if (sseRef.current) {
        sseRef.current.close();
      }
    };
  }, []);

  // Bouton Play/Stop
  const handlePlayPause = async () => {
    if (isPlaying) {
      // STOP
      if (sound) {
        console.log('[handlePlayPause] STOP =>');
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
      }
      setIsPlaying(false);
    } else {
      // PLAY
      if (nowPlaying?.station?.listen_url) {
        console.log('[handlePlayPause] PLAY =>', nowPlaying.station.listen_url);
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: nowPlaying.station.listen_url },
          { shouldPlay: true, volume }
        );
        setSound(newSound);
        setIsPlaying(true);
      } else {
        console.warn('[handlePlayPause] No listen_url => cannot play');
      }
    }
  };

  return (
    <View style={styles.container}>
      {nowPlaying ? (
        <>
          <Text style={styles.title}>
            {nowPlaying.station?.name || "Radio"}
          </Text>

          {nowPlaying.now_playing?.song?.art && (
            <Image
              source={{ uri: nowPlaying.now_playing.song.art }}
              style={styles.art}
            />
          )}

          <Text style={styles.songTitle}>
            {nowPlaying.now_playing?.song?.artist} - {nowPlaying.now_playing?.song?.title}
          </Text>

          <Button
            title={isPlaying ? "Stop" : "Play"}
            onPress={handlePlayPause}
          />

          <Text style={styles.historyTitle}>
            Historique des 5 derniers morceaux :
          </Text>
          <FlatList
            data={songHistory}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <Text style={styles.historyItem}>
                {item.artist} - {item.title}
              </Text>
            )}
          />
        </>
      ) : (
        // On n'a pas de données "nowPlaying" => chargement
        <ActivityIndicator size="large" />
      )}
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1, 
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  title: {
    fontSize: 24, 
    fontWeight: 'bold',
    marginVertical: 10
  },
  songTitle: {
    fontSize: 18,
    marginVertical: 10
  },
  art: {
    width: 100, 
    height: 100, 
    marginVertical: 10
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20
  },
  historyItem: {
    fontSize: 16,
    marginVertical: 5
  }
});

export default AzuracastPlayer;
