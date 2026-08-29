import { useState } from 'react';
import { IconAppWindow } from './icons';

interface IconProps {
  src?: string;
  alt: string;
  size?: number;
}

export function Icon({ src, alt, size = 20 }: IconProps) {
  const [hasError, setHasError] = useState(false);

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
