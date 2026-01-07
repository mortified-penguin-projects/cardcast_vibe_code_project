import { useState } from 'react';
import { Lobby } from './components/Lobby';
import { HostView } from './components/HostView';
import { PlayerView } from './components/PlayerView';

function App() {
  const [gameState, setGameState] = useState<{
    gameCode: string;
    playerId: string;
    isHost: boolean;
  } | null>(null);

  function handleJoinGame(gameCode: string, playerId: string, isHost: boolean) {
    setGameState({ gameCode, playerId, isHost });
  }

  if (!gameState) {
    return <Lobby onJoinGame={handleJoinGame} />;
  }

  if (gameState.isHost) {
    return <HostView gameCode={gameState.gameCode} />;
  }

  return <PlayerView gameCode={gameState.gameCode} playerId={gameState.playerId} />;
}

export default App;
