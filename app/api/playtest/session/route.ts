import {
  createPlaytestSession,
  deletePlaytestSession,
} from '@/lib/playtest-server';
export const dynamic = 'force-dynamic';
export const POST = createPlaytestSession;
export const DELETE = deletePlaytestSession;
