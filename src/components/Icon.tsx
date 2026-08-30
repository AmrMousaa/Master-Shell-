import { useState } from 'react';
import { IconAppWindow } from './icons';

interface IconProps {
  src?: string;
  alt: string;
  size?: number;
}

export function Icon({ src, alt, size = 20 }: IconProps) {
  const [hasError, setHasError] = useState(false);
  const [lastSrc, setLastSrc] = useState(src);

  // Re-arm the fallback whenever the URL itself changes, so a row that
  // previously failed on a broken URL retries once it's edited to a working one.
  if (src !== lastSrc) {
    setLastSrc(src);
    setHasError(false);
  }

  if (src && !hasError) {
    return (
      <img
        src={src}
        alt={alt}
        className="icon-img"
        style={{ width: size, height: size }}
        onError={() => setHasError(true)}
      />
    );
  }
  return <IconAppWindow width={size} height={size} strokeWidth={1.6} aria-label={alt} />;
}
