import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  StatusBar,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Updates from 'expo-updates';
import * as SecureStore from 'expo-secure-store';
import { VideoView, useVideoPlayer } from 'expo-video';
import { WebView } from 'react-native-webview';

type MediaType = 'movie' | 'series';

type MediaItem = {
  id: string;
  title: string;
  type: MediaType;
  year: number;
  duration: string;
  genre: string;
  rating: string;
  imdb: string;
  badge?: string;
  description: string;
  image: string;
  backdrop: string;
  longDescription: string;
  trailerUrl?: string;
  director?: string;
  cast: string[];
  sources: VideoSource[];
  seasonsData: Season[];
};

type AccountUser = { id: string; email: string; name: string };
type VideoSource = { provider: string; embedUrl?: string; playbackUrl?: string; isPrimary?: boolean };
type Episode = { id: string; episodeNumber: number; title: string; description: string; duration?: string; thumbnailUrl?: string; provider: string; embedUrl?: string; playbackUrl?: string };
type Season = { id: string; seasonNumber: number; title?: string; episodes: Episode[] };

function youtubeEmbedUrl(value: string): string {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    const id = host === 'youtu.be' ? url.pathname.slice(1)
      : url.pathname === '/watch' ? url.searchParams.get('v') || ''
        : url.pathname.split('/')[2] || '';
    return id && (host === 'youtu.be' || host.endsWith('youtube.com'))
      ? `https://www.youtube.com/embed/${encodeURIComponent(id)}?autoplay=1&playsinline=1`
      : value;
  } catch {
    return value;
  }
}

function PlaybackModal({ item, onClose }: { item: MediaItem; onClose: () => void }) {
  const sources = item.sources.length ? item.sources : [{ provider: 'EXTERNAL_EMBED', embedUrl: undefined, playbackUrl: undefined }];
  const [sourceIndex, setSourceIndex] = useState(0);
  const [webError, setWebError] = useState(false);
  const source = sources[Math.min(sourceIndex, sources.length - 1)];
  const isEmbed = Boolean(source.embedUrl) || ['YOUTUBE', 'VIMEO', 'EXTERNAL_EMBED'].includes(source.provider);
  const player = useVideoPlayer(isEmbed ? null : source.playbackUrl || null, (instance) => {
    instance.play();
  });

  return (
    <Modal visible animationType="fade" supportedOrientations={['portrait', 'landscape']} onRequestClose={onClose}>
      <SafeAreaView style={styles.playerScreen}>
        <View style={styles.playerHeader}>
          <Pressable style={styles.playerCloseButton} onPress={onClose}>
            <Text style={styles.playerCloseText}>Back</Text>
          </Pressable>
          <Text style={styles.playerHeaderTitle} numberOfLines={1}>{item.title}</Text>
          {sources.length > 1 ? (
            <Pressable style={styles.playerSourceButton} onPress={() => { setWebError(false); setSourceIndex((index) => (index + 1) % sources.length); }}>
              <Text style={styles.playerSourceText}>Source</Text>
            </Pressable>
          ) : <View style={styles.playerHeaderSpacer} />}
        </View>
        <View style={styles.playerStage}>
          {isEmbed && source.embedUrl ? (
            <WebView
              key={`${source.embedUrl}-${sourceIndex}`}
              source={{ uri: source.provider === 'YOUTUBE' ? youtubeEmbedUrl(source.embedUrl) : source.embedUrl }}
              style={styles.webPlayer}
              javaScriptEnabled
              domStorageEnabled
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              allowsFullscreenVideo
              onError={() => setWebError(true)}
              onHttpError={(event) => { if (event.nativeEvent.statusCode >= 400) setWebError(true); }}
              renderLoading={() => <View style={styles.playerLoading}><ActivityIndicator size="large" color="#e50914" /></View>}
              startInLoadingState
            />
          ) : !isEmbed && source.playbackUrl ? (
            <VideoView
              player={player}
              style={styles.nativeVideo}
              nativeControls
              fullscreenOptions={{ enable: true, orientation: 'landscape' }}
              allowsPictureInPicture
              contentFit="contain"
            />
          ) : (
            <View style={styles.playerMessage}>
              <Text style={styles.playerMessageTitle}>Playback source unavailable</Text>
              <Text style={styles.playerMessageText}>This title does not have a playable source configured.</Text>
            </View>
          )}
          {webError ? (
            <View style={styles.playerErrorOverlay}>
              <Text style={styles.playerMessageTitle}>Player could not load</Text>
              <Text style={styles.playerMessageText}>Try another source or check your connection.</Text>
              {sources.length > 1 ? <Pressable style={styles.primaryButton} onPress={() => { setWebError(false); setSourceIndex((index) => (index + 1) % sources.length); }}><Text style={styles.buttonText}>Try another source</Text></Pressable> : null}
            </View>
          ) : null}
        </View>
        <View style={styles.playerFooter}>
          <Text style={styles.playerFooterTitle}>{item.title}</Text>
          <Text style={styles.playerFooterDescription}>{item.description}</Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://cineflix-be.vercel.app').replace(/\/+$/, '');

function mapApiItem(value: unknown): MediaItem | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  if (typeof item.id !== 'string' || typeof item.title !== 'string') return null;

  const poster = typeof item.posterUrl === 'string' ? item.posterUrl : '';
  const backdrop = typeof item.backdropUrl === 'string' ? item.backdropUrl : poster;
  const videos = Array.isArray(item.videos) ? item.videos as Record<string, unknown>[] : [];
  const seasonsData = Array.isArray(item.seasonsData) ? item.seasonsData as Record<string, unknown>[] : [];
  return {
    id: item.id,
    title: item.title,
    type: String(item.type).toLowerCase() === 'series' ? 'series' : 'movie',
    year: Number(item.year) || 0,
    duration: typeof item.duration === 'string' ? item.duration : '',
    genre: typeof item.genre === 'string' ? item.genre : '',
    rating: typeof item.rating === 'string' ? item.rating : 'NR',
    imdb: typeof item.imdb === 'string' ? item.imdb : '',
    badge: typeof item.badge === 'string' ? item.badge : undefined,
    description: typeof item.description === 'string' ? item.description : '',
    longDescription: typeof item.longDescription === 'string' ? item.longDescription : typeof item.description === 'string' ? item.description : '',
    trailerUrl: typeof item.trailerUrl === 'string' ? item.trailerUrl : undefined,
    director: typeof item.director === 'string' ? item.director : undefined,
    cast: Array.isArray(item.cast) ? item.cast.filter((name): name is string => typeof name === 'string') : [],
    sources: videos.map((video) => ({
      provider: String(video.provider || 'EXTERNAL_EMBED'),
      embedUrl: typeof video.embedUrl === 'string' ? video.embedUrl : undefined,
      playbackUrl: typeof video.playbackUrl === 'string' ? video.playbackUrl : undefined,
      isPrimary: Boolean(video.isPrimary),
    })),
    seasonsData: seasonsData.map((season, seasonIndex) => ({
      id: typeof season.id === 'string' ? season.id : `${item.id}-season-${seasonIndex + 1}`,
      seasonNumber: Number(season.seasonNumber) || seasonIndex + 1,
      title: typeof season.title === 'string' ? season.title : undefined,
      episodes: (Array.isArray(season.episodes) ? season.episodes as Record<string, unknown>[] : [])
        .filter((episode) => episode.isPublished !== false)
        .map((episode, episodeIndex) => {
          const episodeVideos = Array.isArray(episode.videos) ? episode.videos as Record<string, unknown>[] : [];
          const episodeVideo = episodeVideos.find((video) => video.isPrimary) || episodeVideos[0] || {};
          return {
            id: typeof episode.id === 'string' ? episode.id : `${season.id}-episode-${episodeIndex + 1}`,
            episodeNumber: Number(episode.episodeNumber) || episodeIndex + 1,
            title: typeof episode.title === 'string' ? episode.title : `Episode ${episodeIndex + 1}`,
            description: typeof episode.description === 'string' ? episode.description : '',
            duration: typeof episode.duration === 'string' ? episode.duration : undefined,
            thumbnailUrl: typeof episode.thumbnailUrl === 'string' ? episode.thumbnailUrl : undefined,
            provider: String(episodeVideo.provider || 'EXTERNAL_EMBED'),
            embedUrl: typeof episodeVideo.embedUrl === 'string' ? episodeVideo.embedUrl : undefined,
            playbackUrl: typeof episodeVideo.playbackUrl === 'string' ? episodeVideo.playbackUrl : undefined,
          };
        }),
    })),
    image: poster || 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?auto=format&fit=crop&w=800&q=80',
    backdrop: backdrop || 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?auto=format&fit=crop&w=1400&q=85',
  };
}

const tabs = ['Home', 'Movies', 'Series', 'My List'];

export default function App() {
  const [activeTab, setActiveTab] = useState('Home');
  const [search, setSearch] = useState('');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [account, setAccount] = useState<AccountUser | null>(null);
  const [authToken, setAuthToken] = useState('');
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [playerItem, setPlayerItem] = useState<MediaItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [resumeData, setResumeData] = useState<Record<string, number>>({});
  const [movieGenre, setMovieGenre] = useState('All');
  const [seriesGenre, setSeriesGenre] = useState('All');
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updating, setUpdating] = useState(false);

  const loadCatalog = async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/content?limit=100`, { signal });
      const data = await response.json() as { items?: unknown[]; error?: string };
      if (!response.ok) throw new Error(data.error || 'Could not load Cineflix content.');
      setMedia((data.items || []).map(mapApiItem).filter((item): item is MediaItem => item !== null));
    } catch (error) {
      if (signal?.aborted) return;
      setLoadError(error instanceof Error ? error.message : 'Could not reach the Cineflix server.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  const loadLibrary = async (token: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/me/library`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Could not load your Cineflix list.');
      const library = await response.json() as { watchlist?: string[] };
      setSavedIds(library.watchlist || []);
    } catch {
      setSavedIds([]);
    }
  };

  const submitAuth = async () => {
    setAuthError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${authMode === 'signup' ? 'signup' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(authMode === 'signup' ? { name: authName } : {}),
          email: authEmail,
          password: authPassword,
        }),
      });
      const data = await response.json() as { token?: string; user?: AccountUser; error?: string };
      if (!response.ok || !data.token || !data.user) throw new Error(data.error || 'Account request failed.');
      await SecureStore.setItemAsync('cf_user_token', data.token);
      setAuthToken(data.token);
      setAccount(data.user);
      setAuthPassword('');
      setAuthOpen(false);
      await loadLibrary(data.token);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Could not reach the Cineflix server.');
    }
  };

  const toggleSaved = async (item: MediaItem) => {
    if (!authToken) {
      setAuthError('Sign in to save titles to your Cineflix account.');
      setAuthMode('login');
      setAuthOpen(true);
      return;
    }
    const isSaved = savedIds.includes(item.id);
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/me/watchlist/${encodeURIComponent(item.id)}`, {
        method: isSaved ? 'DELETE' : 'PUT',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!response.ok) {
        const data = await response.json() as { error?: string };
        throw new Error(data.error || 'Could not update your Cineflix list.');
      }
      setSavedIds((ids) => isSaved ? ids.filter((id) => id !== item.id) : [...ids, item.id]);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Could not update your Cineflix list.');
      setAuthOpen(true);
    }
  };

  const signOut = async () => {
    await SecureStore.deleteItemAsync('cf_user_token');
    setAuthToken('');
    setAccount(null);
    setSavedIds([]);
    setAuthOpen(false);
    setActiveTab('Home');
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadCatalog(controller.signal);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    let active = true;
    const restoreAccount = async () => {
      try {
        const token = await SecureStore.getItemAsync('cf_user_token');
        if (!token || !active) return;
        const response = await fetch(`${API_BASE_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          await SecureStore.deleteItemAsync('cf_user_token');
          return;
        }
        const data = await response.json() as { user?: AccountUser };
        if (!active || !data.user) return;
        setAuthToken(token);
        setAccount(data.user);
        await loadLibrary(token);
      } catch {
        if (active) setAccount(null);
      }
    };
    void restoreAccount();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const checkUpdates = async () => {
      try {
        const isAvailable = await Updates.checkForUpdateAsync();
        if (isAvailable.isAvailable) {
          setUpdateAvailable(true);
        }
      } catch {
        // Ignore runtime update failures and continue with the current app.
      }
    };

    checkUpdates();
  }, []);

  const allGenres = useMemo(() => {
    const set = new Set<string>();
    media.forEach(item => {
      item.genre.split(',').forEach(g => {
        const trimmed = g.trim();
        if (trimmed) set.add(trimmed);
      });
    });
    return Array.from(set).sort();
  }, [media]);

  const visibleItems = useMemo(() => media.filter((item) => {
    const matchesSearch = !search || `${item.title} ${item.genre} ${item.description}`.toLowerCase().includes(search.toLowerCase());
    const currentGenre = activeTab === 'Movies' ? movieGenre : activeTab === 'Series' ? seriesGenre : 'All';
    const matchesGenre = currentGenre === 'All' || item.genre.toLowerCase().includes(currentGenre.toLowerCase());
    const matchesTab = activeTab === 'Movies' ? item.type === 'movie' && matchesGenre
      : activeTab === 'Series' ? item.type === 'series' && matchesGenre
        : activeTab === 'My List' ? savedIds.includes(item.id)
          : true;
    return matchesSearch && matchesTab;
  }), [activeTab, media, savedIds, search, movieGenre, seriesGenre]);
  
  const resumed = useMemo(() => visibleItems.filter(item => (resumeData[item.id] || 0) > 0), [visibleItems, resumeData]);
  const hero = activeTab === 'Home' ? visibleItems[0] : null;
  const continueWatching = resumed.slice(0, 4);
  const discover = visibleItems.slice(0, 12).filter(item => !continueWatching.includes(item));

  const handleApplyUpdate = async () => {
    setUpdating(true);
    try {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch (error) {
      setAuthError('Could not apply update. Please try again.');
      setUpdateAvailable(false);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0b0b" />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.brandWrap}>
            <Image source={require('./assets/cineflix-icon.png')} style={styles.brandLogo} />
            <Text style={styles.brandName}>CINEFLIX</Text>
          </View>
          <Pressable style={styles.profileButton} onPress={() => { setAuthError(''); setAuthOpen(true); }}>
            <Text style={styles.profileText}>{account?.name.charAt(0).toUpperCase() || 'C'}</Text>
          </Pressable>
        </View>

        <View style={styles.searchWrap}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Movies, series, genres"
            placeholderTextColor="#8a8d97"
            style={styles.searchInput}
          />
        </View>

        {(activeTab === 'Movies' || activeTab === 'Series') && allGenres.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.genreRow}>
            {(['All'] as const).concat(allGenres as any[]).map((genre) => {
              const currentGenre = activeTab === 'Movies' ? movieGenre : seriesGenre;
              const isActive = currentGenre === genre;
              return (
                <Pressable
                  key={genre}
                  style={[styles.genreButton, isActive && styles.genreButtonActive]}
                  onPress={() => {
                    if (activeTab === 'Movies') setMovieGenre(genre);
                    else setSeriesGenre(genre);
                  }}
                >
                  <Text style={[styles.genreButtonText, isActive && styles.genreButtonTextActive]}>{genre}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {hero ? (
          <View style={styles.heroCard}>
            <Image source={{ uri: hero.backdrop }} style={styles.heroBackground} />
            <View style={styles.heroShade} />
            <View style={styles.heroContent}>
              <Text style={styles.heroBadge}>{hero.badge ?? (hero.type === 'series' ? 'TV SERIES' : 'MOVIE')}</Text>
              <Text style={styles.heroTitle}>{hero.title}</Text>
              <View style={styles.heroMetaRow}>
                <Text style={styles.heroMeta}>{hero.year || ''}</Text>
                <Text style={styles.heroMeta}>•</Text>
                <Text style={styles.heroMeta}>{hero.rating}</Text>
                <Text style={styles.heroMeta}>•</Text>
                <Text style={styles.heroMeta}>{hero.duration}</Text>
              </View>
              <Text style={styles.heroDescription}>{hero.description}</Text>
              <View style={styles.heroActions}>
                <Pressable style={styles.primaryButton} onPress={() => setSelected(hero)}>
                  <Text style={styles.buttonText}>Play</Text>
                </Pressable>
                <Pressable style={styles.secondaryButton} onPress={() => setSelected(hero)}>
                  <Text style={styles.secondaryButtonText}>More Info</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{activeTab === 'My List' ? 'My List' : activeTab === 'Movies' ? 'Movies' : activeTab === 'Series' ? 'TV Series' : 'Latest Releases'}</Text>
          <Pressable onPress={() => void loadCatalog()}><Text style={styles.sectionAction}>Refresh</Text></Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalList}>
          {continueWatching.map((item) => (
            <Pressable key={item.id} style={styles.card} onPress={() => setSelected(item)}>
              <Image source={{ uri: item.image }} style={styles.poster} />
              <View style={styles.cardProgress} />
              <View style={styles.cardFooter}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardMeta}>{item.genre}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        {discover.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{activeTab === 'Series' ? 'More Series' : 'Popular on Cineflix'}</Text>
              <Text style={styles.sectionAction}>Explore</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalList}>
              {discover.map((item) => (
                <Pressable key={item.id} style={styles.portraitCard} onPress={() => setSelected(item)}>
                  <Image source={{ uri: item.image }} style={styles.portraitPoster} />
                  {item.imdb ? <View style={styles.ratingBadge}><Text style={styles.ratingText}>{item.imdb}</Text></View> : null}
                  <Text style={styles.portraitTitle} numberOfLines={1}>{item.title}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : null}

        {loading ? <Text style={styles.statusText}>Loading Cineflix...</Text> : null}
        {!loading && loadError ? (
          <Pressable style={styles.retryButton} onPress={() => void loadCatalog()}>
            <Text style={styles.statusText}>{loadError}  Tap to retry</Text>
          </Pressable>
        ) : null}
        {!loading && !loadError && visibleItems.length === 0 ? (
          <Text style={styles.statusText}>{activeTab === 'My List' ? 'Your list is empty.' : 'No titles found.'}</Text>
        ) : null}
      </ScrollView>

      <Modal visible={Boolean(selected)} animationType="slide" onRequestClose={() => setSelected(null)}>
        {selected ? (
          <SafeAreaView style={styles.detailScreen}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScroll}>
              <View style={styles.detailArtwork}>
                <Image source={{ uri: selected.backdrop }} style={styles.detailBackdrop} />
                <View style={styles.detailArtworkShade} />
                <Pressable style={styles.detailClose} onPress={() => setSelected(null)}><Text style={styles.closeText}>X</Text></Pressable>
                <Image source={{ uri: selected.image }} style={styles.detailPoster} />
              </View>
              <View style={styles.detailInfo}>
                <Text style={styles.detailType}>{selected.type === 'series' ? 'TV SERIES' : 'MOVIE'}{selected.badge ? `  |  ${selected.badge}` : ''}</Text>
                <Text style={styles.detailTitle}>{selected.title}</Text>
                <Text style={styles.detailMeta}>{selected.year || ''}  ·  {selected.duration}  ·  {selected.rating}{selected.imdb ? `  ·  ${selected.imdb} IMDb` : ''}</Text>
                <Text style={styles.detailDescription}>{selected.longDescription}</Text>
                <View style={styles.detailActions}>
                  <Pressable style={styles.primaryButton} onPress={() => setPlayerItem(selected)}>
                    <Text style={styles.buttonText}>Play {selected.type === 'series' ? 'Series' : 'Now'}</Text>
                  </Pressable>
                  {selected.trailerUrl ? (
                    <Pressable style={styles.secondaryButton} onPress={() => setPlayerItem({ ...selected, title: `${selected.title} Trailer`, sources: [{ provider: 'YOUTUBE', embedUrl: selected.trailerUrl }] })}>
                      <Text style={styles.secondaryButtonText}>Trailer</Text>
                    </Pressable>
                  ) : null}
                  <Pressable style={styles.secondaryButton} onPress={() => void toggleSaved(selected)}>
                    <Text style={styles.secondaryButtonText}>{savedIds.includes(selected.id) ? 'In My List' : '+ My List'}</Text>
                  </Pressable>
                </View>
                {selected.seasonsData.map((season) => (
                  <View key={season.id} style={styles.episodeSection}>
                    <Text style={styles.sectionTitle}>{season.title || `Season ${season.seasonNumber}`}</Text>
                    {season.episodes.map((episode) => {
                      const episodeItem: MediaItem = {
                        ...selected,
                        id: episode.id,
                        title: `${selected.title} - E${episode.episodeNumber}: ${episode.title}`,
                        description: episode.description,
                        longDescription: episode.description,
                        duration: episode.duration || '',
                        image: episode.thumbnailUrl || selected.image,
                        sources: [{ provider: episode.provider, embedUrl: episode.embedUrl, playbackUrl: episode.playbackUrl }],
                      };
                      return (
                        <Pressable key={episode.id} style={styles.episodeRow} onPress={() => setPlayerItem(episodeItem)}>
                          <Image source={{ uri: episode.thumbnailUrl || selected.backdrop }} style={styles.episodePoster} />
                          <View style={styles.episodeInfo}>
                            <Text style={styles.episodeTitle}>E{episode.episodeNumber}: {episode.title}</Text>
                            <Text style={styles.episodeDescription} numberOfLines={3}>{episode.description}</Text>
                          </View>
                          <Text style={styles.episodePlay}>Play</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
                {selected.genre ? <Text style={styles.detailExtra}>Genre  {selected.genre}</Text> : null}
                {selected.director ? <Text style={styles.detailExtra}>Director  {selected.director}</Text> : null}
                {selected.cast.length ? <Text style={styles.detailExtra}>Cast  {selected.cast.join(', ')}</Text> : null}
              </View>
            </ScrollView>
          </SafeAreaView>
        ) : null}
      </Modal>

      {playerItem ? <PlaybackModal item={playerItem} onClose={() => setPlayerItem(null)} /> : null}

      <Modal visible={updateAvailable} transparent animationType="slide">
        <View style={styles.modalScrim}>
          <View style={styles.authSheet}>
            <View style={styles.authHeader}>
              <Text style={styles.authTitle}>Update Available</Text>
              <Pressable style={styles.closeButton} onPress={() => setUpdateAvailable(false)}>
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
            </View>
            <Text style={styles.authHint}>A new version of Cineflix is available. Update now to get the latest features and improvements.</Text>
            <Pressable
              style={[styles.primaryButton, updating && { opacity: 0.6 }]}
              onPress={() => void handleApplyUpdate()}
              disabled={updating}
            >
              <Text style={styles.buttonText}>{updating ? 'Updating...' : 'Update Now'}</Text>
            </Pressable>
            <Pressable onPress={() => setUpdateAvailable(false)}>
              <Text style={styles.authSwitch}>Maybe later</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <View style={styles.bottomNav}>
        {tabs.map((tab, index) => (
          <Pressable key={tab} style={styles.bottomNavButton} onPress={() => { setActiveTab(tab); setSelected(null); }}>
            <Text style={[styles.bottomNavIcon, activeTab === tab && styles.bottomNavIconActive]}>{['⌂', '▣', '▤', '♡'][index]}</Text>
            <Text style={[styles.bottomNavLabel, activeTab === tab && styles.bottomNavLabelActive]}>{tab}</Text>
          </Pressable>
        ))}
      </View>

      <Modal visible={authOpen} transparent animationType="slide" onRequestClose={() => setAuthOpen(false)}>
        <View style={styles.modalScrim}>
          <View style={styles.authSheet}>
            <View style={styles.authHeader}>
              <Text style={styles.authTitle}>{account ? 'Cineflix Account' : authMode === 'login' ? 'Sign in to Cineflix' : 'Create your Cineflix account'}</Text>
              <Pressable style={styles.closeButton} onPress={() => setAuthOpen(false)}>
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
            </View>
            {account ? (
              <>
                <Text style={styles.accountName}>{account.name}</Text>
                <Text style={styles.authHint}>{account.email}</Text>
                <Pressable style={styles.primaryButton} onPress={() => void signOut()}>
                  <Text style={styles.buttonText}>Sign out</Text>
                </Pressable>
              </>
            ) : (
              <>
                {authMode === 'signup' ? (
                  <TextInput value={authName} onChangeText={setAuthName} placeholder="Name" placeholderTextColor="#8a8d97" style={styles.authInput} autoCapitalize="words" />
                ) : null}
                <TextInput value={authEmail} onChangeText={setAuthEmail} placeholder="Email" placeholderTextColor="#8a8d97" style={styles.authInput} keyboardType="email-address" autoCapitalize="none" />
                <TextInput value={authPassword} onChangeText={setAuthPassword} placeholder="Password" placeholderTextColor="#8a8d97" style={styles.authInput} secureTextEntry />
                {authError ? <Text style={styles.authError}>{authError}</Text> : null}
                <Pressable style={styles.primaryButton} onPress={() => void submitAuth()}>
                  <Text style={styles.buttonText}>{authMode === 'login' ? 'Sign in' : 'Create account'}</Text>
                </Pressable>
                <Pressable onPress={() => { setAuthMode((mode) => mode === 'login' ? 'signup' : 'login'); setAuthError(''); }}>
                  <Text style={styles.authSwitch}>{authMode === 'login' ? 'New to Cineflix? Create an account' : 'Already registered? Sign in'}</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0b0b0b',
  },
  container: {
    paddingHorizontal: 14,
    paddingBottom: 110,
    backgroundColor: '#0b0b0b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginBottom: 14,
  },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandLogo: {
    width: 30,
    height: 30,
    borderRadius: 7,
    marginRight: 8,
  },
  brandName: {
    color: '#fff',
    fontWeight: '800',
    letterSpacing: 1.2,
    fontSize: 16,
  },
  profileButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#b52b25',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: {
    color: '#fff',
    fontWeight: '700',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  tabButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#121a2a',
  },
  tabButtonActive: {
    backgroundColor: '#e50914',
  },
  tabText: {
    fontSize: 12,
    color: '#d4d9e3',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  searchWrap: {
    marginBottom: 18,
  },
  searchLabel: {
    color: '#aeb6c3',
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 6,
  },
  searchInput: {
    backgroundColor: '#1c1c1c',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#2e2e2e',
  },
  genreRow: {
    marginBottom: 16,
    marginHorizontal: -14,
    paddingHorizontal: 14,
  },
  genreButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#252525',
    marginRight: 8,
  },
  genreButtonActive: {
    backgroundColor: '#e50914',
  },
  genreButtonText: {
    color: '#aeb6c3',
    fontSize: 12,
    fontWeight: '600',
  },
  genreButtonTextActive: {
    color: '#fff',
  },
  heroCard: {
    height: 390,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 20,
    position: 'relative',
  },
  heroBackground: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  heroShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(11, 11, 11, 0.46)',
  },
  heroContent: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 18,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 3,
    color: '#fff',
    backgroundColor: '#e50914',
    fontWeight: '700',
    fontSize: 10,
    marginBottom: 10,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '800',
    marginBottom: 8,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  heroMeta: {
    color: '#edf1f7',
    fontSize: 12,
    fontWeight: '600',
  },
  heroDescription: {
    color: '#e5eaf1',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    backgroundColor: '#e50914',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 6,
  },
  secondaryButton: {
    backgroundColor: '#252525',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  sectionAction: {
    color: '#aeb6c3',
    fontSize: 12,
    fontWeight: '600',
  },
  horizontalList: {
    marginBottom: 20,
  },
  card: {
    width: 152,
    marginRight: 10,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#141414',
  },
  poster: {
    width: 152,
    height: 214,
  },
  cardProgress: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 58,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  cardFooter: {
    padding: 10,
  },
  cardTitle: {
    color: '#fff',
    fontWeight: '700',
  },
  cardMeta: {
    color: '#aeb6c3',
    fontSize: 12,
    marginTop: 4,
  },
  portraitCard: {
    width: 132,
    marginRight: 12,
  },
  portraitPoster: {
    width: 132,
    height: 180,
    borderRadius: 6,
  },
  ratingBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  ratingText: {
    color: '#f5c518',
    fontWeight: '700',
    fontSize: 11,
  },
  portraitTitle: {
    color: '#fff',
    fontWeight: '700',
    marginTop: 8,
  },
  matchesList: {
    gap: 12,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#101827',
    padding: 10,
  },
  matchPoster: {
    width: 80,
    height: 110,
    borderRadius: 12,
  },
  matchMeta: {
    flex: 1,
    marginLeft: 12,
  },
  matchTitle: {
    color: '#fff',
    fontWeight: '700',
    marginBottom: 4,
  },
  matchText: {
    color: '#aeb6c3',
    fontSize: 12,
    lineHeight: 18,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '72%',
    backgroundColor: '#0b0b0b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  sheetBackdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '50%',
    width: '100%',
  },
  sheetOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(11, 11, 11, 0.4)',
  },
  closeButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  closeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  sheetContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 30,
    paddingBottom: 32,
    backgroundColor: '#0b0b0b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  sheetBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    color: '#fff',
    backgroundColor: '#e50914',
    fontWeight: '700',
    fontSize: 10,
    marginBottom: 12,
  },
  sheetTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  sheetMeta: {
    color: '#dfe7f5',
    fontSize: 13,
    marginBottom: 12,
  },
  sheetDescription: {
    color: '#dfe7f5',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
  },
  statusText: {
    color: '#aeb6c3',
    fontSize: 13,
    lineHeight: 20,
    marginVertical: 16,
  },
  retryButton: {
    paddingVertical: 4,
  },
  modalScrim: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.68)',
  },
  authSheet: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 36,
    backgroundColor: '#141414',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    gap: 12,
  },
  authHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  authTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    paddingRight: 38,
  },
  authInput: {
    color: '#fff',
    backgroundColor: '#1c1c1c',
    borderColor: '#2e2e2e',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  authError: {
    color: '#ff8388',
    fontSize: 13,
    lineHeight: 19,
  },
  authHint: {
    color: '#aeb6c3',
    fontSize: 14,
  },
  accountName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  authSwitch: {
    color: '#d4d9e3',
    textAlign: 'center',
    paddingTop: 4,
  },
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 7,
    paddingBottom: Platform.OS === 'ios' ? 22 : 10,
    backgroundColor: 'rgba(20,20,20,0.98)',
    borderTopColor: '#2e2e2e',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  bottomNavButton: {
    minWidth: 64,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 2,
  },
  bottomNavIcon: {
    color: '#777',
    fontSize: 22,
    lineHeight: 25,
  },
  bottomNavIconActive: {
    color: '#e50914',
  },
  bottomNavLabel: {
    color: '#777',
    fontSize: 10,
    fontWeight: '600',
  },
  bottomNavLabelActive: {
    color: '#fff',
  },
  detailScreen: {
    flex: 1,
    backgroundColor: '#0b0b0b',
  },
  detailScroll: {
    paddingBottom: 30,
  },
  detailArtwork: {
    height: 330,
    justifyContent: 'flex-end',
    paddingHorizontal: 18,
    paddingBottom: 18,
    overflow: 'hidden',
  },
  detailBackdrop: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  detailArtworkShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(11,11,11,0.44)',
  },
  detailClose: {
    position: 'absolute',
    top: 12,
    right: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 2,
  },
  detailPoster: {
    width: 100,
    height: 148,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  detailInfo: {
    paddingHorizontal: 18,
    paddingTop: 20,
  },
  detailType: {
    color: '#e50914',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 7,
  },
  detailTitle: {
    color: '#fff',
    fontSize: 29,
    fontWeight: '800',
    marginBottom: 8,
  },
  detailMeta: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 15,
  },
  detailDescription: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18,
  },
  detailActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    marginBottom: 22,
  },
  episodeSection: {
    marginTop: 16,
    marginBottom: 10,
    gap: 12,
  },
  episodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    borderBottomColor: '#2e2e2e',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  episodePoster: {
    width: 112,
    height: 66,
    borderRadius: 4,
    backgroundColor: '#252525',
  },
  episodeInfo: {
    flex: 1,
    gap: 5,
  },
  episodeTitle: {
    color: '#eee',
    fontSize: 13,
    fontWeight: '700',
  },
  episodeDescription: {
    color: '#999',
    fontSize: 11,
    lineHeight: 15,
  },
  episodePlay: {
    color: '#e50914',
    fontSize: 11,
    fontWeight: '700',
  },
  detailExtra: {
    color: '#aaa',
    fontSize: 12,
    lineHeight: 19,
    paddingTop: 9,
    borderTopColor: '#2e2e2e',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  playerScreen: {
    flex: 1,
    backgroundColor: '#000',
  },
  playerHeader: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    backgroundColor: '#0b0b0b',
  },
  playerCloseButton: {
    minWidth: 48,
    paddingVertical: 8,
  },
  playerCloseText: {
    color: '#eee',
    fontSize: 13,
    fontWeight: '600',
  },
  playerHeaderTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  playerHeaderSpacer: {
    width: 48,
  },
  playerSourceButton: {
    minWidth: 48,
    alignItems: 'flex-end',
    paddingVertical: 8,
  },
  playerSourceText: {
    color: '#e50914',
    fontSize: 12,
    fontWeight: '700',
  },
  playerStage: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  webPlayer: {
    flex: 1,
    backgroundColor: '#000',
  },
  nativeVideo: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
  },
  playerLoading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  playerErrorOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  playerMessage: {
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 28,
  },
  playerMessageTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  playerMessageText: {
    color: '#aaa',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  playerFooter: {
    padding: 16,
    backgroundColor: '#0b0b0b',
    gap: 6,
  },
  playerFooterTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  playerFooterDescription: {
    color: '#999',
    fontSize: 12,
    lineHeight: 17,
  },
});
