import { useEffect, useId, useRef } from 'react';
import $ from 'jquery';
import ChevronIcon from '../icons/chevron-down.svg?react';
import { REGIONS, type RegionFilter as RegionValue } from '../api/types';

interface RegionFilterProps {
  value: RegionValue;
  onChange: (region: RegionValue) => void;
}

const OPTIONS: { value: RegionValue; label: string }[] = [
  { value: null, label: 'All Regions' },
  ...REGIONS.map((region) => ({ value: region, label: region })),
];

/**
 * Listbox-style dropdown (WAI-ARIA "select-only combobox"-lite).
 * Split of responsibilities:
 * - React owns *what* is selected (props → `aria-selected`, button label).
 * - jQuery owns the *interaction*: open/close animation, keyboard navigation,
 *   outside-click / focus-out dismissal and `aria-expanded`.
 * React never sets `style` or `aria-expanded` after mount, so the two never fight over the DOM.
 */
export function RegionFilter({ value, onChange }: RegionFilterProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const $root = $(root);
    const $button = $root.find('.filter__button');
    const $list = $root.find('.filter__list');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const duration = () => (reducedMotion.matches ? 0 : 160);

    const $options = () => $list.find<HTMLElement>('[role="option"]');
    const isOpen = () => $root.hasClass('is-open');

    const focusOption = (index: number) => {
      const $all = $options();
      const wrapped = (index + $all.length) % $all.length;
      $all.eq(wrapped).trigger('focus');
    };

    const open = () => {
      if (isOpen()) return;
      $root.addClass('is-open');
      $button.attr('aria-expanded', 'true');
      $list.stop(true, true).slideDown(duration());
      const $all = $options();
      focusOption(Math.max($all.index($all.filter('[aria-selected="true"]')), 0));
    };

    const close = ({ restoreFocus = true } = {}) => {
      if (!isOpen()) return;
      $root.removeClass('is-open');
      $button.attr('aria-expanded', 'false');
      $list.stop(true, true).slideUp(duration());
      if (restoreFocus) $button.trigger('focus');
    };

    $button.on('click', () => (isOpen() ? close() : open()));

    $button.on('keydown', (event) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        open();
      }
    });

    $list.on('keydown', '[role="option"]', function (this: HTMLElement, event) {
      const index = $options().index(this);
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          focusOption(index + 1);
          break;
        case 'ArrowUp':
          event.preventDefault();
          focusOption(index - 1);
          break;
        case 'Home':
          event.preventDefault();
          focusOption(0);
          break;
        case 'End':
          event.preventDefault();
          focusOption(-1);
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          this.click(); // React's onClick performs the actual selection.
          break;
        case 'Escape':
          event.preventDefault();
          close();
          break;
        case 'Tab':
          close({ restoreFocus: false });
          break;
      }
    });

    // Delegated jQuery handlers run before React's root listener: close first, then React selects.
    $list.on('click', '[role="option"]', () => close());

    $(document).on('pointerdown.regionFilter', (event) => {
      if (!root.contains(event.target as Node)) close({ restoreFocus: false });
    });

    $(document).on('keydown.regionFilter', (event) => {
      if (event.key === 'Escape' && isOpen()) close();
    });

    return () => {
      $button.off();
      $list.off();
      $(document).off('.regionFilter');
    };
  }, []);

  const selectedLabel = value ?? 'Filter by Region';

  return (
    <div ref={rootRef} className="filter">
      <button
        type="button"
        className="filter__button"
        aria-haspopup="listbox"
        aria-expanded="false"
        aria-controls={listId}
        aria-label={value ? `Filter by region: ${value}` : 'Filter by region'}
      >
        <span>{selectedLabel}</span>
        <ChevronIcon className="filter__chevron" aria-hidden="true" focusable="false" />
      </button>

      <ul id={listId} className="filter__list" role="listbox" aria-label="Regions">
        {OPTIONS.map((option) => (
          <li
            key={option.label}
            role="option"
            tabIndex={-1}
            className="filter__option"
            aria-selected={option.value === value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
