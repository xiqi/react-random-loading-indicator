import React from 'react';
import { render, screen, act, cleanup } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { RandomLoadingIndicator } from '../src/RandomLoadingIndicator';

describe('RandomLoadingIndicator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('picks once per loading session in per-load mode', () => {
    const onIndicatorChange = vi.fn();
    const sources = ['a.gif', 'b.gif', 'c.gif'];

    const { rerender } = render(
      <RandomLoadingIndicator
        loading={false}
        sources={sources}
        seed="demo-seed"
        onIndicatorChange={onIndicatorChange}
      />
    );

    expect(screen.queryByRole('status')).toBeNull();

    rerender(
      <RandomLoadingIndicator
        loading
        sources={sources}
        seed="demo-seed"
        onIndicatorChange={onIndicatorChange}
      />
    );

    expect(onIndicatorChange).toHaveBeenCalledTimes(1);
    const firstSrc = screen.getByRole('img').getAttribute('src');

    rerender(
      <RandomLoadingIndicator
        loading
        sources={sources}
        seed="demo-seed"
        onIndicatorChange={onIndicatorChange}
      />
    );

    expect(onIndicatorChange).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('img').getAttribute('src')).toBe(firstSrc);

    rerender(
      <RandomLoadingIndicator
        loading={false}
        sources={sources}
        seed="demo-seed"
        onIndicatorChange={onIndicatorChange}
      />
    );

    rerender(
      <RandomLoadingIndicator
        loading
        sources={sources}
        seed="demo-seed"
        onIndicatorChange={onIndicatorChange}
      />
    );

    expect(onIndicatorChange).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('img').getAttribute('src')).not.toBe(firstSrc);
  });

  it('changes source repeatedly in continuous mode', () => {
    const onIndicatorChange = vi.fn();
    const sources = ['a.gif', 'b.gif', 'c.gif'];

    render(
      <RandomLoadingIndicator
        loading
        sources={sources}
        mode="continuous"
        intervalMs={200}
        seed="continuous-seed"
        onIndicatorChange={onIndicatorChange}
      />
    );

    const firstSrc = screen.getByRole('img').getAttribute('src');

    act(() => {
      vi.advanceTimersByTime(220);
    });

    const secondSrc = screen.getByRole('img').getAttribute('src');
    expect(secondSrc).not.toBe(firstSrc);
    expect(onIndicatorChange).toHaveBeenCalledTimes(2);

    act(() => {
      vi.advanceTimersByTime(220);
    });

    expect(onIndicatorChange).toHaveBeenCalledTimes(3);
  });

  it('renders custom sources', () => {
    render(
      <RandomLoadingIndicator
        loading
        sources={[
          {
            type: 'custom',
            render: () => <div data-testid="custom-loader">Custom</div>
          }
        ]}
      />
    );

    expect(screen.getByTestId('custom-loader')).toBeTruthy();
  });

  it('supports idleBehavior="last"', () => {
    const sources = ['a.gif', 'b.gif'];

    const { rerender } = render(<RandomLoadingIndicator loading sources={sources} seed="idle-test" />);
    const selected = screen.getByRole('img').getAttribute('src');

    rerender(
      <RandomLoadingIndicator
        loading={false}
        sources={sources}
        seed="idle-test"
        idleBehavior="last"
      />
    );

    expect(screen.getByRole('img').getAttribute('src')).toBe(selected);
  });
});
