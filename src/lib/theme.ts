export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'zimfinance-theme';

export function resolveTheme(preference: ThemePreference, systemIsDark: boolean): 'light' | 'dark' {
  return preference === 'system' ? (systemIsDark ? 'dark' : 'light') : preference;
}

export function readThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

export function saveThemePreference(preference: ThemePreference) {
  try {
    localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // Sem armazenamento, a escolha vale até fechar o app
  }
}

export function applyTheme(preference: ThemePreference) {
  const systemIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = resolveTheme(preference, systemIsDark);
}
