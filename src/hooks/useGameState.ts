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

  useEffect(() => {
    if (!gameCode) return;

    async function loadGame() {
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

    loadGame();

    const channel = supabase
      .channel(`game:${gameCode}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'games', filter: `game_code=eq.${gameCode}` },
        payload => { setGame(payload.new as Game); }
      )
      .on(
        'postgres_changes',
        // FIX #7: filter players subscription to this game only
        { event: '*', schema: 'public', table: 'players', filter: `game_id=eq.${gameIdRef.current}` },
        payload => {
          if (payload.eventType === 'INSERT') {
            setPlayers(prev =>
              [...prev, payload.new as Player].sort((a, b) => a.position - b.position)
            );
          } else if (payload.eventType === 'UPDATE') {
            setPlayers(prev =>
              prev.map(p => (p.id === payload.new.id ? (payload.new as Player) : p))
            );
          } else if (payload.eventType === 'DELETE') {
            setPlayers(prev => prev.filter(p => p.id !== (payload.old as Player).id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'game_actions' },
        payload => {
          const action = payload.new as GameAction;
          // Only include actions for this game
          if (gameIdRef.current && action.game_id !== gameIdRef.current) return;
          setActions(prev => [action, ...prev].slice(0, 10));
        }
      )
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [gameCode]);

  return { game, players, actions, loading, error };
}
