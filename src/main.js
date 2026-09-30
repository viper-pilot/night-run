import { createScene } from './scene.js';
import { createAudio, TRACKS } from './audio.js';

const $ = (id) => document.getElementById(id);
const startBtn = $('btn-start');
const musicBtn = $('btn-music');
const player = $('player');
const seekBar = $('seek');
const stage = $('stage');
let seeking = false;
let world = null;

function show(el, msg) { el.textContent = msg; el.hidden = false; }
function fmt(s) {
  if (!isFinite(s)) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

/* Song cards */
const cards = TRACKS.map((tr, i) => {
  const b = document.createElement('button');
  b.className = 'track';
  b.innerHTML = '<span class="t"></span><span class="a"></span>';
  b.querySelector('.t').textContent = tr.title;
  b.querySelector('.a').textContent = tr.artist;
  b.addEventListener('click', () => audio.play(i));
  $('playlist').appendChild(b);
  return b;
});

const audio = createAudio({
  onWarning: (msg) => show($('audio-warning'), msg),
  onChange: (i, playing) => {
    cards.forEach((c, n) => c.setAttribute('aria-current', String(n === i)));
    $('now-title').textContent = TRACKS[i].title;
    $('now-artist').textContent = TRACKS[i].artist;
    $('b-play').textContent = playing ? 'Pause' : 'Play';
  },
  onMissing: (i) => cards[i].classList.add('missing'),
  onTime: (cur, dur) => {
    $('t-cur').textContent = fmt(cur);
    $('t-dur').textContent = fmt(dur);
    if (!seeking && isFinite(dur) && dur > 0) seekBar.value = Math.round((cur / dur) * 1000);
  },
});

/* Music panel open/close */
function setOpen(open) {
  player.classList.toggle('open', open);
  musicBtn.setAttribute('aria-expanded', String(open));
}
musicBtn.addEventListener('click', () => setOpen(!player.classList.contains('open')));
addEventListener('pointerdown', (e) => {
  if (player.classList.contains('open') && !player.contains(e.target) && !musicBtn.contains(e.target)) setOpen(false);
});

/* Player controls */
$('b-prev').addEventListener('click', () => audio.prev());
$('b-next').addEventListener('click', () => audio.next());
$('b-back').addEventListener('click', () => audio.seek(-10));
$('b-fwd').addEventListener('click', () => audio.seek(10));
$('b-play').addEventListener('click', () => audio.toggle());
seekBar.addEventListener('input', () => { seeking = true; });
seekBar.addEventListener('change', () => { audio.seekTo(seekBar.value / 1000); seeking = false; });
$('volume').addEventListener('input', (e) => audio.setVolume(+e.target.value));

/* Keyboard */
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.code === 'KeyR' && !e.repeat) world?.flip();
  else if (e.code === 'ArrowLeft') audio.seek(-10);
  else if (e.code === 'ArrowRight') audio.seek(10);
  else if (e.code === 'Escape') setOpen(false);
});

/* Drag to rotate the rider (mouse or touch). Change 0.012 to spin faster/slower */
let dragX = null;
stage.addEventListener('pointerdown', (e) => {
  dragX = e.clientX;
  stage.setPointerCapture(e.pointerId);
  stage.classList.add('dragging');
});
stage.addEventListener('pointermove', (e) => {
  if (dragX === null) return;
  world?.rotate((e.clientX - dragX) * 0.012);
  dragX = e.clientX;
});
const endDrag = () => { dragX = null; stage.classList.remove('dragging'); };
stage.addEventListener('pointerup', endDrag);
stage.addEventListener('pointercancel', endDrag);

/* Scene */

async function initializeScene() {
    try {
        world = await createScene(stage);
        startBtn.disabled = false;
        startBtn.textContent = 'Start ride';
    } catch (error) {
        console.error('Failed to create scene:', error);
        startBtn.textContent = 'Failed to load';
    }
}

initializeScene();

startBtn.addEventListener('click', () => {
  if (!world) return;
  startBtn.disabled = true;
  audio.start();                  // user gesture: music is allowed to start
  $('landing').classList.add('out');
  $('hud').hidden = false;
  requestAnimationFrame(() => $('hud').classList.add('on'));
  world.start();
});