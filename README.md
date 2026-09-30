# Night Run

Cinematic night-ride scene in vanilla JS + Three.js + Vite.

1. **Node.js**: 18 or newer (20 LTS recommended).
2. **Install**: `npm install` (three and vite are already listed in package.json).
3. **GLB files**: put them in `public/models/` as `rider.glb` and `road.glb`.
4. **Audio files**: put them in `public/audio/` (`music.mp3`, `engine-idle.mp3`, `engine-rev.mp3`, `bike-whoosh.mp3`). Any missing file is skipped with a small warning; only use audio you are licensed to use.
5. **Run**: `npm run dev`, then open the printed URL and click Start ride.
6. **Camera**: edit `CAMERA_OFFSET` and `CAMERA_LOOK_AT_OFFSET` at the top of `src/scene.js`.
7. **Model scale/orientation**: edit `RIDER_SCALE`, `RIDER_TARGET_SIZE`, `RIDER_ROTATION`, `RIDER_POSITION`, `ROAD_SCALE`, `ROAD_TARGET_LENGTH`, `ROAD_ROTATION`, `ROAD_POSITION` in `src/scene.js`. Models are auto-fitted from their bounding boxes; the console logs the measured sizes. The rider must face -Z: if it rides backwards use `RIDER_ROTATION = [0, Math.PI, 0]`. If the rider floats or sinks, change `RIDER_POSITION.y`.
8. **Music**: replace `public/audio/music.mp3`, or change the path in `FILES` in `src/audio.js`.
9. **Motorcycle sounds**: replace `engine-idle.mp3`, `engine-rev.mp3`, `bike-whoosh.mp3`. Idle and rev must loop cleanly; rev pitch and volume follow speed.
10. **Build**: `npm run build` (output in `dist/`; preview with `npm run preview`).

Controls: hold Space, ArrowUp or press the screen to accelerate. Set `FORWARD_MOTION = false` to disable movement. Reduced-motion preference lowers camera sway, FOV kick, bloom and particles.

Note: the road is tiled and scrolled to fake forward motion, which looks best if your road model is reasonably straight.
