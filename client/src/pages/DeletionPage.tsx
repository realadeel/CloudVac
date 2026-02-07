import { DeletionQueue } from '../components/deletion/DeletionQueue';

export function DeletionPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Deletion Queue</h1>
      <DeletionQueue />
    </div>
  );
}
