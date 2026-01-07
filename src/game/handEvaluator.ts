import { Card, HandRank } from '../types/game';
import { getRankValue } from './deck';

export function evaluateHand(holeCards: Card[], communityCards: Card[]): HandRank {
  const allCards = [...holeCards, ...communityCards];
  const combinations = getCombinations(allCards, 5);

  let bestHand: HandRank = {
    rank: 0,
    name: 'High Card',
    cards: []
  };

  for (const combo of combinations) {
    const hand = evaluateFiveCards(combo);
    if (hand.rank > bestHand.rank) {
      bestHand = hand;
    }
  }

  return bestHand;
}

function getCombinations(cards: Card[], k: number): Card[][] {
  if (k === 0) return [[]];
  if (cards.length === 0) return [];

  const [first, ...rest] = cards;
  const withFirst = getCombinations(rest, k - 1).map(combo => [first, ...combo]);
  const withoutFirst = getCombinations(rest, k);

  return [...withFirst, ...withoutFirst];
}

function evaluateFiveCards(cards: Card[]): HandRank {
  const sortedCards = [...cards].sort((a, b) => getRankValue(b.rank) - getRankValue(a.rank));

  const isFlush = cards.every(card => card.suit === cards[0].suit);
  const isStraight = checkStraight(sortedCards);
  const rankCounts = countRanks(sortedCards);
  const counts = Object.values(rankCounts).sort((a, b) => b - a);

  if (isFlush && isStraight) {
    const highCard = getRankValue(sortedCards[0].rank);
    if (highCard === 14) {
      return { rank: 10, name: 'Royal Flush', cards: sortedCards };
    }
    return { rank: 9, name: 'Straight Flush', cards: sortedCards };
  }

  if (counts[0] === 4) {
    return { rank: 8, name: 'Four of a Kind', cards: sortedCards };
  }

  if (counts[0] === 3 && counts[1] === 2) {
    return { rank: 7, name: 'Full House', cards: sortedCards };
  }

  if (isFlush) {
    return { rank: 6, name: 'Flush', cards: sortedCards };
  }

  if (isStraight) {
    return { rank: 5, name: 'Straight', cards: sortedCards };
  }

  if (counts[0] === 3) {
    return { rank: 4, name: 'Three of a Kind', cards: sortedCards };
  }

  if (counts[0] === 2 && counts[1] === 2) {
    return { rank: 3, name: 'Two Pair', cards: sortedCards };
  }

  if (counts[0] === 2) {
    return { rank: 2, name: 'Pair', cards: sortedCards };
  }

  return { rank: 1, name: 'High Card', cards: sortedCards };
}

function checkStraight(sortedCards: Card[]): boolean {
  const values = sortedCards.map(card => getRankValue(card.rank));

  for (let i = 0; i < values.length - 1; i++) {
    if (values[i] - values[i + 1] !== 1) {
      if (values[0] === 14 && values[1] === 5 && values[4] === 2) {
        return true;
      }
      return false;
    }
  }

  return true;
}

function countRanks(cards: Card[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const card of cards) {
    counts[card.rank] = (counts[card.rank] || 0) + 1;
  }
  return counts;
}

export function compareHands(hand1: HandRank, hand2: HandRank): number {
  if (hand1.rank !== hand2.rank) {
    return hand1.rank - hand2.rank;
  }

  for (let i = 0; i < hand1.cards.length; i++) {
    const val1 = getRankValue(hand1.cards[i].rank);
    const val2 = getRankValue(hand2.cards[i].rank);
    if (val1 !== val2) {
      return val1 - val2;
    }
  }

  return 0;
}

export function calculateWinProbability(holeCards: Card[], communityCards: Card[]): { winProb: number; handProb: number; handName: string } {
  const currentHand = evaluateHand(holeCards, communityCards);

  const handProbabilities: Record<string, number> = {
    'High Card': 50.1,
    'Pair': 42.3,
    'Two Pair': 4.75,
    'Three of a Kind': 2.11,
    'Straight': 0.39,
    'Flush': 0.20,
    'Full House': 0.14,
    'Four of a Kind': 0.024,
    'Straight Flush': 0.0014,
    'Royal Flush': 0.0001
  };

  const winProbabilities: Record<string, number> = {
    'High Card': 15,
    'Pair': 35,
    'Two Pair': 55,
    'Three of a Kind': 70,
    'Straight': 80,
    'Flush': 85,
    'Full House': 90,
    'Four of a Kind': 95,
    'Straight Flush': 98,
    'Royal Flush': 99
  };

  return {
    winProb: winProbabilities[currentHand.name] || 50,
    handProb: handProbabilities[currentHand.name] || 50,
    handName: currentHand.name
  };
}
