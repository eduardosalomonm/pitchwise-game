import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { openOnPlainClick } from '@/lib/link-navigation';

export function CompetitionBack({ onBack }: { onBack: () => void }) {
  return <Link prefetch={false} className="competition-back" href="/#tournaments" onClick={(event) => openOnPlainClick(event, onBack)}><ArrowLeft aria-hidden="true" /> Competitions</Link>;
}
