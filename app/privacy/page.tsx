import type { Metadata } from 'next';
import Link from 'next/link';
import { env } from 'cloudflare:workers';
export const dynamic = 'force-dynamic';
import { CONSENT_VERSION, RETENTION_DAYS } from '@/lib/playtest-policy';
import {
  VISITOR_RETENTION_DAYS,
  visitorTrackingReady,
} from '@/lib/visitor-policy';
export const metadata: Metadata = {
  title: 'Playtest privacy | Pitchwise',
  robots: { index: false, follow: false },
};
export default function PrivacyPage() {
  const tracking = visitorTrackingReady(env);
  return (
    <main className="playtest-document">
      <Link href="/" prefetch={false}>
        ← Back to the game
      </Link>
      {tracking && (
        <section>
          <h2>Visitor sharing is on by default. You can switch it off.</h2>
          <p>
            While visitor sharing is on, visits are recorded to improve the
            game: a random ID stored in your browser, the name in a personal
            link if you received one, your device type, language, the site that
            linked you here, an approximate location (country, region and city
            as reported by the network; your IP address is not stored) and what
            you do in the game. Only the creator can see it, and it is deleted
            after {VISITOR_RETENTION_DAYS} days. Clearing this site&apos;s data
            in your browser starts a new anonymous ID. Ask the person who shared
            the link to delete your visits at any time.
          </p>
          <p>
            Choose “Play without recording” above the game to stop future
            visitor events. Your preference stays in this browser, including
            after a refresh. It does not delete visits already received; the
            creator can delete those from the private report. This website is
            publicly accessible, even when the link is sent only to friends.
          </p>
        </section>
      )}
      <p className="eyebrow">Optional testing with friends</p>
      <h1>Your game. Your choice to share.</h1>
      <p>
        You can play without giving us an alias, email or account. Optional
        playtest recording begins only when you choose “Play & share my
        playtest”. It never includes earlier actions.
      </p>
      <h2>What the creator sees</h2>
      <p>
        Your chosen or randomly suggested nickname, a random session reference,
        activities started, choices, results, timestamps and estimated active
        time. Time excludes hidden tabs and pauses after about a minute without
        interaction. These are testing signals, not verified records or a way to
        identify you.
      </p>
      <p>
        An IP address is saved only if you separately tick the IP option and the
        host can supply a trusted address. It helps the creator understand
        repeat sessions but may be shared or change. We do not use it for access
        control, location, advertising or fingerprinting. No IP is guessed from
        your nickname or submitted by your browser.
      </p>
      <h2>Who can see it and why</h2>
      <p>
        The creator of Pitchwise, who shared this test with you, can view the
        private report to improve the game. Other players cannot see your
        session. The application uses Sites and Cloudflare hosting/storage; no
        advertising or third-party analytics service is added.
      </p>
      <p>
        Contact:{' '}
        {env.PLAYTEST_CONTACT ||
          'Contact the person who shared this test with you.'}
      </p>
      <h2>Retention and deletion</h2>
      <p>
        Playtest records expire after {RETENTION_DAYS} days and are removed by a
        daily cleanup. You can stop recording and delete this session at any
        time using the settings above the game. This does not delete your
        locally saved game stars.
      </p>
      <p>
        The deletion token stays only in this tab. Copy your private deletion
        code if you want to delete after closing it; paste it at{' '}
        <Link href="/playtest/delete" prefetch={false}>
          Delete my playtest
        </Link>
        . Never share that code publicly. Otherwise contact the person who sent
        you the link, quoting your session reference, for deletion, access or
        correction.
      </p>
      <p>
        Cloudflare maintains a separate disaster-recovery history (7 days on
        Free or up to 30 days on Paid) after database changes. Deleted records
        are not accessible through the game or report; recovery history expires
        under the provider’s rules. A restored backup must honour deletion
        requests again.
      </p>
      <h2>Without sharing</h2>
      <p>
        The optional collector sends no visit or decision events before consent.
        The hosting provider still handles ordinary network requests and may
        process technical access/security logs under its own policies. Existing
        training stars and match records stay on your own device; they are not
        an identity.
      </p>
      <p>
        Each new tab or opt-in creates a new session. We do not claim that
        session counts are counts of unique people.{' '}
        {tracking
          ? 'The optional alias/IP playtest and visitor sharing are separate controls. To stop visitor sharing too, choose “Play without recording” above the game.'
          : 'Playing without sharing is not measured by the game.'}
      </p>
      <p className="playtest-fine">
        Notice version: {CONSENT_VERSION}. This draft is for a small invited
        playtest, not a claim of legal compliance for a general public launch.
      </p>
    </main>
  );
}
