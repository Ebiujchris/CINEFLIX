import { useEffect, useRef, useState } from 'react'
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipBack, SkipForward, Settings, Subtitles, RotateCcw, X
} from 'lucide-react'
import type { Content } from './data'
import { toYouTubeEmbedUrl, withAutoplay } from './videoUrls'

// persist resume positions in localStorage
const STORAGE_KEY = 'cf_resume'
function getResume(id: string): number {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')[id] ?? 0 } catch { return 0 }
}
function saveResume(id: string, t: number) {
  try {
    const d = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    d[id] = Math.floor(t)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d))
  } catch { /* noop */ }
}
function clearResume(id: string) {
  try {
    const d = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    delete d[id]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d))
  } catch { /* noop */ }
}

function fmt(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  return `${m}:${String(sec).padStart(2,'0')}`
}

const QUALITIES = ['Auto', '2K', '1080p', '720p', '480p', '360p']
const SPEEDS    = [0.5, 0.75, 1, 1.25, 1.5, 2]

type Props = { item: Content; onClose: () => void; onProgress?: (position: number, duration: number) => void }

export default function Player({ item, onClose, onProgress }: Props) {
  const videoRef   = useRef<HTMLVideoElement>(null)
  const wrapRef    = useRef<HTMLDivElement>(null)
  const resumePos  = getResume(item.id)

  const [playing,    setPlaying]    = useState(false)
  const [muted,      setMuted]      = useState(false)
  const [volume,     setVolume]     = useState(1)
  const [current,    setCurrent]    = useState(resumePos)
  const [duration,   setDuration]   = useState(0)
  const [buffered,   setBuffered]   = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const [showCtrl,   setShowCtrl]   = useState(true)
  const [panel,      setPanel]      = useState<null | 'settings' | 'captions'>( null)
  const [quality,    setQuality]    = useState('Auto')
  const [speed,      setSpeed]      = useState(1)
  const [caption,    setCaption]    = useState<string | null>(null)
  const [mediaReady, setMediaReady] = useState(false)
  const [playbackError, setPlaybackError] = useState(false)
  const [playerAttempt, setPlayerAttempt] = useState(0)
  const [sourceIndex, setSourceIndex] = useState(0)
  const [resumeBanner, setResumeBanner] = useState(resumePos > 5)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const sources = item.sources?.length ? item.sources : [{ provider: item.provider, embedUrl: item.embedUrl, playbackUrl: item.playbackUrl }]
  const source = sources[Math.min(sourceIndex, sources.length - 1)]
  const isEmbed = source.provider === 'YOUTUBE' || source.provider === 'VIMEO' || source.provider === 'EXTERNAL_EMBED'

  useEffect(() => {
    if (isEmbed && source.embedUrl) onProgress?.(1, 0)
  }, [item.id, source.embedUrl, isEmbed])

  // auto-hide controls
  const resetHide = () => {
    setShowCtrl(true)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => { if (playing) setShowCtrl(false) }, 3000)
  }
  useEffect(() => { resetHide(); return () => clearTimeout(hideTimer.current) }, [playing])
  useEffect(() => { setMediaReady(false); setPlaybackError(false); setSourceIndex(0) }, [item.id])
  useEffect(() => { setMediaReady(false); setPlaybackError(false) }, [sourceIndex, playerAttempt])

  // sync video state
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = resumePos
    const onTime = () => {
      setCurrent(v.currentTime)
      saveResume(item.id, v.currentTime)
      onProgress?.(v.currentTime, v.duration || 0)
      if (v.buffered.length) setBuffered(v.buffered.end(v.buffered.length - 1))
    }
    const onMeta = () => setDuration(v.duration)
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    v.addEventListener('timeupdate', onTime)
    v.addEventListener('loadedmetadata', onMeta)
    v.addEventListener('play', onPlay)
    v.addEventListener('pause', onPause)
    return () => {
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('loadedmetadata', onMeta)
      v.removeEventListener('play', onPlay)
      v.removeEventListener('pause', onPause)
    }
  }, [item.id, onProgress])

  // speed
  useEffect(() => { if (videoRef.current) videoRef.current.playbackRate = speed }, [speed])

  // fullscreen change listener
  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    playing ? v.pause() : v.play()
  }

  const seek = (t: number) => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = Math.max(0, Math.min(t, duration))
  }

  const toggleMute = () => {
    const v = videoRef.current
    if (!v) return
    v.muted = !muted
    setMuted(!muted)
  }

  const changeVolume = (val: number) => {
    const v = videoRef.current
    if (!v) return
    v.volume = val
    setVolume(val)
    setMuted(val === 0)
  }

  const toggleFS = async () => {
    if (!wrapRef.current) return
    if (!document.fullscreenElement) {
      await wrapRef.current.requestFullscreen()
    } else {
      await document.exitFullscreen()
    }
  }

  const handleResume = () => { seek(resumePos); setResumeBanner(false) }
  const handleRestart = () => { seek(0); clearResume(item.id); setResumeBanner(false) }
  const tryNextSource = () => {
    if (sourceIndex >= sources.length - 1) return
    setPlaybackError(false)
    setSourceIndex(index => index + 1)
  }

  const progress = duration > 0 ? (current / duration) * 100 : 0
  const bufPct   = duration > 0 ? (buffered / duration) * 100 : 0

  // EMBED (YouTube/Vimeo) — no custom controls possible
  if (isEmbed && source.embedUrl) {
    const embedUrl = source.provider === 'YOUTUBE' ? (toYouTubeEmbedUrl(source.embedUrl) || source.embedUrl) : source.embedUrl
    return (
      <div className="player-wrap embed-wrap" ref={wrapRef}>
        <div className="embed-topbar">
          <button className="player-close-btn" onClick={onClose} aria-label="Close player"><X size={18} /></button>
          <div><span className="player-kicker">NOW PLAYING</span><strong>{item.title}</strong></div>
          {sources.length > 1 && <button className="player-source-btn" onClick={tryNextSource}>Try another source</button>}
          <span className="player-quality-chip">HD</span>
        </div>
        <iframe
          className="player-iframe"
          src={withAutoplay(embedUrl)}
          key={`${embedUrl}-${playerAttempt}`}
          title={item.title}
          allow="autoplay; picture-in-picture"
          sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
          referrerPolicy="no-referrer"
          allowFullScreen
          onLoad={() => { setMediaReady(true); setPlaybackError(false) }}
        />
        {!mediaReady && <div className="player-loading" role="status" aria-label="Loading player"><span className="player-spinner" /></div>}
      </div>
    )
  }

  // NATIVE player
  return (
    <div
      className={`player-wrap native-wrap${showCtrl ? ' show-ctrl' : ''}${fullscreen ? ' fs' : ''}`}
      ref={wrapRef}
      onMouseMove={resetHide}
      onTouchStart={resetHide}
    >
      <video
        ref={videoRef}
        className="player-video"
        src={source.playbackUrl}
        autoPlay
        playsInline
        muted={muted}
        onLoadedData={() => setMediaReady(true)}
        onError={() => setPlaybackError(true)}
        onClick={togglePlay}
        onDoubleClick={toggleFS}
      >
        {(item.captions ?? []).map(c => (
          <track
            key={c.srclang}
            kind="subtitles"
            label={c.label}
            srcLang={c.srclang}
            src={c.src}
            default={caption === c.srclang}
          />
        ))}
      </video>

      {!mediaReady && <div className="player-loading" role="status" aria-label="Loading player"><span className="player-spinner" /></div>}
      {playbackError && (
        <div className="player-error" role="alert">
          <strong>Playback unavailable</strong>
          <span>Try again or choose another title.</span>
          <button onClick={() => { if (sourceIndex < sources.length - 1) tryNextSource(); else { setPlaybackError(false); setMediaReady(false); videoRef.current?.load(); videoRef.current?.play().catch(() => undefined) } }}>{sourceIndex < sources.length - 1 ? 'Try another source' : 'Try again'}</button>
        </div>
      )}

      {/* resume banner */}
      {resumeBanner && (
        <div className="resume-banner">
          <span>Continue from {fmt(resumePos)}?</span>
          <button onClick={handleResume}><RotateCcw size={14} /> Resume</button>
          <button className="ghost" onClick={handleRestart}>Start over</button>
        </div>
      )}

      {/* gradient scrim for controls */}
      <div className="ctrl-scrim" />

      {/* top bar */}
      <div className="ctrl-top">
        <button className="player-close-btn" onClick={onClose} aria-label="Close player"><X size={18} /></button>
        <span className="player-title">{item.title}</span>
      </div>

      {/* centre play/pause tap area */}
      <button className="ctrl-center-tap" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
        {!playing && <div className="big-play"><Play size={36} fill="currentColor" /></div>}
      </button>

      {/* bottom controls */}
      <div className="ctrl-bottom">
        {/* scrubber */}
        <div className="scrubber-row">
          <span className="time-label">{fmt(current)}</span>
          <div
            className="scrubber"
            onClick={e => {
              const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
              seek(((e.clientX - r.left) / r.width) * duration)
            }}
          >
            <div className="scrubber-buf" style={{ width: `${bufPct}%` }} />
            <div className="scrubber-fill" style={{ width: `${progress}%` }} />
            <div className="scrubber-thumb" style={{ left: `${progress}%` }} />
          </div>
          <span className="time-label">{fmt(duration)}</span>
        </div>

        {/* buttons row */}
        <div className="ctrl-row">
          <div className="ctrl-left-group">
            <button onClick={() => seek(current - 10)} aria-label="Back 10s"><SkipBack size={18} /></button>
            <button className="play-pause-btn" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
              {playing ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
            </button>
            <button onClick={() => seek(current + 10)} aria-label="Forward 10s"><SkipForward size={18} /></button>

            <div className="volume-group">
              <button onClick={toggleMute} aria-label="Toggle mute">
                {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <input
                className="vol-slider" type="range" min={0} max={1} step={0.05}
                value={muted ? 0 : volume}
                onChange={e => changeVolume(Number(e.target.value))}
                aria-label="Volume"
              />
            </div>

            <span className="time-inline">{fmt(current)} / {fmt(duration)}</span>
          </div>

          <div className="ctrl-right-group">
            {/* captions */}
            {(item.captions ?? []).length > 0 && (
              <div className="ctrl-popup-wrap">
                <button
                  className={panel === 'captions' ? 'active-ctrl-btn' : ''}
                  onClick={() => setPanel(p => p === 'captions' ? null : 'captions')}
                  aria-label="Captions"
                >
                  <Subtitles size={18} />
                </button>
                {panel === 'captions' && (
                  <div className="ctrl-popup">
                    <p className="popup-label">Subtitles / CC</p>
                    <button className={caption === null ? 'active' : ''} onClick={() => { setCaption(null); setPanel(null) }}>Off</button>
                    {(item.captions ?? []).map(c => (
                      <button key={c.srclang} className={caption === c.srclang ? 'active' : ''} onClick={() => { setCaption(c.srclang); setPanel(null) }}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* settings */}
            <div className="ctrl-popup-wrap">
              <button
                className={panel === 'settings' ? 'active-ctrl-btn' : ''}
                onClick={() => setPanel(p => p === 'settings' ? null : 'settings')}
                aria-label="Settings"
              >
                <Settings size={18} />
              </button>
              {panel === 'settings' && (
                <div className="ctrl-popup wide">
                  <p className="popup-label">Quality</p>
                  <p className="quality-note">Playback quality depends on the source.</p>
                  <div className="popup-options">
                    {QUALITIES.map(q => (
                      <button key={q} className={quality === q ? 'active' : ''} onClick={() => { setQuality(q); setPanel(null) }}>{q}</button>
                    ))}
                  </div>
                  <p className="popup-label" style={{ marginTop: 12 }}>Speed</p>
                  <div className="popup-options">
                    {SPEEDS.map(s => (
                      <button key={s} className={speed === s ? 'active' : ''} onClick={() => { setSpeed(s); setPanel(null) }}>
                        {s === 1 ? 'Normal' : `${s}×`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button onClick={toggleFS} aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
              {fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
