import { useTheme } from 'next-themes';
import { Toaster as Sonner, type ToasterProps } from 'sonner';
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from 'lucide-react';

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      /*
       * `pointer-events-none`: o toast é `fixed` e intercepta o clique no botão
       * embaixo dele por ~4 s — nenhuma disposição de layout resolve, porque abaixo
       * de 600px ele ocupa a largura toda.
       *
       * O custo é perder o arrastar-para-dispensar e o pausar-no-hover (ver a
       * duração dos toasts longos em `apps/web/src/lib/storage-error.ts`).
       */
      toastOptions={{
        classNames: {
          toast: 'cn-toast pointer-events-none',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
