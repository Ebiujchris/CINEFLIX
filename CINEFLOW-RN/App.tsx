import React, { useState, useEffect, useMemo } from 'react';
import {
  SafeAreaView, View, Text, ScrollView, FlatList, Pressable, TextInput, Image,
  Modal, ActivityIndicator, StatusBar, Platform, RefreshControl, StyleSheet
} from 'react-native';
import { Video } from 'expo-video';
import * as SecureStore from 'expo-secure-store';
import { WebView } from 'react-native-webview';

const API_BASE_URL = 'https://cineflix-backend-production.up.railway.app';

const Colors = {
  bg: '#0b0b0b',
  bg2: '#141414',
  bg3: '#1c1c1c',
  bg4: '#252525',
  border: '#2e2e2e',
  text: '#e5e5e5',
  muted: '#777',
  accent: '#e50914',
  gold: '#f5c518',
};

type MediaItem = {
  id: string;
  title: string;
  type: 'movie' | 'series';
  year: number;
  duration: string;
  genre: string;
  rating: string;
  imdb: string;
  description: string;
  longDescription: string;
  trailerUrl?: string;
  director?: string;
  cast: string[];
  image: string;
  backdrop: string;
  sources: Array<{ provider: string; embedUrl?: string; playbackUrl?: string; isPrimary?: boolean }>;
  seasonsData: Array<{
    id: string;
    seasonNumber: number;
    title?: string;
    episodes: Array<{
      id: string;
      episodeNumber: number;
      title: string;
      description: string;
      duration?: string;
      thumbnailUrl?: string;
      provider: string;
      embedUrl?: string;
      playbackUrl?: string;
    }>;
  }>;
};

type AccountUser = { id: string; name: string; email: string };

function youtubeEmbedUrl(value: string): string {
  const m = value.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/i);
  return m ? `https://www.youtube.com/embed/${m[1]}?autoplay=1` : value;
}

function mapApiItem(value: unknown): MediaItem | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  if (typeof item.id !== 'string' || typeof item.title !== 'string') return null;

  const poster = typeof item.posterUrl === 'string' ? item.posterUrl : '';
  const backdrop = typeof item.backdropUrl === 'string' ? item.backdropUrl : poster;
  const videos = Array.isArray(item.videos) ? (item.videos as Record<string, unknown>[]) : [];
  const seasonsData = Array.isArray(item.seasonsData) ? (item.seasonsData as Record<string, unknown>[]) : [];

  return {
    id: item.id,
    title: item.title,
    type: String(item.type).toLowerCase() === 'series' ? 'series' : 'movie',
    year: Number(item.year) || 0,
    duration: typeof item.duration === 'string' ? item.duration : '',
    genre: typeof item.genre === 'string' ? item.genre : '',
    rating: typeof item.rating === 'string' ? item.rating : 'NR',
    imdb: typeof item.imdb === 'string' ? item.imdb : '',
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
      episodes: (Array.isArray(season.episodes) ? (season.episodes as Record<string, unknown>[]) : [])
        .map((episode, episodeIndex) => {
          const episodeVideos = Array.isArray(episode.videos) ? (episode.videos as Record<string, unknown>[]) : [];
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

function CWCard({ item, onPress, onRemove }: { item: MediaItem; onPress: () => void; onRemove: () => void }) {
  return (
    <Pressable onPress={onPress} style={s.cwCard}>
      <View style={s.cwPoster}>
        <Image source={{ uri: item.backdrop || item.image }} style={s.cwImage} />
        <Pressable style={s.cwRemove} onPress={onRemove}>
          <Text style={s.cwRemoveText}>✕</Text>
        </Pressable>
        <View style={s.cwPlayBtn}>
          <Text style={s.cwPlayIcon}>▶</Text>
        </View>
      </View>
      <Text style={s.cwTitle} numberOfLines={1}>{item.title}</Text>
      <Text style={s.cwMeta}>{item.genre} · {item.year}</Text>
    </Pressable>
  );
}

function MediaCard({ item, onPress }: { item: MediaItem; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={s.card}>
      <Image source={{ uri: item.image }} style={s.cardImage} />
    </Pressable>
  );
}

function App() {
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
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [playerItem, setPlayerItem] = useState<MediaItem | null>(null);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [activeSeason, setActiveSeason] = useState(1);

  const loadCatalog = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/content?limit=100`);
      const data = (await response.json()) as { items?: unknown[] };
      if (!response.ok) throw new Error('Could not load content');
      setMedia((data.items || []).map(mapApiItem).filter((item): item is MediaItem => item !== null));
    } catch (error) {
      console.error('Load catalog error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadLibrary = async (token: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/me/library`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Could not load library');
      const library = (await response.json()) as { watchlist?: string[] };
      setSavedIds(library.watchlist || []);
    } catch {
      setSavedIds([]);
    }
  };

  const submitAuth = async () => {
    setAuthError('');
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/users/${authMode === 'signup' ? 'signup' : 'login'}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...(authMode === 'signup' ? { name: authName } : {}),
            email: authEmail,
            password: authPassword,
          }),
        }
      );
      const data = (await response.json()) as { token?: string; user?: AccountUser };
      if (!response.ok || !data.token || !data.user) throw new Error('Auth failed');
      await SecureStore.setItemAsync('cf_user_token', data.token);
      setAuthToken(data.token);
      setAccount(data.user);
      setAuthPassword('');
      setAuthOpen(false);
      await loadLibrary(data.token);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Auth error');
    }
  };

  const toggleSaved = async (item: MediaItem) => {
    if (!authToken) {
      setAuthError('Sign in to save titles');
      setAuthMode('login');
      setAuthOpen(true);
      return;
    }
    const isSaved = savedIds.includes(item.id);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/users/me/watchlist/${encodeURIComponent(item.id)}`,
        {
          method: isSaved ? 'DELETE' : 'PUT',
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      if (!response.ok) throw new Error('Could not update watchlist');
      setSavedIds((ids) => (isSaved ? ids.filter((id) => id !== item.id) : [...ids, item.id]));
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Error updating watchlist');
    }
  };

  const signOut = async () => {
    await SecureStore.deleteItemAsync('cf_user_token');
    setAuthToken('');
    setAccount(null);
    setSavedIds([]);
    setAuthOpen(false);
  };

  useEffect(() => {
    loadCatalog();
    const restoreAccount = async () => {
      try {
        const token = await SecureStore.getItemAsync('cf_user_token');
        if (!token) return;
        const response = await fetch(`${API_BASE_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          await SecureStore.deleteItemAsync('cf_user_token');
          return;
        }
        const data = (await response.json()) as { user?: AccountUser };
        if (data.user) {
          setAuthToken(token);
          setAccount(data.user);
          await loadLibrary(token);
        }
      } catch {
        setAccount(null);
      }
    };
    restoreAccount();
  }, []);

  const hero = media.length > 0 ? media[0] : null;
  const similar = useMemo(() => {
    if (!selectedItem || !hero) return [];
    const genres = selectedItem.genre.split(',').map((g) => g.trim());
    return media.filter(
      (c) => c.id !== selectedItem.id && c.genre.split(',').some((g) => genres.includes(g.trim()))
    ).slice(0, 6);
  }, [selectedItem, media]);

  if (playerItem) {
    const source = playerItem.sources?.[0];
    return (
      <SafeAreaView style={s.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
        <View style={s.playerContainer}>
          {source?.embedUrl ? (
            <WebView
              source={{ uri: youtubeEmbedUrl(source.embedUrl) }}
              style={s.webview}
              allowsFullscreenVideo
            />
          ) : source?.playbackUrl ? (
            <Video
              source={{ uri: source.playbackUrl }}
              style={s.video}
              controls
              useNativeControls
              isLooping={false}
            />
          ) : (
            <View style={s.noSource}>
              <Text style={s.noSourceText}>No playback source available</Text>
            </View>
          )}
          <Pressable style={s.playerClose} onPress={() => setPlayerItem(null)}>
            <Text style={s.playerCloseText}>← Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (selectedItem) {
    return (
      <SafeAreaView style={s.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
        <ScrollView style={s.detailPage}>
          {/* Header */}
          <View style={s.detailHeader}>
            <Image source={{ uri: selectedItem.backdrop }} style={s.detailBackdrop} />
            <Pressable style={s.detailBackButton} onPress={() => setSelectedItem(null)}>
              <Text style={s.detailBackText}>← Back</Text>
            </Pressable>
          </View>

          {/* Hero section */}
          <View style={s.detailHero}>
            <Image source={{ uri: selectedItem.image }} style={s.detailPoster} />
            <View style={s.detailInfo}>
              <Text style={s.detailBadge}>{selectedItem.type === 'series' ? 'TV SERIES' : 'MOVIE'}</Text>
              <Text style={s.detailTitle}>{selectedItem.title}</Text>
              <Text style={s.detailMeta}>
                {selectedItem.year} · {selectedItem.duration} · {selectedItem.rating}
                {selectedItem.imdb && ` · ⭐ ${selectedItem.imdb}`}
              </Text>
              <Text style={s.detailDesc}>{selectedItem.longDescription}</Text>

              {/* Action buttons */}
              <View style={s.detailActions}>
                <Pressable style={s.playButton} onPress={() => setPlayerItem(selectedItem)}>
                  <Text style={s.playButtonText}>▶ PLAY</Text>
                </Pressable>
                {selectedItem.trailerUrl && (
                  <Pressable style={s.trailerButton} onPress={() => setTrailerOpen(true)}>
                    <Text style={s.trailerButtonText}>📹 TRAILER</Text>
                  </Pressable>
                )}
                <Pressable
                  style={s.saveButton}
                  onPress={() => toggleSaved(selectedItem)}
                >
                  <Text style={s.saveButtonText}>
                    {savedIds.includes(selectedItem.id) ? '✓ SAVED' : '+ LIST'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Details */}
          <View style={s.detailDetails}>
            {selectedItem.genre && (
              <View style={s.detailRow}>
                <Text style={s.detailLabel}>Genre</Text>
                <Text style={s.detailValue}>{selectedItem.genre}</Text>
              </View>
            )}
            {selectedItem.director && (
              <View style={s.detailRow}>
                <Text style={s.detailLabel}>Director</Text>
                <Text style={s.detailValue}>{selectedItem.director}</Text>
              </View>
            )}
            {selectedItem.cast.length > 0 && (
              <View style={s.detailRow}>
                <Text style={s.detailLabel}>Cast</Text>
                <Text style={s.detailValue}>{selectedItem.cast.join(', ')}</Text>
              </View>
            )}
          </View>

          {/* Episodes for series */}
          {selectedItem.type === 'series' && selectedItem.seasonsData.length > 0 && (
            <View style={s.episodeSection}>
              <Text style={s.sectionTitle}>Episodes</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.seasonTabs}>
                {selectedItem.seasonsData.map((season) => (
                  <Pressable
                    key={season.id}
                    style={[
                      s.seasonTab,
                      activeSeason === season.seasonNumber && s.seasonTabActive,
                    ]}
                    onPress={() => setActiveSeason(season.seasonNumber)}
                  >
                    <Text style={s.seasonTabText}>
                      {season.title || `Season ${season.seasonNumber}`}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {selectedItem.seasonsData
                .find((s) => s.seasonNumber === activeSeason)
                ?.episodes.map((episode) => (
                  <Pressable
                    key={episode.id}
                    style={s.episodeCard}
                    onPress={() => {
                      setPlayerItem({
                        ...selectedItem,
                        id: episode.id,
                        title: `${selectedItem.title} - E${episode.episodeNumber}: ${episode.title}`,
                        description: episode.description,
                        longDescription: episode.description,
                        duration: episode.duration || '',
                        image: episode.thumbnailUrl || selectedItem.image,
                        sources: [
                          {
                            provider: episode.provider,
                            embedUrl: episode.embedUrl,
                            playbackUrl: episode.playbackUrl,
                          },
                        ],
                      });
                    }}
                  >
                    {episode.thumbnailUrl && (
                      <Image
                        source={{ uri: episode.thumbnailUrl }}
                        style={s.episodeThumb}
                      />
                    )}
                    <View style={s.episodeInfo}>
                      <Text style={s.episodeTitle}>
                        E{episode.episodeNumber}: {episode.title}
                      </Text>
                      <Text style={s.episodeDesc} numberOfLines={2}>
                        {episode.description}
                      </Text>
                      {episode.duration && (
                        <Text style={s.episodeDur}>⏱ {episode.duration}</Text>
                      )}
                    </View>
                  </Pressable>
                ))}
            </View>
          )}

          {/* Similar/You May Also Like */}
          {similar.length > 0 && (
            <View style={s.similarSection}>
              <Text style={s.sectionTitle}>You May Also Like</Text>
              <View style={s.similarGrid}>
                {similar.map((item) => (
                  <Pressable key={item.id} onPress={() => setSelectedItem(item)}>
                    <Image source={{ uri: item.image }} style={s.similarCard} />
                    <Text style={s.similarTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Trailer Modal */}
        {trailerOpen && selectedItem.trailerUrl && (
          <Modal transparent animationType="fade" onRequestClose={() => setTrailerOpen(false)}>
            <Pressable
              style={s.trailerBackdrop}
              onPress={() => setTrailerOpen(false)}
            >
              <View style={s.trailerBox}>
                <Pressable
                  style={s.trailerClose}
                  onPress={() => setTrailerOpen(false)}
                >
                  <Text style={s.trailerCloseText}>✕</Text>
                </Pressable>
                <WebView
                  source={{ uri: youtubeEmbedUrl(selectedItem.trailerUrl) }}
                  style={s.trailerIframe}
                />
              </View>
            </Pressable>
          </Modal>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />

      <ScrollView
        style={s.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadCatalog(); }} tintColor={Colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={s.appTitle}>CINEFLIX</Text>
          <Pressable onPress={() => { setAuthError(''); setAuthOpen(true); }}>
            <View style={s.profileButton}>
              <Text style={s.profileInitial}>
                {account?.name.charAt(0).toUpperCase() || 'C'}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Search */}
        <View style={s.searchBox}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search"
            placeholderTextColor={Colors.muted}
            style={s.searchInput}
          />
        </View>

        {loading && <ActivityIndicator size="large" color={Colors.accent} style={s.loader} />}

        {!loading && hero && (
          <Pressable onPress={() => setSelectedItem(hero)} style={s.heroCard}>
            <Image source={{ uri: hero.backdrop }} style={s.heroImage} />
            <View style={s.heroScrim} />
            <View style={s.heroContent}>
              <Text style={s.heroTitle}>{hero.title}</Text>
              <Text style={s.heroDesc} numberOfLines={2}>
                {hero.description}
              </Text>
              <View style={s.heroActions}>
                <Pressable
                  style={s.heroPlayBtn}
                  onPress={() => setPlayerItem(hero)}
                >
                  <Text style={s.heroPlayText}>▶ PLAY</Text>
                </Pressable>
                <Pressable
                  style={s.heroMoreBtn}
                  onPress={() => setSelectedItem(hero)}
                >
                  <Text style={s.heroMoreText}>ℹ MORE</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        )}

        {/* Continue Watching */}
        {media.slice(0, 4).length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Continue Watching</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.horizontalScroll}>
              {media.slice(0, 4).map((item) => (
                <CWCard
                  key={item.id}
                  item={item}
                  onPress={() => setSelectedItem(item)}
                  onRemove={() => {}}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Trending */}
        {media.length > 0 && (
          <>
            <View style={s.section}>
              <Text style={s.sectionTitle}>Trending Now</Text>
              <View style={s.cardGrid}>
                {media.slice(0, 6).map((item) => (
                  <MediaCard
                    key={item.id}
                    item={item}
                    onPress={() => setSelectedItem(item)}
                  />
                ))}
              </View>
            </View>

            <View style={s.section}>
              <Text style={s.sectionTitle}>New Releases</Text>
              <View style={s.cardGrid}>
                {media.slice(6, 12).map((item) => (
                  <MediaCard
                    key={item.id}
                    item={item}
                    onPress={() => setSelectedItem(item)}
                  />
                ))}
              </View>
            </View>
          </>
        )}

        {!loading && media.length === 0 && (
          <View style={s.emptyState}>
            <Text style={s.emptyStateText}>No content found</Text>
          </View>
        )}

        <View style={s.bottomPadding} />
      </ScrollView>

      {/* Auth Modal */}
      <Modal visible={authOpen} transparent animationType="slide">
        <SafeAreaView style={s.authBackdrop}>
          <Pressable style={s.authClose} onPress={() => setAuthOpen(false)}>
            <Text style={s.authCloseText}>✕</Text>
          </Pressable>

          {account ? (
            <View style={s.authForm}>
              <Text style={s.authTitle}>Account</Text>
              <Text style={s.accountName}>{account.name}</Text>
              <Text style={s.accountEmail}>{account.email}</Text>
              <Pressable style={s.signOutBtn} onPress={() => void signOut()}>
                <Text style={s.signOutText}>Sign Out</Text>
              </Pressable>
            </View>
          ) : (
            <View style={s.authForm}>
              <Text style={s.authTitle}>
                {authMode === 'login' ? 'Sign In' : 'Create Account'}
              </Text>
              {authError && <Text style={s.authError}>{authError}</Text>}
              {authMode === 'signup' && (
                <TextInput
                  value={authName}
                  onChangeText={setAuthName}
                  placeholder="Full Name"
                  style={s.authInput}
                  placeholderTextColor={Colors.muted}
                />
              )}
              <TextInput
                value={authEmail}
                onChangeText={setAuthEmail}
                placeholder="Email"
                style={s.authInput}
                placeholderTextColor={Colors.muted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                value={authPassword}
                onChangeText={setAuthPassword}
                placeholder="Password"
                style={s.authInput}
                placeholderTextColor={Colors.muted}
                secureTextEntry
              />
              <Pressable style={s.authSubmitBtn} onPress={() => void submitAuth()}>
                <Text style={s.authSubmitText}>
                  {authMode === 'login' ? 'Sign In' : 'Create Account'}
                </Text>
              </Pressable>
              <Pressable onPress={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}>
                <Text style={s.authSwitch}>
                  {authMode === 'login'
                    ? "Need an account? Sign Up"
                    : "Already have an account? Sign In"}
                </Text>
              </Pressable>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bg },
  scrollView: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: Colors.bg },
  appTitle: { fontSize: 18, fontWeight: '700', color: '#fff', letterSpacing: 1.2 },
  profileButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.accent, justifyContent: 'center', alignItems: 'center' },
  profileInitial: { fontSize: 14, fontWeight: '700', color: '#fff' },

  searchBox: { marginHorizontal: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bg3, borderRadius: 6, paddingHorizontal: 12, height: 40, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, color: '#fff', fontSize: 14 },

  heroCard: { marginHorizontal: 12, marginBottom: 28, borderRadius: 8, overflow: 'hidden', height: 300 },
  heroImage: { width: '100%', height: '100%' },
  heroScrim: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  heroContent: { position: 'absolute', inset: 0, justifyContent: 'flex-end', padding: 16 },
  heroTitle: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 8 },
  heroDesc: { fontSize: 13, color: '#ccc', marginBottom: 14, lineHeight: 18 },
  heroActions: { flexDirection: 'row', gap: 10 },
  heroPlayBtn: { backgroundColor: Colors.accent, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 4, justifyContent: 'center' },
  heroPlayText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  heroMoreBtn: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 4, justifyContent: 'center' },
  heroMoreText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  section: { marginBottom: 32, paddingHorizontal: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 12, letterSpacing: -0.3 },
  horizontalScroll: { marginBottom: 0 },
  cwCard: { marginRight: 12, width: 260, marginBottom: 0 },
  cwPoster: { position: 'relative', aspectRatio: 16/9, backgroundColor: Colors.bg3, borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  cwImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  cwPlayBtn: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  cwPlayIcon: { fontSize: 36, color: '#fff', opacity: 0.8 },
  cwRemove: { position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  cwRemoveText: { color: '#bbb', fontSize: 14, fontWeight: '600' },
  cwTitle: { fontSize: 13, fontWeight: '600', color: '#fff' },
  cwMeta: { fontSize: 11, color: Colors.muted },

  cardGrid: { display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 0 },
  card: { width: '28%', aspectRatio: 2/3, borderRadius: 6, overflow: 'hidden', backgroundColor: Colors.bg3 },
  cardImage: { width: '100%', height: '100%', resizeMode: 'cover' },

  detailPage: { flex: 1, backgroundColor: Colors.bg },
  detailHeader: { position: 'relative', height: 200 },
  detailBackdrop: { width: '100%', height: '100%', resizeMode: 'cover' },
  detailBackButton: { position: 'absolute', top: 16, left: 16, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4 },
  detailBackText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  detailHero: { flexDirection: 'row', gap: 16, paddingHorizontal: 12, paddingTop: 20, paddingBottom: 20 },
  detailPoster: { width: 100, height: 150, borderRadius: 6, backgroundColor: Colors.bg3 },
  detailInfo: { flex: 1 },
  detailBadge: { color: Colors.accent, fontSize: 9, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  detailTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 8 },
  detailMeta: { fontSize: 11, color: '#999', marginBottom: 12 },
  detailDesc: { fontSize: 12, color: '#ccc', lineHeight: 18, marginBottom: 12 },

  detailActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  playButton: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 4, justifyContent: 'center' },
  playButtonText: { color: '#000', fontWeight: '700', fontSize: 11 },
  trailerButton: { backgroundColor: Colors.bg4, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 4, borderWidth: 1, borderColor: Colors.border },
  trailerButtonText: { color: '#fff', fontWeight: '600', fontSize: 11 },
  saveButton: { backgroundColor: Colors.bg4, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 4, borderWidth: 1, borderColor: Colors.border },
  saveButtonText: { color: '#fff', fontWeight: '600', fontSize: 11 },

  detailDetails: { paddingHorizontal: 12, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: Colors.border },
  detailRow: { marginBottom: 12 },
  detailLabel: { fontSize: 10, color: Colors.muted, fontWeight: '600', marginBottom: 4 },
  detailValue: { fontSize: 12, color: '#ccc', lineHeight: 18 },

  episodeSection: { paddingHorizontal: 12, paddingVertical: 20 },
  seasonTabs: { marginBottom: 16, paddingBottom: 12 },
  seasonTab: { marginRight: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  seasonTabActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  seasonTabText: { fontSize: 12, fontWeight: '600', color: '#fff' },

  episodeCard: { flexDirection: 'row', gap: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10, backgroundColor: Colors.bg3, borderRadius: 6, borderWidth: 1, borderColor: Colors.border },
  episodeThumb: { width: 100, height: 60, borderRadius: 4, backgroundColor: Colors.bg2 },
  episodeInfo: { flex: 1 },
  episodeTitle: { fontSize: 12, fontWeight: '600', color: '#fff', marginBottom: 4 },
  episodeDesc: { fontSize: 11, color: Colors.muted, marginBottom: 4 },
  episodeDur: { fontSize: 10, color: '#666' },

  similarSection: { paddingHorizontal: 12, paddingVertical: 20 },
  similarGrid: { display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  similarCard: { width: '28%', aspectRatio: 2/3, borderRadius: 6, backgroundColor: Colors.bg3 },
  similarTitle: { fontSize: 11, color: '#ccc', marginTop: 4 },

  trailerBackdrop: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12 },
  trailerBox: { position: 'relative', width: '100%', maxHeight: 400, backgroundColor: Colors.bg2, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  trailerClose: { position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  trailerCloseText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  trailerIframe: { width: '100%', aspectRatio: 16/9, backgroundColor: '#000' },
  webview: { width: '100%', height: '100%' },
  video: { width: '100%', height: '100%' },

  playerContainer: { flex: 1, backgroundColor: '#000' },
  playerClose: { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4, zIndex: 10 },
  playerCloseText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  noSource: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  noSourceText: { color: '#888', fontSize: 14 },

  emptyState: { justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyStateText: { color: Colors.muted, fontSize: 14 },
  bottomPadding: { height: 20 },

  authBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  authClose: { position: 'absolute', top: 14, right: 14, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  authCloseText: { color: '#bbb', fontSize: 16, fontWeight: '600' },
  authForm: { width: '90%', maxWidth: 360, backgroundColor: Colors.bg2, borderRadius: 8, paddingHorizontal: 20, paddingVertical: 24, borderWidth: 1, borderColor: Colors.border },
  authTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 16 },
  accountName: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 6 },
  accountEmail: { fontSize: 12, color: Colors.muted, marginBottom: 20 },
  authInput: { width: '100%', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 6, backgroundColor: Colors.bg3, borderWidth: 1, borderColor: Colors.border, color: '#fff', fontSize: 13, marginBottom: 12 },
  authError: { color: '#ff6b6b', fontSize: 12, marginBottom: 12, backgroundColor: 'rgba(229,9,20,0.1)', padding: 8, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(229,9,20,0.3)' },
  authSubmitBtn: { width: '100%', paddingVertical: 12, borderRadius: 6, backgroundColor: Colors.accent, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  authSubmitText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  authSwitch: { width: '100%', marginTop: 16, color: Colors.accent, fontSize: 12, textAlign: 'center' },
  signOutBtn: { width: '100%', paddingVertical: 10, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(229,9,20,0.3)', justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  signOutText: { color: '#ff8585', fontSize: 12, fontWeight: '600' },
});

export default App;
