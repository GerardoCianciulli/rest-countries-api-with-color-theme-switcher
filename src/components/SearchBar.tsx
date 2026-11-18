import { useId } from 'react';
import SearchIcon from '../icons/search.svg?react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  const inputId = useId();

  return (
    <div className="search" role="search">
      <label htmlFor={inputId} className="sr-only">
        Search for a country by name
      </label>
      <SearchIcon className="search__icon" aria-hidden="true" focusable="false" />
      <input
        id={inputId}
        className="search__input"
        type="search"
        placeholder="Search for a country…"
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
