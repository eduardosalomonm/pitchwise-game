'use client';
import { useState } from 'react';
import Link from 'next/link';
export default function DeletePlaytest() {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  async function remove(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = code
      .trim()
      .match(/(?:Deletion code:\s*)?([0-9a-f]{64})\s*$/)?.[1];
    if (!token) {
      setStatus('Paste the private deletion code you copied from the game.');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/playtest/session', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error();
      setStatus(
        'This playtest is deleted or was already unavailable. Your game stars are unchanged.',
      );
      setCode('');
    } catch {
      setStatus(
        'Deletion could not be confirmed. Try again, or contact the person who shared the test.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="playtest-document">
      <Link href="/" prefetch={false}>
        ← Back to the game
      </Link>
      <h1>Delete my playtest</h1>
      <p>
        Paste your private code. No sign-in needed. If you did not save it, ask
        the person who shared the test to delete your session reference.
      </p>
      <form onSubmit={remove}>
        <label htmlFor="deletion-code">Private deletion code</label>
        <textarea
          id="deletion-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          rows={4}
        />
        <button type="submit" disabled={busy}>
          {busy ? 'Deleting…' : 'Delete this playtest'}
        </button>
      </form>
      <output>{status}</output>
      <p>
        <Link href="/privacy" prefetch={false}>
          Privacy notice
        </Link>
      </p>
    </main>
  );
}
