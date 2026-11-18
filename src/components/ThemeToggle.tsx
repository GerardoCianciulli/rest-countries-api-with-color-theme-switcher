import { useEffect, useRef } from 'react';
import $ from 'jquery';
import MoonIcon from '../icons/moon.svg?react';

type Theme = 'light' | 'dark';
const STORAGE_KEY = 'theme';

function readStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'dark' || value === 'light' ? value : null;
  } catch {
    return null;
  }
}

/**
 * The theme lives on `<html data-theme>` (set before paint by the inline script in index.html),
 * not in React state: CSS custom properties do all the restyling, so React never re-renders on toggle.
 * jQuery owns the click, the attribute swap, persistence and the `aria-pressed` state.
 */
export function ThemeToggle() {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;

    const $html = $(document.documentElement);
    const $button = $(button);
    const osDark = window.matchMedia('(prefers-color-scheme: dark)');
    let transitionTimer: number | undefined;

    const current = (): Theme => ($html.attr('data-theme') === 'dark' ? 'dark' : 'light');

    const apply = (theme: Theme, { animate = true } = {}) => {
      if (animate) {
        $html.addClass('theme-transition');
        window.clearTimeout(transitionTimer);
        transitionTimer = window.setTimeout(() => $html.removeClass('theme-transition'), 300);
      }
      $html.attr('data-theme', theme);
      $button.attr('aria-pressed', String(theme === 'dark'));
    };

    apply(current(), { animate: false });

    $button.on('click', () => {
      const next: Theme = current() === 'dark' ? 'light' : 'dark';
      apply(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Storage unavailable — the choice still applies for this visit.
      }
    });

    // Follow OS changes until the user picks a theme explicitly.
    const onOsChange = (event: MediaQueryListEvent) => {
      if (!readStoredTheme()) apply(event.matches ? 'dark' : 'light');
    };
    osDark.addEventListener('change', onOsChange);

    return () => {
      $button.off('click');
      osDark.removeEventListener('change', onOsChange);
      window.clearTimeout(transitionTimer);
    };
  }, []);

  return (
    <button ref={buttonRef} type="button" className="theme-toggle" aria-pressed="false">
      <MoonIcon className="theme-toggle__icon" aria-hidden="true" focusable="false" />
      <span>Dark Mode</span>
    </button>
  );
}
