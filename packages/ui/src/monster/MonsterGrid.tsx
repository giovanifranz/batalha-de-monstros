import type { Monster } from '@arena/domain/monster';
import { Skeleton } from '../components/skeleton.tsx';
import { MonsterCard } from './MonsterCard.tsx';

type Props = {
  monsters: Monster[];
  skeletonCount?: number;
  selectedIds?: Partial<Record<'left' | 'right', string>>;
  onSelect?: (monster: Monster) => void;
  onEdit?: (monster: Monster) => void;
  onRemove?: (monster: Monster) => void;
};

export function MonsterGrid({
  monsters,
  skeletonCount = 0,
  selectedIds,
  onSelect,
  onEdit,
  onRemove,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {monsters.map((monster) => (
        <MonsterCard
          key={monster.id}
          monster={monster}
          selectedAs={
            selectedIds?.left === monster.id
              ? 'left'
              : selectedIds?.right === monster.id
                ? 'right'
                : undefined
          }
          onSelect={onSelect}
          onEdit={onEdit}
          onRemove={onRemove}
        />
      ))}
      {Array.from({ length: skeletonCount }, (_, index) => (
        <Skeleton key={`skeleton-${index}`} className="h-64 rounded-xl" />
      ))}
    </div>
  );
}
