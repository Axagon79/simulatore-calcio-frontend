import { useState } from 'react';
import { getTheme, getThemeMode, type ThemeMode } from '../AppDev/costanti';
import { useAuth } from '../contexts/AuthContext';

const theme = getTheme();
const currentMode = getThemeMode();

interface SettingsProps {
  onClose: () => void;
}

export default function Settings({ onClose }: SettingsProps) {
  const { user, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const isMobile = window.innerWidth < 768;

  const handleThemeChange = (mode: ThemeMode) => {
    if (mode === currentMode) return;
    localStorage.setItem('puppals_theme', mode);
    sessionStorage.setItem('settings_open', 'true');
    sessionStorage.setItem('appdev_restore', 'true');
    // Forza il salvataggio stato di AppDev prima del reload
    window.dispatchEvent(new Event('beforeunload'));
    window.location.reload();
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100000, fontFamily: theme.font,
        overflowY: 'auto', padding: isMobile ? '16px' : '24px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: theme.bg,
          border: theme.panelBorder,
          borderRadius: '16px',
          color: theme.text,
          padding: isMobile ? '20px' : '32px',
          width: '100%', maxWidth: '500px',
          maxHeight: '90vh', overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >

      {/* HEADER FISSO */}
      <div style={{
        position: 'sticky', top: isMobile ? '-20px' : '-32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: isMobile ? '16px 0 12px' : '24px 0 12px',
        marginBottom: '12px',
        background: theme.bg,
        zIndex: 10,
        borderBottom: theme.panelBorder,
      }}>
        <h1 style={{ fontSize: '20px', fontWeight: 900, margin: 0, color: theme.text }}>
          Impostazioni
        </h1>
        <button onClick={onClose} style={{
          background: theme.cyan, border: 'none',
          color: currentMode === 'dark' ? '#000' : '#fff',
          padding: '8px 18px', borderRadius: '8px',
          cursor: 'pointer', fontSize: '13px', fontWeight: 700,
          letterSpacing: '0.3px',
        }}>
          Salva e chiudi
        </button>
      </div>

      {/* SEZIONE: ASPETTO */}
      <Section title="Aspetto">
        <SettingRow label="Tema">
          <div style={{ display: 'flex', gap: '8px' }}>
            <ThemeButton
              label="Dark"
              icon="🌙"
              active={currentMode === 'dark'}
              onClick={() => handleThemeChange('dark')}
            />
            <ThemeButton
              label="Light"
              icon="☀️"
              active={currentMode === 'light'}
              onClick={() => handleThemeChange('light')}
            />
          </div>
        </SettingRow>

      </Section>

      {/* SEZIONE: PROSSIMAMENTE */}
      <Section title="Prossimamente" dimmed>
        <SettingRow label="Lingua" disabled>
          <span style={{ color: theme.textDim, fontSize: '13px' }}>🇮🇹 Italiano</span>
        </SettingRow>
        <SettingRow label="Notifiche" disabled>
          <span style={{ color: theme.textDim, fontSize: '13px' }}>Non attivo</span>
        </SettingRow>
        <SettingRow label="Modalità Quote" disabled>
          <span style={{ color: theme.textDim, fontSize: '13px' }}>Non attivo</span>
        </SettingRow>
      </Section>

      {/* SEZIONE: ACCOUNT */}
      {user && (
        <Section title="Account">
          <SettingRow label="Email">
            <span style={{ color: theme.textDim, fontSize: '13px' }}>{user.email || '—'}</span>
          </SettingRow>
          <SettingRow label="">
            {!showLogoutConfirm ? (
              <button onClick={() => setShowLogoutConfirm(true)} style={{
                background: 'transparent', border: `1px solid ${theme.danger}`,
                color: theme.danger, padding: '8px 20px', borderRadius: '8px',
                cursor: 'pointer', fontSize: '13px', fontWeight: 700,
              }}>
                Logout
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ color: theme.danger, fontSize: '12px' }}>Sei sicuro?</span>
                <button onClick={handleLogout} style={{
                  background: theme.danger, border: 'none',
                  color: '#fff', padding: '6px 16px', borderRadius: '6px',
                  cursor: 'pointer', fontSize: '12px', fontWeight: 700,
                }}>
                  Sì, esci
                </button>
                <button onClick={() => setShowLogoutConfirm(false)} style={{
                  background: 'transparent', border: `1px solid ${theme.textDim}`,
                  color: theme.textDim, padding: '6px 16px', borderRadius: '6px',
                  cursor: 'pointer', fontSize: '12px',
                }}>
                  Annulla
                </button>
              </div>
            )}
          </SettingRow>
        </Section>
      )}

      {/* FOOTER */}
      <div style={{
        marginTop: '32px', textAlign: 'center',
        color: theme.textDim, fontSize: '11px', opacity: 0.5,
      }}>
        PUPPALS v1.0
      </div>
      </div>
    </div>
  );
}


// --- COMPONENTI INTERNI ---

function Section({ title, children, dimmed }: { title: string; children: React.ReactNode; dimmed?: boolean }) {
  return (
    <div style={{
      background: theme.panel,
      border: theme.panelBorder,
      borderRadius: '12px',
      padding: '16px 20px',
      marginBottom: '16px',
      opacity: dimmed ? 0.5 : 1,
    }}>
      <h3 style={{
        fontSize: '13px', fontWeight: 700, textTransform: 'uppercase',
        color: theme.cyan, margin: '0 0 12px 0', letterSpacing: '0.5px',
      }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function SettingRow({ label, children, disabled }: { label: string; children: React.ReactNode; disabled?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 0',
      borderBottom: `1px solid ${currentMode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
      opacity: disabled ? 0.6 : 1,
      pointerEvents: disabled ? 'none' : 'auto',
    }}>
      {label && <span style={{ fontSize: '14px', fontWeight: 600, color: theme.text }}>{label}</span>}
      {children}
    </div>
  );
}

function ThemeButton({ label, icon, active, onClick }: { label: string; icon: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: active ? theme.cyan : 'transparent',
      color: active ? (currentMode === 'dark' ? '#000' : '#fff') : theme.textDim,
      border: active ? 'none' : `1px solid ${theme.textDim}`,
      padding: '8px 18px',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: active ? 800 : 500,
      display: 'flex', alignItems: 'center', gap: '6px',
      transition: 'all 0.2s',
    }}>
      {icon} {label}
    </button>
  );
}
