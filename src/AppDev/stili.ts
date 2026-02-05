import React from 'react';
import { theme } from './costanti';

// --- HELPER STILI ---
export const getWidgetGlow = (color: string): React.CSSProperties => ({
  position: 'absolute', top: 0, left: 0, width: '4px', height: '100%',
  backgroundColor: color, boxShadow: `0 0 15px ${color}`
});

// --- STILI CSS-IN-JS ---
export const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    width: '100vw', minHeight: '100vh', backgroundColor: theme.bg,
    color: theme.text, fontFamily: theme.font,
    backgroundImage: `radial-gradient(circle at 50% 10%, #1a1c4b 0%, ${theme.bg} 60%)`,
    display: 'flex', flexDirection: 'column', overflow: 'hidden'
  },
  topBar: {
    height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 25px', borderBottom: theme.panelBorder, backdropFilter: 'blur(10px)', zIndex: 20
  },
  logo: {
    fontSize: '22px', fontWeight: '900',
    background: `linear-gradient(to right, ${theme.cyan}, ${theme.purple})`,
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '2px'
  },
  mainContent: {
    display: 'flex', flex: 1, height: 'calc(100vh - 60px)', overflow: 'hidden'
  },

  // SIDEBAR NAVIGAZIONE
  sidebar: {
    width: '280px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px',
    borderRight: theme.panelBorder, background: 'rgba(0,0,0,0.3)', overflowY: 'auto',
    transition: 'transform 0.3s ease'
  },
  sidebarMobile: {
    position: 'fixed', top: 0, left: 0, bottom: 0, width: '280px',
    background: 'rgba(5, 7, 10, 0.98)', backdropFilter: 'blur(20px)',
    zIndex: 1000, padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px',
    overflowY: 'auto', transform: 'translateX(-100%)', transition: 'transform 0.3s ease',
    boxShadow: '4px 0 20px rgba(0,0,0,0.5)'
  },
  sidebarMobileOpen: {
    transform: 'translateX(0)'
  },
  mobileOverlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.7)', zIndex: 999, opacity: 0,
    pointerEvents: 'none', transition: 'opacity 0.3s ease'
  },
  mobileOverlayVisible: {
    opacity: 1, pointerEvents: 'auto'
  },

  // ARENA CENTRALE
  arena: {
    flex: 1, position: 'relative', display: 'flex', flexDirection: 'column',
    overflowY: 'auto', padding: '0'
  },
  arenaContent: {
    padding: '3px 8px 0px',
    overflowX: 'hidden',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%'
  },

  // CARDS GENERICHE
  card: {
    background: theme.panel, border: theme.panelBorder, borderRadius: '12px',
    padding: '20px', marginBottom: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
  },
  matchRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.05)',
    cursor: 'pointer', transition: 'background 0.2s', borderRadius: '8px'
  },

  // DETTAGLI PRE-MATCH
  statBlock: {
    background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '8px',
    marginBottom: '10px', display: 'flex', justifyContent: 'space-between'
  },

  // ANIMAZIONE SIMULAZIONE
  animContainer: {
    width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', position: 'relative'
  },
  pitch: {
    width: '80%',
    maxWidth: '700px',
    height: '300px',
    marginLeft: '100px',
    marginTop: '40px',
    border: `1px solid rgba(255, 255, 255, 0.2)`,
    borderRadius: '10px',
    position: 'relative',
    overflow: 'hidden',
    background: 'linear-gradient(135deg, #0a4d2e 0%, #0d6b3f 50%, #0a4d2e 100%)',
    boxShadow: `
      0 0 20px rgba(255, 255, 255, 0.1),
      inset 0 0 100px rgba(0, 0, 0, 0.3)
    `
  },
  momentumBar: {
    height: '100%',
    width: '4px',
    position: 'absolute',
    top: 0,
    left: '50%',
    transition: 'left 0.5s ease-out',
    zIndex: 10,
    pointerEvents: 'none'
  },
  timerDisplay: {
    fontSize: '48px', fontWeight: '900', color: theme.text,
    textShadow: `0 0 20px ${theme.cyan}`, marginBottom: '20px'
  },
  eventFeed: {
    marginTop: '20px',
    width: '500px',
    maxWidth: '600px',
    height: '300px',
    marginLeft: '-50px',
    overflowY: 'auto',
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    padding: '15px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    scrollBehavior: 'smooth',
    scrollbarWidth: 'thin',
    scrollbarColor: `${theme.cyan}40 rgba(255,255,255,0.1)`
  },

  // CHAT BOT
  chatWidget: {
    position: 'fixed', bottom: '80px', right: '20px', width: '340px', height: '450px',
    background: 'rgba(12, 14, 28, 0.95)', border: theme.panelBorder, borderRadius: '16px',
    display: 'flex', flexDirection: 'column', boxShadow: '0 10px 50px rgba(0,0,0,0.7)',
    zIndex: 100, overflow: 'hidden', backdropFilter: 'blur(20px)'
  },
  chatHeader: {
    padding: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)',
    background: `linear-gradient(90deg, rgba(188,19,254,0.2) 0%, rgba(0,0,0,0) 100%)`,
    fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
  },
  chatBody: {
    flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px'
  },
  msgBubble: {
    padding: '10px 14px', borderRadius: '12px', fontSize: '13px', lineHeight: '1.4',
    maxWidth: '85%'
  },
  userMsg: {
    alignSelf: 'flex-end', background: theme.cyan, color: '#000',
    borderRadius: '12px 12px 0 12px'
  },
  botMsg: {
    alignSelf: 'flex-start', background: 'rgba(255,255,255,0.1)', color: theme.text,
    borderRadius: '12px 12px 12px 0'
  }
};
