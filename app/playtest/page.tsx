import type { Metadata } from 'next';
import Link from 'next/link';
// Sites auth must be a top-level navigation, never a prefetched Next Link.
/* oxlint-disable next/no-html-link-for-pages */
import { ownerAccess } from '@/lib/playtest-server';
import { chatGPTSignInPath } from '@/app/chatgpt-auth';
import { PlaytestReport } from './report';
import { VisitorReport } from './visitor-report';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Private playtest report | Pitchwise',
  robots: { index: false, follow: false },
  alternates: { canonical: '/playtest' },
};
async function OwnerReport() {
  const access = await ownerAccess();
  if (access === 'signed-out')
    return (
      <>
        <h1>Private playtest report</h1>
        <p>
          Only the creator can access player sessions. Players never need to
          sign in.
        </p>
        <a className="playtest-signin" href={chatGPTSignInPath()} target="_top">
          Sign in with ChatGPT
        </a>
      </>
    );
  if (access !== 'owner')
    return (
      <>
        <h1>This report is private.</h1>
        <p>Your account does not have owner access.</p>
        <a href="/signout-with-chatgpt?return_to=%2Fplaytest" target="_top">
          Sign out
        </a>
      </>
    );
  return (
    <>
      <VisitorReport />
      <PlaytestReport />
    </>
  );
}
export default function PlaytestPage() {
  return (
    <main className="playtest-document playtest-report">
      <Link href="/" prefetch={false}>
        ← Back to the game
      </Link>
      <OwnerReport />
    </main>
  );
}
