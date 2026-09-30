/* Put your mp3 files in public/audio/ using these names. Change titles freely. */
export const TRACKS = [
  { title: 'Timeless', artist: 'The Weeknd', file: '/audio/music1.mp3' },
  { title: 'Muted', artist: 'Jehoda', file: '/audio/music2.mp3' },
  { title: 'Zehen X Saajna', artist: 'Mitraz', file: '/audio/music3.mp3' },
  { title: 'Kinna Chir', artist: 'The PropheC', file: '/audio/music4.mp3' },
  { title: 'Voicenote', artist: 'Saaheal', file: '/audio/music5.mp3' },
  { title: 'Baarish Mein Phir (Acoustic)', artist: 'Saaheal', file: '/audio/music6.mp3' },
  { title: 'Meharbaan Hua', artist: 'Vishal Shekhar', file: '/audio/music7.mp3' },
];

export function createAudio({ onWarning = () => {}, onChange = () => {}, onMissing = () => {}, onTime = () => {} } = {}) {
  const el = new Audio();
  el.preload = 'auto';
  el.volume = 0.7;
  let index = 0;
  let failures = 0;

  function play(i) {
    index = (i + TRACKS.length) % TRACKS.length;
    el.src = TRACKS[index].file;
    onChange(index, true);
    el.play().catch((e) => {
      if (e.name === 'NotAllowedError') onWarning('Browser blocked audio. Click a song to play.');
    });
  }

  const next = () => play(index + 1);

  el.addEventListener('playing', () => { failures = 0; });
  el.addEventListener('play', () => onChange(index, true));
  el.addEventListener('pause', () => onChange(index, false));
  el.addEventListener('ended', next);
  el.addEventListener('timeupdate', () => onTime(el.currentTime, el.duration));
  el.addEventListener('loadedmetadata', () => onTime(el.currentTime, el.duration));
  el.addEventListener('error', () => {
    const f = TRACKS[index].file;
    console.warn(`Audio "${f}" could not be loaded`);
    onWarning(`Missing or unreadable: ${f.split('/').pop()}`);
    onMissing(index);
    if (++failures < TRACKS.length) next();
    else onChange(index, false);
  });

  return {
    start() { play(0); },
    play,
    next,
    prev() {
      if (el.currentTime > 3) el.currentTime = 0; // restart first, like most players
      else play(index - 1);
    },
    toggle() {
      if (!el.src) return play(0);
      if (el.paused) el.play().catch(() => {}); else el.pause();
    },
    seek(seconds) {
      if (!el.src || !isFinite(el.duration)) return;
      el.currentTime = Math.min(Math.max(0, el.currentTime + seconds), el.duration - 0.1);
    },
    seekTo(fraction) {
      if (!el.src || !isFinite(el.duration)) return;
      el.currentTime = fraction * el.duration;
    },
    setVolume(v) { el.volume = v; },
  };
}