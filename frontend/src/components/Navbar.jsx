import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Shield, Menu, X, Bell, LogOut, User, Moon, Sun } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useSocket } from '../hooks/useSocket';
import toast from 'react-hot-toast';

/**
 * Navbar
 * Responsive top navigation bar with theme toggle, auth links, and
 * real-time notification badge via Socket.io.
 */
export default function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const { isDark, toggle }         = useTheme();
  const { language, setLanguage, supportedLanguages, t } = useLanguage();
  const { on }                     = useSocket();
  const navigate                   = useNavigate();
  const { pathname }               = useLocation();

  const [menuOpen,    setMenuOpen]    = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [avatarErrored, setAvatarErrored] = useState(false);

  const profilePhotoUrl = String(user?.profilePhoto || '').trim();
  const canRenderProfilePhoto = Boolean(profilePhotoUrl) && !avatarErrored;

  // Listen for real-time status update notifications
  useEffect(() => {
    if (!user) return;
    const unsubscribe = on('report-status-update', ({ message, status }) => {
      setUnreadCount((c) => c + 1);
      toast(message || `Report status changed to ${status}`, { icon: '🔔' });
    });
    return unsubscribe;
  }, [user, on]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinks = user
    ? isAdmin
      ? [
          { to: '/admin',              label: t('dashboard', 'Dashboard') },
          { to: '/admin/reports',      label: t('reports', 'Reports') },
          { to: '/admin/users',        label: t('users', 'Users') },
          { to: '/admin/verification', label: t('idVerify', 'ID Verify') },
        ]
      : [
          { to: '/dashboard',   label: t('dashboard', 'Dashboard') },
          { to: '/cases/track', label: t('trackCases', 'Track Cases') },
          { to: '/submit',      label: t('submitReport', 'Submit Report') },
          { to: '/live',        label: t('liveStream', 'Live Stream') },
        ]
    : [
        { to: '/',         label: t('home', 'Home') },
        { to: '/login',    label: t('login', 'Login') },
        { to: '/register', label: t('register', 'Register') },
      ];

  return (
    <nav className="sticky top-0 z-50 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 shadow-sm shadow-slate-200/40 dark:shadow-black/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg flex items-center justify-center shadow-md shadow-indigo-500/30">
              <Shield className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-extrabold tracking-tight text-sm sm:text-base text-slate-900 dark:text-white">
              VOV <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">CRIME</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  pathname === to
                    ? 'bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-900/40 dark:to-violet-900/40 text-indigo-700 dark:text-indigo-300 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 hover:-translate-y-0.5'
                } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900`}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="language-switcher">{t('languageLabel', 'Language')}</label>
            <select
              id="language-switcher"
              className="hidden sm:block text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              aria-label={t('languageLabel', 'Language')}
            >
              {supportedLanguages.map((option) => (
                <option key={option.code} value={option.code}>{option.label}</option>
              ))}
            </select>

            {/* Theme toggle */}
            <button
              onClick={toggle}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {user ? (
              <>
                {/* Notifications */}
                <button
                  className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
                  onClick={() => setUnreadCount(0)}
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-gradient-to-br from-red-500 to-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* User menu (desktop) */}
                <div className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
                  {canRenderProfilePhoto ? (
                    <img
                      src={profilePhotoUrl}
                      alt={`${user?.name || 'User'} profile`}
                      className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                      onError={() => setAvatarErrored(true)}
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/60 dark:to-violet-900/50 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                  )}
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 max-w-[120px] truncate">
                    {user.name}
                  </span>
                  <button onClick={handleLogout} className="p-2 rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900" aria-label="Logout">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : null}

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden py-3 border-t border-slate-200 dark:border-slate-800 animate-fade-in">
            <div className="flex flex-col gap-1">
              {navLinks.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMenuOpen(false)}
                  className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    pathname === to
                      ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {label}
                </Link>
              ))}
              {user && (
                <button
                  onClick={() => { setMenuOpen(false); handleLogout(); }}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                >
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
