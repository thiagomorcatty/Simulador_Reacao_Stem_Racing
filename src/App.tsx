import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, History, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';
import './App.css';

// Logos
import logoStem from './assets/STEM Racing TM_Location_Logo_RGB_Brazil - Full Colour Black_RGB.png';
import logoProjetando from './assets/Logo Projetando o Futuro.png';
import logoRobonuvem from './assets/logo_robonuvem.png';

// --- Tipos e Estados ---
type RaceState = 'IDLE' | 'COUNTDOWN' | 'WAITING' | 'GO' | 'RESULT' | 'FALSE_START';

interface Stats {
  best: number | null;
  last: number | null;
  history: number[];
}

export default function App() {
  // Estados do Simulador
  const [state, setState] = useState<RaceState>('IDLE');
  const [activeLights, setActiveLights] = useState<number>(0);
  const [timer, setTimer] = useState<number>(0);
  const [stats, setStats] = useState<Stats>(() => {
    const saved = localStorage.getItem('sr_reaction_stats');
    return saved ? JSON.parse(saved) : { best: null, last: null, history: [] };
  });

  // Refs para lógica de precisão
  const startTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<number | null>(null);
  const countdownIntervalsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const jumpStartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Persistência ---
  useEffect(() => {
    localStorage.setItem('sr_reaction_stats', JSON.stringify(stats));
  }, [stats]);

  // --- Lógica do Timer ---
  const startTimer = () => {
    startTimeRef.current = performance.now();
    timerIntervalRef.current = window.setInterval(() => {
      setTimer(Math.round(performance.now() - startTimeRef.current));
    }, 10);
  };

  const stopTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const clearAllTimeouts = useCallback(() => {
    countdownIntervalsRef.current.forEach(clearTimeout);
    countdownIntervalsRef.current = [];
    if (jumpStartTimeoutRef.current) {
      clearTimeout(jumpStartTimeoutRef.current);
      jumpStartTimeoutRef.current = null;
    }
    stopTimer();
  }, []);

  // --- Ciclo de Vida da Corrida ---
  const startSequence = useCallback(() => {
    clearAllTimeouts();
    setState('COUNTDOWN');
    setActiveLights(0);
    setTimer(0);

    const sequence = [1000, 2000, 3000, 4000, 5000];
    
    sequence.forEach((delay, index) => {
      const timeout = setTimeout(() => {
        setActiveLights(index + 1);
        
        if (index === 4) {
          setState('WAITING');
          const randomDelay = Math.random() * 3000 + 1000; // 1-4s
          jumpStartTimeoutRef.current = setTimeout(() => {
            setState('GO');
            setActiveLights(0);
            startTimer();
          }, randomDelay);
        }
      }, delay);
      countdownIntervalsRef.current.push(timeout);
    });
  }, [clearAllTimeouts]);

  const handleInteraction = useCallback(() => {
    if (state === 'IDLE' || state === 'RESULT' || state === 'FALSE_START') {
      startSequence();
    } else if (state === 'COUNTDOWN' || state === 'WAITING') {
      // Queima de largada
      clearAllTimeouts();
      setState('FALSE_START');
    } else if (state === 'GO') {
      // Reação bem sucedida
      stopTimer();
      const reactionTime = Math.round(performance.now() - startTimeRef.current);
      
      setStats(prev => {
        const isNewBest = prev.best === null || reactionTime < prev.best;
        if (isNewBest) {
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#9333ea', '#db2777', '#f59e0b']
          });
        }
        return {
          best: isNewBest ? reactionTime : prev.best,
          last: reactionTime,
          history: [reactionTime, ...prev.history].slice(0, 5)
        };
      });
      setState('RESULT');
    }
  }, [state, startSequence, clearAllTimeouts]);

  // Teclado (Espaço)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleInteraction();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleInteraction]);

  return (
    <div className="app-container" onMouseDown={(e) => e.preventDefault()}>
      {/* Header / Logo */}
      <header className="header glass-panel">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="header-content"
        >
          <div className="logo-wrapper">
            <img src={logoStem} alt="Stem Racing Brazil" className="header-logo" />
            <div className="brand-info">
              <h1 className="sr-title">SIMULADOR <span className="highlight">STEM RACING</span></h1>
              <p className="subtitle">Official Training System</p>
            </div>
          </div>
        </motion.div>
      </header>

      {/* Main Content Layout */}
      <div className="layout-content">
        <main className="main-stage">
          <div className="gantry-container glass-panel">
            <div className="lights-grid">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className={`light-unit ${activeLights > i ? 'active' : ''}`}>
                  <div className="light-bulb"></div>
                  <div className="light-glow"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Display Central */}
          <div className="display-area">
            <AnimatePresence mode="wait">
              <motion.div 
                key={state}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="status-message"
              >
                {state === 'IDLE' && <span className="text-muted">PRONTO PARA LARGADA?</span>}
                {state === 'COUNTDOWN' && <span className="text-warning">PREPARAR...</span>}
                {state === 'WAITING' && <span className="text-warning animate-pulse">ATENÇÃO!</span>}
                {state === 'GO' && <span className="text-success glow-text">REAGE AGORA!</span>}
                {state === 'FALSE_START' && <span className="text-danger">QUEIMOU A LARGADA!</span>}
                {state === 'RESULT' && <span className="text-accent">TEMPO DE REAÇÃO</span>}
              </motion.div>
            </AnimatePresence>

            <div className="timer-box font-digital">
              <span className={state === 'FALSE_START' ? 'text-danger' : ''}>
                {state === 'FALSE_START' ? 'FAIL' : timer.toString().padStart(3, '0')}
              </span>
              <span className="unit">ms</span>
            </div>
          </div>

          {/* Botão de Ação */}
          <motion.button
            className={`action-btn ${state === 'GO' ? 'go-state' : ''} ${state === 'FALSE_START' ? 'fail-state' : ''}`}
            whileTap={{ scale: 0.96 }}
            onClick={handleInteraction}
            onTouchStart={(e) => {
              e.preventDefault();
              handleInteraction();
            }}
          >
            {state === 'IDLE' && 'INICIAR SEQUÊNCIA'}
            {(state === 'COUNTDOWN' || state === 'WAITING') && 'AGUARDE...'}
            {state === 'GO' && 'CLIQUE AGORA!'}
            {state === 'RESULT' && 'TENTAR NOVAMENTE'}
            {state === 'FALSE_START' && 'REINICIAR'}
          </motion.button>
        </main>

        {/* Stats Board (Sidebar) */}
        <aside className="stats-sidebar glass-panel">
          <div className="stat-group">
            <div className="stat-item">
              <div className="stat-label"><Trophy size={14} /> MELHOR</div>
              <div className="stat-value font-digital text-success">
                {stats.best ? `${stats.best}ms` : '--'}
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-label"><Zap size={14} /> ÚLTIMO</div>
              <div className="stat-value font-digital text-accent">
                {stats.last ? `${stats.last}ms` : '--'}
              </div>
            </div>
          </div>

          <div className="stat-item history-section">
            <div className="stat-label"><History size={14} /> RECENTES</div>
            <div className="history-list">
              {stats.history.map((t, i) => (
                <motion.div 
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  key={i} 
                  className="history-entry font-digital"
                >
                  {t}ms
                </motion.div>
              ))}
              {stats.history.length === 0 && <span className="text-xs text-muted">Nenhum registro</span>}
            </div>
          </div>
        </aside>
      </div>

      {/* Footer com Parceiros */}
      <footer className="app-footer">
        <div className="footer-label">PARCEIROS E DESENVOLVIMENTO</div>
        <div className="footer-logos">
          <div className="partner-item">
            <span className="partner-label">Organização</span>
            <img src={logoProjetando} alt="Projetando o Futuro" className="partner-logo" />
          </div>
          <div className="partner-item">
            <span className="partner-label">Desenvolvido por</span>
            <img src={logoRobonuvem} alt="Robonuvem" className="partner-logo" />
          </div>
        </div>
      </footer>
    </div>
  );
}
