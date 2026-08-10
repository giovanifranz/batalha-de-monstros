import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { BoldIcon, ItalicIcon, UnderlineIcon } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from './toggle-group.tsx';

const meta = {
  component: ToggleGroup,
  tags: ['ai-generated'],
} satisfies Meta<typeof ToggleGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = {
  args: { type: 'single' },
  render: () => (
    <ToggleGroup type="single" defaultValue="bold" aria-label="Formatação de texto">
      <ToggleGroupItem value="bold" aria-label="Negrito">
        <BoldIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="italic" aria-label="Itálico">
        <ItalicIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="underline" aria-label="Sublinhado">
        <UnderlineIcon />
      </ToggleGroupItem>
    </ToggleGroup>
  ),
  play: async ({ canvas, userEvent }) => {
    const italic = canvas.getByRole('radio', { name: 'Itálico' });
    await expect(italic).toHaveAttribute('aria-checked', 'false');

    await userEvent.click(italic);

    await expect(italic).toHaveAttribute('aria-checked', 'true');
    await expect(canvas.getByRole('radio', { name: 'Negrito' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  },
};

export const Multiple: Story = {
  args: { type: 'multiple' },
  render: () => (
    <ToggleGroup type="multiple" aria-label="Formatação de texto">
      <ToggleGroupItem value="bold" aria-label="Negrito">
        <BoldIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="italic" aria-label="Itálico">
        <ItalicIcon />
      </ToggleGroupItem>
    </ToggleGroup>
  ),
};

export const Outline: Story = {
  args: { type: 'single' },
  render: () => (
    <ToggleGroup
      type="single"
      variant="outline"
      defaultValue="bold"
      aria-label="Formatação de texto"
    >
      <ToggleGroupItem value="bold" aria-label="Negrito">
        <BoldIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="italic" aria-label="Itálico">
        <ItalicIcon />
      </ToggleGroupItem>
    </ToggleGroup>
  ),
};
