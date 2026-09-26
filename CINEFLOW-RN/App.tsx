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
  Dimensions,
} from 'react-native';
import * as Updates from 'expo-updates';
import * as SecureStore from 'expo-secure-store';
import { VideoView, useVideoPlayer } from 'expo-video';
import { WebView } from 'react-native-webview';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SPACING = 16;
const CARD_WIDTH = 110;
const CARD_HEIGHT = 165;

// ─ Type Definitions ─
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
type Episode = {
  id: string;
  episodeNumber: number;
  title: string;
  description: string;
  duration?: string;
  thumbnailUrl?: string;
  provider: string;
  embedUrl?: string;
  playbackUrl?: string;
};
type Season = { id: string; seasonNumber: number; title?: string; episodes: Episode[] };

// ─ Utilities ─
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

// ─ Playback Modal Component ─
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

          {webError && (
            <View style={styles.playerErrorOverlay}>
              <Text style={styles.playerMessageTitle}>Player could not load</Text>
              <Text style={styles.playerMessageText}>Try another source or check your connection.</Text>
              {sources.length > 1 && (
                <Pressable style={styles.primaryButton} onPress={() => { setWebError(false); setSourceIndex((index) => (index + 1) % sources.length); }}>
                  <Text style={styles.primaryButtonText}>Try another source</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>

        <View style={styles.playerFooter}>
          <Text style={styles.playerFooterTitle}>{item.title}</Text>
          <Text style={styles.playerFooterDescription} numberOfLines={2}>{item.description}</Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ─ Continue Watching Card ─
function ContinueWatchingCard({ item, onPress }: { item: MediaItem; onPress: () => void }) {
  return (
    <Pressable style={styles.cwCard} onPress={onPress}>
      <Image source={{ uri: item.backdrop || item.image }} style={styles.cwPoster} />
      <View style={styles.cwOverlay}>
        <View style={styles.cwPlayIcon}>
          <Text style={styles.playSymbol}>▶</Text>
        </View>
      </View>
      <View style={styles.cwProgress}>
        <View style={[styles.cwProgressFill, { width: '35%' }]} />
      </View>
      <View style={styles.cwInfo}>
        <Text style={styles.cwTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.cwMeta} numberOfLines={1}>{item.genre}</Text>
      </View>
    </Pressable>
  );
}

// ─ Portrait Card ─
function MediaCard({ item, onPress }: { item: MediaItem; onPress: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Image source={{ uri: item.image }} style={styles.cardImage} />
      <View style={styles.cardOverlay}>
        <View style={styles.cardPlayButton}>
          <Text style={styles.playSymbol}>▶</Text>
        </View>
      </View>
      {item.imdb && (
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingText}>★ {item.imdb}</Text>
        </View>
      )}
    </Pressable>
  );
}

// ─ Hero Section ─
function HeroSection({ item, onPlay, onMoreInfo }: { item: MediaItem; onPlay: () => void; onMoreInfo: () => void }) {
  return (
    <View style={styles.hero}>
      <Image source={{ uri: item.backdrop }} style={styles.heroImage} />
      <View style={styles.heroGradient} />
      <View style={styles.heroContent}>
        {item.badge && <Text style={styles.heroBadge}>{item.badge}</Text>}
        <Text style={styles.heroTitle}>{item.title}</Text>
        <View style={styles.heroStats}>
          <Text style={styles.heroStat}>{item.year}</Text>
          <Text style={styles.heroStatDot}>•</Text>
          <Text style={styles.heroStat}>{item.rating}</Text>
          {item.imdb && (
            <>
              <Text style={styles.heroStatDot}>•</Text>
              <Text style={styles.heroStat}>★ {item.imdb}</Text>
            </>
          )}
        </View>
        <Text style={styles.heroDescription} numberOfLines={3}>{item.description}</Text>
        <View style={styles.heroActions}>
          <Pressable style={styles.primaryButton} onPress={onPlay}>
            <Text style={styles.primaryButtonText}>▶ Play</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={onMoreInfo}>
            <Text style={styles.secondaryButtonText}>ℹ Info</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ─ API & Mapping ─
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

const TABS = ['Home', 'Movies', 'Series', 'My List'];

// ─ Main App Component ─
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

  // Load catalog
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

  // Load library
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

  // Submit auth
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

  // Toggle saved
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

  // Sign out
  const signOut = async () => {
    await SecureStore.deleteItemAsync('cf_user_token');
    setAuthToken('');
    setAccount(null);
    setSavedIds([]);
    setAuthOpen(false);
    setActiveTab('Home');
  };

  // Effects
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
        if (isAvailable.isAvailable) setUpdateAvailable(true);
      } catch {
        // noop
      }
    };
    checkUpdates();
  }, []);

  // Computed values
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
  const continueWatching = resumed.slice(0, 5);
  const discover = visibleItems.slice(1, 13).filter(item => !continueWatching.includes(item));

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
      <StatusBar barStyle="light-content" backgroundColor="#0a0e27" />

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandContainer}>
            <Image source={require('./assets/cineflix-icon.png')} style={styles.brandLogo} />
            <Text style={styles.brandName}>CINEFLIX</Text>
          </View>
          <Pressable style={styles.profileButton} onPress={() => { setAuthError(''); setAuthOpen(true); }}>
            <Text style={styles.profileText}>{account?.name.charAt(0).toUpperCase() || 'C'}</Text>
          </Pressable>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search movies & series"
            placeholderTextColor="#7a8096"
            style={styles.searchInput}
          />
          {search ? <Pressable onPress={() => setSearch('')}><Text style={styles.searchClearText}>✕</Text></Pressable> : null}
        </View>

        {/* Genres */}
        {(activeTab === 'Movies' || activeTab === 'Series') && allGenres.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.genreScroll}>
            {(['All'] as const).concat(allGenres as any[]).map((genre) => {
              const currentGenre = activeTab === 'Movies' ? movieGenre : seriesGenre;
              const isActive = currentGenre === genre;
              return (
                <Pressable
                  key={genre}
                  style={[styles.genreChip, isActive && styles.genreChipActive]}
                  onPress={() => {
                    if (activeTab === 'Movies') setMovieGenre(genre);
                    else setSeriesGenre(genre);
                  }}
                >
                  <Text style={[styles.genreChipText, isActive && styles.genreChipTextActive]}>{genre}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* Hero */}
        {hero ? <HeroSection item={hero} onPlay={() => setPlayerItem(hero)} onMoreInfo={() => setSelected(hero)} /> : null}

        {/* Continue Watching */}
        {continueWatching.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Continue Watching</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {continueWatching.map((item) => (
                <ContinueWatchingCard key={item.id} item={item} onPress={() => setSelected(item)} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Discover */}
        {discover.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{activeTab === 'Series' ? 'Popular Series' : activeTab === 'Movies' ? 'Popular Movies' : 'Discover'}</Text>
            <View style={styles.gridContainer}>
              {discover.slice(0, 6).map((item) => (
                <View key={item.id} style={styles.gridItem}>
                  <MediaCard item={item} onPress={() => setSelected(item)} />
                </View>
              ))}
            </View>
          </View>
        )}

        {loading ? <View style={styles.centerContent}><ActivityIndicator size="large" color="#e50914" /></View> : null}
        {!loading && loadError ? <View style={styles.centerContent}><Text style={styles.errorText}>{loadError}</Text></View> : null}
        {!loading && !loadError && visibleItems.length === 0 ? <View style={styles.centerContent}><Text style={styles.emptyText}>No titles found</Text></View> : null}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={Boolean(selected)} animationType="slide" onRequestClose={() => setSelected(null)}>
        {selected && (
          <SafeAreaView style={styles.detailContainer}>
            <ScrollView>
              <View style={styles.detailBackdropContainer}>
                <Image source={{ uri: selected.backdrop }} style={styles.detailBackdrop} />
                <Pressable style={styles.detailCloseButton} onPress={() => setSelected(null)}>
                  <Text style={styles.detailCloseText}>✕</Text>
                </Pressable>
              </View>

              <View style={styles.detailHeader}>
                <Image source={{ uri: selected.image }} style={styles.detailPoster} />
                <View style={styles.detailTitleContainer}>
                  <Text style={styles.detailBadge}>{selected.type === 'series' ? 'TV SERIES' : 'MOVIE'}</Text>
                  <Text style={styles.detailTitle}>{selected.title}</Text>
                  <Text style={styles.detailMeta}>{selected.year} • {selected.rating}</Text>
                </View>
              </View>

              <View style={styles.detailDescContainer}>
                <Text style={styles.detailDescription}>{selected.longDescription}</Text>
              </View>

              <View style={styles.detailActions}>
                <Pressable style={styles.primaryButton} onPress={() => setPlayerItem(selected)}>
                  <Text style={styles.primaryButtonText}>▶ Play</Text>
                </Pressable>
                <Pressable style={styles.secondaryButton} onPress={() => void toggleSaved(selected)}>
                  <Text style={styles.secondaryButtonText}>{savedIds.includes(selected.id) ? '✓ Saved' : '+ Save'}</Text>
                </Pressable>
              </View>

              {selected.genre ? <View style={styles.detailInfoRow}><Text style={styles.detailInfoLabel}>Genre</Text><Text style={styles.detailInfoValue}>{selected.genre}</Text></View> : null}
              {selected.director ? <View style={styles.detailInfoRow}><Text style={styles.detailInfoLabel}>Director</Text><Text style={styles.detailInfoValue}>{selected.director}</Text></View> : null}
              {selected.cast.length > 0 ? <View style={styles.detailInfoRow}><Text style={styles.detailInfoLabel}>Cast</Text><Text style={styles.detailInfoValue}>{selected.cast.join(', ')}</Text></View> : null}

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
                        {episode.thumbnailUrl && <Image source={{ uri: episode.thumbnailUrl }} style={styles.episodeThumbnail} />}
                        <View style={styles.episodeInfo}>
                          <Text style={styles.episodeTitle}>E{episode.episodeNumber}: {episode.title}</Text>
                          <Text style={styles.episodeDescription} numberOfLines={2}>{episode.description}</Text>
                        </View>
                        <Text style={styles.episodePlayIcon}>▶</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>

      {playerItem ? <PlaybackModal item={playerItem} onClose={() => setPlayerItem(null)} /> : null}

      {/* Update Modal */}
      <Modal visible={updateAvailable} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.updateModal}>
            <Text style={styles.updateTitle}>Update Available</Text>
            <Text style={styles.updateDescription}>Get the latest features and improvements.</Text>
            <Pressable style={[styles.primaryButton, updating && { opacity: 0.6 }]} onPress={() => void handleApplyUpdate()} disabled={updating}>
              <Text style={styles.primaryButtonText}>{updating ? 'Updating...' : 'Update Now'}</Text>
            </Pressable>
            <Pressable onPress={() => setUpdateAvailable(false)}>
              <Text style={styles.updateSkip}>Maybe Later</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        {TABS.map((tab, index) => (
          <Pressable key={tab} style={[styles.navItem, activeTab === tab && styles.navItemActive]} onPress={() => { setActiveTab(tab); setSelected(null); }}>
            <Text style={[styles.navIcon, activeTab === tab && styles.navIconActive]}>{['⌂', '🎬', '📺', '❤'][index]}</Text>
            <Text style={[styles.navLabel, activeTab === tab && styles.navLabelActive]}>{tab}</Text>
          </Pressable>
        ))}
      </View>

      {/* Auth Modal */}
      <Modal visible={authOpen} transparent animationType="slide" onRequestClose={() => setAuthOpen(false)}>
        <View style={styles.authBackdrop}>
          <View style={styles.authModal}>
            <Pressable style={styles.authCloseButton} onPress={() => setAuthOpen(false)}>
              <Text style={styles.authCloseText}>✕</Text>
            </Pressable>

            {account ? (
              <>
                <Text style={styles.authTitle}>Account</Text>
                <Text style={styles.accountName}>{account.name}</Text>
                <Text style={styles.accountEmail}>{account.email}</Text>
                <Pressable style={styles.primaryButton} onPress={() => void signOut()}>
                  <Text style={styles.primaryButtonText}>Sign Out</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.authTitle}>{authMode === 'login' ? 'Sign In' : 'Create Account'}</Text>
                {authError ? <Text style={styles.authError}>{authError}</Text> : null}
                {authMode === 'signup' ? <TextInput value={authName} onChangeText={setAuthName} placeholder="Full Name" placeholderTextColor="#7a8096" style={styles.authInput} /> : null}
                <TextInput value={authEmail} onChangeText={setAuthEmail} placeholder="Email" placeholderTextColor="#7a8096" style={styles.authInput} keyboardType="email-address" autoCapitalize="none" />
                <TextInput value={authPassword} onChangeText={setAuthPassword} placeholder="Password" placeholderTextColor="#7a8096" style={styles.authInput} secureTextEntry />
                <Pressable style={styles.primaryButton} onPress={() => void submitAuth()}>
                  <Text style={styles.primaryButtonText}>{authMode === 'login' ? 'Sign In' : 'Create Account'}</Text>
                </Pressable>
                <Pressable onPress={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}>
                  <Text style={styles.authSwitch}>{authMode === 'login' ? 'Need an account? Sign Up' : 'Already have an account? Sign In'}</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─ STYLES ─
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0a0e27' },
  scrollContainer: { paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING, paddingVertical: SPACING, borderBottomWidth: 1, borderBottomColor: '#1a1f3a' },
  brandContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandLogo: { width: 32, height: 32 },
  brandName: { fontSize: 18, fontWeight: '700', color: '#fff', letterSpacing: 1 },
  profileButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e50914', justifyContent: 'center', alignItems: 'center' },
  profileText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  searchContainer: { marginHorizontal: SPACING, marginVertical: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#151d38', borderRadius: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#2a2f45' },
  searchInput: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '500' },
  searchClearText: { fontSize: 18, color: '#7a8096' },
  genreScroll: { paddingHorizontal: SPACING, marginBottom: SPACING },
  genreChip: { paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, borderRadius: 20, backgroundColor: '#1a1f3a', borderWidth: 1, borderColor: '#2a2f45' },
  genreChipActive: { backgroundColor: '#e50914', borderColor: '#e50914' },
  genreChipText: { fontSize: 12, fontWeight: '600', color: '#7a8096' },
  genreChipTextActive: { color: '#fff' },
  hero: { marginHorizontal: SPACING, marginBottom: SPACING * 1.5, borderRadius: 12, overflow: 'hidden', height: 320 },
  heroImage: { ...StyleSheet.absoluteFillObject },
  heroGradient: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  heroContent: { flex: 1, justifyContent: 'flex-end', padding: SPACING, gap: 8 },
  heroBadge: { fontSize: 11, fontWeight: '700', color: '#e50914', letterSpacing: 0.5 },
  heroTitle: { fontSize: 28, fontWeight: '700', color: '#fff' },
  heroStats: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  heroStat: { fontSize: 12, fontWeight: '500', color: '#b0b8c8' },
  heroStatDot: { fontSize: 10, color: '#666' },
  heroDescription: { fontSize: 13, fontWeight: '400', color: '#d0d8e0', marginTop: 4, lineHeight: 18 },
  heroActions: { flexDirection: 'row', gap: SPACING, marginTop: 12 },
  section: { marginHorizontal: SPACING, marginBottom: SPACING * 2 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 12 },
  cwCard: { marginRight: 12, borderRadius: 8, overflow: 'hidden' },
  cwPoster: { width: 160, height: 100 },
  cwOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  cwPlayIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(229,9,20,0.9)', justifyContent: 'center', alignItems: 'center' },
  cwProgress: { height: 3, backgroundColor: 'rgba(255,255,255,0.2)' },
  cwProgressFill: { height: '100%', backgroundColor: '#e50914' },
  cwInfo: { paddingVertical: 8 },
  cwTitle: { fontSize: 12, fontWeight: '600', color: '#fff' },
  cwMeta: { fontSize: 11, color: '#7a8096', marginTop: 2 },
  playSymbol: { fontSize: 14, color: '#fff', fontWeight: '700' },
  card: { marginRight: 12, borderRadius: 8, overflow: 'hidden', position: 'relative' },
  cardImage: { width: CARD_WIDTH, height: CARD_HEIGHT },
  cardOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  cardPlayButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(229,9,20,0.9)', justifyContent: 'center', alignItems: 'center' },
  ratingBadge: { position: 'absolute', top: 6, right: 6, paddingHorizontal: 6, paddingVertical: 3, backgroundColor: 'rgba(245, 197, 24, 0.9)', borderRadius: 4 },
  ratingText: { fontSize: 10, fontWeight: '700', color: '#000' },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: { width: '48%', marginBottom: 12 },
  primaryButton: { paddingVertical: 11, paddingHorizontal: 16, backgroundColor: '#e50914', borderRadius: 6, alignItems: 'center' },
  primaryButtonText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  secondaryButton: { paddingVertical: 11, paddingHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center' },
  secondaryButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  detailContainer: { flex: 1, backgroundColor: '#0a0e27' },
  detailBackdropContainer: { height: 240, marginBottom: -60, zIndex: 1, position: 'relative' },
  detailBackdrop: { width: '100%', height: '100%' },
  detailCloseButton: { position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  detailCloseText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  detailHeader: { flexDirection: 'row', paddingHorizontal: SPACING, paddingTop: 40, paddingBottom: SPACING, gap: 12, backgroundColor: '#0a0e27' },
  detailPoster: { width: 100, height: 150, borderRadius: 6 },
  detailTitleContainer: { flex: 1, justifyContent: 'center' },
  detailBadge: { fontSize: 10, fontWeight: '700', color: '#e50914', letterSpacing: 0.5 },
  detailTitle: { fontSize: 22, fontWeight: '700', color: '#fff', marginTop: 4 },
  detailMeta: { fontSize: 11, fontWeight: '500', color: '#b0b8c8', marginTop: 6 },
  detailDescContainer: { paddingHorizontal: SPACING, paddingVertical: 12, backgroundColor: '#0a0e27' },
  detailDescription: { fontSize: 13, fontWeight: '400', color: '#d0d8e0', lineHeight: 19 },
  detailActions: { paddingHorizontal: SPACING, paddingVertical: 12, flexDirection: 'row', gap: 10 },
  detailInfoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: SPACING, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1a1f3a' },
  detailInfoLabel: { fontSize: 12, fontWeight: '600', color: '#7a8096' },
  detailInfoValue: { fontSize: 13, fontWeight: '500', color: '#fff', flex: 1, textAlign: 'right' },
  episodeSection: { paddingHorizontal: SPACING, paddingVertical: 12 },
  episodeRow: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1a1f3a', alignItems: 'center' },
  episodeThumbnail: { width: 80, height: 45, borderRadius: 4 },
  episodeInfo: { flex: 1 },
  episodeTitle: { fontSize: 13, fontWeight: '600', color: '#fff' },
  episodeDescription: { fontSize: 11, color: '#7a8096', marginTop: 2, lineHeight: 15 },
  episodePlayIcon: { fontSize: 16, color: '#e50914' },
  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 70, backgroundColor: '#0a0e27', borderTopWidth: 1, borderTopColor: '#1a1f3a', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingBottom: 12 },
  navItem: { alignItems: 'center', gap: 4 },
  navItemActive: {},
  navIcon: { fontSize: 24, opacity: 0.5 },
  navIconActive: { opacity: 1 },
  navLabel: { fontSize: 11, fontWeight: '600', color: '#7a8096' },
  navLabelActive: { color: '#fff' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  updateModal: { backgroundColor: '#1a1f3a', borderRadius: 12, padding: SPACING * 1.5, marginHorizontal: SPACING, alignItems: 'center' },
  updateTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 8 },
  updateDescription: { fontSize: 13, fontWeight: '400', color: '#d0d8e0', textAlign: 'center', marginBottom: 16 },
  updateSkip: { fontSize: 14, fontWeight: '600', color: '#7a8096', marginTop: 12 },
  authBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  authModal: { backgroundColor: '#1a1f3a', borderTopLeftRadius: 12, borderTopRightRadius: 12, padding: SPACING * 1.5, paddingTop: 20 },
  authCloseButton: { position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  authCloseText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  authTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 16 },
  accountName: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 4 },
  accountEmail: { fontSize: 13, color: '#7a8096', marginBottom: 16 },
  authInput: { backgroundColor: '#0a0e27', borderWidth: 1, borderColor: '#2a2f45', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, color: '#fff', fontSize: 14, marginBottom: 12 },
  authError: { fontSize: 12, fontWeight: '500', color: '#ff6b6b', marginBottom: 12 },
  authSwitch: { fontSize: 13, fontWeight: '600', color: '#e50914', textAlign: 'center', marginTop: 12 },
  centerContent: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  errorText: { fontSize: 14, color: '#ff6b6b', textAlign: 'center' },
  emptyText: { fontSize: 14, color: '#7a8096', textAlign: 'center' },
  playerScreen: { flex: 1, backgroundColor: '#000' },
  playerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING, paddingVertical: 10, backgroundColor: 'rgba(0,0,0,0.8)' },
  playerCloseButton: { paddingVertical: 6, paddingHorizontal: 12 },
  playerCloseText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  playerHeaderTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: '#fff', textAlign: 'center' },
  playerHeaderSpacer: { width: 60 },
  playerSourceButton: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: 'rgba(229,9,20,0.8)', borderRadius: 4 },
  playerSourceText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  playerStage: { flex: 1, backgroundColor: '#000' },
  webPlayer: { flex: 1 },
  nativeVideo: { flex: 1 },
  playerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  playerMessage: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  playerMessageTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 8 },
  playerMessageText: { fontSize: 13, color: '#bbb', textAlign: 'center' },
  playerErrorOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: SPACING },
  playerFooter: { paddingHorizontal: SPACING, paddingVertical: 12, backgroundColor: 'rgba(0,0,0,0.6)' },
  playerFooterTitle: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 4 },
  playerFooterDescription: { fontSize: 12, color: '#bbb', lineHeight: 16 },
  bottomPadding: { height: 20 },
});
