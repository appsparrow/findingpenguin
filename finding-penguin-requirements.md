# Finding Penguin 🐧 — Complete Requirements & Feature Specification

> Two-file browser game + admin panel. No build step, no backend, no server required. Works on desktop and mobile.

---

## 0. File Structure

| File | Purpose |
|---|---|
| `finding-penguin.html` | Main game (player-facing) |
| `admin.html` | Admin control panel (separate UI) |
| `pois.json` | JSON data file for places/POIs |
| `penguin.html` | Legacy single-file prototype (archived) |

---

## 1. Story & Premise

| Field | Value |
|---|---|
| Player character | **Laila** — a penguin searching for her mate |
| Lost character | **Waddler** — wandered into endless snowfields |
| Win condition | Laila reaches within 6 units of Waddler |
| Replayability | Infinite rounds; Waddler spawns farther each round |

### Story Display
- Prominent intro screen with **glassmorphic story card** (backdrop blur, rounded, white border)
- Story text in larger, readable serif-influenced italic style
- Character names **bold** and highlighted within the story text
- Narration subtitles in italic serif font during the 2D animation

---

## 2. Technology Stack

| Layer | Choice |
|---|---|
| Renderer | Three.js r128 (CDN, no install) |
| Language | Vanilla JavaScript (ES6+), single `<script>` tag |
| Admin UI | Vanilla JS + HTML/CSS (no framework, same paradigm) |
| Audio | Web Audio API — procedural beeps, no audio files |
| UI | HTML/CSS overlays on top of WebGL canvas |
| Intro animation | Native 2D Canvas API |
| Deployment | Two `.html` files + `pois.json`, open in any browser |
| Data persistence | `localStorage` (primary) + `pois.json` (static fallback) |

---

## 3. Game Screens & Flow

```
[Intro Screen] → [START button] → [3D Game] → [Found Screen] → [back to 3D Game]
```

### 3.1 Intro Screen
- Full-screen 2D canvas animation plays automatically on load
- Waddler (drawn in 2D) walks across a snowy landscape leaving footprints
- Waddler gradually fades to white as he "disappears into the snow"
- Italic serif narration: *"Waddler wandered into the endless snowfields..."* → *"...and disappeared into the white."*
- Animated background: sky gradient, rolling snow hills, 80 falling snowflakes
- **Prominent story box**: glassmorphic card with story text, character names bolded
- **BEGIN THE SEARCH button** launches the 3D game

### 3.2 Reunited / Found Screen
- Triggers when Laila comes within 6 world units of Waddler
- Shows 🐧🐧 with a pulse animation
- Displays round number
- **WANDER AGAIN button** — increments round counter, respawns both penguins, continues

---

## 4. 3D World

### 4.1 World Size
- World radius: **1400 units** (diameter 2800 — very large)
- Hard boundary at 90% of radius; penguin cannot walk outside
- Waddler bounded at 88% of radius

### 4.2 Terrain
- `THREE.PlaneGeometry` subdivided at 180×180 segments
- Height displacement formula:
  ```
  terrainH(x, z) = sin(x·0.012)·4 + cos(z·0.010)·3.5 + sin(x·0.025+z·0.02)·1.8 + sin(x·0.006−z·0.007)·6
  ```
- Max terrain height variation: ~±15 units
- **Critical**: plane vertices use `terrainH(px, −py)` (negated Y) due to Three.js rotation mapping

### 4.3 World Objects

| Type | Spawn probability | Notes |
|---|---|---|
| **Ice spike** | **0.8%** (reduced from 2.2%) | Very rare; transparent blue; smaller (1.5–4 units) |
| **Snow mound** | 14% | Stacked Minecraft-style blocks, 1–4 layers |
| **Rock cluster** | 9% | 1–3 grey boulders grouped, varied sizes |
| Clear spawn zone | Always | 25-unit radius around origin kept clear |

Ice terrain is intentionally reduced to keep the snowfield feel clean and open.

### 4.4 Snowfall
- 5000 particle `THREE.Points` system
- Particles fall at 0.002 units/ms, reset to top (y=60) when below ground
- Gentle horizontal drift per frame
- Snowfall group follows player X/Z position each frame

### 4.5 Lighting
- **Ambient**: `0xd0e8ff` (cool blue-white), intensity 0.95
- **Sun (directional)**: `0xfff8f0` (warm white), intensity 1.2, position (200, 350, 150)
  - Shadow map: 2048×2048, coverage −800 to +800 units
- **Fill light**: `0xb0d0ff` (blue), intensity 0.4, position (−100, 60, −80)
- Renderer: PCF soft shadow maps

### 4.6 Atmosphere
- Sky colour: `0xb0d4f0`
- Exponential fog: `0xc0dcf4`, density 0.0007

---

## 5. Penguin Characters

### 5.1 Laila (Player) — scale `PS = 0.65`
Standard penguin built from `THREE.BoxGeometry` primitives:

| Part | Colour |
|---|---|
| Body | Dark navy `#111128` |
| Belly | Off-white `#f0f2f8` |
| Head | Dark navy |
| Eyes | White + black pupil |
| Beak | Orange `#f0a020` |
| Wings (×2) | Dark navy — animated |
| Feet (×2) | Orange — animated |

### 5.2 Waddler (Lost Mate)
- Same construction as Laila
- Spawns at: `minDistance = min(260 + round·65, WRAD·0.82)` + random 0–120 units
- Wanders autonomously; walk speed 0.04 units/frame

### 5.3 NPC Penguins (variant characters)
Three pre-placed NPC penguins with props — same box-geometry style as Laila, slightly larger (`PS × 1.05`):

| Variant | Prop | World Position |
|---|---|---|
| **Hat penguin** | Red top hat (brim + crown blocks) | X:180, Z:-220 |
| **Shades penguin** | Blue semi-transparent sunglasses | X:-300, Z:150 |
| **Skater penguin** | Skateboard (deck + 4 cylinder wheels) | X:240, Z:300 |

NPC penguins have gentle idle wing-sway animation each frame.

---

## 6. Laila Animation State Machine

States: `idle` | `walk` | `sit` | `sleep` | `rising` | `jump` | `circle` | `wave` | `bow` | `waddle`

### 6.1 Automatic Transitions
| From | To | Trigger |
|---|---|---|
| `walk` | `idle` | Movement keys released |
| `idle` | `sit` | No movement for **9 seconds** |
| `sit` | `sleep` | Sitting for **7 more seconds** |
| `idle` | `waddle` | Random timer: every **5–12 seconds** |
| `sit` / `sleep` / `waddle` | `rising` | Any movement key pressed |
| `rising` | `idle` | Animation completes (~0.65s) |

### 6.2 Action Key Animations
| Key | State | Animation |
|---|---|---|
| **J** | `jump` | Arc up 3.5·PS units — 0.55s |
| **C** | `circle` | Full spin — 2s |
| **H** | `wave` | Right wing swings — 1.4s |
| **B** | `bow` | Body tilts forward — 2s |

---

## 7. Camera System
- Type: `THREE.PerspectiveCamera`, 62° FOV, near 0.5, far 1400
- Third-person behind Laila: distance 14 units, height 8 units
- Camera yaw smoothly follows `lYaw` with factor 0.08 per frame
- `camera.lookAt` targets slightly above penguin centre

---

## 8. Controls

### 8.1 Keyboard
| Key | Action |
|---|---|
| `↑` / `W` | Move forward |
| `↓` / `S` | Move backward |
| `←` / `A` | Turn left |
| `→` / `D` | Turn right |
| `J` | Jump (when resting) |
| `C` | Spin circle (when resting) |
| `H` | Wave hello (when resting) |
| `B` | Bow (when resting) |

### 8.2 Mobile D-Pad (screen ≤ 640px)
- 3×3 grid of 56px touch buttons, ▲ ▼ ◀ ▶

### 8.3 Touch Swipe (canvas drag)
- Vertical drag: forward/backward; Horizontal drag: turn
- Dead zone: 12px before activation

---

## 9. HUD

| Element | Position | Content |
|---|---|---|
| 🐧 Penguin button | Top-left | Double-click opens map |
| Title + subtitle | Top-centre | "FINDING PENGUIN" + "a love story in the snow" |
| Warmth indicator | Top-right | Distance feedback (6 tiers) |
| Compass | Top-right | Direction arrow to Waddler |
| Action hint | Bottom-centre | Fades in when resting |

### 9.1 Warmth Tiers
| Distance | Message |
|---|---|
| < 10 | 🔥🔥 ALMOST THERE!! |
| < 28 | 🔥 Very close!! |
| < 70 | 🟡 Getting warmer! |
| < 150 | 🔵 Somewhere nearby... |
| < 300 | ❄️ Far away... |
| ≥ 300 | 🌨️ Very far... |

---

## 10. Audio (Procedural — Web Audio API)

| Sound | Trigger | Waveform | Frequency | Duration |
|---|---|---|---|---|
| Footstep | Walk cycle (~230ms) | Triangle | 100–120 Hz | 60ms |
| Waddle | Random idle | Triangle | 85–105 Hz | 100ms |
| Jump | J key | Sine | 380→480 Hz | 55ms+140ms |
| Wave | H key | Triangle, 3 notes | 290, 380, 330 Hz | 75ms each |
| Reunion | Found Waddler | Triangle, 5 notes | C5→E5→G5→C6→E6 | 280ms each |
| Proximity ping | Continuous | Sine | 350–850 Hz (scales) | 90ms |

---

## 11. POI (Place of Interest) System

### 11.1 3D Character Models
All POI types are rendered as **3D box-geometry models** (same Minecraft/block aesthetic as penguins), **not emoji sprites**. Scale `CS = 1.1`:

| Type | 3D Model Description |
|---|---|
| **Person** | Block-person: legs, torso/shirt, arms, head, hair, eyes |
| **Shop** | Building: walls, door, windows, angled roof, sign |
| **Store** | Larger: glass front, pillars, flat roof with overhang, sign strip |
| **Stall** | Market: 4 poles, canopy, counter/table, display items |
| **Landmark** | Stacked tiered blocks getting smaller; ice spike top |
| **Custom** | Pole + coloured board (emoji label above) |

### 11.2 Floating Label
- Each POI has a floating label **sprite above the 3D model**
- Label contains: icon, name, URL (if any)
- Canvas-rendered card texture: white background, blue border, rounded
- Label is **hidden by default**, shown on proximity or click

### 11.3 Tooltip Card (above character)
- Position: **projected world-space above the POI** — not at mouse cursor
- Arrow pointing down toward character (`::after` CSS pseudo-element)
- Design: white card, blue border, backdrop blur, box-shadow, 14px border-radius
- Shows: large icon, bold name, clickable URL link
- Hides when clicking elsewhere or moving away

### 11.4 Proximity Trigger
- Laila within **30 units** → label sprite becomes visible, tooltip shown
- Laila moves away → label hidden, tooltip closed

### 11.5 Click in 3D
- Clicking any mesh of a POI group → tooltip shown

---

## 12. Data Persistence

### 12.1 Primary Storage — localStorage
- Key: `findingpenguin_pois`
- Format: JSON array of POI objects
- Written on every add/edit/delete
- Read on game start

### 12.2 Fallback — pois.json
- Static JSON file: `{"pois": [...]}`
- Loaded via `fetch()` if localStorage is empty
- Updated by admin export/import workflow

### 12.3 POI Object Schema
```json
{
  "id": "poi_1700000000000_abc12",
  "type": "shop",
  "icon": "🏪",
  "name": "Ice Cream Shop",
  "url": "https://example.com",
  "desc": "A cozy shop on the snow plain",
  "x": 150.0,
  "z": -220.0
}
```

---

## 13. Admin System (admin.html)

### 13.1 Authentication
- Separate `admin.html` file with full-screen login
- Password: **`penguin2024`**
- Not stored in session; must login each page load

### 13.2 Dashboard
- Stats: total places, people count, shops count, landmarks count
- Recent places list (last 4 added)
- Quick actions: Add Place, Open Game link

### 13.3 Places Management
- Full CRUD: Add / Edit / Delete all POIs
- Form fields: Type, Emoji, Name, Website URL, X/Z coordinates, Description
- Type dropdown auto-fills default emoji icon
- Delete requires confirmation dialog

### 13.4 Map View (admin)
- 480×480 canvas showing dark theme world map
- All POI positions shown with emoji icons
- Click on map canvas → auto-fills X/Z fields in Add Place form
- World boundary circle + spawn zone indicator

### 13.5 Settings
- Admin password field
- Proximity tooltip range (units)
- NPC penguins toggle
- Sound effects toggle
- Settings saved to localStorage key `findingpenguin_settings`

### 13.6 Data Management
- **Export**: Downloads `findingpenguin_pois.json` (includes settings)
- **Import**: Upload JSON file, validates format, replaces all POIs
- **Clear All**: Deletes all POIs after confirmation

---

## 14. In-Game Admin Map

### 14.1 Access
- Double-click 🐧 icon in top-left HUD → opens map overlay

### 14.2 Map Toolbar
Buttons: 👁 VIEW · 🏪 SHOP · 🧍 PERSON · 🏬 STORE · 🎪 STALL · 🏔 LANDMARK · ✏️ CUSTOM

### 14.3 Placement Workflow
1. Open map → click **🔐 ADMIN** → enter password
2. Select POI type from toolbar
3. Double-click on map → POI form appears
4. Fill in Name, URL, Emoji → **PLACE IT**
5. POI appears instantly in 3D world and is saved to localStorage

---

## 15. Technical Architecture

### 15.1 Coordinate System
- Three.js standard: Y = up
- `terrainH(worldX, worldZ)` samples terrain at any XZ
- All world objects: `position.set(x, terrainH(x,z) + halfHeight, z)`
- Penguins: `position.set(x, terrainH(x,z) − 0.12·PS, z)`

### 15.2 POI 3D Placement
- POI group origin at `(x, terrainH(x,z), z)` — base on ground
- All sub-boxes positioned relative to group (Y = 0 at ground level)
- Label sprite: `y = terrainH(x,z) + CS*5.5` (above building height)
- Float animation: `±0.25 * sin(time * 0.0018)` on label sprite only

### 15.3 Rendering Pipeline
```
gameLoop(timestamp)
  → process input
  → update state machine
  → move Laila
  → update Waddler AI
  → animate NPC penguins (idle sway)
  → recentre snowfall on player
  → float POI label sprites
  → tick snowfall particles
  → updateCam()
  → updateHUD() [proximity check, tooltip reposition]
  → renderer.render(scene, camera)
```

### 15.4 Performance
- Pixel ratio capped at 2× for high-DPI
- dt clamped to 80ms
- Snowfall recentred on player
- Shadow map: 2048×2048

---

## 16. Bugs Fixed (Engineering Notes)

| Bug | Root Cause | Fix Applied |
|---|---|---|
| `Cannot assign to read only property 'position'` | `Object.assign(light, {...})` bypasses setter | Changed to `light.position.set(x,y,z)` |
| Objects floating in air | `PlaneGeometry` local Y maps to world −Z | Changed to `terrainH(px, −py)` |
| Penguins submerging | Same + no foot offset | Added `−0.12·PS` offset |
| ↑/↓ arrows reversed | Wrong forward vector sign | Changed to `fX=−sin(lYaw), fZ=−cos(lYaw)` |
| Auto-sliding | `canMove` true during `rising` with no keys | Added `lState!=='rising'` guard |
| Camera shows face | `camYaw` converging to opposite | Reverted to `lYaw` tracking |
| `scene.children = []` crash | Direct array assignment unsupported | Changed to `scene.remove()` per object |

---

## 17. File Specification

| Property | Value |
|---|---|
| Game file | `finding-penguin.html` |
| Admin file | `admin.html` |
| Data file | `pois.json` |
| Dependencies | Three.js r128 (CDN only) |
| Browser support | Any modern browser with WebGL |
| Mobile support | Yes — D-pad auto-shown, touch swipe |
| Data persistence | localStorage (primary), pois.json (fallback) |
| Admin password | `penguin2024` |
| NPC penguin variants | hat, shades, skateboard |
