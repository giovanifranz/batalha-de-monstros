import type { Meta, StoryObj } from '@storybook/react-vite';
import { Skeleton } from './skeleton.tsx';

const meta = {
  component: Skeleton,
  tags: ['ai-generated'],
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Skeleton className="h-4 w-48" />,
};

export const LoadingCard: Story = {
  render: () => (
    <div className="flex w-72 flex-col gap-3 rounded-xl bg-card p-4">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  ),
};
