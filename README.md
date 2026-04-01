📡 Distributed Systems — Interactive Textbook

An animated, responsive web app to learn distributed systems through real-time canvas visualizations (60 FPS) — no static diagrams.

✨ Features
📚 7 interactive chapters (core DS concepts)
🎬 15+ live animations using Canvas + requestAnimationFrame
📱 Fully responsive (mobile, tablet, desktop)
🌙 Dark / Light mode
⚡ Retina + ResizeObserver support
🚫 No animation libraries — pure React + Canvas
📚 Chapters
Introduction
How It Works
Types (Cluster, Grid, Cloud, P2P)
Architectural Models
System Models
Hardware & Software
Design Issues
🎬 Animations

Includes simulations like:

Cluster processing
Cloud auto-scaling
Peer-to-peer mesh
Client-server (SPOF)
Packet drop & retransmission

✨ Features: easing, motion trails, particles, glow effects, state-machine animations

🛠 Tech Stack
React 19 + Vite
Tailwind CSS
Canvas API (requestAnimationFrame)
🚀 Getting Started
npm create vite@latest distributed-systems -- --template react
cd distributed-systems
npm install
npm install -D tailwindcss autoprefixer @tailwindcss/vite
npx tailwindcss init -p
npm run dev
📁 Structure
src/
 ├── distributed-systems.jsx
 ├── main.jsx
 └── index.css
🏗 Core Idea
Single JSX architecture
Canvas-based animations (no React re-renders)
Responsive UI with dynamic layouts
👤 Author

Pranav — VIT Bhopal

📄 License

For academic & educational use only
