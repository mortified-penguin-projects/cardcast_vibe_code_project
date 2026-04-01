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
    if (!playerName.trim()) { setError('Please enter your name'); return; }

    setLoading(true);
    setError('');

    try {
      const code = generateGameCode();

      const { error: gameError } = await supabase
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
    if (!playerName.trim()) { setError('Please enter your name'); return; }
    if (!gameCode.trim()) { setError('Please enter a game code'); return; }

    setLoading(true);
    setError('');

    try {
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('game_code', gameCode.toUpperCase())
        .maybeSingle();

      if (gameError) throw gameError;
      if (!gameData) { setError('Game not found'); setLoading(false); return; }

      const { data: existingPlayers, error: playersError } = await supabase
        .from('players')
        .select('*')
        .eq('game_id', gameData.id);

      if (playersError) throw playersError;
      if (existingPlayers.length >= 8) { setError('Game is full'); setLoading(false); return; }

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
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-red-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8">
          <div className="flex justify-center mb-8">
            <img src="/IMG_4336.PNG" alt="Cardcast" className="h-48 w-auto" />
          </div>
          <button onClick={() => setMode('create')} className="w-full py-6 bg-gradient-to-r from-white to-gray-200 text-black text-xl font-light rounded-lg hover:from-gray-100 hover:to-gray-300 transition-all shadow-lg">
            Host Game
          </button>
          <button onClick={() => setMode('join')} className="w-full py-6 bg-gradient-to-r from-red-600 to-red-700 text-white text-xl font-light rounded-lg hover:from-red-700 hover:to-red-800 transition-all shadow-lg hover:shadow-red-900/50">
            Join Game
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'create') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-red-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6">
          <button onClick={() => setMode('menu')} className="text-white font-light mb-4 hover:opacity-60 transition-opacity">← Back</button>
          <div className="flex items-center gap-3 mb-8">
            <img src="/IMG_4336.PNG" alt="Cardcast" className="h-12 w-auto" />
            <h2 className="text-3xl font-light text-white">Host Game</h2>
          </div>
          <input
            type="text" placeholder="Your name" value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            className="w-full px-6 py-4 bg-gray-900/50 text-white font-light text-lg rounded-lg border border-red-900/30 focus:border-red-600 outline-none transition-colors"
          />
          {error && <div className="text-red-500 font-light text-sm">{error}</div>}
          <button onClick={handleCreateGame} disabled={loading} className="w-full py-4 bg-gradient-to-r from-red-600 to-red-700 text-white text-lg font-light rounded-lg hover:from-red-700 hover:to-red-800 transition-all shadow-lg hover:shadow-red-900/50 disabled:opacity-50">
            {loading ? 'Creating...' : 'Create Game'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-red-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <button onClick={() => setMode('menu')} className="text-white font-light mb-4 hover:opacity-60 transition-opacity">← Back</button>
        <div className="flex items-center gap-3 mb-8">
          <img src="/IMG_4336.PNG" alt="Cardcast" className="h-12 w-auto" />
          <h2 className="text-3xl font-light text-white">Join Game</h2>
        </div>
        <input
          type="text" placeholder="Your name" value={playerName}
          onChange={e => setPlayerName(e.target.value)}
          className="w-full px-6 py-4 bg-gray-900/50 text-white font-light text-lg rounded-lg border border-red-900/30 focus:border-red-600 outline-none transition-colors"
        />
        <input
          type="text" placeholder="Game code" value={gameCode}
          onChange={e => setGameCode(e.target.value.toUpperCase())}
          className="w-full px-6 py-4 bg-gray-900/50 text-white font-light text-lg rounded-lg border border-red-900/30 focus:border-red-600 outline-none transition-colors uppercase"
          maxLength={4}
        />
        {error && <div className="text-red-500 font-light text-sm">{error}</div>}
        <button onClick={handleJoinGame} disabled={loading} className="w-full py-4 bg-gradient-to-r from-red-600 to-red-700 text-white text-lg font-light rounded-lg hover:from-red-700 hover:to-red-800 transition-all shadow-lg hover:shadow-red-900/50 disabled:opacity-50">
          {loading ? 'Joining...' : 'Join Game'}
        </button>
      </div>
    </div>
  );
}
