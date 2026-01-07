import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useGameState } from '../hooks/useGameState';
import { PlayingCard } from './PlayingCard';
import { PlayerAvatar } from './PlayerAvatar';
import { calculateWinProbability } from '../game/handEvaluator';
import { ActionType, Card } from '../types/game';

interface PlayerViewProps {
  gameCode: string;
  playerId: string;
}

export function PlayerView({ gameCode, playerId }: PlayerViewProps) {
  const { game, players, loading } = useGameState(gameCode);
  const [raiseAmount, setRaiseAmount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const currentPlayer = players.find(p => p.id === playerId);
  const isMyTurn = game && currentPlayer && players[game.current_player_index]?.id === playerId;

  async function handleAction(actionType: ActionType, amount: number = 0) {
    if (!game || !currentPlayer || !isMyTurn || isProcessing) return;

    setIsProcessing(true);

    try {
      let finalAmount = amount;
      let newChips = currentPlayer.chips;
      let newCurrentBet = currentPlayer.current_bet;
      let newStatus = currentPlayer.status;

      if (actionType === 'fold') {
        newStatus = 'folded';
      } else if (actionType === 'check') {
        finalAmount = 0;
      } else if (actionType === 'call') {
        finalAmount = Math.min(game.current_bet - currentPlayer.current_bet, currentPlayer.chips);
        newChips -= finalAmount;
        newCurrentBet += finalAmount;
        if (newChips === 0) newStatus = 'all-in';
      } else if (actionType === 'raise') {
        const totalBet = game.current_bet + amount;
        finalAmount = Math.min(totalBet - currentPlayer.current_bet, currentPlayer.chips);
        newChips -= finalAmount;
        newCurrentBet += finalAmount;
        if (newChips === 0) {
          newStatus = 'all-in';
          actionType = 'all-in';
        }
      }

      await supabase.from('players').update({
        chips: newChips,
        current_bet: newCurrentBet,
        status: newStatus,
        last_action: actionType
      }).eq('id', playerId);

      await supabase.from('game_actions').insert({
        game_id: game.id,
        player_id: playerId,
        action_type: actionType,
        amount: finalAmount,
        betting_round: game.betting_round
      });

      const newPot = game.pot + finalAmount;
      const newGameCurrentBet = actionType === 'raise' ? newCurrentBet : game.current_bet;

      let nextPlayerIndex = (game.current_player_index + 1) % players.length;
      let attempts = 0;

      while (attempts < players.length) {
        const nextPlayer = players[nextPlayerIndex];
        if (nextPlayer && nextPlayer.status === 'active' && nextPlayer.id !== playerId) {
          break;
        }
        nextPlayerIndex = (nextPlayerIndex + 1) % players.length;
        attempts++;
      }

      await supabase.from('games').update({
        pot: newPot,
        current_bet: newGameCurrentBet,
        current_player_index: nextPlayerIndex
      }).eq('id', game.id);

      setRaiseAmount(0);
    } catch (error) {
      console.error('Action error:', error);
      alert('Failed to perform action. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white font-light">
        Loading...
      </div>
    );
  }

  if (!game || !currentPlayer) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white font-light">
        Game not found
      </div>
    );
  }

  const winProb = currentPlayer.hole_cards.length === 2 && game.community_cards.length > 0
    ? calculateWinProbability(currentPlayer.hole_cards, game.community_cards)
    : { winProb: 0, handProb: 0, handName: 'No cards' };

  const canCheck = game.current_bet === currentPlayer.current_bet;
  const callAmount = Math.min(game.current_bet - currentPlayer.current_bet, currentPlayer.chips);
  const minRaise = game.big_blind;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div className="flex-1 flex flex-col p-4">
        <div className="flex justify-center gap-2 mb-6 mt-4 overflow-x-auto">
          {players.map((player, index) => (
            <div key={player.id} className="flex flex-col items-center min-w-[60px]">
              <PlayerAvatar
                player={player}
                isDealer={index === game.dealer_index}
                isCurrentPlayer={game.status === 'in_progress' && index === game.current_player_index}
              />
              {player.last_action && player.status !== 'folded' && (
                <div className="text-xs font-light opacity-60 mt-1">{player.last_action}</div>
              )}
              {player.status === 'folded' && (
                <div className="text-xs font-light opacity-40 mt-1">folded</div>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-2 mb-6">
          {game.community_cards && game.community_cards.length > 0 ? (
            <>
              {game.community_cards.map((card: Card, index: number) => (
                <PlayingCard key={index} card={card} size="small" />
              ))}
              {Array.from({ length: 5 - game.community_cards.length }).map((_, index) => (
                <PlayingCard key={`empty-${index}`} size="small" faceDown />
              ))}
            </>
          ) : (
            Array.from({ length: 5 }).map((_, index) => (
              <PlayingCard key={`empty-${index}`} size="small" faceDown />
            ))
          )}
        </div>

        <div className="text-right mb-6">
          <div className="text-4xl font-light">{game.pot}</div>
          <div className="text-sm font-light opacity-60">POT</div>
          {game.current_bet > 0 && (
            <div className="text-sm font-light opacity-60 mt-1">Bet: {game.current_bet}</div>
          )}
        </div>

        <div className="text-center mb-4">
          <div className="text-lg font-light opacity-80">Your chips: {currentPlayer.chips}</div>
          {currentPlayer.current_bet > 0 && (
            <div className="text-sm font-light opacity-60">Your bet: {currentPlayer.current_bet}</div>
          )}
        </div>

        <div className="mt-auto">
          <div className="flex justify-center gap-3 mb-6">
            {currentPlayer.hole_cards.length === 2 ? (
              <>
                <PlayingCard card={currentPlayer.hole_cards[0]} size="large" />
                <PlayingCard card={currentPlayer.hole_cards[1]} size="large" />
              </>
            ) : (
              <>
                <PlayingCard size="large" faceDown />
                <PlayingCard size="large" faceDown />
              </>
            )}
          </div>

          {isMyTurn && game.status === 'in_progress' && currentPlayer.status === 'active' ? (
            <>
              <div className="flex gap-3 mb-4">
                {canCheck ? (
                  <button
                    onClick={() => handleAction('check')}
                    disabled={isProcessing}
                    className="flex-1 py-4 bg-gray-700 text-white font-light rounded-lg text-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
                  >
                    Check
                  </button>
                ) : (
                  <button
                    onClick={() => handleAction('call', callAmount)}
                    disabled={isProcessing || callAmount === 0}
                    className="flex-1 py-4 bg-gray-700 text-white font-light rounded-lg text-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
                  >
                    Call {callAmount}
                  </button>
                )}
                <button
                  onClick={() => handleAction('raise', raiseAmount || minRaise)}
                  disabled={isProcessing || (raiseAmount === 0 && currentPlayer.chips < minRaise)}
                  className="flex-1 py-4 bg-gray-700 text-white font-light rounded-lg text-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  Bet {raiseAmount || minRaise}
                </button>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => setRaiseAmount(prev => Math.min(prev + minRaise, currentPlayer.chips))}
                    className="p-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    <ChevronUp size={20} />
                  </button>
                  <button
                    onClick={() => setRaiseAmount(prev => Math.max(0, prev - minRaise))}
                    className="p-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    <ChevronDown size={20} />
                  </button>
                </div>
              </div>

              <div className="flex gap-3 mb-4">
                <button
                  onClick={() => handleAction('fold')}
                  disabled={isProcessing}
                  className="flex-1 py-4 bg-gray-800 text-white font-light rounded-lg text-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Fold
                </button>
                <div className="flex-1 py-4 bg-gray-800 rounded-lg text-center">
                  <div className="text-xs font-light opacity-60">Win</div>
                  <div className="text-lg font-light text-yellow-400">{winProb.winProb}%</div>
                  <div className="text-xs font-light opacity-60 mt-1">{winProb.handName}</div>
                  <div className="text-sm font-light opacity-40">{winProb.handProb}%</div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-lg font-light opacity-60">
              {game.status === 'waiting'
                ? 'Waiting for game to start...'
                : currentPlayer.status === 'folded'
                ? 'You folded this hand'
                : currentPlayer.status === 'all-in'
                ? 'You are all-in'
                : `Waiting for ${players[game.current_player_index]?.name || 'other player'}...`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
