import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext({})

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('cr-theme') === 'dark' ||
        (!localStorage.getItem('cr-theme') &&
          window.matchMedia('(prefers-color-scheme: dark)').matches)
      )
    }
    return false
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('cr-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  return (
    <ThemeContext.Provider value={{ isDark, toggle: () => setIsDark((p) => !p) }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
