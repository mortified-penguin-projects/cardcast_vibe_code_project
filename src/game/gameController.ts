import { Game, Player, Card, BettingRound } from '../types/game';
import { createDeck, shuffleDeck, dealCards } from './deck';
import { evaluateHand, compareHands } from './handEvaluator';

export function generateGameCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function startNewHand(game: Game, players: Player[]): { game: Game; players: Player[]; deck: Card[] } {
  const activePlayers = players.filter(p => p.status !== 'out' && p.chips > 0);

  if (activePlayers.length < 2) {
    return { game, players, deck: [] };
  }

  const deck = shuffleDeck(createDeck());
  let remainingDeck = deck;

  const updatedPlayers = players.map(player => {
    if (player.status === 'out' || player.chips <= 0) {
      return { ...player, status: 'out' as const, hole_cards: [] };
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

  const newDealerIndex = (game.dealer_index + 1) % activePlayers.length;
  const smallBlindIndex = (newDealerIndex + 1) % activePlayers.length;
  const bigBlindIndex = (newDealerIndex + 2) % activePlayers.length;

  const smallBlindPlayer = activePlayers[smallBlindIndex];
  const bigBlindPlayer = activePlayers[bigBlindIndex];

  updatedPlayers.forEach(player => {
    if (player.id === smallBlindPlayer.id) {
      player.current_bet = Math.min(game.small_blind, player.chips);
      player.chips -= player.current_bet;
    } else if (player.id === bigBlindPlayer.id) {
      player.current_bet = Math.min(game.big_blind, player.chips);
      player.chips -= player.current_bet;
    }
  });

  const updatedGame: Game = {
    ...game,
    status: 'in_progress',
    dealer_index: newDealerIndex,
    current_player_index: (bigBlindIndex + 1) % activePlayers.length,
    pot: smallBlindPlayer.current_bet + bigBlindPlayer.current_bet,
    current_bet: game.big_blind,
    betting_round: 'pre-flop',
    community_cards: [],
    updated_at: new Date().toISOString()
  };

  return { game: updatedGame, players: updatedPlayers, deck: remainingDeck };
}

export function advanceBettingRound(game: Game, deck: Card[]): { game: Game; deck: Card[] } {
  let remainingDeck = deck;
  let communityCards = [...game.community_cards];

  const roundOrder: BettingRound[] = ['pre-flop', 'flop', 'turn', 'river'];
  const currentIndex = roundOrder.indexOf(game.betting_round);

  if (currentIndex >= roundOrder.length - 1) {
    return { game, deck };
  }

  const nextRound = roundOrder[currentIndex + 1];

  if (nextRound === 'flop') {
    const { dealt, remaining } = dealCards(remainingDeck, 3);
    communityCards = dealt;
    remainingDeck = remaining;
  } else if (nextRound === 'turn' || nextRound === 'river') {
    const { dealt, remaining } = dealCards(remainingDeck, 1);
    communityCards = [...communityCards, ...dealt];
    remainingDeck = remaining;
  }

  return {
    game: {
      ...game,
      betting_round: nextRound,
      community_cards: communityCards,
      current_bet: 0,
      updated_at: new Date().toISOString()
    },
    deck: remainingDeck
  };
}

export function determineWinners(game: Game, players: Player[]): { winners: Player[]; handRanks: Map<string, string> } {
  const activePlayers = players.filter(p => p.status !== 'folded' && p.status !== 'out');

  if (activePlayers.length === 0) {
    return { winners: [], handRanks: new Map() };
  }

  if (activePlayers.length === 1) {
    return { winners: activePlayers, handRanks: new Map() };
  }

  const handRanks = new Map<string, string>();
  const evaluations = activePlayers.map(player => {
    const hand = evaluateHand(player.hole_cards, game.community_cards);
    handRanks.set(player.id, hand.name);
    return { player, hand };
  });

  evaluations.sort((a, b) => compareHands(b.hand, a.hand));

  const bestHand = evaluations[0].hand;
  const winners = evaluations
    .filter(e => compareHands(e.hand, bestHand) === 0)
    .map(e => e.player);

  return { winners, handRanks };
}

export function distributePot(game: Game, winners: Player[], allPlayers: Player[]): Player[] {
  const winAmount = Math.floor(game.pot / winners.length);

  return allPlayers.map(player => {
    if (winners.some(w => w.id === player.id)) {
      return { ...player, chips: player.chips + winAmount };
    }
    return player;
  });
}

export function getNextActivePlayer(currentIndex: number, players: Player[]): number {
  const activePlayers = players.filter(p => p.status === 'active');

  if (activePlayers.length === 0) {
    return currentIndex;
  }

  let nextIndex = (currentIndex + 1) % players.length;
  let attempts = 0;

  while (players[nextIndex].status !== 'active' && attempts < players.length) {
    nextIndex = (nextIndex + 1) % players.length;
    attempts++;
  }

  return nextIndex;
}

export function isBettingRoundComplete(players: Player[], currentBet: number): boolean {
  const activePlayers = players.filter(p => p.status === 'active');

  if (activePlayers.length <= 1) {
    return true;
  }

  return activePlayers.every(p => p.current_bet === currentBet || p.status === 'all-in');
}
