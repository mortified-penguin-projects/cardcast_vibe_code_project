import { supabase } from '../lib/supabase';
import { useGameState } from '../hooks/useGameState';
import { PlayingCard } from './PlayingCard';
import { PlayerAvatar } from './PlayerAvatar';
import {
  startNewHand,
  advanceBettingRound,
  determineWinners,
  distributePot,
  isBettingRoundComplete
} from '../game/gameController';
import { Card } from '../types/game';

interface HostViewProps {
  gameCode: string;
}

export function HostView({ gameCode }: HostViewProps) {
  const { game, players, actions, loading } = useGameState(gameCode);

  async function handleStartHand() {
    if (!game || players.length < 2) { alert('Need at least 2 players to start'); return; }

    const result = startNewHand(game, players);

    await supabase.from('games').update({
      status: result.game.status,
      dealer_index: result.game.dealer_index,
      current_player_index: result.game.current_player_index,
      pot: result.game.pot,
      current_bet: result.game.current_bet,
      betting_round: result.game.betting_round,
      community_cards: result.game.community_cards,
      deck_state: result.deck
    }).eq('id', game.id);

    for (const player of result.players) {
      await supabase.from('players').update({
        hole_cards: player.hole_cards,
        current_bet: player.current_bet,
        chips: player.chips,
        status: player.status,
        last_action: null
      }).eq('id', player.id);
    }
  }

  async function handleNextRound() {
    if (!game || !game.deck_state || game.deck_state.length === 0) return;

    // FIX #3: pass players so next round resets current_player_index from dealer
    const result = advanceBettingRound(game, game.deck_state, players);

    await supabase.from('games').update({
      betting_round: result.game.betting_round,
      community_cards: result.game.community_cards,
      current_bet: 0,
      current_player_index: result.game.current_player_index,
      deck_state: result.deck
    }).eq('id', game.id);

    // Reset player bets for the new round
    for (const player of players) {
      if (player.status === 'active' || player.status === 'all-in') {
        await supabase.from('players').update({ current_bet: 0, last_action: null }).eq('id', player.id);
      }
    }
  }

  async function handleShowdown() {
    if (!game) return;

    const { winners, handRanks } = determineWinners(game, players);
    const updatedPlayers = distributePot(game, winners, players);

    for (const player of updatedPlayers) {
      await supabase.from('players').update({ chips: player.chips, current_bet: 0, hole_cards: player.hole_cards }).eq('id', player.id);
    }

    await supabase.from('games').update({ pot: 0, current_bet: 0, status: 'waiting' }).eq('id', game.id);

    const winnerNames = winners.map(w => w.name).join(', ');
    const winnerHands = winners.map(w => handRanks.get(w.id) ?? '').join(', ');
    setTimeout(() => alert(`Winner(s): ${winnerNames}\nHand: ${winnerHands}`), 100);
  }

  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white font-light">Loading...</div>;
  }
  if (!game) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white font-light">Game not found</div>;
  }

  const currentPlayer = players[game.current_player_index];
  const roundComplete = isBettingRoundComplete(players, game.current_bet);

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="text-2xl font-light">ROOM: {gameCode}</div>
            <div className="text-sm font-light opacity-60 mt-1">Host: {game.host_name}</div>
          </div>
          <div className="flex gap-4 items-center">
            {roundComplete && game.status === 'in_progress' && game.betting_round !== 'river' && (
              <button onClick={handleNextRound} className="px-6 py-3 bg-white text-black font-light rounded-lg hover:bg-gray-200 transition-colors">
                Next Round →
              </button>
            )}
            {roundComplete && game.status === 'in_progress' && game.betting_round === 'river' && (
              <button onClick={handleShowdown} className="px-6 py-3 bg-yellow-400 text-black font-light rounded-lg hover:bg-yellow-300 transition-colors">
                Showdown
              </button>
            )}
            {game.status === 'waiting' && players.length >= 2 && (
              <button onClick={handleStartHand} className="px-6 py-3 bg-white text-black font-light rounded-lg hover:bg-gray-200 transition-colors">
                Start Hand
              </button>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="text-center mb-6">
          <div className="text-sm font-light opacity-60">
            {game.status === 'waiting'
              ? `Waiting for players (${players.length}/8)`
              : `${game.betting_round.toUpperCase()}${roundComplete ? ' — Round complete' : ''}`}
          </div>
        </div>

        {/* Players */}
        <div className="flex justify-center gap-6 mb-12 flex-wrap">
          {players.map((player, index) => (
            <div key={player.id} className="flex flex-col items-center">
              <PlayerAvatar
                player={player}
                isDealer={index === game.dealer_index}
                isCurrentPlayer={game.status === 'in_progress' && index === game.current_player_index}
              />
              {player.last_action && (
                <div className="text-xs font-light opacity-60 mt-1">{player.last_action}</div>
              )}
              {player.current_bet > 0 && (
                <div className="text-xs font-light text-yellow-400 mt-1">Bet: {player.current_bet}</div>
              )}
              {player.status === 'folded' && (
                <div className="text-xs font-light opacity-40 mt-1">folded</div>
              )}
              {player.status === 'all-in' && (
                <div className="text-xs font-light text-orange-400 mt-1">all-in</div>
              )}
            </div>
          ))}
        </div>

        {/* Community Cards */}
        <div className="flex justify-center gap-4 mb-8">
          {game.community_cards && game.community_cards.length > 0 ? (
            <>
              {game.community_cards.map((card: Card, index: number) => (
                <PlayingCard key={index} card={card} size="large" />
              ))}
              {Array.from({ length: 5 - game.community_cards.length }).map((_, i) => (
                <PlayingCard key={`empty-${i}`} size="large" />
              ))}
            </>
          ) : (
            Array.from({ length: 5 }).map((_, i) => <PlayingCard key={i} size="large" />)
          )}
        </div>

        {/* Pot */}
        <div className="text-center mb-8">
          <div className="text-6xl font-light mb-2">{game.pot}</div>
          <div className="text-xl font-light opacity-60">POT</div>
          {game.current_bet > 0 && (
            <div className="text-lg font-light opacity-60 mt-2">Current Bet: {game.current_bet}</div>
          )}
        </div>

        {/* Whose turn */}
        {currentPlayer && game.status === 'in_progress' && !roundComplete && (
          <div className="text-center mb-8">
            <div className="text-lg font-light opacity-80">
              Waiting for {currentPlayer.name}'s action...
            </div>
          </div>
        )}

        {/* Action log */}
        <div className="border-t border-gray-800 pt-4">
          <div className="text-sm font-light opacity-60 mb-2">Recent Actions</div>
          <div className="space-y-1">
            {actions.slice(0, 5).map(action => {
              const player = players.find(p => p.id === action.player_id);
              return (
                <div key={action.id} className="text-sm font-light opacity-40">
                  {player?.name} {action.action_type}{action.amount > 0 ? ` ${action.amount}` : ''}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
