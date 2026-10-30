'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { randomAlias } from '@/lib/playtest-policy';
import { usePlaytest } from './playtest-provider';

export function PlaytestPanel() {
  const { config, session, busy, error, pending, begin, stopAndDelete } =
    usePlaytest();
  const [alias, setAlias] = useState('');
  const [shareIp, setShareIp] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => {
      if (mounted) setAlias(randomAlias());
    });
    return () => {
      mounted = false;
    };
  }, []);
  if (!config?.enabled) return null;
  if (session)
    return (
      <aside
        className="playtest-panel playtest-active"
        aria-label="Playtest sharing"
      >
        <details>
          <summary>
            Playtest · {session.alias} ·{' '}
            {error ? 'sharing paused' : pending ? 'syncing' : 'sharing on'}
          </summary>
          <p>
            Your choices, results and estimated active time are shared privately
            with the creator.{' '}
            {session.ipStored
              ? 'You also chose to share your IP.'
              : 'No IP was stored.'}
          </p>
          <p>
            Reference: <code>{session.sessionId}</code>. A new tab creates a new
            session; this alias is not an account.
          </p>
          <div className="playtest-actions">
            <button type="button" disabled={busy} onClick={stopAndDelete}>
              {busy ? 'Deleting…' : 'Stop & delete my playtest'}
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    `Pitchwise deletion reference: ${session.sessionId}\nDeletion code: ${session.token}`,
                  );
                  setCopied(true);
                } catch {
                  setCopied(false);
                }
              }}
            >
              {copied ? 'Deletion code copied' : 'Copy private deletion code'}
            </button>
          </div>
          <p className="playtest-fine">
            {config.visitorTracking && (
              <>Visitor sharing is controlled separately above the game. </>
            )}
            Keep the code private. You can delete later at{' '}
            <Link href="/playtest/delete" prefetch={false}>
              Delete my playtest
            </Link>
            , or contact the person who shared this test with your reference.{' '}
            <Link href="/privacy" prefetch={false}>
              Privacy notice
            </Link>
          </p>
          {error && <output>{error}</output>}
        </details>
      </aside>
    );
  if (dismissed)
    return (
      <aside className="playtest-panel playtest-active">
        <button
          type="button"
          className="playtest-text-button"
          onClick={() => setDismissed(false)}
        >
          Optional playtest is off · settings
        </button>
      </aside>
    );
  return (
    <aside
      className="playtest-panel playtest-invite"
      aria-labelledby="playtest-title"
    >
      <div>
        <h2 id="playtest-title">Play as {alias || 'a guest'}.</h2>
        <p>
          Share your choices, results and active time privately with the creator
          for {config.retentionDays} days. No sign-up. Optional; delete any
          time.
        </p>
      </div>
      <div className="playtest-form">
        <details className="playtest-preferences">
          <summary>Change nickname or share IP</summary>
          <label htmlFor="playtest-alias">Your nickname</label>
          <div className="playtest-alias">
            <input
              id="playtest-alias"
              value={alias}
              maxLength={24}
              autoComplete="off"
              onChange={(event) => setAlias(event.target.value)}
            />
            <button
              type="button"
              aria-label="Generate another nickname"
              onClick={() => setAlias(randomAlias())}
            >
              ↻
            </button>
          </div>
          <label className="playtest-ip">
            <input
              type="checkbox"
              checked={shareIp}
              onChange={(event) => setShareIp(event.target.checked)}
            />
            <span>
              Also share my IP, if available.
              <small>
                Optional. It may be shared with others and does not prove
                identity.
              </small>
            </span>
          </label>
        </details>
        <div className="playtest-actions">
          <button
            type="button"
            disabled={busy}
            onClick={() => begin(alias.trim(), shareIp)}
          >
            {busy ? 'Starting…' : 'Play & share my playtest'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setDismissed(true)}
          >
            {config.visitorTracking
              ? 'Skip optional playtest'
              : 'Play without sharing'}
          </button>
        </div>
        <p className="playtest-fine">
          {config.visitorTracking && (
            <>Visitor sharing is controlled separately above the game. </>
          )}
          “Play & share my playtest” agrees to this optional recording.{' '}
          <Link href="/privacy" prefetch={false}>
            What is collected & how to delete it
          </Link>
        </p>
        {error && <output>{error}</output>}
      </div>
    </aside>
  );
}
