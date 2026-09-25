class MovieItem {
  final String id;
  final String title;
  final String description;
  final String imageUrl;
  final String backdropUrl;
  final String genre;
  final int year;
  final String duration;
  final String trailerUrl;
  final bool isSeries;

  const MovieItem({
    required this.id,
    required this.title,
    required this.description,
    required this.imageUrl,
    required this.backdropUrl,
    required this.genre,
    required this.year,
    required this.duration,
    this.trailerUrl = '',
    this.isSeries = false,
  });
}

class MockData {
  static const List<String> genres = [
    'Action',
    'Drama',
    'Comedy',
    'Sci-Fi',
    'Romance',
    'Thriller',
    'Adventure',
    'Mystery',
    'Crime',
    'Documentary',
  ];

  static const List<MovieItem> movies = [
    MovieItem(
      id: 'm1',
      title: 'The Last Horizon',
      description: 'A former pilot uncovers a plot that could alter the fate of the world.',
      imageUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=800&q=80',
      backdropUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1200&q=80',
      genre: 'Action',
      year: 2024,
      duration: '2h 04m',
    ),
    MovieItem(
      id: 'm2',
      title: 'Neon City',
      description: 'In a broken metropolis, love and survival collide under the lights.',
      imageUrl: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=800&q=80',
      backdropUrl: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1200&q=80',
      genre: 'Sci-Fi',
      year: 2023,
      duration: '1h 52m',
    ),
    MovieItem(
      id: 'm3',
      title: 'Velvet Mist',
      description: 'Secrets in a seaside town stir up old rivalries and forbidden affection.',
      imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80',
      backdropUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80',
      genre: 'Drama',
      year: 2022,
      duration: '2h 15m',
    ),
    MovieItem(
      id: 'm4',
      title: 'Midnight Circuit',
      description: 'A brilliant hacker must stop a system designed to erase human memory.',
      imageUrl: 'https://images.unsplash.com/photo-1513106580091-1d82408b8cd6?auto=format&fit=crop&w=800&q=80',
      backdropUrl: 'https://images.unsplash.com/photo-1513106580091-1d82408b8cd6?auto=format&fit=crop&w=1200&q=80',
      genre: 'Thriller',
      year: 2024,
      duration: '1h 48m',
    ),
  ];

  static const List<MovieItem> continueWatching = [
    MovieItem(
      id: 'cw1',
      title: 'Shadow Protocol',
      description: 'A rogue agent tries to bring down a private surveillance network.',
      imageUrl: 'https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?auto=format&fit=crop&w=800&q=80',
      backdropUrl: 'https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?auto=format&fit=crop&w=1200&q=80',
      genre: 'Action',
      year: 2024,
      duration: '1h 39m',
    ),
    MovieItem(
      id: 'cw2',
      title: 'Blue Echo',
      description: 'A young singer rises through a city shaped by chance and sacrifice.',
      imageUrl: 'https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?auto=format&fit=crop&w=800&q=80',
      backdropUrl: 'https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?auto=format&fit=crop&w=1200&q=80',
      genre: 'Drama',
      year: 2023,
      duration: '2h 08m',
    ),
  ];

  static const List<MovieItem> topRated = [
    MovieItem(
      id: 'tr1',
      title: 'Ink & Ember',
      description: 'Two estranged artists discover a painting that reveals a hidden life.',
      imageUrl: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&w=800&q=80',
      backdropUrl: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&w=1200&q=80',
      genre: 'Drama',
      year: 2021,
      duration: '1h 56m',
    ),
    MovieItem(
      id: 'tr2',
      title: 'Crimson Ridge',
      description: 'An ex-soldier returns to a mountain town to confront a painful legacy.',
      imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80',
      backdropUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
      genre: 'Adventure',
      year: 2024,
      duration: '2h 10m',
    ),
  ];

  static const List<MovieItem> watchlist = [
    ...movies,
    ...continueWatching,
  ];
}
