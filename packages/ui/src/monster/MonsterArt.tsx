import type { ComponentProps, ReactNode } from 'react';
import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '../lib/utils.ts';

type Props = Omit<ComponentProps<'img'>, 'src' | 'onError'> & {
  src: string;
  iconClassName?: string;
  fallback?: ReactNode;
};

export function MonsterArt({ src, className, iconClassName, fallback, ...props }: Props) {
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null);

  if (brokenSrc === src) {
    if (fallback) return fallback;

    return (
      <span
        data-slot="art-fallback"
        aria-hidden="true"
        className={cn('text-muted-foreground flex items-center justify-center', className)}
      >
        <ImageOff className={iconClassName} />
      </span>
    );
  }

  return (
    <img
      src={src}
      onError={() => setBrokenSrc(src)}
      className={className}
      {...props}
      alt={props.alt ?? ''}
    />
  );
}
