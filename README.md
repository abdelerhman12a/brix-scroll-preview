# BRIX — scroll-driven 3D page (preview)

A working preview of the "custom 3D scroll website" look from the reference video: one fixed WebGL canvas behind the page, one scroll progress number (0 → 1) driving the camera and the bottle, and HTML sections that fade in over it.

Live preview: **https://abdelerhman12a.github.io/brix-scroll-preview/**

Fictional brand, built as a layout study. Not affiliated with or copied from any real water company.

## What the reference video is actually doing

1. **One full-screen canvas**, `position: fixed`, behind normal scrolling HTML. The page scrolls; the canvas never does.
2. **One progress number.** `scrollY / (documentHeight - viewportHeight)` gives 0 → 1. Everything 3D reads that number, nothing reads the scroll event directly.
3. **A scrubbed camera path.** Keyframes (camera position, bottle height, bottle rotation) are interpolated by progress with a smootherstep ease, so the motion dwells at each section instead of moving at constant speed.
4. **Damped scrolling.** Lenis smooths the wheel, GSAP's ScrollTrigger only measures, and the scene eases toward its target every frame instead of snapping. This is what makes it feel like film rather than a slideshow.
5. **Text in HTML, not in 3D.** Big display type, blurred translucent panels, letterspaced eyebrows. Cheap, sharp on every screen, and selectable.
6. **A glass look without heavy tricks.** A `MeshPhysicalMaterial` with `transmission` plus a generated environment map (`RoomEnvironment`) reads as glass; no refraction render passes, no post-processing.

## Stack (all free)

| Layer | Choice |
| --- | --- |
| 3D | three.js 0.160 via CDN import map, no build step |
| Scroll animation | GSAP 3.12 + ScrollTrigger (free, including commercial use since 2025) |
| Smooth scroll | Lenis 1.1 |
| Model | Procedural bottle built with `LatheGeometry` — no downloaded asset, no licence to track |
| Hosting | GitHub Pages, static, no server |

## Performance rules used here

- `setPixelRatio(Math.min(devicePixelRatio, 2))` — a 3x phone renders full-res WebGL for nothing.
- The render loop stops when the tab is hidden or the canvas is off-screen.
- Bubbles are one `InstancedMesh` (90 instances, 1 draw call), not 90 meshes.
- No shadow maps: the glow is an additive sprite.
- `prefers-reduced-motion` parks the scene at the middle beat and stops the idle drift.
- If WebGL fails, the page falls back to readable text instead of a blank screen.

## Run locally

```
open index.html
```

A local server is safer for module imports:

```
python3 -m http.server 8080
```

Then open http://localhost:8080.

## Where to take it next

- **Cylindrical image sequence instead of real 3D** (the Apple technique): export 60–120 frames from Blender, paint them to a canvas and pick the frame from scroll progress. Cheaper on mobile than WebGL and indistinguishable at moderate spin speeds.
- **A real glTF model** with Draco or Meshopt compression, loaded through `GLTFLoader`, instead of the procedural lathe.
- **KDrop the pin-the-section approach** if the page gets longer: `ScrollTrigger` with `pin: true` and `scrub: 1` for a section that pins while the timeline runs.
- **Caustics and god rays** — worth it only on desktop; gate them behind a media query so phones keep the frame budget.

## Sources behind these choices

- https://lastres.ai/guides/scroll-effects — scroll effects taxonomy, single-ticker pattern, performance rules
- https://mkscreatives.com/tutorials/threejs-scroll-3d-product-reveal — state object animated by GSAP, render loop reads it
- https://valters.solutions/blog/how-to-build-a-3d-web-experience — beats, progress timeline, camera on a curve
- https://github.com/darkroomengineering/lenis — Lenis + ScrollTrigger wiring
- https://github.com/Dieg0arc/3D-scrolling-practice — same idea, vanilla JS, no build step
- https://docs.github.com/articles/creating-project-pages-manually — Pages from static files
