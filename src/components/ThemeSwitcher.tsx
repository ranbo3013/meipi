import type { Theme } from '../themes'

interface ThemeSwitcherProps {
  themes: Theme[]
  value: string
  onChange: (id: string) => void
}

export function ThemeSwitcher({ themes, value, onChange }: ThemeSwitcherProps) {
  return (
    <div className="theme-switcher">
      {themes.map((t) => (
        <button
          key={t.id}
          className={'theme-btn' + (t.id === value ? ' active' : '')}
          title={t.description}
          onClick={() => onChange(t.id)}
        >
          {t.name}
        </button>
      ))}
    </div>
  )
}
