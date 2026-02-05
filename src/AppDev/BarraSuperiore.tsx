import type { CSSProperties } from 'react';

interface League {
  id: string;
  name: string;
  country: string;
}

interface Country {
  code: string;
  name: string;
  flag: string;
}

interface BarraSuperioreProps {
  isMobile: boolean;
  isAdmin: boolean;
  league: string;
  leagues: League[];
  selectedCup: string;
  country: string;
  availableCountries: Country[];
  stemmiCampionati: Record<string, string>;
  stemmiCoppe: Record<string, string>;
  styles: Record<string, CSSProperties>;
  onMobileMenuOpen: () => void;
  onDashboard: () => void;
}

export default function BarraSuperiore({
  isMobile,
  isAdmin,
  league,
  leagues,
  selectedCup,
  country,
  availableCountries,
  stemmiCampionati,
  stemmiCoppe,
  styles,
  onMobileMenuOpen,
  onDashboard
}: BarraSuperioreProps) {

  return (
    <div style={styles.topBar}>
      {/* HAMBURGER MENU (Solo Mobile) */}
      {isMobile && (
        <button
          onClick={onMobileMenuOpen}
          style={{
            background: 'rgba(0, 240, 255, 0.1)',
            border: '1px solid rgba(0, 240, 255, 0.3)',
            color: '#00f0ff',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20
          }}
        >
          ☰
        </button>
      )}

      {/* 1. SEZIONE SINISTRA: Navigazione e Nome Sito (Desktop) */}
      {!isMobile && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '120px', paddingLeft: '60px', zIndex: 10 }}>
          <button
            onClick={onDashboard}
            style={{
              background: 'rgba(0, 240, 255, 0.1)',
              border: '1px solid rgba(0, 240, 255, 0.3)',
              color: '#00f0ff',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>⟵</span> DASHBOARD
          </button>

          <div style={{ ...styles.logo, display: 'flex', alignItems: 'center' }}>
            <img
              src="https://cdn-icons-png.flaticon.com/512/1165/1165187.png"
              alt="Logo"
              style={{
                height: '28px',
                width: 'auto',
                marginRight: '15px',
                filter: 'drop-shadow(0 0 5px #00f0ff) brightness(1.5) contrast(1.1)'
              }}
            />
            AI SIMULATOR PRO
          </div>
        </div>
      )}

      {/* 2. IDENTITA COMPETIZIONE */}
      {(league || selectedCup) && (
        <div style={{
          position: isMobile ? 'relative' : 'absolute',
          left: isMobile ? '30px' : '280px',
          right: '0',
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
          height: '100%',
          alignItems: 'center',
          zIndex: 5
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '10px' : '25px',
            padding: isMobile ? '5px 15px' : '5px 120px',
            background: 'transparent',
            pointerEvents: 'auto',
            animation: 'fadeIn 0.5s ease'
          }}>
            <img
              src={selectedCup ? stemmiCoppe[selectedCup] : stemmiCampionati[league]}
              alt="Stemma"
              style={{
                height: isMobile ? '30px' : '42px',
                width: 'auto',
                objectFit: 'contain',
                filter: 'drop-shadow(0 0 10px rgba(0, 240, 255, 0.4))'
              }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{
                fontSize: isMobile ? '12px' : '15px',
                fontWeight: '900',
                color: 'white',
                lineHeight: '1.1',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {selectedCup
                  ? (selectedCup === 'UCL' ? 'Champions' : 'Europa L.')
                  : leagues.find(l => l.id === league)?.name || league
                }
              </span>
              {!isMobile && (
                <span style={{
                  fontSize: '10px',
                  color: '#00f0ff',
                  fontWeight: 'bold',
                  opacity: 0.9,
                  letterSpacing: '2px',
                  marginTop: '2px'
                }}>
                  {selectedCup ? 'UEFA TOURNAMENT' : (availableCountries.find(c => c.code === country)?.name || country).toUpperCase()}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. SEZIONE DESTRA: Admin, Crediti, User */}
      <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginLeft: 'auto', zIndex: 10, paddingRight: isMobile ? '10px' : '20px' }}>
        {isAdmin && !isMobile && (
          <div style={{
            background: 'linear-gradient(135deg, #ff0080, #ff8c00)',
            padding: '4px 12px',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 'bold',
            letterSpacing: '1px',
            boxShadow: '0 0 15px rgba(255, 0, 128, 0.5)',
            animation: 'pulse 2s infinite'
          }}>
            👑 ADMIN MODE
          </div>
        )}

        {!isMobile && (
          <div style={{ fontSize: '12px', color: '#8b9bb4' }}>
            Crediti: <span style={{ color: '#05f9b6' }}>∞</span>
          </div>
        )}

        <button onClick={() => alert('Tema toggle')} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>🌙</button>

        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: '#bc13fe',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          boxShadow: '0 0 10px #bc13fe',
          fontSize: '16px',
          color: 'white'
        }}>U</div>
      </div>
    </div>
  );
}
