import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Game, Player, GameAction } from '../types/game';

export function useGameState(gameCode: string) {
  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [actions, setActions] = useState<GameAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const gameIdRef = useRef<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!gameCode) return;

    async function loadGameOnce() {
      try {
        const { data: gameData, error: gameError } = await supabase
          .from('games')
          .select('*')
          .eq('game_code', gameCode)
          .maybeSingle();

        if (gameError) throw gameError;
        if (!gameData) { setError('Game not found'); setLoading(false); return; }

        setGame(gameData as Game);
        gameIdRef.current = gameData.id;

        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('*')
          .eq('game_id', gameData.id)
          .order('position');

        if (playersError) throw playersError;
        setPlayers(playersData as Player[]);

        const { data: actionsData, error: actionsError } = await supabase
          .from('game_actions')
          .select('*')
          .eq('game_id', gameData.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (actionsError) throw actionsError;
        setActions(actionsData as GameAction[]);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load game');
        setLoading(false);
      }
    }

    async function pollUpdates() {
      if (!gameIdRef.current) return;

      try {
        const { data: gameData, error: gameError } = await supabase
          .from('games')
          .select('*')
          .eq('id', gameIdRef.current)
          .maybeSingle();

        if (gameData && !gameError) setGame(gameData as Game);

        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('*')
          .eq('game_id', gameIdRef.current)
          .order('position');

        if (playersData && !playersError) setPlayers(playersData as Player[]);

        const { data: actionsData, error: actionsError } = await supabase
          .from('game_actions')
          .select('*')
          .eq('game_id', gameIdRef.current)
          .order('created_at', { ascending: false })
          .limit(10);

        if (actionsData && !actionsError) setActions(actionsData as GameAction[]);
      } catch (err) {
        console.error('Poll error:', err);
      }
    }

    loadGameOnce();
    pollIntervalRef.current = setInterval(pollUpdates, 500);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [gameCode]);

  return { game, players, actions, loading, error };
}
