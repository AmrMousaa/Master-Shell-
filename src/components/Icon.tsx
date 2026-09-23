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
      <span
        role="img"
        aria-label={alt}
        className="icon-img icon-img-mono"
        style={{
          width: size,
          height: size,
          maskImage: `url(${src})`,
          WebkitMaskImage: `url(${src})`,
        }}
      >
        {/* Hidden probe: reuses the browser's own request so a broken URL still falls back. */}
        <img src={src} alt="" aria-hidden="true" style={{ display: 'none' }} onError={() => setHasError(true)} />
      </span>
    );
  }
  return <IconAppWindow width={size} height={size} strokeWidth={1.6} aria-label={alt} />;
}
