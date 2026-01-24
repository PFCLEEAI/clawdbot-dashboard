# 🦞 Clawdbot Dashboard

A rich, glanceable dashboard UI for [Clawdbot](https://clawd.bot) — see your weather, calendar, emails, sessions, cron jobs, and more at a glance.

![Status](https://img.shields.io/badge/status-in%20development-yellow)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Tailwind](https://img.shields.io/badge/Tailwind-4.0-38bdf8)

## ✨ Features

### Current (Phase 1)
- [x] Basic dashboard layout
- [x] Header with weather and time
- [x] Status widget (gateway health, channels)
- [x] Calendar widget
- [x] Email widget
- [x] Cron jobs widget
- [x] Sports widget (PSG, Arsenal)

### Planned
- [ ] **Phase 2**: Real API integration with Clawdbot Gateway
- [ ] **Phase 3**: Daily briefing panel, newspaper view, usage stats
- [ ] **Phase 4**: Topic/project management, timeline view
- [ ] **Phase 5**: Dynamic layouts, command palette (⌘K)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm
- Clawdbot running locally

### Installation

```bash
# Clone the repo
git clone https://github.com/jpequegn/clawdbot-dashboard.git
cd clawdbot-dashboard

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

### Configuration

Create a `.env.local` file:

```env
# Clawdbot Gateway
CLAWDBOT_HOST=127.0.0.1
CLAWDBOT_PORT=18789
CLAWDBOT_TOKEN=your-token-here

# Optional: External APIs
OPENWEATHER_API_KEY=your-key
```

## 📁 Project Structure

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── api/              # API routes
├── components/
│   ├── ui/               # shadcn/ui components
│   ├── widgets/          # Dashboard widgets
│   │   ├── StatusWidget.tsx
│   │   ├── CalendarWidget.tsx
│   │   ├── EmailWidget.tsx
│   │   ├── CronWidget.tsx
│   │   └── SportsWidget.tsx
│   └── layout/           # Layout components
│       └── Header.tsx
├── hooks/                # Custom React hooks
├── lib/                  # Utilities
└── types/                # TypeScript types
```

## 🎨 Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Language**: TypeScript
- **Data**: Clawdbot Gateway WebSocket API

## 🗺️ Roadmap

### Phase 1: Foundation ✅
Basic dashboard with mock data

### Phase 2: Core Integration
- Connect to Clawdbot Gateway WebSocket
- Fetch real data (weather, calendar, email)
- Implement refresh/polling

### Phase 3: Rich Features
- Daily briefing panel
- Newspaper view ("The Daily Clawd")
- Usage stats & cost tracking
- Twitter digest

### Phase 4: Topic Management
- Projects/workstreams view
- Task integration (Apple Reminders / TODO.md)
- Timeline visualization
- Notes quick capture

### Phase 5: Dynamic & Smart
- Time-based layouts (morning vs evening)
- Work/Personal mode toggle
- Command palette (⌘K)
- Widget drag & drop customization

## 🤝 Contributing

Contributions welcome! Please read the contributing guidelines first.

## 📄 License

MIT

## 🙏 Acknowledgments

- Inspired by [kitze's](https://twitter.com/thekitze) Benji app and Life OS concepts
- Built for [Clawdbot](https://clawd.bot) by [@steipete](https://twitter.com/steipete)
- UI components from [shadcn/ui](https://ui.shadcn.com/)

---

*Made with 🦞 by Larry the Lobster*
