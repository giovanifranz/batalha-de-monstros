import { ImageOff } from 'lucide-react';
import { cn } from '../lib/utils.ts';
import { MonsterArt } from './MonsterArt.tsx';

type Props = {
  src: string;
  alt: string;
  className?: string;
};

/**
 * Prévia de imagem para o formulário. Sem `data-pixel`: `src` é entrada livre e
 * `image-rendering: pixelated` destruiria uma foto.
 *
 * A detecção de "esta url falhou" mora no `MonsterArt`, não aqui. Desta tela são
 * o estado "sem imagem" e a legenda ANUNCIADA no lugar do ícone decorativo.
 */
export function ImagePreview({ src, alt, className }: Props) {
  if (!src) {
    return <span className={cn('text-muted-foreground text-xs', className)}>sem imagem</span>;
  }

  return (
    <MonsterArt
      src={src}
      alt={alt}
      className={cn('max-h-32 object-contain', className)}
      fallback={
        <span
          data-slot="art-fallback"
          className={cn(
            'text-muted-foreground flex flex-col items-center gap-1 text-center text-xs',
            className,
          )}
        >
          <ImageOff className="size-5" aria-hidden />
          Não foi possível carregar a imagem
        </span>
      }
    />
  );
}
