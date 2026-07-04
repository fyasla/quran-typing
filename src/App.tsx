import { useCallback, useEffect, useMemo, useState } from 'react';
import { Redirect, Route, Switch, useLocation } from 'wouter';
import BottomNav from './components/BottomNav';
import TopBar from './components/TopBar';
import WelcomeModal from './components/WelcomeModal';
import { loadChapters } from './data/loader';
import { applyLanguage } from './i18n';
import ProfilePage from './pages/ProfilePage';
import ReadPage from './pages/ReadPage';
import SettingsPage from './pages/SettingsPage';
import StatsPage from './pages/StatsPage';
import { computeStreak, toDay } from './review/srs';
import { useAuth } from './store/auth';
import { useProgress } from './store/progress';
import { useActiveProfile } from './store/profiles';
import { cloudProfileId, pullAndMerge } from './store/sync';
import { useSettings } from './store/settings';
import type { Chapter } from './types';

export default function App() {
  const { page, theme, language } = useSettings();
  const [location] = useLocation();

  // Langue de l'interface (direction RTL pour l'arabe)
  useEffect(() => {
    applyLanguage(language);
  }, [language]);

  // Application du thème (auto = préférence système, suivie en direct)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'auto' && mq.matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    };
    apply();
    if (theme !== 'auto') return;
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);

  // Retour en haut à chaque changement de page
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [welcomeOpen, setWelcomeOpen] = useState(
    () => !localStorage.getItem('quran-typing-welcomed')
  );
  /** Avancée en direct sur la page en cours de frappe (conservée en naviguant) */
  const [liveGoal, setLiveGoal] = useState({ pageFraction: 0, verses: 0 });

  const activeProfile = useActiveProfile();
  const { user } = useAuth();
  // Progression effective : compte connecté sinon profil local
  const profileId = user ? cloudProfileId(user.id) : (activeProfile?.id ?? null);
  const { data: progress, recordSession, addCheckin, reload } = useProgress(profileId);

  // Connexion → récupère et fusionne les données cloud (+ migration du profil local)
  useEffect(() => {
    if (!user) return;
    pullAndMerge(user.id, activeProfile?.id ?? null).then((merged) => {
      if (merged) reload();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Chargement des métadonnées
  useEffect(() => {
    loadChapters().then(setChapters).catch(() => {});
  }, []);

  // Sourate courante : premier chapitre dont l'intervalle de pages contient la page
  const currentSurah = useMemo(() => {
    const c = chapters.find((c) => page >= c.pages[0] && page <= c.pages[1]);
    return c ? c.id : null;
  }, [chapters, page]);

  const streak = useMemo(
    () => computeStreak(progress.sessions, toDay(new Date())),
    [progress.sessions]
  );

  const onLive = useCallback((live: { pageFraction: number; verses: number }) => {
    setLiveGoal((prev) =>
      prev.pageFraction === live.pageFraction && prev.verses === live.verses ? prev : live
    );
  }, []);

  return (
    <div className="app flex min-h-dvh flex-col">
      <TopBar chapters={chapters} currentSurah={currentSurah} streak={streak} />

      <main className="main flex flex-1 flex-col pb-24 md:pb-10">
        <Switch>
          <Route path="/">
            <ReadPage
              chapters={chapters}
              profileId={profileId}
              progress={progress}
              recordSession={recordSession}
              onLive={onLive}
            />
          </Route>
          <Route path="/stats">
            <StatsPage
              progress={progress}
              hasProfile={!!profileId}
              live={liveGoal}
              addCheckin={addCheckin}
            />
          </Route>
          <Route path="/profile">
            <ProfilePage onDataImported={reload} />
          </Route>
          <Route path="/settings">
            <SettingsPage onShowWelcome={() => setWelcomeOpen(true)} />
          </Route>
          <Route>
            <Redirect to="/" />
          </Route>
        </Switch>
      </main>

      <WelcomeModal
        open={welcomeOpen}
        onClose={() => {
          localStorage.setItem('quran-typing-welcomed', '1');
          setWelcomeOpen(false);
        }}
      />
      <BottomNav streak={streak} />
    </div>
  );
}
