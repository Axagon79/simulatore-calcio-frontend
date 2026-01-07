// COMPONENTE DEEP ANALYSIS VIEW - Report Scientifico
const DeepAnalysisView = ({ data, onBack, home, away }: { 
    data: any; 
    onBack: () => void; 
    home: string; 
    away: string 
  }) => {
    
    // Se non ci sono dati di analisi profonda, mostriamo un fallback
    const report = data?.deep_analysis;
    
    if (!report) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', color: '#fff' }}>
          <h2>⚠️ Dati Deep Analysis non disponibili</h2>
          <button onClick={onBack} style={{ 
            marginTop: '20px',
            padding: '10px 20px',
            background: '#00f0ff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}>
            Torna indietro
          </button>
        </div>
      );
    }
    
    const conf = report.global_confidence || { score: 0, label: "N/D", color: "#888" };
    const disp = report.dispersione || { std_dev: 0, risk_level: "N/D" };
    const money = report.money_management || { recommended_stake: "0%", kelly_criterion: 0 };
    
    // Helpers - Colore
    const getScoreColor = (score: number) => {
      if (score >= 8.5) return "#00ff88"; // Verde Fluo
      if (score >= 7.0) return "#00f0ff"; // Ciano
      if (score >= 5.5) return "#ffcc00"; // Giallo
      if (score >= 4.0) return "#ff8800"; // Arancio
      return "#ff0044"; // Rosso
    };
    
    const scoreColor = getScoreColor(conf.score);
    
    return (
      <div style={{ 
        width: '100%', 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: '20px',
        color: '#fff',
        fontFamily: 'Inter, sans-serif',
        animation: 'fadeIn 0.5s ease'
      }}>
        
        {/* 1. HEADER DI NAVIGAZIONE */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '30px'
        }}>
          <button 
            onClick={onBack}
            style={{
              background: 'transparent',
              border: '1px solid rgba(0,240,255,0.3)',
              color: '#00f0ff',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            ← TORNA AL RISULTATO
          </button>
          
          <div style={{ 
            fontSize: '18px', 
            fontWeight: 900, 
            letterSpacing: '2px',
            color: '#bc13fe',
            textTransform: 'uppercase',
            textShadow: '0 0 10px rgba(188,19,254,0.4)'
          }}>
            🔬 DEEP ANALYSIS PROTOCOL™ V3
          </div>
        </div>
        
        {/* 2. MATCH INFO - USA home e away */}
        <div style={{
          textAlign: 'center',
          marginBottom: '30px',
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#fff'
        }}>
          {home} vs {away}
        </div>
        
        {/* 3. DASHBOARD PRINCIPALE - GRIGLIA */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px'
        }}>
          
          {/* A. CONFIDENCE SCORE - IL CUORE */}
          <div style={{
            gridColumn: 'span 2', // Occupa 2 colonne su desktop
            background: 'linear-gradient(145deg, rgba(10,10,20,0.9), rgba(20,20,40,0.8))',
            border: `1px solid ${scoreColor}`,
            borderRadius: '20px',
            padding: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            boxShadow: `0 0 30px ${scoreColor}20`
          }}>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '12px', 
                color: '#888', 
                letterSpacing: '2px',
                marginBottom: '10px'
              }}>
                CONFIDENCE RATING
              </div>
              <div style={{ 
                fontSize: '72px', 
                fontWeight: 900, 
                color: scoreColor,
                textShadow: `0 0 20px ${scoreColor}`,
                lineHeight: 1
              }}>
                {conf.score}/10
              </div>
              <div style={{ 
                fontSize: '18px', 
                fontWeight: 'bold', 
                color: scoreColor,
                marginTop: '5px',
                textTransform: 'uppercase'
              }}>
                {conf.label}
              </div>
            </div>
            
            <div style={{ width: '1px', height: '80px', background: 'rgba(255,255,255,0.1)' }}></div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#888', letterSpacing: '2px', marginBottom: '10px' }}>
                RISCHIO VOLATILITÀ
              </div>
              <div style={{ 
                fontSize: '32px', 
                fontWeight: 'bold', 
                color: disp.risk_level === "BASSO" ? "#00ff88" : "#ff0044"
              }}>
                {disp.risk_level}
              </div>
              <div style={{ fontSize: '12px', color: '#aaa', marginTop: '5px' }}>
                Dev. Std: <span style={{ color: '#fff' }}>{disp.std_dev?.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          {/* B. MONEY MANAGEMENT - Stake Consigliato */}
          <div style={{
            background: 'rgba(10,15,30,0.6)',
            border: '1px solid rgba(255,215,0,0.3)',
            borderRadius: '20px',
            padding: '25px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              width: '100%', 
              height: '4px', 
              background: '#ffd700'
            }}></div>
            
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>💰</div>
            <div style={{ 
              fontSize: '12px', 
              color: '#ffd700', 
              letterSpacing: '1px',
              fontWeight: 'bold'
            }}>
              MONEY MANAGEMENT
            </div>
            <div style={{ 
              fontSize: '36px', 
              fontWeight: 900, 
              color: '#fff',
              margin: '10px 0'
            }}>
              {money.recommended_stake}
            </div>
            <div style={{ fontSize: '11px', color: '#888', textAlign: 'center' }}>
              della cassa<br/>
              Kelly Criterion: {(money.kelly_criterion * 100).toFixed(1)}%
            </div>
          </div>
          
        </div>
        
        {/* 4. DETTAGLIO ALGORITMI */}
        <h3 style={{
          marginTop: '40px',
          color: '#fff',
          fontSize: '16px',
          borderLeft: '4px solid #bc13fe',
          paddingLeft: '10px'
        }}>
          🤖 CONSENSO ALGORITMICO
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: '15px',
          marginTop: '20px'
        }}>
          {report.algo_details && Object.entries(report.algo_details).map(([name, data]: [string, any]) => (
            <div key={name} style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '12px',
              padding: '15px',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: 'bold', 
                color: '#00f0ff',
                marginBottom: '10px',
                textTransform: 'uppercase'
              }}>
                {name.replace(/_/g, ' ')}
              </div>
              
              {typeof data === 'object' && data.prediction ? (
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff' }}>
                    {data.prediction}
                    <span style={{ fontSize: '12px', color: '#888', marginLeft: '8px' }}>
                      {data.probability}%
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#666', marginTop: '5px' }}>
                    {data.metodo}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '14px', color: '#aaa', fontStyle: 'italic' }}>
                  Dati grezzi: {JSON.stringify(data).substring(0, 30)}...
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* 5. FOOTER SCIENTIFICO */}
        <div style={{
          marginTop: '50px',
          padding: '20px',
          background: 'rgba(0,0,0,0.5)',
          borderTop: '1px solid #333',
          fontSize: '10px',
          color: '#555',
          fontFamily: 'monospace',
          textAlign: 'center'
        }}>
          🔬 ANALISI GENERATA DA C.O.R.E. AI ENGINE™ | {new Date().toISOString()} | SESSION ID: {Math.random().toString(36).substr(2, 9)}
        </div>
        
      </div>
    );
  };
  
  export default DeepAnalysisView;
  