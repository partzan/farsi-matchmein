import { type CSSProperties, type ReactNode } from 'react';

type FlipCardStyle = {
  front?: CSSProperties;
  back?: CSSProperties;
  wrapper?: CSSProperties;
};

type FlipCardProps = {
  flipped?: boolean;
  onClick?: () => void;
  onMouseOut?: () => void;
  onMouseOver?: () => void;
  frontChild: ReactNode;
  backChild: ReactNode;
  width?: number | string;
  height?: number | string;
  style?: FlipCardStyle;
  className?: string;
};

function toDimension(value?: number | string): string | undefined {
  if (value === undefined) return undefined;
  return typeof value === 'number' ? `${value}px` : value;
}

export function FlipCard({
  flipped = false,
  onClick,
  onMouseOut,
  onMouseOver,
  frontChild,
  backChild,
  width,
  height,
  style = {},
  className = '',
}: FlipCardProps) {
  const dimensionStyle: CSSProperties = {
    width: toDimension(width),
    height: toDimension(height),
  };

  return (
    <div
      className={`flip-card-scene ${className}`}
      style={{ ...dimensionStyle, ...style.wrapper }}
      onClick={onClick}
      onMouseOut={onMouseOut}
      onMouseOver={onMouseOver}
    >
      <div className={`flip-card-inner ${flipped ? 'flip-card-inner--flipped' : ''}`} style={dimensionStyle}>
        <div className="flip-card-face flip-card-front" style={{ ...dimensionStyle, ...style.front }}>
          {frontChild}
        </div>
        <div className="flip-card-face flip-card-back" style={{ ...dimensionStyle, ...style.back }}>
          {backChild}
        </div>
      </div>
    </div>
  );
}
