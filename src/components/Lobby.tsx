import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { generateGameCode } from '../game/gameController';

interface LobbyProps {
  onJoinGame: (gameCode: string, playerId: string, isHost: boolean) => void;
}

export function Lobby({ onJoinGame }: LobbyProps) {
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [playerName, setPlayerName] = useState('');
  const [gameCode, setGameCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCreateGame() {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const code = generateGameCode();

      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .insert({
          game_code: code,
          host_name: playerName.trim(),
          status: 'waiting',
          small_blind: 5,
          big_blind: 10,
          pot: 0,
          current_bet: 0,
          betting_round: 'pre-flop',
          dealer_index: 0,
          current_player_index: 0,
          community_cards: [],
          deck_state: []
        })
        .select()
        .single();

      if (gameError) throw gameError;

      onJoinGame(code, '', true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create game');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinGame() {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!gameCode.trim()) {
      setError('Please enter a game code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('game_code', gameCode.toUpperCase())
        .maybeSingle();

      if (gameError) throw gameError;
      if (!gameData) {
        setError('Game not found');
        setLoading(false);
        return;
      }

      const { data: existingPlayers, error: playersError } = await supabase
        .from('players')
        .select('*')
        .eq('game_id', gameData.id);

      if (playersError) throw playersError;

      if (existingPlayers.length >= 8) {
        setError('Game is full');
        setLoading(false);
        return;
      }

      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .insert({
          game_id: gameData.id,
          name: playerName.trim(),
          chips: 1000,
          position: existingPlayers.length,
          status: 'active',
          is_host: false,
          hole_cards: [],
          current_bet: 0
        })
        .select()
        .single();

      if (playerError) throw playerError;

      onJoinGame(gameCode.toUpperCase(), playerData.id, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join game');
    } finally {
      setLoading(false);
    }
  }

  if (mode === 'menu') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6">
          <h1 className="text-5xl font-light text-white text-center mb-12">POKER</h1>
          <button
            onClick={() => setMode('create')}
            className="w-full py-6 bg-white text-black text-xl font-light rounded-lg hover:bg-gray-200 transition-colors"
          >
            Host Game
          </button>
          <button
            onClick={() => setMode('join')}
            className="w-full py-6 bg-gray-800 text-white text-xl font-light rounded-lg hover:bg-gray-700 transition-colors"
          >
            Join Game
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'create') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6">
          <button
            onClick={() => setMode('menu')}
            className="text-white font-light mb-4 hover:opacity-60 transition-opacity"
          >
            ← Back
          </button>
          <h2 className="text-3xl font-light text-white mb-8">Host Game</h2>
          <input
            type="text"
            placeholder="Your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full px-6 py-4 bg-gray-900 text-white font-light text-lg rounded-lg border border-gray-800 focus:border-white outline-none transition-colors"
          />
          {error && <div className="text-red-500 font-light text-sm">{error}</div>}
          <button
            onClick={handleCreateGame}
            disabled={loading}
            className="w-full py-4 bg-white text-black text-lg font-light rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Game'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <button
          onClick={() => setMode('menu')}
          className="text-white font-light mb-4 hover:opacity-60 transition-opacity"
        >
          ← Back
        </button>
        <h2 className="text-3xl font-light text-white mb-8">Join Game</h2>
        <input
          type="text"
          placeholder="Your name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          className="w-full px-6 py-4 bg-gray-900 text-white font-light text-lg rounded-lg border border-gray-800 focus:border-white outline-none transition-colors"
        />
        <input
          type="text"
          placeholder="Game code"
          value={gameCode}
          onChange={(e) => setGameCode(e.target.value.toUpperCase())}
          className="w-full px-6 py-4 bg-gray-900 text-white font-light text-lg rounded-lg border border-gray-800 focus:border-white outline-none transition-colors uppercase"
          maxLength={4}
        />
        {error && <div className="text-red-500 font-light text-sm">{error}</div>}
        <button
          onClick={handleJoinGame}
          disabled={loading}
          className="w-full py-4 bg-white text-black text-lg font-light rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          {loading ? 'Joining...' : 'Join Game'}
        </button>
      </div>
    </div>
  );
}
