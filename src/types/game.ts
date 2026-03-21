export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export type BettingRound = 'pre-flop' | 'flop' | 'turn' | 'river';
export type PlayerStatus = 'active' | 'folded' | 'all-in' | 'out';
export type GameStatus = 'waiting' | 'in_progress' | 'completed';
export type ActionType = 'fold' | 'check' | 'call' | 'raise' | 'all-in';

export interface Player {
  id: string;
  game_id: string;
  name: string;
  chips: number;
  position: number;
  hole_cards: Card[];
  current_bet: number;
  status: PlayerStatus;
  is_host: boolean;
  last_action?: string;
  created_at: string;
}

export interface Game {
  id: string;
  game_code: string;
  host_name: string;
  status: GameStatus;
  current_player_index: number;
  pot: number;
  small_blind: number;
  big_blind: number;
  community_cards: Card[];
  current_bet: number;
  betting_round: BettingRound;
  dealer_index: number;
  deck_state: Card[];
  created_at: string;
  updated_at: string;
}

export interface GameAction {
  id: string;
  game_id: string;
  player_id: string;
  action_type: ActionType;
  amount: number;
  betting_round: BettingRound;
  created_at: string;
}

export interface HandRank {
  rank: number;
  name: string;
  cards: Card[];
  tiebreakers: number[];
}
