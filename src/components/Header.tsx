import { ThemeToggle } from './ThemeToggle';

export function Header() {
  return (
    <header className="site-header">
      <div className="site-header__inner container">
        <h1 className="site-header__title">Where in the world?</h1>
        <ThemeToggle />
      </div>
    </header>
  );
}
