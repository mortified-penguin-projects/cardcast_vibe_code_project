import { Card, HandRank } from '../types/game';
import { getRankValue, createDeck } from './deck';

export function evaluateHand(holeCards: Card[], communityCards: Card[]): HandRank {
  const allCards = [...holeCards, ...communityCards];

  if (allCards.length < 5) {
    const sorted = [...allCards].sort((a, b) => getRankValue(b.rank) - getRankValue(a.rank));
    return { rank: 0, name: 'Incomplete', cards: sorted, tiebreakers: sorted.map(c => getRankValue(c.rank)) };
  }

  const combinations = getCombinations(allCards, 5);
  let bestHand: HandRank = { rank: 0, name: 'High Card', cards: [], tiebreakers: [] };

  for (const combo of combinations) {
    const hand = evaluateFiveCards(combo);
    if (compareHandRanks(hand, bestHand) > 0) {
      bestHand = hand;
    }
  }
  return bestHand;
}

function getCombinations(cards: Card[], k: number): Card[][] {
  if (k === 0) return [[]];
  if (cards.length < k) return [];
  const [first, ...rest] = cards;
  return [
    ...getCombinations(rest, k - 1).map(combo => [first, ...combo]),
    ...getCombinations(rest, k)
  ];
}

function evaluateFiveCards(cards: Card[]): HandRank {
  const sortedCards = [...cards].sort((a, b) => getRankValue(b.rank) - getRankValue(a.rank));
  const values = sortedCards.map(c => getRankValue(c.rank));

  const isFlush = cards.every(card => card.suit === cards[0].suit);
  const straightResult = checkStraight(values);
  const rankCounts = countRanks(sortedCards);

  const groups = Object.entries(rankCounts)
    .map(([rank, count]) => ({ rank: parseInt(rank), count }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);

  const counts = groups.map(g => g.count);
  const tiebreakers = groups.flatMap(g => Array(g.count).fill(g.rank));

  if (isFlush && straightResult.isStraight) {
    const highVal = straightResult.isWheel ? 5 : values[0];
    if (highVal === 14) return { rank: 10, name: 'Royal Flush', cards: sortedCards, tiebreakers: [14] };
    return { rank: 9, name: 'Straight Flush', cards: sortedCards, tiebreakers: [highVal] };
  }
  if (counts[0] === 4) return { rank: 8, name: 'Four of a Kind', cards: sortedCards, tiebreakers };
  if (counts[0] === 3 && counts[1] === 2) return { rank: 7, name: 'Full House', cards: sortedCards, tiebreakers };
  if (isFlush) return { rank: 6, name: 'Flush', cards: sortedCards, tiebreakers: values };
  if (straightResult.isStraight) {
    const highVal = straightResult.isWheel ? 5 : values[0];
    return { rank: 5, name: 'Straight', cards: sortedCards, tiebreakers: [highVal] };
  }
  if (counts[0] === 3) return { rank: 4, name: 'Three of a Kind', cards: sortedCards, tiebreakers };
  if (counts[0] === 2 && counts[1] === 2) return { rank: 3, name: 'Two Pair', cards: sortedCards, tiebreakers };
  if (counts[0] === 2) return { rank: 2, name: 'Pair', cards: sortedCards, tiebreakers };
  return { rank: 1, name: 'High Card', cards: sortedCards, tiebreakers: values };
}

function checkStraight(sortedValues: number[]): { isStraight: boolean; isWheel: boolean } {
  let normal = true;
  for (let i = 0; i < sortedValues.length - 1; i++) {
    if (sortedValues[i] - sortedValues[i + 1] !== 1) { normal = false; break; }
  }
  if (normal) return { isStraight: true, isWheel: false };

  // Wheel: A-2-3-4-5 sorted desc = [14,5,4,3,2]
  const isWheel =
    sortedValues[0] === 14 && sortedValues[1] === 5 &&
    sortedValues[2] === 4 && sortedValues[3] === 3 && sortedValues[4] === 2;
  return { isStraight: isWheel, isWheel };
}

function countRanks(cards: Card[]): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const card of cards) {
    const v = getRankValue(card.rank);
    counts[v] = (counts[v] || 0) + 1;
  }
  return counts;
}

function compareHandRanks(a: HandRank, b: HandRank): number {
  if (a.rank !== b.rank) return a.rank - b.rank;
  for (let i = 0; i < Math.max(a.tiebreakers.length, b.tiebreakers.length); i++) {
    const diff = (a.tiebreakers[i] ?? 0) - (b.tiebreakers[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function compareHands(hand1: HandRank, hand2: HandRank): number {
  return compareHandRanks(hand1, hand2);
}

export function calculateWinProbability(
  holeCards: Card[],
  communityCards: Card[]
): { winProb: number; handProb: number; handName: string } {
  const currentHand = evaluateHand(holeCards, communityCards);

  const handProbabilities: Record<string, number> = {
    'High Card': 50.1, 'Pair': 42.3, 'Two Pair': 4.75,
    'Three of a Kind': 2.11, 'Straight': 0.39, 'Flush': 0.20,
    'Full House': 0.14, 'Four of a Kind': 0.024,
    'Straight Flush': 0.0014, 'Royal Flush': 0.0001, 'Incomplete': 0
  };

  if (communityCards.length === 0) {
    return { winProb: 50, handProb: 0, handName: currentHand.name };
  }

  // Monte Carlo: simulate ~300 runouts vs one random opponent
  const usedSet = new Set([...holeCards, ...communityCards].map(c => `${c.rank}-${c.suit}`));
  const remainingDeck = createDeck().filter(c => !usedSet.has(`${c.rank}-${c.suit}`));

  const cardsNeeded = 5 - communityCards.length;
  const SIMS = 300;
  let wins = 0;

  for (let i = 0; i < SIMS; i++) {
    const shuffled = [...remainingDeck].sort(() => Math.random() - 0.5);
    const board = [...communityCards, ...shuffled.slice(0, cardsNeeded)];
    const oppHole = shuffled.slice(cardsNeeded, cardsNeeded + 2);
    const myHand = evaluateHand(holeCards, board);
    const oppHand = evaluateHand(oppHole, board);
    if (compareHandRanks(myHand, oppHand) >= 0) wins++;
  }

  return {
    winProb: Math.round((wins / SIMS) * 100),
    handProb: handProbabilities[currentHand.name] ?? 0,
    handName: currentHand.name
  };
}
