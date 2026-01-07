import { Player } from '../types/game';

interface PlayerAvatarProps {
  player: Player;
  isDealer?: boolean;
  isCurrentPlayer?: boolean;
}

export function PlayerAvatar({ player, isDealer, isCurrentPlayer }: PlayerAvatarProps) {
  const colors = ['#6b7280', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#06b6d4'];
  const color = colors[player.position % colors.length];

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        <svg width="48" height="48" viewBox="0 0 48 48">
          <circle
            cx="24"
            cy="24"
            r="23"
            fill={color}
            stroke={isCurrentPlayer ? '#fff' : 'transparent'}
            strokeWidth="2"
          />
          <circle cx="24" cy="18" r="8" fill="#1f2937" />
          <path
            d="M 24 26 Q 14 26 12 38 L 36 38 Q 34 26 24 26"
            fill="#1f2937"
          />
        </svg>
        {isDealer && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center text-xs font-light text-black">
            D
          </div>
        )}
      </div>
      <div className="text-white text-xs font-light opacity-60">{player.name}</div>
      <div className="text-white text-sm font-light">{player.chips}</div>
    </div>
  );
}
