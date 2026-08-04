import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ADAPTIVE_PATH_NUDGE_KEY } from '../../utils/adaptive-path-nudge';
import { AdaptivePathNudge } from './AdaptivePathNudge';

describe('AdaptivePathNudge', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.sessionStorage.clear();
  });

  afterEach(() => vi.useRealTimers());

  it('shows one non-blocking suggestion for a student after login', () => {
    window.sessionStorage.setItem(ADAPTIVE_PATH_NUDGE_KEY, 'pending');
    render(<AdaptivePathNudge role="STUDENT" />);

    expect(screen.queryByRole('complementary')).toBeNull();
    act(() => vi.advanceTimersByTime(900));

    expect(screen.getByRole('complementary', { name: 'Adaptive Path suggestion' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Khám phá Adaptive Path/i })).toHaveAttribute(
      'href',
      '/learning-plan/adaptive',
    );
    expect(window.sessionStorage.getItem(ADAPTIVE_PATH_NUDGE_KEY)).toBeNull();
  });

  it('can be dismissed and is not shown to staff roles', () => {
    window.sessionStorage.setItem(ADAPTIVE_PATH_NUDGE_KEY, 'pending');
    const { rerender } = render(<AdaptivePathNudge role="INSTRUCTOR" />);
    act(() => vi.advanceTimersByTime(900));
    expect(screen.queryByRole('complementary')).toBeNull();

    rerender(<AdaptivePathNudge role="STUDENT" />);
    act(() => vi.advanceTimersByTime(900));
    fireEvent.click(screen.getByRole('button', { name: /Dismiss Adaptive Path/i }));
    expect(screen.queryByRole('complementary')).toBeNull();
  });
});
