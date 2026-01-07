import { Card } from '../types/game';

interface PlayingCardProps {
  card?: Card;
  size?: 'small' | 'medium' | 'large';
  faceDown?: boolean;
}

export function PlayingCard({ card, size = 'medium', faceDown = false }: PlayingCardProps) {
  const sizes = {
    small: { width: 60, height: 84, fontSize: 20 },
    medium: { width: 80, height: 112, fontSize: 28 },
    large: { width: 100, height: 140, fontSize: 32 }
  };

  const { width, height, fontSize } = sizes[size];

  if (faceDown) {
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="playing-card">
        <rect
          x="0"
          y="0"
          width={width}
          height={height}
          rx="8"
          fill="#333"
          stroke="#555"
          strokeWidth="1"
        />
        <pattern id="stripes" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
          <line x1="0" y="0" x2="0" y2="8" stroke="#444" strokeWidth="4" />
        </pattern>
        <rect x="4" y="4" width={width - 8} height={height - 8} rx="6" fill="url(#stripes)" />
      </svg>
    );
  }

  if (!card) {
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="playing-card">
        <rect
          x="0"
          y="0"
          width={width}
          height={height}
          rx="8"
          fill="#1a1a1a"
          stroke="#333"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
      </svg>
    );
  }

  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const color = isRed ? '#ef4444' : '#1f2937';

  const suitSymbols = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠'
  };

  const displayRank = card.rank === '10' ? '10' : card.rank;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="playing-card">
      <rect
        x="0"
        y="0"
        width={width}
        height={height}
        rx="8"
        fill="#d1d5db"
        stroke="#fff"
        strokeWidth="1"
      />
      <text
        x={width * 0.15}
        y={height * 0.22}
        fontSize={fontSize}
        fontFamily="Helvetica Neue, Helvetica, Arial, sans-serif"
        fontWeight="300"
        fill={color}
        textAnchor="middle"
      >
        {displayRank}
      </text>
      <text
        x={width * 0.15}
        y={height * 0.42}
        fontSize={fontSize * 0.8}
        fontFamily="Arial, sans-serif"
        fill={color}
        textAnchor="middle"
      >
        {suitSymbols[card.suit]}
      </text>
      <text
        x={width * 0.5}
        y={height * 0.6}
        fontSize={fontSize * 1.4}
        fontFamily="Arial, sans-serif"
        fill={color}
        textAnchor="middle"
      >
        {suitSymbols[card.suit]}
      </text>
    </svg>
  );
}
