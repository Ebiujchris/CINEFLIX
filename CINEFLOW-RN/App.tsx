import React, { useState, useEffect, useMemo } from 'react';
import {
  SafeAreaView, View, Text, ScrollView, Pressable, TextInput, Image,
  Modal, ActivityIndicator, StatusBar, FlatList, StyleSheet, RefreshControl
} from 'react-native';
import { Video } from 'expo-video';
import * as SecureStore from 'expo-secure-store';
import { WebView } from 'react-native-webview';

const API_BASE_URL = 'https://cineflix-backend-production.up.railway.app';

// Colors from website
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

type Content = {
  id: string;
  title: string;
  type: 'movie' | 'series';
  year: number;
  duration: string;
  genre: string;
  rating: string;
  imdb: string;
  badge?: string;
  description: string;
  longDescription: string;
  trailerUrl?: string;
  director?: string;
  cast: string[];
  posterUrl: string;
  backdropUrl: string;
  videos: Array<{ provider: string; embedUrl?: string; playbackUrl?: string; isPrimary?: boolean }>;
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
      videos: Array<{ provider: string; embedUrl?: string; playbackUrl?: string; isPrimary?: boolean }>;
    }>;
  }>;
};

type Page = 'home' | 'movies' | 'series' | 'watchlist';
type AccountUser = { id: string; name: string; email: string };

function mapApiItem(item: any): Content | null {
  if (!item?.id || !item?.title) return null;
  return {
    id: item.id,
    title: item.title,
    type: item.type?.toLowerCase() === 'series' ? 'series' : 'movie',
    year: item.year || 0,
    duration: item.duration || '',
    genre: item.genre || '',
    rating: item.rating || 'NR',
    imdb: item.imdb || '',
    badge: item.badge,
    description: item.description || '',
    longDescription: item.longDescription || item.description || '',
    trailerUrl: item.trailerUrl,
    director: item.director,
    cast: item.cast || [],
    posterUrl: item.posterUrl || '',
    backdropUrl: item.backdropUrl || '',
    videos: item.videos || [],
    seasonsData: item.seasonsData || [],
  };
}

function ContinueWatchingCard({ item, onPress, onRemove }: any) {
  return (
    <Pressable onPress={onPress} style={styles.cwCard}>
      <View style={styles.cwPoster}>
        <Image source={{ uri: item.backdropUrl || item.posterUrl }} style={styles.cwImage} />
        <View style={styles.cwOverlay}>
          <View style={styles.cwPlayBtn}>
            <Text style={styles.playIcon}>▶</Text>
          </View>
        </View>
        <Pressable style={styles.cwRemove} onPress={onRemove}>
          <Text style={styles.closeIcon}>✕</Text>
        </Pressable>
      </View>
      <Text style={styles.cwTitle} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.cwMeta}>{item.duration} • {item.year}</Text>
    </Pressable>
  );
}

function MovieCard({ item, onPress }: any) {
  return (
    <Pressable onPress={onPress} style={styles.movieCard}>
      <Image source={{ uri: item.posterUrl }} style={styles.moviePoster} />
      {item.badge && <Text style={styles.badge}>{item.badge}</Text>}
    </Pressable>
  );
}

export default function App() {
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState<Page>('home');
  const [detailItem, setDetailItem] = useState<Content | null>(null);
  const [playerItem, setPlayerItem] = useState<Content | null>(null);
  const [searchVal, setSearchVal] = useState('');
  const [myList, setMyList] = useState<string[]>([]);
  const [account, setAccount] = useState<AccountUser | null>(null);
  const [authToken, setAuthToken] = useState('');
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [movieGenre, setMovieGenre] = useState('All');
  const [seriesGenre, setSeriesGenre] = useState('All');
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [activeSeason, setActiveSeason] = useState(1);

  const loadContent = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/content?limit=100`);
      const data = await res.json();
      const mapped = (data.items || []).map(mapApiItem).filter(Boolean);
      setContent(mapped);
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadLibrary = async (token: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/users/me/library`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMyList(data.watchlist || []);
    } catch {}
  };

  const submitAuth = async () => {
    setAuthError('');
    try {
      const res = await fetch(
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
      const data = await res.json();
      if (!data.token || !data.user) throw new Error('Auth failed');
      await SecureStore.setItemAsync('cf_token', data.token);
      setAuthToken(data.token);
      setAccount(data.user);
      setAuthOpen(false);
      setAuthPassword('');
      await loadLibrary(data.token);
    } catch (err: any) {
      setAuthError(err.message || 'Auth error');
    }
  };

  const toggleList = async (id: string) => {
    if (!account) {
      setAuthMode('login');
      setAuthOpen(true);
      return;
    }
    const isIncluded = myList.includes(id);
    setMyList(isIncluded ? myList.filter(x => x !== id) : [...myList, id]);
    try {
      const method = isIncluded ? 'DELETE' : 'PUT';
      await fetch(
        `${API_BASE_URL}/api/users/me/watchlist/${id}`,
        { method, headers: { Authorization: `Bearer ${authToken}` } }
      );
    } catch {}
  };

  const signOut = async () => {
    await SecureStore.deleteItemAsync('cf_token');
    setAuthToken('');
    setAccount(null);
    setMyList([]);
    setAuthOpen(false);
  };

  useEffect(() => {
    loadContent();
    const restore = async () => {
      try {
        const token = await SecureStore.getItemAsync('cf_token');
        if (!token) return;
        const res = await fetch(`${API_BASE_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          await SecureStore.deleteItemAsync('cf_token');
          return;
        }
        const data = await res.json();
        setAuthToken(token);
        setAccount(data.user);
        await loadLibrary(token);
      } catch {}
    };
    restore();
  }, []);

  const movies = useMemo(() => content.filter(c => c.type === 'movie'), [content]);
  const series = useMemo(() => content.filter(c => c.type === 'series'), [content]);
  const watchlist = useMemo(() => content.filter(c => myList.includes(c.id)), [content, myList]);
  const filteredMovies = useMemo(
    () => movieGenre === 'All' ? movies : movies.filter(m => m.genre.includes(movieGenre)),
    [movies, movieGenre]
  );
  const filteredSeries = useMemo(
    () => seriesGenre === 'All' ? series : series.filter(s => s.genre.includes(seriesGenre)),
    [series, seriesGenre]
  );
  const searchResults = useMemo(() => {
    if (searchVal.length < 2) return [];
    const term = searchVal.toLowerCase();
    return content.filter(c =>
      c.title.toLowerCase().includes(term) ||
      c.genre.toLowerCase().includes(term) ||
      c.cast.some(a => a.toLowerCase().includes(term))
    );
  }, [searchVal, content]);

  if (playerItem) {
    const video = playerItem.videos?.[0];
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
        <View style={styles.playerContainer}>
          {video?.embedUrl ? (
            <WebView source={{ uri: video.embedUrl }} style={styles.webview} allowsFullscreenVideo />
          ) : video?.playbackUrl ? (
            <Video source={{ uri: video.playbackUrl }} style={styles.video} controls useNativeControls isLooping={false} />
          ) : (
            <View style={styles.noSource}>
              <Text style={styles.noSourceText}>No video source</Text>
            </View>
          )}
          <Pressable style={styles.playerClose} onPress={() => setPlayerItem(null)}>
            <Text style={styles.playerCloseText}>← Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (detailItem) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
        <ScrollView style={styles.detailPage}>
          <Image source={{ uri: detailItem.backdropUrl }} style={styles.detailBackdrop} />
          <Pressable style={styles.detailBack} onPress={() => setDetailItem(null)}>
            <Text style={styles.detailBackText}>← Back</Text>
          </Pressable>

          <View style={styles.detailHero}>
            <Image source={{ uri: detailItem.posterUrl }} style={styles.detailPoster} />
            <View style={styles.detailInfo}>
              <Text style={styles.detailType}>{detailItem.type === 'series' ? 'TV SERIES' : 'MOVIE'}</Text>
              <Text style={styles.detailTitle}>{detailItem.title}</Text>
              <Text style={styles.detailMeta}>
                {detailItem.year} • {detailItem.duration} • {detailItem.rating}
                {detailItem.imdb ? ` • ⭐ ${detailItem.imdb}` : ''}
              </Text>
              <Text style={styles.detailDesc}>{detailItem.longDescription}</Text>

              <View style={styles.detailActions}>
                <Pressable style={styles.btnPlay} onPress={() => setPlayerItem(detailItem)}>
                  <Text style={styles.btnPlayText}>▶ PLAY</Text>
                </Pressable>
                {detailItem.trailerUrl && (
                  <Pressable style={styles.btnTrailer} onPress={() => setTrailerOpen(true)}>
                    <Text style={styles.btnTrailerText}>📹 TRAILER</Text>
                  </Pressable>
                )}
                <Pressable style={styles.btnList} onPress={() => toggleList(detailItem.id)}>
                  <Text style={styles.btnListText}>
                    {myList.includes(detailItem.id) ? '✓ SAVED' : '+ LIST'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>

          <View style={styles.detailMeta2}>
            {detailItem.genre && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Genre</Text>
                <Text style={styles.metaValue}>{detailItem.genre}</Text>
              </View>
            )}
            {detailItem.director && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Director</Text>
                <Text style={styles.metaValue}>{detailItem.director}</Text>
              </View>
            )}
            {detailItem.cast?.length > 0 && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Cast</Text>
                <Text style={styles.metaValue}>{detailItem.cast.join(', ')}</Text>
              </View>
            )}
          </View>

          {detailItem.type === 'series' && detailItem.seasonsData?.length > 0 && (
            <View style={styles.epSection}>
              <Text style={styles.epTitle}>Episodes</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.seasonTabs}>
                {detailItem.seasonsData.map(season => (
                  <Pressable
                    key={season.id}
                    style={[styles.seasonTab, activeSeason === season.seasonNumber && styles.seasonTabActive]}
                    onPress={() => setActiveSeason(season.seasonNumber)}
                  >
                    <Text style={styles.seasonTabText}>{season.title || `Season ${season.seasonNumber}`}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              {detailItem.seasonsData.find(s => s.seasonNumber === activeSeason)?.episodes.map(ep => (
                <Pressable
                  key={ep.id}
                  style={styles.epCard}
                  onPress={() => {
                    setPlayerItem({ ...detailItem, id: ep.id, title: `${detailItem.title} - E${ep.episodeNumber}`, videos: ep.videos });
                  }}
                >
                  {ep.thumbnailUrl && <Image source={{ uri: ep.thumbnailUrl }} style={styles.epThumb} />}
                  <View style={styles.epInfo}>
                    <Text style={styles.epName}>E{ep.episodeNumber}: {ep.title}</Text>
                    <Text style={styles.epDesc} numberOfLines={2}>{ep.description}</Text>
                    {ep.duration && <Text style={styles.epDur}>⏱ {ep.duration}</Text>}
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          {/* Similar */}
          {content.slice(0, 6).length > 0 && (
            <View style={styles.similarSection}>
              <Text style={styles.similarTitle}>You May Also Like</Text>
              <View style={styles.similarGrid}>
                {content.slice(0, 6).map(item => (
                  <Pressable key={item.id} onPress={() => setDetailItem(item)}>
                    <Image source={{ uri: item.posterUrl }} style={styles.simCard} />
                    <Text style={styles.simText} numberOfLines={1}>{item.title}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>

        {trailerOpen && detailItem.trailerUrl && (
          <Modal transparent animationType="fade" onRequestClose={() => setTrailerOpen(false)}>
            <Pressable style={styles.trailerBackdrop} onPress={() => setTrailerOpen(false)}>
              <View style={styles.trailerBox}>
                <Pressable style={styles.trailerClose} onPress={() => setTrailerOpen(false)}>
                  <Text style={styles.trailerCloseIcon}>✕</Text>
                </Pressable>
                <WebView source={{ uri: detailItem.trailerUrl }} style={styles.trailerIframe} />
              </View>
            </Pressable>
          </Modal>
        )}
      </SafeAreaView>
    );
  }

  // HOME PAGE
  if (page === 'home' && searchVal.length < 2) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
        <ScrollView
          style={styles.scrollView}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadContent(); }} tintColor={Colors.accent} />}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logo}>CINEFLIX</Text>
            <Pressable onPress={() => setAuthOpen(true)} style={styles.profileBtn}>
              <Text style={styles.profileText}>{account?.name.split(' ')[0] || 'C'}</Text>
            </Pressable>
          </View>

          {/* Search */}
          <View style={styles.searchBox}>
            <TextInput placeholder="Search…" value={searchVal} onChangeText={setSearchVal} style={styles.searchInput} placeholderTextColor={Colors.muted} />
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={Colors.accent} style={styles.loader} />
          ) : (
            <>
              {/* Hero */}
              {content.length > 0 && (
                <Pressable onPress={() => setDetailItem(content[0])} style={styles.hero}>
                  <Image source={{ uri: content[0].backdropUrl }} style={styles.heroImage} />
                  <View style={styles.heroScrim} />
                  <View style={styles.heroContent}>
                    <Text style={styles.heroTitle}>{content[0].title}</Text>
                    <Text style={styles.heroDesc} numberOfLines={2}>{content[0].description}</Text>
                    <View style={styles.heroButtons}>
                      <Pressable style={styles.heroPay} onPress={() => setPlayerItem(content[0])}>
                        <Text style={styles.heroPlayText}>▶ PLAY</Text>
                      </Pressable>
                      <Pressable style={styles.heroInfo} onPress={() => setDetailItem(content[0])}>
                        <Text style={styles.heroInfoText}>ℹ INFO</Text>
                      </Pressable>
                    </View>
                  </View>
                </Pressable>
              )}

              {/* Continue Watching */}
              {content.slice(0, 4).length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Continue Watching</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {content.slice(0, 4).map(item => (
                      <ContinueWatchingCard key={item.id} item={item} onPress={() => setDetailItem(item)} onRemove={() => {}} />
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Trending */}
              {content.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Trending Now</Text>
                  <View style={styles.grid}>
                    {content.slice(0, 6).map(item => (
                      <MovieCard key={item.id} item={item} onPress={() => setDetailItem(item)} />
                    ))}
                  </View>
                </View>
              )}

              {/* Movies */}
              {movies.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Movies</Text>
                  <View style={styles.grid}>
                    {movies.slice(0, 6).map(item => (
                      <MovieCard key={item.id} item={item} onPress={() => setDetailItem(item)} />
                    ))}
                  </View>
                </View>
              )}

              {/* Series */}
              {series.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>TV Series</Text>
                  <View style={styles.grid}>
                    {series.slice(0, 6).map(item => (
                      <MovieCard key={item.id} item={item} onPress={() => setDetailItem(item)} />
                    ))}
                  </View>
                </View>
              )}
            </>
          )}

          <View style={{ height: 80 }} />
        </ScrollView>

        {/* Bottom Nav */}
        <View style={styles.bottomNav}>
          {[{ label: 'Home', key: 'home' }, { label: 'Movies', key: 'movies' }, { label: 'Series', key: 'series' }, { label: 'My List', key: 'watchlist' }].map(nav => (
            <Pressable key={nav.key} style={[styles.navItem, page === nav.key && styles.navItemActive]} onPress={() => setPage(nav.key as Page)}>
              <Text style={[styles.navLabel, page === nav.key && styles.navLabelActive]}>{nav.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Auth Modal */}
        <Modal visible={authOpen} transparent animationType="slide">
          <SafeAreaView style={styles.authBackdrop}>
            <Pressable style={styles.authClose} onPress={() => setAuthOpen(false)}>
              <Text style={styles.authCloseText}>✕</Text>
            </Pressable>
            {account ? (
              <View style={styles.authForm}>
                <Text style={styles.authTitle}>Account</Text>
                <Text style={styles.accountName}>{account.name}</Text>
                <Text style={styles.accountEmail}>{account.email}</Text>
                <Pressable style={styles.signOutBtn} onPress={signOut}>
                  <Text style={styles.signOutText}>Sign Out</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.authForm}>
                <Text style={styles.authTitle}>{authMode === 'login' ? 'Sign In' : 'Create Account'}</Text>
                {authError && <Text style={styles.authError}>{authError}</Text>}
                {authMode === 'signup' && (
                  <TextInput placeholder="Full Name" value={authName} onChangeText={setAuthName} style={styles.authInput} placeholderTextColor={Colors.muted} />
                )}
                <TextInput placeholder="Email" value={authEmail} onChangeText={setAuthEmail} style={styles.authInput} placeholderTextColor={Colors.muted} keyboardType="email-address" />
                <TextInput placeholder="Password" value={authPassword} onChangeText={setAuthPassword} style={styles.authInput} placeholderTextColor={Colors.muted} secureTextEntry />
                <Pressable style={styles.authBtn} onPress={submitAuth}>
                  <Text style={styles.authBtnText}>{authMode === 'login' ? 'Sign In' : 'Create Account'}</Text>
                </Pressable>
                <Pressable onPress={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}>
                  <Text style={styles.authSwitch}>{authMode === 'login' ? "Need an account? Sign Up" : "Already have an account? Sign In"}</Text>
                </Pressable>
              </View>
            )}
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    );
  }

  // MOVIES PAGE
  if (page === 'movies' && searchVal.length < 2) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
        <ScrollView style={styles.scrollView}>
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>MOVIES</Text>
          </View>
          <View style={styles.genreBar}>
            {['All', ...new Set(movies.map(m => m.genre))].slice(0, 5).map(g => (
              <Pressable
                key={g}
                style={[styles.genreBtn, movieGenre === g && styles.genreBtnActive]}
                onPress={() => setMovieGenre(g as any)}
              >
                <Text style={movieGenre === g ? styles.genreBtnTextActive : styles.genreBtnText}>{g}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.grid}>
            {filteredMovies.map(m => <MovieCard key={m.id} item={m} onPress={() => setDetailItem(m)} />)}
          </View>
          <View style={{ height: 80 }} />
        </ScrollView>
        <View style={styles.bottomNav}>
          {[{ label: 'Home', key: 'home' }, { label: 'Movies', key: 'movies' }, { label: 'Series', key: 'series' }, { label: 'My List', key: 'watchlist' }].map(nav => (
            <Pressable key={nav.key} style={[styles.navItem, page === nav.key && styles.navItemActive]} onPress={() => setPage(nav.key as Page)}>
              <Text style={[styles.navLabel, page === nav.key && styles.navLabelActive]}>{nav.label}</Text>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  // SERIES PAGE
  if (page === 'series' && searchVal.length < 2) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
        <ScrollView style={styles.scrollView}>
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>TV SERIES</Text>
          </View>
          <View style={styles.genreBar}>
            {['All', ...new Set(series.map(s => s.genre))].slice(0, 5).map(g => (
              <Pressable
                key={g}
                style={[styles.genreBtn, seriesGenre === g && styles.genreBtnActive]}
                onPress={() => setSeriesGenre(g as any)}
              >
                <Text style={seriesGenre === g ? styles.genreBtnTextActive : styles.genreBtnText}>{g}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.grid}>
            {filteredSeries.map(s => <MovieCard key={s.id} item={s} onPress={() => setDetailItem(s)} />)}
          </View>
          <View style={{ height: 80 }} />
        </ScrollView>
        <View style={styles.bottomNav}>
          {[{ label: 'Home', key: 'home' }, { label: 'Movies', key: 'movies' }, { label: 'Series', key: 'series' }, { label: 'My List', key: 'watchlist' }].map(nav => (
            <Pressable key={nav.key} style={[styles.navItem, page === nav.key && styles.navItemActive]} onPress={() => setPage(nav.key as Page)}>
              <Text style={[styles.navLabel, page === nav.key && styles.navLabelActive]}>{nav.label}</Text>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  // WATCHLIST PAGE
  if (page === 'watchlist' && searchVal.length < 2) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
        <ScrollView style={styles.scrollView}>
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>MY WATCHLIST</Text>
          </View>
          {watchlist.length > 0 ? (
            <View style={styles.grid}>
              {watchlist.map(item => (
                <MovieCard key={item.id} item={item} onPress={() => setDetailItem(item)} />
              ))}
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Nothing saved yet</Text>
              <Pressable style={styles.browseBtn} onPress={() => setPage('home')}>
                <Text style={styles.browseBtnText}>Browse Content</Text>
              </Pressable>
            </View>
          )}
          <View style={{ height: 80 }} />
        </ScrollView>
        <View style={styles.bottomNav}>
          {[{ label: 'Home', key: 'home' }, { label: 'Movies', key: 'movies' }, { label: 'Series', key: 'series' }, { label: 'My List', key: 'watchlist' }].map(nav => (
            <Pressable key={nav.key} style={[styles.navItem, page === nav.key && styles.navItemActive]} onPress={() => setPage(nav.key as Page)}>
              <Text style={[styles.navLabel, page === nav.key && styles.navLabelActive]}>{nav.label}</Text>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  // SEARCH RESULTS
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Pressable onPress={() => setSearchVal('')}>
            <Text style={styles.searchBackText}>← Back</Text>
          </Pressable>
        </View>
        <Text style={styles.searchResultsTitle}>Results for "{searchVal}"</Text>
        {searchResults.length > 0 ? (
          <View style={styles.grid}>
            {searchResults.map(item => (
              <MovieCard key={item.id} item={item} onPress={() => setDetailItem(item)} />
            ))}
          </View>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Nothing found</Text>
          </View>
        )}
        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bg },
  scrollView: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  logo: { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: 1 },
  profileBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.accent, justifyContent: 'center', alignItems: 'center' },
  profileText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  searchBox: { margin: 12, backgroundColor: Colors.bg3, borderRadius: 6, paddingHorizontal: 12, height: 40, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, color: '#fff', fontSize: 14 },

  loader: { marginTop: 40 },

  hero: { marginHorizontal: 12, marginBottom: 24, borderRadius: 8, overflow: 'hidden', height: 280 },
  heroImage: { width: '100%', height: '100%' },
  heroScrim: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  heroContent: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16 },
  heroTitle: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 6 },
  heroDesc: { fontSize: 12, color: '#ccc', marginBottom: 12, lineHeight: 16 },
  heroButtons: { flexDirection: 'row', gap: 10 },
  heroPay: { backgroundColor: Colors.accent, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4 },
  heroPlayText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  heroInfo: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 4 },
  heroInfoText: { color: '#fff', fontWeight: '700', fontSize: 11 },

  section: { marginHorizontal: 12, marginBottom: 28 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 12 },

  cwCard: { marginRight: 12, width: 240 },
  cwPoster: { position: 'relative', aspectRatio: 16/9, backgroundColor: Colors.bg3, borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  cwImage: { width: '100%', height: '100%' },
  cwOverlay: { position: 'absolute', inset: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  cwPlayBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.accent, justifyContent: 'center', alignItems: 'center' },
  playIcon: { fontSize: 20, color: '#fff' },
  cwRemove: { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  closeIcon: { fontSize: 12, color: '#bbb', fontWeight: '600' },
  cwTitle: { fontSize: 12, fontWeight: '600', color: '#fff' },
  cwMeta: { fontSize: 10, color: Colors.muted },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 8, marginBottom: 0 },
  movieCard: { width: '30%', aspectRatio: 2/3, marginHorizontal: 4, marginBottom: 12, borderRadius: 6, overflow: 'hidden', backgroundColor: Colors.bg3 },
  moviePoster: { width: '100%', height: '100%' },
  badge: { position: 'absolute', top: 6, left: 6, backgroundColor: Colors.accent, color: '#fff', fontSize: 8, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 3 },

  detailPage: { flex: 1 },
  detailBackdrop: { width: '100%', height: 200 },
  detailBack: { position: 'absolute', top: 16, left: 16, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4, zIndex: 10 },
  detailBackText: { color: '#fff', fontSize: 11, fontWeight: '600' },

  detailHero: { flexDirection: 'row', gap: 12, paddingHorizontal: 12, paddingVertical: 16 },
  detailPoster: { width: 90, height: 140, borderRadius: 6, backgroundColor: Colors.bg3 },
  detailInfo: { flex: 1 },
  detailType: { color: Colors.accent, fontSize: 8, fontWeight: '700', letterSpacing: 0.8, marginBottom: 4 },
  detailTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 6 },
  detailMeta: { fontSize: 10, color: '#999', marginBottom: 10 },
  detailDesc: { fontSize: 11, color: '#ccc', lineHeight: 16, marginBottom: 10 },

  detailActions: { flexDirection: 'row', gap: 6 },
  btnPlay: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4 },
  btnPlayText: { color: '#000', fontWeight: '700', fontSize: 10 },
  btnTrailer: { backgroundColor: Colors.bg4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 4, borderWidth: 1, borderColor: Colors.border },
  btnTrailerText: { color: '#fff', fontWeight: '600', fontSize: 10 },
  btnList: { backgroundColor: Colors.bg4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 4, borderWidth: 1, borderColor: Colors.border },
  btnListText: { color: '#fff', fontWeight: '600', fontSize: 10 },

  detailMeta2: { paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  metaRow: { marginBottom: 8 },
  metaLabel: { fontSize: 9, color: Colors.muted, fontWeight: '600', marginBottom: 2 },
  metaValue: { fontSize: 11, color: '#ccc' },

  epSection: { paddingHorizontal: 12, paddingVertical: 16 },
  epTitle: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 10 },
  seasonTabs: { marginBottom: 12 },
  seasonTab: { marginRight: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: Colors.border },
  seasonTabActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  seasonTabText: { fontSize: 11, fontWeight: '600', color: '#fff' },

  epCard: { flexDirection: 'row', gap: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8, backgroundColor: Colors.bg3, borderRadius: 6, borderWidth: 1, borderColor: Colors.border },
  epThumb: { width: 90, height: 54, borderRadius: 4, backgroundColor: Colors.bg2 },
  epInfo: { flex: 1 },
  epName: { fontSize: 11, fontWeight: '600', color: '#fff', marginBottom: 3 },
  epDesc: { fontSize: 10, color: Colors.muted, marginBottom: 3 },
  epDur: { fontSize: 9, color: '#666' },

  similarSection: { paddingHorizontal: 12, paddingVertical: 16 },
  similarTitle: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 10 },
  similarGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  simCard: { width: '30%', aspectRatio: 2/3, borderRadius: 6, backgroundColor: Colors.bg3, marginBottom: 12 },
  simText: { fontSize: 10, color: '#ccc', marginTop: 4 },

  trailerBackdrop: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12 },
  trailerBox: { position: 'relative', width: '100%', aspectRatio: 16/9, backgroundColor: Colors.bg2, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  trailerClose: { position: 'absolute', top: 10, right: 12, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  trailerCloseIcon: { fontSize: 16, color: '#fff', fontWeight: '600' },
  trailerIframe: { width: '100%', height: '100%' },

  webview: { width: '100%', height: '100%' },
  video: { width: '100%', height: '100%' },
  playerContainer: { flex: 1, backgroundColor: '#000' },
  playerClose: { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4, zIndex: 10 },
  playerCloseText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  noSource: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  noSourceText: { color: '#888' },

  pageHeader: { paddingHorizontal: 12, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  pageTitle: { fontSize: 18, fontWeight: '700', color: '#fff', letterSpacing: 1 },

  genreBar: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 12, gap: 6 },
  genreBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: Colors.border },
  genreBtnActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  genreBtnText: { fontSize: 11, color: Colors.muted },
  genreBtnTextActive: { color: '#fff', fontWeight: '600' },

  empty: { justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 14, color: Colors.muted, marginBottom: 12 },
  browseBtn: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: Colors.accent, borderRadius: 4 },
  browseBtnText: { color: '#fff', fontWeight: '600', fontSize: 12 },

  searchResultsTitle: { fontSize: 16, fontWeight: '700', color: '#fff', paddingHorizontal: 12, paddingVertical: 12 },
  searchBackText: { color: Colors.accent, fontSize: 12, fontWeight: '600' },

  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-around', backgroundColor: Colors.bg, borderTopWidth: 1, borderTopColor: Colors.border, paddingBottom: 8, paddingTop: 8 },
  navItem: { justifyContent: 'center', alignItems: 'center', paddingVertical: 8 },
  navItemActive: {},
  navLabel: { fontSize: 11, color: Colors.muted, fontWeight: '500' },
  navLabelActive: { color: Colors.accent, fontWeight: '700' },

  authBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  authClose: { position: 'absolute', top: 14, right: 14, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  authCloseText: { color: '#bbb', fontSize: 14, fontWeight: '600' },
  authForm: { width: '88%', maxWidth: 340, backgroundColor: Colors.bg2, borderRadius: 8, paddingHorizontal: 18, paddingVertical: 22, borderWidth: 1, borderColor: Colors.border },
  authTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 14 },
  accountName: { fontSize: 13, fontWeight: '600', color: '#fff', marginBottom: 4 },
  accountEmail: { fontSize: 11, color: Colors.muted, marginBottom: 18 },
  authInput: { width: '100%', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 6, backgroundColor: Colors.bg3, borderWidth: 1, borderColor: Colors.border, color: '#fff', fontSize: 12, marginBottom: 10 },
  authError: { color: '#ff6b6b', fontSize: 11, marginBottom: 10, backgroundColor: 'rgba(229,9,20,0.1)', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(229,9,20,0.3)' },
  authBtn: { width: '100%', paddingVertical: 11, borderRadius: 6, backgroundColor: Colors.accent, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  authBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  authSwitch: { width: '100%', marginTop: 14, color: Colors.accent, fontSize: 11, textAlign: 'center', fontWeight: '500' },
  signOutBtn: { width: '100%', paddingVertical: 9, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(229,9,20,0.3)', justifyContent: 'center', alignItems: 'center', marginTop: 6 },
  signOutText: { color: '#ff8585', fontSize: 11, fontWeight: '600' },
});
