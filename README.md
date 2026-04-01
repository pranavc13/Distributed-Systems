# 📡 Distributed Systems — Interactive Textbook

> A fully animated, responsive web application that teaches distributed systems concepts through real-time canvas visualisations. Every chapter includes a live 60 fps animation that demonstrates the concept — no static diagrams.

---

## ✨ Features

- **7 interactive chapters** covering core distributed systems theory
- **15+ canvas-rendered animations** — all built on native Canvas 2D API + `requestAnimationFrame`
- **Fully responsive** — mobile, tablet, and desktop layouts with dedicated navigation patterns
- **Dark / Light theme toggle** with smooth transitions
- **Retina / HiDPI support** via `devicePixelRatio` scaling
- **ResizeObserver-powered canvases** — animations scale fluidly to any container width
- **Zero external animation libraries** — pure React + Canvas

---

## 📚 Chapters

| # | Chapter | Topics Covered |
|---|---------|---------------|
| 01 | **Introduction** | What is a distributed system · transparency · message passing |
| 02 | **How It Works** | HTTP request journey · client → gateway → load balancer → server → DB |
| 03 | **Types** | Cluster · Grid · Cloud auto-scaling · Peer-to-Peer |
| 04 | **Architectural Models** | Client-Server · Decentralized mesh |
| 05 | **System Models** | Physical (LAN/WAN topology) · Architectural (3-tier) · Fundamental (interaction · failure · security) |
| 06 | **HW & SW** | Multiprocessor vs Multicomputer · Shared memory · Message passing · Middleware stack |
| 07 | **Design Issues** | Network fallacies · Packet drop · ACK timeout · Retransmission |

---

## 🎬 Animations

Every chapter has one or more live canvas scenes:

| Scene | What it shows |
|-------|--------------|
| `IntroCanvas` | Request ball travels to system box; inner nodes light up in sequence |
| `ClusterCanvas` | Task splits into 4 parallel balls → nodes → merges into result |
| `GridCanvas` | Jobs dispatched to heterogeneous global nodes at different speeds |
| `CloudCanvas` | Traffic floods server → overload → 2 replicas auto-spawn |
| `P2PCanvas` | 6-node mesh with multi-hop coloured packets |
| `ClientServerCanvas` | All traffic funnels to one server (SPOF pulse ring) |
| `DecentralizedCanvas` | Mesh routing with "No SPOF ✓" badge |
| `HardwareCanvas` | MP balls travel L-shaped path through shared memory bar |
| `MiddlewareCanvas` | Two stacks + middleware channel; ball changes colour per layer |
| `FallacyCanvas` | 3 packets · 1 dropped at broken link · ACK timeout · retransmit |
| `PhysicalModelCanvas` | LAN cluster + WAN router + remote data centre |
| `ArchitecturalModelCanvas` | 3-tier bands: Presentation → Logic → Data |
| `FundamentalModelCanvas` | Interaction (sync/async) · Failure (crash/omission/byzantine) · Security (TLS/auth) |
| `HowItWorksCanvas` | 5-phase animated HTTP journey with step indicator strip |

**Animation features:**
- Easing functions: `outCubic`, `inOutCubic`, `outBack`, `outElastic`
- Motion trails — fading comet tails on every packet
- Radial-gradient glow balls with `shadowBlur`
- Particle burst system on arrival (physics: gravity + fade)
- Pulse rings, screen-shake on overload, electric sparks on broken links
- Auto-looping state machines with configurable phase durations

---

## 📱 Responsive Design

| Breakpoint | Layout |
|------------|--------|
| **Mobile** `< 640px` | Sticky top header · slide-over drawer · bottom tab bar (5 tabs + More) |
| **Tablet** `640–1023px` | 56px icon-only sidebar · scrollable main content |
| **Desktop** `≥ 1024px` | Full 256px sticky sidebar · main content up to 780px |

Additional RWD details:
- Canvas scenes scale via `ResizeObserver` — never overflow on small screens
- Tab buttons scroll horizontally on mobile (`overflow-x: auto`)
- Info grids collapse: 3-col → 2-col → 1-col across breakpoints
- Font sizes use `text-xs sm:text-sm` / `text-base sm:text-lg` scaling
- Card padding reduces on mobile (`p-3` vs `p-5/p-6`)
- Safe area insets for iPhone home indicator (`env(safe-area-inset-bottom)`)

---

## 🛠 Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | ^19.0.0 | UI framework |
| React DOM | ^19.0.0 | DOM renderer |
| Vite | ^6.x | Dev server & bundler |
| Tailwind CSS | ^3.4.x | Utility-first styling |
| @vitejs/plugin-react | latest | JSX transform |
| autoprefixer | latest | CSS vendor prefixes |

**No other runtime dependencies.** All animations use:
- Native `Canvas 2D API`
- `requestAnimationFrame` for 60 fps loops
- `ResizeObserver` for responsive canvas scaling
- `window.devicePixelRatio` for retina support

---

## 🚀 Getting Started

### Prerequisites

- **Node.js 18+** — [download here](https://nodejs.org)
- **npm 9+** (bundled with Node.js)
- **VS Code** (recommended) with the [ES7+ React/Redux snippets](https://marketplace.visualstudio.com/items?itemName=dsznajder.es7-react-js-snippets) extension

Verify your versions:

```bash
node -v    # should print v18.x.x or higher
npm -v     # should print 9.x.x or higher
```

---

### Installation

**Step 1 — Scaffold a new Vite + React project**

```bash
npm create vite@latest distributed-systems -- --template react
cd distributed-systems
```

**Step 2 — Install dependencies**

```bash
npm install
npm install -D tailwindcss autoprefixer @tailwindcss/vite
```

**Step 3 — Initialise Tailwind**

```bash
npx tailwindcss init -p
```

**Step 4 — Configure `tailwind.config.js`**

Replace the generated file with:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**Step 5 — Configure `vite.config.js`**

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

**Step 6 — Set up `src/index.css`**

Replace the entire file contents with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Step 7 — Add the component**

Copy `distributed-systems.jsx` into the `src/` folder.

Then replace `src/main.jsx` with:

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './distributed-systems.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

**Step 8 — Start the dev server**

```bash
npm run dev
```

Open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

### All commands at a glance

```bash
# 1. Scaffold
npm create vite@latest distributed-systems -- --template react
cd distributed-systems

# 2. Install
npm install
npm install -D tailwindcss autoprefixer @tailwindcss/vite

# 3. Tailwind init
npx tailwindcss init -p

# 4. Start dev server
npm run dev

# 5. Build for production
npm run build

# 6. Preview production build locally
npm run preview
```

---

## 📁 Project Structure

```
distributed-systems/
│
├── src/
│   ├── distributed-systems.jsx   ← main component (all logic + UI)
│   ├── main.jsx                  ← React entry point
│   └── index.css                 ← Tailwind directives
│
├── index.html                    ← HTML shell (Vite entry)
├── vite.config.js                ← Vite + React plugin config
├── tailwind.config.js            ← Tailwind content paths
├── package.json                  ← dependencies & scripts
└── README.md                     ← this file
```

---

## 🏗 Architecture Overview

The entire application lives in a **single JSX file** organised into clear layers:

```
distributed-systems.jsx
│
├── Math & Easing utilities
│   └── outCubic · inOutCubic · outBack · outElastic
│
├── Canvas Engine (CanvasScene)
│   └── ResizeObserver · devicePixelRatio · requestAnimationFrame loop
│
├── Draw Primitives
│   ├── glowBall()        — radial gradient + shadowBlur glow
│   ├── trail()           — fading comet trail
│   ├── dashed()          — dashed line helper
│   ├── bgGrid()          — dark background + grid lines
│   ├── node()            — icon node with 6 icon types
│   ├── particles_spawn() — burst particle emitter
│   ├── particles_tick()  — physics update (gravity + fade)
│   └── addTrail()        — trail push helper
│
├── Canvas Scenes (14 total)
│   └── Each is a self-contained draw function with local state machine
│
├── Section Components (7 chapters)
│   └── Each wraps canvas(es) in SceneCard + prose explanation
│
├── useBreakpoint hook
│   └── Returns "mobile" | "tablet" | "desktop" reactively
│
└── App (responsive shell)
    ├── Desktop sidebar (256px sticky)
    ├── Tablet icon sidebar (56px)
    ├── Mobile top header + drawer + bottom nav
    ├── Dark / Light theme token system
    └── CSS overrides injected for light mode
```

### State machine pattern

Every canvas scene uses the same pattern:

```js
// Inside draw() callback:
if(!s.init) {
  Object.assign(s, { init:true, t:0, phase:"idle", balls:[], ... });
}
s.t += dt;

// Phase transitions
if(s.phase === "idle" && s.t > 800) { s.phase = "sending"; ... }
if(s.phase === "sending") { s.ball.prog = clamp(s.ball.prog + dt/1100); }
// ... etc.
```

All animation state lives in `stateRef.current` — never in React state — so the canvas loop never triggers re-renders.

---

## 🎨 Design System

### Colour palette

| Token | Hex | Usage |
|-------|-----|-------|
| Cyan | `#22d3ee` / `#67e8f9` | Primary accent, client nodes, request balls |
| Purple | `#a855f7` / `#c084fc` | Server nodes, middleware, cluster |
| Emerald | `#10b981` / `#6ee7b7` | Success, database, decentralised |
| Amber | `#f59e0b` / `#fbbf24` | Timeout, warnings, retransmission |
| Red | `#ef4444` / `#fca5a5` | Errors, crash failure, dropped packets |
| Pink | `#f472b6` | Load balancer, P2P nodes |

### Typography

- **Code / labels:** JetBrains Mono (Google Fonts)
- **Headings:** Space Grotesk (Google Fonts)
- **Fallback:** Fira Code, monospace

### Canvas background

All scenes render on `#020b18` (near-black navy) with a subtle dot-grid overlay at 4% opacity, ensuring animations are always visible regardless of theme.

---

## 🖥 Building for Production

```bash
npm run build
```

Output goes to `dist/`. Serve with any static file host:

```bash
# Preview locally
npm run preview

# Deploy to Netlify (drag & drop the dist/ folder)
# Deploy to Vercel: vercel --prod
# Deploy to GitHub Pages: use the gh-pages package
```

---

## 👤 Author

**Pranav** — VIT Bhopal (Registration: 23BCE10563)  
.

---

## 📄 Licence

This project is for academic and educational use.
