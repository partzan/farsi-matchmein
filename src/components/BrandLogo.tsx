import { Link } from 'react-router-dom';
import { fa } from '../locale/fa';

type BrandLogoProps = {
  to?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
};

const sizes = {
  sm: 'h-7 sm:h-8',
  md: 'h-8 sm:h-9',
  lg: 'h-10 sm:h-11',
};

export function BrandLogo({
  to = '/',
  className = '',
  size = 'md',
}: BrandLogoProps) {
  const content = (
    <img
      src="/images/hievent-logo.png"
      alt={fa.brandEn}
      className={`${sizes[size]} w-auto object-contain ${className}`}
    />
  );

  if (!to) return content;
  return (
    <Link to={to} className="inline-flex items-center shrink-0" aria-label={`${fa.brand} ${fa.brandEn}`}>
      {content}
    </Link>
  );
}
