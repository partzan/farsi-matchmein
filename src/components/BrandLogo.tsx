import { Link } from 'react-router-dom';
import { fa } from '../locale/fa';

type BrandLogoProps = {
  to?: string;
  className?: string;
  /** Show Persian brand name beside the Hi Ev mark */
  showWordmark?: boolean;
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
  showWordmark = true,
  size = 'md',
}: BrandLogoProps) {
  const content = (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <img
        src="/images/hievent-logo.png"
        alt={fa.brandEn}
        className={`${sizes[size]} w-auto object-contain`}
      />
      {showWordmark && (
        <span className="font-extrabold tracking-tight text-white text-base sm:text-lg leading-none border-s border-white/20 ps-2.5">
          {fa.brand}
        </span>
      )}
    </span>
  );

  if (!to) return content;
  return (
    <Link to={to} className="inline-flex items-center shrink-0" aria-label={`${fa.brand} ${fa.brandEn}`}>
      {content}
    </Link>
  );
}
