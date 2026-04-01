import { Game, Player, Card, BettingRound } from '../types/game';
import { createDeck, shuffleDeck, dealCards } from './deck';
import { evaluateHand, compareHands } from './handEvaluator';

export function generateGameCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

/**
 * Find the next active player index starting AFTER startIndex.
 * Wraps around the full players array.
 */
export function getNextActivePlayerIndex(startIndex: number, players: Player[]): number {
  const n = players.length;
  for (let i = 1; i <= n; i++) {
    const idx = (startIndex + i) % n;
    if (players[idx].status === 'active') return idx;
  }
  return startIndex; // fallback: no active players
}

/**
 * Returns true when all active players have matched the current bet
 * (or are all-in), meaning the betting round is over.
 */
export function isBettingRoundComplete(players: Player[], currentBet: number): boolean {
  const notFoldedPlayers = players.filter(p => p.status !== 'folded' && p.status !== 'out');
  if (notFoldedPlayers.length <= 1) return true;
  return notFoldedPlayers.every(p => p.current_bet === currentBet || p.status === 'all-in');
}

export function startNewHand(
  game: Game,
  players: Player[]
): { game: Game; players: Player[]; deck: Card[] } {
  // Only players who still have chips can play
  const eligiblePlayers = players.filter(p => p.chips > 0);
  if (eligiblePlayers.length < 2) return { game, players, deck: [] };

  // --- Deal cards ---
  const deck = shuffleDeck(createDeck());
  let remainingDeck = deck;

  // Reset all players, deal hole cards only to eligible ones
  let updatedPlayers: Player[] = players.map(player => {
    if (player.chips <= 0) {
      return { ...player, status: 'out' as const, hole_cards: [], current_bet: 0, last_action: undefined };
    }
    const { dealt, remaining } = dealCards(remainingDeck, 2);
    remainingDeck = remaining;
    return {
      ...player,
      hole_cards: dealt,
      current_bet: 0,
      status: 'active' as const,
      last_action: undefined
    };
  });

  // --- Blinds: calculated within eligible players only ---
  // Advance dealer among eligible players
  const newDealerIndex = (() => {
    // Find next eligible player after current dealer (index into full players array)
    for (let i = 1; i <= players.length; i++) {
      const idx = (game.dealer_index + i) % players.length;
      if (updatedPlayers[idx].status === 'active') return idx;
    }
    return game.dealer_index;
  })();

  const smallBlindIndex = getNextActivePlayerIndex(newDealerIndex, updatedPlayers);
  const bigBlindIndex = getNextActivePlayerIndex(smallBlindIndex, updatedPlayers);
  const firstToActIndex = getNextActivePlayerIndex(bigBlindIndex, updatedPlayers);

  // Post blinds immutably
  updatedPlayers = updatedPlayers.map((player, idx) => {
    if (idx === smallBlindIndex) {
      const bet = Math.min(game.small_blind, player.chips);
      return { ...player, chips: player.chips - bet, current_bet: bet, status: bet === player.chips ? 'all-in' as const : 'active' as const };
    }
    if (idx === bigBlindIndex) {
      const bet = Math.min(game.big_blind, player.chips);
      return { ...player, chips: player.chips - bet, current_bet: bet, status: bet === player.chips ? 'all-in' as const : 'active' as const };
    }
    return player;
  });

  const sbAmount = updatedPlayers[smallBlindIndex].current_bet;
  const bbAmount = updatedPlayers[bigBlindIndex].current_bet;

  const updatedGame: Game = {
    ...game,
    status: 'in_progress',
    dealer_index: newDealerIndex,
    current_player_index: firstToActIndex,
    pot: sbAmount + bbAmount,
    current_bet: game.big_blind,
    betting_round: 'pre-flop',
    community_cards: [],
    updated_at: new Date().toISOString()
  };

  return { game: updatedGame, players: updatedPlayers, deck: remainingDeck };
}

export function advanceBettingRound(
  game: Game,
  deck: Card[],
  players: Player[]
): { game: Game; deck: Card[] } {
  let remainingDeck = deck;
  let communityCards = [...game.community_cards];

  const roundOrder: BettingRound[] = ['pre-flop', 'flop', 'turn', 'river'];
  const currentIndex = roundOrder.indexOf(game.betting_round);
  if (currentIndex >= roundOrder.length - 1) return { game, deck };

  const nextRound = roundOrder[currentIndex + 1];

  if (nextRound === 'flop') {
    const { dealt, remaining } = dealCards(remainingDeck, 3);
    communityCards = dealt;
    remainingDeck = remaining;
  } else {
    const { dealt, remaining } = dealCards(remainingDeck, 1);
    communityCards = [...communityCards, ...dealt];
    remainingDeck = remaining;
  }

  // After flop/turn/river, action starts from first active player left of dealer
  const firstToAct = getNextActivePlayerIndex(game.dealer_index, players);

  return {
    game: {
      ...game,
      betting_round: nextRound,
      community_cards: communityCards,
      current_bet: 0,
      current_player_index: firstToAct,
      updated_at: new Date().toISOString()
    },
    deck: remainingDeck
  };
}

export function determineWinners(
  game: Game,
  players: Player[]
): { winners: Player[]; handRanks: Map<string, string> } {
  const activePlayers = players.filter(p => p.status !== 'folded' && p.status !== 'out');

  if (activePlayers.length === 0) return { winners: [], handRanks: new Map() };
  if (activePlayers.length === 1) return { winners: activePlayers, handRanks: new Map([[activePlayers[0].id, 'Last player standing']]) };

  const handRanks = new Map<string, string>();
  const evaluations = activePlayers.map(player => {
    const hand = evaluateHand(player.hole_cards, game.community_cards);
    handRanks.set(player.id, hand.name);
    return { player, hand };
  });

  evaluations.sort((a, b) => compareHands(b.hand, a.hand));
  const best = evaluations[0].hand;
  const winners = evaluations
    .filter(e => compareHands(e.hand, best) === 0)
    .map(e => e.player);

  return { winners, handRanks };
}

export function distributePot(game: Game, winners: Player[], allPlayers: Player[]): Player[] {
  if (winners.length === 0) return allPlayers;
  const winAmount = Math.floor(game.pot / winners.length);
  const remainder = game.pot - winAmount * winners.length;

  return allPlayers.map((player, idx) => {
    const isWinner = winners.some(w => w.id === player.id);
    if (!isWinner) return player;
    // Give remainder chips to first winner (standard poker practice)
    const bonus = idx === 0 ? remainder : 0;
    return { ...player, chips: player.chips + winAmount + bonus };
  });
}
