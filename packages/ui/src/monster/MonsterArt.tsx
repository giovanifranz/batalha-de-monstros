import type { ComponentProps, ReactNode } from 'react';
import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '../lib/utils.ts';

type Props = Omit<ComponentProps<'img'>, 'src' | 'onError'> & {
  src: string;
  /** Só o TAMANHO do ícone de fallback; a caixa vem de `className`. */
  iconClassName?: string;
  /**
   * Substitui o fallback padrão inteiro — o `ImagePreview` precisa de uma legenda
   * ANUNCIADA em vez do ícone decorativo. O estado de "qual url falhou" continua
   * morando só aqui.
   */
  fallback?: ReactNode;
};

/**
 * A arte de um monstro, tolerante a `image_url` quebrada — o campo é texto livre.
 *
 * O placeholder é SVG INLINE, nunca um arquivo: `packages/ui` não pode depender
 * de `apps/web/public`, e o Storybook serve outra raiz.
 *
 * O estado guarda QUAL url falhou, não um booleano: trocar a URL já dá à imagem
 * nova a chance de carregar, sem effect e sem `key`.
 */
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
