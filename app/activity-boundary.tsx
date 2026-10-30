'use client';

import { Component, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

// Lazy import rejections are cached by React; a reload retries the download.
export class ActivityBoundary extends Component<
  { children: ReactNode; onBack: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section className="mx-auto max-w-xl px-5 py-10" role="alert">
        <h1 className="text-2xl font-bold">The game couldn’t load.</h1>
        <p className="mt-3 text-muted-foreground">
          Check your connection, then reload to try again. Your saved progress is still here.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button className="min-h-11" onClick={() => window.location.reload()}>Reload game</Button>
          <Button className="min-h-11" variant="outline" onClick={this.props.onBack}>Back to home</Button>
        </div>
      </section>
    );
  }
}
