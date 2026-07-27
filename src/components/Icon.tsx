import { IconAppWindow } from './icons';

interface IconProps {
  src?: string;
  alt: string;
  size?: number;
}

export function Icon({ src, alt, size = 28 }: IconProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className="icon-img"
        style={{ width: size, height: size }}
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
    );
  }
  return (
    <div className="icon-fallback" style={{ width: size, height: size }}>
      <IconAppWindow width={size * 0.55} height={size * 0.55} strokeWidth={1.6} />
    </div>
  );
}
