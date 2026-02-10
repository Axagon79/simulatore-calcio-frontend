import type { Match } from '../types';

interface Theme {
  cyan: string;
  purple: string;
  textDim: string;
}

interface ElementoPartitaProps {
  match: Match;
  isMobile: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onPrepareSimulation: () => void;
  getStemmaLeagueUrl: (mongoId?: string) => string;
  theme: Theme;
  isLive?: boolean;
}

export default function ElementoPartita({
  match,
  isMobile,
  isExpanded,
  onToggleExpand,
  onPrepareSimulation,
  getStemmaLeagueUrl,
  theme,
  isLive
}: ElementoPartitaProps) {

  const showLucifero = match.h2h_data?.lucifero_home != null;

  // Recupero quote dal livello principale del match
  const bkOdds = match.odds;

  // Tipizziamo 'val' come any per accettare numeri o stringhe dal DB
  const formatOdds = (val: any): string => {
    if (val === undefined || val === null || val === '-') return '-';
    const num = Number(val);
    return isNaN(num) ? '-' : num.toFixed(2);
  };

  const odds = {
    1: formatOdds(bkOdds?.['1']),
    X: formatOdds(bkOdds?.['X']),
    2: formatOdds(bkOdds?.['2'])
  };

  return (
    <div
      onClick={() => {
        if (isMobile) {
          onToggleExpand();
        } else {
          onPrepareSimulation();
        }
      }}
      style={{
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '20px',
        overflow: 'hidden',
        padding: isMobile ? '12px 10px' : '10.2px 15px',
        maxWidth: isMobile ? '95%' : '100%',
        minHeight: isMobile ? '33px' : 'auto',
        margin: isMobile ? '0 auto 5px auto' : '0 0 5px 0',
        marginBottom: '5px',
        cursor: 'pointer',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex',
        flexDirection: isMobile && isExpanded ? 'column' : 'row',
        alignItems: isMobile && isExpanded ? 'stretch' : 'center',
        justifyContent: 'space-between',
        transition: 'all 0.3s ease'
      }}
      onMouseEnter={(e) => {
        if (e.currentTarget) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
      }}
      onMouseLeave={(e) => {
        if (e.currentTarget) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
      }}
    >
      {/* A. DATA E ORA (Orizzontale in un contenitore/capsula) */}
      <div style={{
        width: isMobile ? '30px' : '130px',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          background: 'rgba(111, 149, 170, 0.13)',
          padding: isMobile ? '4px 4px' : '5px 10px',
          borderRadius: '8px',
          border: '1px solid rgba(0, 240, 255, 0.1)',
        }}>
          <span style={{
            fontSize: '11px',
            color: 'rgba(255, 255, 255, 0.5)',
            fontWeight: 'bold'
          }}>
            {match.date_obj
              ? new Date(match.date_obj).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })
              : '00/00'}
          </span>
          <span style={{ color: 'rgba(255, 255, 255, 0.1)', fontSize: '12px' }}>|</span>
          <span style={{
            fontSize: '11px',
            color: 'rgba(255, 255, 255, 0.5)',
            fontWeight: 'bold'
          }}>
            {match.match_time || '--:--'}
          </span>
        </div>
        {isLive && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            background: 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(239,68,68,0.4)',
            borderRadius: '8px', padding: '1px 6px', marginLeft: '6px',
            flexShrink: 0
          }}>
            <span style={{
              width: '5px', height: '5px', borderRadius: '50%',
              background: '#ef4444', boxShadow: '0 0 6px #ef4444',
              animation: 'pulse 1.5s infinite'
            }} />
            <span style={{ fontSize: '8px', fontWeight: 900, color: '#ef4444', letterSpacing: '0.5px' }}>
              LIVE
            </span>
          </span>
        )}
      </div>

      {/* VERSIONE MOBILE - VS BLOCCATO + PUNTINI */}
      {isMobile && !isExpanded ? (
        <>
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginLeft: '65px',
            marginRight: '5px',
            minWidth: 0
          }}>
            <div style={{
              flex: 1,
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: '4px',
              minWidth: 0
            }}>
              <span style={{
                maxWidth: '65px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontSize: '12px', fontWeight: 'bold', color: 'white', textAlign: 'right'
              }}>
                {match.home}
              </span>
              <img
                src={getStemmaLeagueUrl(match.home_mongo_id)}
                alt=""
                style={{ width: '20px', height: '20px', objectFit: 'contain', flexShrink: 0 }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>

            <div style={{ width: '20px', textAlign: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>vs</span>
            </div>

            <div style={{
              flex: 1,
              display: 'flex',
              justifyContent: 'flex-start',
              alignItems: 'center',
              gap: '4px',
              minWidth: 0
            }}>
              <img
                src={getStemmaLeagueUrl(match.away_mongo_id)}
                alt=""
                style={{ width: '20px', height: '20px', objectFit: 'contain', flexShrink: 0 }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <span style={{
                maxWidth: '65px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontSize: '12px', fontWeight: 'bold', color: 'white', textAlign: 'left'
              }}>
                {match.away}
              </span>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(111, 149, 170, 0.13)',
            border: '1px solid rgba(0, 240, 255, 0.1)',
            borderRadius: '8px',
            padding: '2px 8px',
            height: '24px',
            marginLeft: '0px',
            marginRight: '0px',
            flexShrink: 0
          }}>
            <span style={{
              fontSize: '11px',
              color: match.live_status === 'Live' ? '#ef4444' : match.live_status === 'HT' ? '#f59e0b' : '#fff',
              fontWeight: 'bold',
              fontFamily: 'monospace',
              animation: match.live_status === 'Live' ? 'pulse 1.5s infinite' : undefined
            }}>
              {match.live_status === 'Live' || match.live_status === 'HT'
                ? (match.live_score || '-:-')
                : (match.status === 'Finished' && match.real_score ? match.real_score : '-:-')}
            </span>
            {match.live_status === 'Live' && match.live_minute && (
              <span style={{ fontSize: '8px', color: '#ef4444', fontWeight: 900, marginLeft: '3px' }}>
                {match.live_minute}'
              </span>
            )}
            {match.live_status === 'HT' && (
              <span style={{ fontSize: '7px', color: '#f59e0b', fontWeight: 900, marginLeft: '3px' }}>
                INT
              </span>
            )}
          </div>
        </>
      ) : !isMobile ? (
        <>
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {/* CASA */}
            <div style={{
              flex: 1,
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: '12px'
            }}>
              {showLucifero && (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', color: 'rgb(5, 249, 182)', marginRight: '6px', fontWeight: 'bold', width: '30px', textAlign: 'right' }}>
                    {Math.round((match.h2h_data?.lucifero_home / 25) * 100)}%
                  </span>
                  <div style={{ width: '35px', height: '5px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px' }}>
                    <div style={{
                      width: `${Math.min((match.h2h_data?.lucifero_home / 25) * 100, 100)}%`,
                      height: '100%',
                      background: 'rgb(5, 249, 182)',
                      boxShadow: '0 0 8px rgb(5, 249, 182)',
                      borderRadius: '3px'
                    }}></div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {match.h2h_data?.home_rank && (
                  <span className="badge-classifica home">
                    <span className="badge-rank">{match.h2h_data.home_rank}°</span>
                    {match.h2h_data.home_points !== undefined && (
                      <span className="badge-points">{match.h2h_data.home_points}pt</span>
                    )}
                  </span>
                )}

                <div style={{
                  fontWeight: 'bold', fontSize: '15px', color: 'white',
                  textAlign: 'right', width: '130px', whiteSpace: 'nowrap',
                  overflow: 'hidden', textOverflow: 'ellipsis'
                }}>
                  {match.home}
                </div>

                <img
                  src={getStemmaLeagueUrl(match.home_mongo_id)}
                  alt={match.home}
                  style={{ width: '32px', height: '32px', objectFit: 'contain' }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
            </div>

            {/* VS / SCORE */}
            <div style={{
              background: match.live_status === 'Live' ? 'rgba(239, 68, 68, 0.15)' : match.live_status === 'HT' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(0, 240, 255, 0.1)',
              border: match.live_status === 'Live' ? '1px solid rgba(239, 68, 68, 0.5)' : match.live_status === 'HT' ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid rgba(0, 240, 255, 0.3)',
              fontSize: '15px', fontWeight: 'bold',
              color: match.live_status === 'Live' ? '#ef4444' : match.live_status === 'HT' ? '#f59e0b' : '#fff',
              borderRadius: '8px',
              minWidth: '50px', textAlign: 'center', margin: '0 15px', fontFamily: 'monospace',
              display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2px 8px',
              animation: match.live_status === 'Live' ? 'pulse 1.5s infinite' : undefined
            }}>
              <span>{match.live_status === 'Live' || match.live_status === 'HT'
                ? (match.live_score || 'VS')
                : (match.status === 'Finished' && match.real_score ? match.real_score : 'VS')}</span>
              {match.live_status === 'Live' && match.live_minute && (
                <span style={{ fontSize: '9px', color: '#ef4444', fontWeight: 900, lineHeight: 1 }}>
                  {match.live_minute}'
                </span>
              )}
              {match.live_status === 'HT' && (
                <span style={{ fontSize: '8px', color: '#f59e0b', fontWeight: 900, lineHeight: 1 }}>
                  INT
                </span>
              )}
            </div>

            {/* OSPITE */}
            <div style={{
              flex: 1,
              display: 'flex',
              justifyContent: 'flex-start',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img
                  src={getStemmaLeagueUrl(match.away_mongo_id)}
                  alt={match.away}
                  style={{ width: '32px', height: '32px', objectFit: 'contain' }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />

                <div style={{
                  fontWeight: 'bold', fontSize: '15px', color: 'white',
                  textAlign: 'left', width: '130px', whiteSpace: 'nowrap',
                  overflow: 'hidden', textOverflow: 'ellipsis'
                }}>
                  {match.away}
                </div>

                {match.h2h_data?.away_rank && (
                  <span className="badge-classifica away">
                    <span className="badge-rank">{match.h2h_data.away_rank}°</span>
                    {match.h2h_data.away_points !== undefined && (
                      <span className="badge-points">{match.h2h_data.away_points}pt</span>
                    )}
                  </span>
                )}
              </div>

              {showLucifero && (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: '35px', height: '5px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px' }}>
                    <div style={{
                      width: `${Math.min((match.h2h_data?.lucifero_away / 25) * 100, 100)}%`,
                      height: '100%',
                      background: 'rgb(255, 159, 67)',
                      boxShadow: '0 0 8px rgb(255, 159, 67)',
                      borderRadius: '3px'
                    }}></div>
                  </div>
                  <span style={{ fontSize: '10px', color: 'rgb(255, 159, 67)', marginLeft: '6px', fontWeight: 'bold', width: '30px', textAlign: 'left' }}>
                    {Math.round((match.h2h_data?.lucifero_away / 25) * 100)}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* C. QUOTE (Desktop) */}
          <div style={{
            width: '130px',
            display: 'flex',
            gap: '6px',
            marginLeft: '10px',
            alignItems: 'center',
            justifyContent: 'flex-end',
            flexShrink: 0
          }}>
            <div style={{
              width: '130px',
              display: 'flex',
              gap: '6px',
              marginLeft: '10px',
              alignItems: 'center',
              justifyContent: 'flex-end',
              flexShrink: 0
            }}>
              {(() => {
                const o1 = parseFloat((odds as any)['1']);
                const oX = parseFloat((odds as any)['X']);
                const o2 = parseFloat((odds as any)['2']);
                const minOdd = Math.min(o1, oX, o2);

                return ['1', 'X', '2'].map(label => {
                  const val = (odds as any)[label];
                  const numVal = parseFloat(val);

                  const score = match.real_score?.split(':');
                  let resultOutcome = null;
                  if (score && score.length === 2) {
                    const homeGoals = parseInt(score[0]);
                    const awayGoals = parseInt(score[1]);
                    if (homeGoals > awayGoals) resultOutcome = '1';
                    else if (homeGoals < awayGoals) resultOutcome = '2';
                    else if (homeGoals === awayGoals) resultOutcome = 'X';
                  }

                  const isMatchResult = label === resultOutcome;
                  const isLowest = numVal === minOdd;

                  let boxBg = 'rgba(255, 255, 255, 0.05)';
                  let boxBorder = '1px solid transparent';
                  let numColor = '#ddd';
                  let labelColor = 'rgba(255,255,255,0.2)';

                  if (isMatchResult) {
                    boxBg = 'rgba(0, 240, 255, 0.1)';
                    boxBorder = '1px solid rgba(43, 255, 0, 0.22)';
                    numColor = 'rgba(51, 255, 0, 0.53)';
                    labelColor = 'rgb(0, 240, 255)';
                  } else if (isLowest) {
                    boxBg = 'rgba(251, 255, 0, 0.1)';
                    boxBorder = '1px solid rgba(255, 230, 0, 0.18)';
                    numColor = 'rgba(238, 255, 0, 0.43)';
                    labelColor = 'rgba(255, 230, 0, 0.36)';
                  }

                  return (
                    <div key={label} style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: boxBg,
                      padding: '3px 0',
                      height: '32px',
                      width: '38px',
                      borderRadius: '8px',
                      border: boxBorder,
                      transition: 'all 0.2s',
                      boxShadow: isLowest && !isMatchResult ? '0 0 5px rgba(0, 255, 127, 0.1)' : 'none'
                    }}>
                      <span style={{
                        fontSize: '8px',
                        color: labelColor,
                        fontWeight: 'bold',
                        lineHeight: '1'
                      }}>
                        {label}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        color: numColor,
                        fontWeight: (isMatchResult || isLowest) ? '900' : 'normal',
                        fontFamily: 'monospace',
                        marginTop: '1px'
                      }}>
                        {val}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </>
      ) : null}

      {/* ICONA EXPAND (Solo Mobile) */}
      {isMobile && (
        <div style={{
          fontSize: '18px',
          color: theme.cyan,
          transition: 'transform 0.3s',
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          marginLeft: '10px',
          flexShrink: 0
        }}>
          ▼
        </div>
      )}

      {/* SEZIONE ESPANDIBILE (Solo Mobile) */}
      {isMobile && isExpanded && (
        <div style={{
          marginTop: '15px',
          paddingTop: '15px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          {/* SQUADRA CASA */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '12px',
              minHeight: '24px'
            }}>
              {match.h2h_data?.home_rank && (
                <span className="badge-classifica home" style={{
                  position: 'absolute',
                  left: 0,
                  top: '50%',
                  transform: 'translateY(-50%)'
                }}>
                  <span className="badge-rank">{match.h2h_data.home_rank}°</span>
                  {match.h2h_data.home_points !== undefined && (
                    <span className="badge-points">{match.h2h_data.home_points}pt</span>
                  )}
                </span>
              )}

              <img
                src={getStemmaLeagueUrl(match.home_mongo_id)}
                alt=""
                style={{ width: '25px', height: '25px', objectFit: 'contain' }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />

              <span style={{ fontSize: '15px', fontWeight: 'bold', color: 'white' }}>
                {match.home}
              </span>
            </div>

            {showLucifero && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1, height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px' }}>
                  <div style={{
                    width: `${Math.min((match.h2h_data?.lucifero_home / 25) * 100, 100)}%`,
                    height: '100%',
                    background: 'rgb(5, 249, 182)',
                    boxShadow: '0 0 8px rgb(5, 249, 182)',
                    borderRadius: '3px'
                  }}></div>
                </div>
                <span style={{ fontSize: '11px', color: 'rgb(5, 249, 182)', fontWeight: 'bold', minWidth: '40px' }}>
                  {Math.round((match.h2h_data?.lucifero_home / 25) * 100)}%
                </span>
              </div>
            )}
          </div>

          {/* VS */}
          <div style={{
            textAlign: 'center',
            background: match.live_status === 'Live' ? 'rgba(239, 68, 68, 0.15)' : match.live_status === 'HT' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(0, 240, 255, 0.1)',
            border: match.live_status === 'Live' ? '1px solid rgba(239, 68, 68, 0.5)' : match.live_status === 'HT' ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid rgba(0, 240, 255, 0.3)',
            padding: '6px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 'bold',
            color: match.live_status === 'Live' ? '#ef4444' : match.live_status === 'HT' ? '#f59e0b' : '#fff',
            margin: '10px 0',
            fontFamily: 'monospace',
            animation: match.live_status === 'Live' ? 'pulse 1.5s infinite' : undefined
          }}>
            {match.live_status === 'Live' || match.live_status === 'HT'
              ? (match.live_score || 'VS')
              : (match.status === 'Finished' && match.real_score ? match.real_score : 'VS')}
            {match.live_status === 'Live' && match.live_minute && (
              <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 900, marginLeft: '8px' }}>
                {match.live_minute}'
              </span>
            )}
            {match.live_status === 'HT' && (
              <span style={{ fontSize: '9px', color: '#f59e0b', fontWeight: 900, marginLeft: '8px' }}>
                INT
              </span>
            )}
          </div>

          {/* SQUADRA OSPITE */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '12px',
              minHeight: '24px'
            }}>
              {match.h2h_data?.away_rank && (
                <span className="badge-classifica away" style={{
                  position: 'absolute',
                  left: 0,
                  top: '50%',
                  transform: 'translateY(-50%)'
                }}>
                  <span className="badge-rank">{match.h2h_data.away_rank}°</span>
                  {match.h2h_data.away_points !== undefined && (
                    <span className="badge-points">{match.h2h_data.away_points}pt</span>
                  )}
                </span>
              )}

              <img
                src={getStemmaLeagueUrl(match.away_mongo_id)}
                alt=""
                style={{ width: '25px', height: '25px', objectFit: 'contain' }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />

              <span style={{ fontSize: '15px', fontWeight: 'bold', color: 'white' }}>
                {match.away}
              </span>
            </div>

            {showLucifero && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1, height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px' }}>
                  <div style={{
                    width: `${Math.min((match.h2h_data?.lucifero_away / 25) * 100, 100)}%`,
                    height: '100%',
                    background: 'rgb(255, 159, 67)',
                    boxShadow: '0 0 8px rgb(255, 159, 67)',
                    borderRadius: '3px'
                  }}></div>
                </div>
                <span style={{ fontSize: '11px', color: 'rgb(255, 159, 67)', fontWeight: 'bold', minWidth: '40px' }}>
                  {Math.round((match.h2h_data?.lucifero_away / 25) * 100)}%
                </span>
              </div>
            )}
          </div>

          {/* QUOTE */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginTop: '15px',
            paddingTop: '12px',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)'
          }}>
            {['1', 'X', '2'].map((label) => {
              const val = (odds as any)[label];
              return (
                <div key={label} style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '8px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', marginBottom: '4px' }}>
                    {label}
                  </span>
                  <span style={{ fontSize: '16px', color: '#fff', fontWeight: 'bold', fontFamily: 'monospace' }}>
                    {val}
                  </span>
                </div>
              );
            })}
          </div>

          {/* BOTTONE ANALIZZA */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPrepareSimulation();
            }}
            style={{
              width: '100%',
              marginTop: '15px',
              padding: '12px',
              background: `linear-gradient(90deg, ${theme.cyan}, ${theme.purple})`,
              border: 'none',
              borderRadius: '10px',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '14px',
              cursor: 'pointer',
              boxShadow: `0 0 15px rgba(0, 240, 255, 0.3)`
            }}
          >
            👁️ ANALIZZA PARTITA
          </button>
        </div>
      )}
    </div>
  );
}
