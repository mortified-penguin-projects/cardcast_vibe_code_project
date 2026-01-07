# Poker - Real-time Multiplayer Texas Hold'em

A minimal, elegant real-time multiplayer poker application built with React, TypeScript, and Supabase. Features separate host and player interfaces similar to Jackbox Games architecture.

## Features

- **Texas Hold'em Poker**: Full implementation with standard rules and hand rankings
- **2-8 Players**: Support for up to 8 players per game
- **Real-time Sync**: WebSocket-based synchronization via Supabase Realtime
- **Host Interface**: Desktop/tablet view for displaying game state
- **Player Interface**: Mobile-optimized view with betting controls
- **Room Codes**: Simple 4-character codes for joining games
- **Minimalist Design**: Pure black background with ultra-light typography

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Supabase Realtime (WebSockets)
- **Icons**: Lucide React

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

The Supabase credentials are already configured in `.env`:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Database Setup

The database schema has been applied automatically. It includes:

- `games` - Game state and configuration
- `players` - Player information and chips
- `game_actions` - Betting history

### 4. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### 5. Build for Production

```bash
npm run build
```

## How to Play

### Creating a Game

1. Click "Host Game"
2. Enter your name
3. Share the 4-character room code with other players
4. Wait for players to join
5. Click "Start Hand" to begin

### Joining a Game

1. Click "Join Game"
2. Enter your name
3. Enter the room code
4. Wait for the host to start

### Host Controls

- **Start Hand**: Deal cards and begin a new hand
- **Next Round**: Advance from pre-flop → flop → turn → river
- **Showdown**: Determine winners and distribute pot

### Player Controls

- **Check/Call**: Match current bet or check if no bet
- **Bet/Raise**: Increase bet (use up/down buttons)
- **Fold**: Forfeit current hand

## File Structure

```
src/
├── components/
│   ├── Lobby.tsx          # Game creation and joining
│   ├── HostView.tsx       # Host interface (display)
│   ├── PlayerView.tsx     # Player interface (mobile)
│   ├── PlayingCard.tsx    # SVG card component
│   └── PlayerAvatar.tsx   # Player avatar display
├── game/
│   ├── deck.ts            # Deck creation and shuffling
│   ├── handEvaluator.ts   # Poker hand evaluation
│   └── gameController.ts  # Game flow logic
├── hooks/
│   └── useGameState.ts    # Real-time game state hook
├── lib/
│   └── supabase.ts        # Supabase client
├── types/
│   └── game.ts            # TypeScript types
├── App.tsx                # Main application
└── index.css              # Global styles
```

## WebSocket API

The application uses Supabase Realtime for WebSocket communication:

### Subscribed Channels

- **games**: Game state updates (pot, current bet, community cards)
- **players**: Player updates (chips, status, cards)
- **game_actions**: Betting actions (fold, call, raise)

### Real-time Events

```typescript
// Game updates
games:UPDATE -> { pot, current_bet, community_cards, ... }

// Player updates
players:UPDATE -> { chips, status, current_bet, ... }
players:INSERT -> New player joined

// Action updates
game_actions:INSERT -> { action_type, amount, ... }
```

## Design System

- **Background**: Pure black (#000000)
- **Text**: White (#FFFFFF)
- **Font**: Helvetica Neue (weight: 200)
- **Cards**: Light gray (#d1d5db) with thin white borders
- **Buttons**: White for primary, gray for secondary
- **Avatars**: Colorful player indicators

## Game Logic

### Hand Evaluation

The poker hand evaluator supports:
- Royal Flush
- Straight Flush
- Four of a Kind
- Full House
- Flush
- Straight
- Three of a Kind
- Two Pair
- Pair
- High Card

### Betting Rounds

1. **Pre-flop**: After hole cards dealt
2. **Flop**: After 3 community cards
3. **Turn**: After 4th community card
4. **River**: After 5th community card
5. **Showdown**: Compare hands and determine winner

### Blinds

- Small Blind: 5 chips
- Big Blind: 10 chips
- Starting Chips: 1000

## Deployment

### Build

```bash
npm run build
```

### Deploy to Vercel/Netlify

The `dist` folder contains the production build. Deploy using:

```bash
# Vercel
vercel --prod

# Netlify
netlify deploy --prod --dir=dist
```

## License

MIT
