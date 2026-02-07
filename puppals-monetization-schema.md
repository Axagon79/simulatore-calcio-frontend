# PUPPALS - Sistema Monetizzazione Dual-Currency

## 🎯 CONCETTO BASE

**Due Tipi di Gettoni:**
- 🔵 **Reveal Tokens** = Vedere i pronostici (3 token = 1 prediction)
- 🟡 **Shield Tokens** = Proteggere i pronostici (rimborso reveal se perde)

---

## 💰 REGOLE ACQUISTO

### ✅ Cosa SI PUÒ Comprare
1. **Pacchetti Completi** (Reveal + Shield insieme)
2. **Solo Shield** separatamente (ricarica protezioni)

### ❌ Cosa NON SI PUÒ Comprare
- **Solo Reveal** separatamente (disponibili SOLO nei pacchetti)

---

## 📦 PACCHETTI DISPONIBILI

| Pacchetto | Prezzo | Reveal 🔵 | Shield 🟡 | Tip equiv. | Scadenza Reveal |
|-----------|--------|-----------|-----------|------------|-----------------|
| STARTER   | €10    | 10        | 3         | ~3         | 7 giorni        |
| BASIC     | €20    | 25        | 8         | ~8         | 14 giorni       |
| POPULAR ⭐| €50    | 70        | 25        | ~23        | 30 giorni       |
| PRO       | €100   | 160       | 60        | ~53        | 60 giorni       |
| ELITE     | €200   | 350       | 140       | ~116       | 90 giorni       |

### ⏰ Regole Scadenza
- 🔵 **Reveal**: scadono secondo la durata del pacchetto acquistato
- 🟡 **Shield**: **NON SCADONO MAI** (né quelli dei pacchetti né quelli ricaricati)
- Gli Shield persistenti funzionano come incentivo al riacquisto di Reveal

### 🟡 Ricarica Solo Shield

| Quantità | Prezzo | Sconto |
|----------|--------|--------|
| 5 🟡     | €6     | -      |
| 10 🟡    | €11    | 8%     |
| 25 🟡    | €25    | 17%    |
| 50 🟡    | €45    | 25%    |

---

## 🔄 CONVERSIONE TOKENS

### Regola Conversione
```
5 🟡 Shield = 1 🔵 Reveal
```

### Direzione
- ✅ **Shield → Reveal** (permesso)
- ❌ **Reveal → Shield** (bloccato)

### Limiti
- Minimo: 5 shield
- Multipli di 5
- Non reversibile

---

## 🎁 ONBOARDING & TRIAL

### Registrazione Gratuita
```
Alla registrazione l'utente riceve GRATIS il pacchetto STARTER:
→ 10 🔵 Reveal + 3 🟡 Shield (scadenza Reveal: 7 giorni)
→ ~3 pronostici da provare nel primo weekend
```

### Funnel di Conversione
```
1. Landing page → vede track record pubblico (hit rate verificato)
2. Si registra → riceve STARTER gratis
3. Usa 3 pronostici nel weekend → vede che funzionano (~66% hit rate)
4. Dopo 7 giorni: Reveal scaduti, ma 3 Shield restano nel wallet
5. Vede i 3 Shield → "se compro un pack posso usarli" → acquista POPULAR
```

### Anti-Abuse
- 1 solo STARTER gratuito per account (legato a email verificata)
- No multi-account: fingerprint device + verifica email
- Lo STARTER gratuito NON è riacquistabile

---

## 🎮 COME FUNZIONA

### Vedere Pronostico Standard
```
Costo: 3 🔵 Reveal Token
- Se VINCE ✅ → -3🔵 (pagato)
- Se PERDE ❌ → -3🔵 (perso)
```

### Vedere Pronostico Protetto
```
Costo: 3 🔵 Reveal + 1 🟡 Shield
- Se VINCE ✅ → -3🔵 -1🟡 (pagato)
- Se PERDE ❌ → -1🟡 ma +3🔵 RIMBORSATI
```

---

## 💡 ESEMPI USO

### Esempio 1: Utente Normale
```
Acquisto: POPULAR €50
Riceve: 70🔵 + 25🟡
Tip disponibili: 23 pronostici (70/3)

Settimana 1:
- 5 predictions standard → -15🔵
- 3 predictions protette → -9🔵 -3🟡
- 1 protetta perde → +3🔵 rimborsati

Saldo: 49🔵 | 22🟡 (ancora ~16 tip)
```

### Esempio 2: Shield Finiti
```
Saldo: 30🔵 | 1🟡
Situazione: Serve proteggere big match

Opzione A: Ricarica Shield
- Compra 10🟡 = €11
- Nuovo: 30🔵 | 11🟡

Opzione B: Nuovo Pack
- Compra POPULAR €50
- Nuovo: 100🔵 | 26🟡
```

### Esempio 3: Reveal Finiti
```
Saldo: 1🔵 | 15🟡
Situazione: Vuole vedere predictions ma non ha abbastanza Reveal

Opzione A: Conversione
- 15🟡 → 3🔵
- Nuovo: 4🔵 | 0🟡 (1 tip + 1🔵 avanza)

Opzione B: Compra Pack (consigliato)
- POPULAR €50
- Nuovo: 71🔵 | 15🟡
```

---

## 🚶 FLUSSO UTENTE TIPO

### Scenario A — Utente che Converte (percorso ideale)

#### Giorno 0 — Scoperta
```
1. Trova il sito (social/Telegram/SEO)
2. Landing page: vede hit rate verificato (~66%), interfaccia professionale
3. "Interessante, ma funziona davvero?" → si registra
```

#### Giorno 0 — Registrazione + Primo Weekend
```
4. Riceve STARTER gratis: 10🔵 + 3🟡
5. È sabato sera, ci sono le partite di Serie A
6. Sfoglia la scrematura → vede pronostici blurred con stelle
7. Clicca "Simula prima" su Inter-Milan → vede score simulato e probabilità
8. Decide di rivelare il pronostico → spende 3🔵 → vede: "1X2 → 1, confidence alta, commento AI"
9. Protegge con Shield → spende 1🟡
10. Rivela altri 2 pronostici standard (6🔵) senza Shield
    Saldo: 1🔵 | 2🟡
```

#### Giorno 1 — Risultati
```
11. Inter-Milan: vinto ✅ → -3🔵 -1🟡 (pagato, ok)
12. Secondo pronostico: vinto ✅ → -3🔵
13. Terzo pronostico: perso ❌ → -3🔵 (non protetto, perso)
    Risultato: 2/3 azzeccati. "Se avessi protetto anche il terzo avrei recuperato 3🔵"
    Saldo: 1🔵 | 2🟡
```

#### Giorno 3-7 — Esplorazione
```
14. Ha 1🔵 (non basta per un pronostico, servono 3)
15. Fa 1 simulazione/giorno (limite STARTER) per "assaggiare"
16. Vede che i pronostici continuano ad azzeccare
17. Al giorno 7: Reveal scaduti, ma 2🟡 restano nel wallet
```

#### Giorno 8 — Conversione
```
18. Lunedì: nuova settimana, Champions League in arrivo
19. Ha 0🔵 e 2🟡 — non può fare nulla
20. Banner: "Acquista POPULAR — 70🔵 + 25🟡 — €50"
21. Pensa: "Ho già 2🟡, con il POPULAR ne avrò 27, posso proteggere quasi tutti"
22. Acquista POPULAR → Saldo: 70🔵 | 27🟡
```

#### Settimane 2-4 — Uso Regolare
```
23. Rivela 4-5 pronostici/giorno (~12-15🔵)
24. Protegge i big match con Shield (~3-4🟡/settimana)
25. Usa simulazioni (5/giorno) per decidere su quali partite puntare
26. Dopo 3 settimane: ~15🔵 rimasti | 10🟡 rimasti
```

#### Giorno 28 — Riacquisto
```
27. Shield in esaurimento, Reveal quasi finiti
28. Compra ricarica Shield 10🟡 = €11
29. Rinnova POPULAR €50 a fine mese
    Revenue mese 1: €50 + €11 = €61
```

---

### Scenario B — Utente che NON Converte (churn)

```
Giorno 0: Si registra, riceve STARTER gratis (10🔵 + 3🟡)
Giorno 1-2: Rivela 2-3 pronostici, risultati misti (1 vinto, 1 perso)
Giorno 3: Non è convinto, smette di usare il sito
Giorno 7: Reveal scaduti. Ha ancora 2-3🟡 nel wallet
→ Ogni tanto riceve email: "Hai ancora 2🟡 nel wallet — usali!"
→ Se torna: gli Shield lo invogliano a comprare un pack per sfruttarli
→ Se non torna: costo acquisizione = 0 (STARTER era gratis)
```

---

### Scenario C — Upgrade da POPULAR a PRO

```
Mese 1-2: Usa POPULAR (€50/mese), soddisfatto dei risultati
Mese 3: Vuole di più — vuole scegliere gli algoritmi di simulazione
         Vuole il chatbot premium con fonti esterne
Acquista PRO (€100): 160🔵 + 60🟡 + scelta algoritmi + chatbot premium
→ Più pronostici (53 tip), più protezioni, più simulazioni (10/giorno)
→ Revenue: da €61/mese a €100+/mese
```

---

### Scenario D — Conversione d'Emergenza (Shield → Reveal)

```
Saldo: 2🔵 | 20🟡
Situazione: È mercoledì, Champions League stasera, non ha abbastanza Reveal
Non vuole/può comprare un pack adesso

Converte: 15🟡 → 3🔵 (tasso 5:1)
Nuovo saldo: 5🔵 | 5🟡 → rivela 1 pronostico (3🔵) + 1 protezione (1🟡)
Resta: 2🔵 | 4🟡

→ Ha risolto l'urgenza ma ha "bruciato" 15 Shield
→ Al prossimo acquisto pack recupererà Shield nuovi
→ La conversione è volutamente svantaggiosa per incentivare l'acquisto pack
```

---

### Scenario E — Scadenza Reveal (FIFO)

```
Giorno 1: Compra POPULAR → 70🔵 (scadenza: giorno 30)
Giorno 25: Saldo: 12🔵 | 8🟡
Giorno 30: I 12🔵 scadono!

Opzioni:
A) Compra nuovo pack PRIMA della scadenza → i nuovi 🔵 hanno nuova scadenza
B) Converte Shield → Reveal per usarli prima che scadano
C) Li perde — ma gli Shield restano (incentivo a riacquistare)

→ Notifica push/email 3 giorni prima: "Hai 12🔵 in scadenza tra 3 giorni!"
→ L'urgenza spinge all'acquisto o all'uso immediato
```

---

### Scenario F — Shield Salva la Giornata

```
Saldo: 30🔵 | 15🟡
Sabato sera: 5 partite interessanti

3 pronostici standard: -9🔵
2 pronostici protetti (big match): -6🔵 -2🟡

Risultati:
- Standard 1: ✅ vinto
- Standard 2: ❌ perso → -3🔵 bruciati
- Standard 3: ✅ vinto
- Protetto 1: ✅ vinto → -3🔵 -1🟡 (pagato)
- Protetto 2: ❌ perso → -1🟡 ma +3🔵 RIMBORSATI

Bilancio: ha perso 3🔵 sul non-protetto, ma ha recuperato 3🔵 sul protetto
Saldo finale: 18🔵 | 13🟡
→ "Se avessi protetto anche il secondo, non avrei perso nulla"
→ Messaggio: la protezione vale la pena, compra più Shield
```

---

## 🔬 SIMULAZIONE (Strumento di Supporto)

La simulazione NON è il prodotto principale — è lo strumento che aiuta l'utente a decidere quale pronostico acquistare.

### Posizionamento
```
Simulazione = "Annusare il piatto prima di ordinarlo"
Pronostico = "Il piatto vero, con la ricetta dello chef"
```

### Cosa Mostra la Simulazione vs il Pronostico

| Dato | Simulazione (gratis) | Pronostico (3🔵) |
|------|---------------------|------------------|
| Punteggio simulato | Si | Si |
| Probabilità generali | Si | Si |
| Mercato consigliato | No | Si |
| Confidence / rating | No | Si |
| Commento AI dettagliato | No | Si |
| Protezione Shield | No | Si |

### UX nella Pagina Scrematura
```
Per ogni partita con pronostico disponibile:
[🔒 Pronostico blurred] [🔵 Rivela — 3 token] [🔬 Simula prima]

Click "Simula prima" → apre simulazione per quella partita specifica
Dopo la simulazione → utente decide se spendere 3🔵 per il pronostico completo
```

### Limiti Simulazione per Pacchetto

| Pacchetto | Sim/giorno | Scelta algoritmo | Scelta cicli |
|-----------|-----------|-----------------|--------------|
| STARTER   | 1         | No (default)    | No           |
| BASIC     | 3         | No (default)    | No           |
| POPULAR   | 5         | No (default)    | No           |
| PRO       | 10        | Si (tutti i 5)  | No           |
| ELITE     | Illimitate| Si (tutti i 5)  | Si           |

### Requisiti
- Simulazione disponibile SOLO con pacchetto attivo (almeno 1🔵 non scaduto)
- Non consuma Reveal token
- Limite giornaliero resettato a mezzanotte
- Senza pacchetto attivo: bottone "Simula" mostra CTA per acquisto pack

---

## 🤖 CHATBOT AI

Assistente AI che spiega PERCHÉ un pronostico consiglia un certo mercato.
Lo scommettitore serio vuole capire il ragionamento, non solo il risultato.

### Provider: Mistral AI
- **Base** (BASIC/POPULAR): Mistral Small 3.1 — $0.10/M input, $0.30/M output
- **Premium** (PRO/ELITE): Mistral Medium 3.1 — $0.40/M input, $2.00/M output
- Web search built-in tramite Mistral Agents API (solo Premium)
- Function calling nativo per interrogare MongoDB

### Due Livelli di Profondità

| Aspetto | Base (BASIC / POPULAR) | Premium (PRO / ELITE) |
|---------|----------------------|----------------------|
| Modello | Mistral Small 3.1 | Mistral Medium 3.1 |
| Dati interni (DB) | ✅ H2H, BVS, quote, affidabilità, stats | ✅ Tutto |
| Analisi pronostico | ✅ Spiega il "perché" dai dati | ✅ Spiega il "perché" dai dati |
| Web search | ❌ | ✅ Meteo, infortuni, news, formazioni |
| Analisi tattica | ❌ | ✅ Matchup, punti deboli, trend |
| STARTER | ❌ Nessun accesso chatbot | - |

### Budget Token Giornaliero per Pacchetto

| Pacchetto | Token/giorno | ≈ Messaggi/giorno | Costo max/utente/mese |
|-----------|-------------|-------------------|----------------------|
| STARTER   | ❌          | 0                 | $0                   |
| BASIC     | 30.000      | ~23               | ~$0.36               |
| POPULAR   | 80.000      | ~60               | ~$0.96               |
| PRO       | 200.000     | ~150              | ~$14                 |
| ELITE     | 500.000     | ~385              | ~$36                 |

### Calcolo Costi (Worst Case)
```
1 messaggio medio ≈ 800 token input + 500 token output = 1.300 token

100 utenti BASIC tutti al max ogni giorno:
100 × $0.36/mese = $36/mese totale

100 utenti POPULAR tutti al max:
100 × $0.96/mese = $96/mese totale

100 utenti PRO tutti al max:
100 × $14/mese = $1.400/mese
MA: 100 PRO × €100 = €10.000/mese revenue → margine enorme
```

### UX
- L'utente vede una barra: "Chatbot: 60% disponibile oggi"
- Budget resettato a mezzanotte
- Senza budget: messaggio "Limite giornaliero raggiunto — torna domani o fai upgrade"
- Cache risposte per stessa partita (riduce consumo reale)

---

## 📊 LOGICA BUSINESS

### Perché Reveal Solo in Pacchetti?
- ✅ Revenue minimo garantito (€10+)
- ✅ Forza upgrade a pack grandi
- ✅ Shield sempre disponibili
- ✅ Previene abuse sistema

### Perché Shield Separati?
- ✅ Flessibilità utente
- ✅ Upsell ricorrente
- ✅ Micro-transazioni
- ✅ Retention (evita frustrazione)

### Perché Conversione 5:1?
- ✅ Emergency escape valve
- ✅ Non conveniente (incentiva acquisto)
- ✅ Retention tool
- ❌ Shield più preziosi (no reverse)

---

## 🎯 REVENUE MODEL

### Revenue Utente Tipico/Mese
```
Pack base: €50 (POPULAR)
Shield refill: €11-25 (1-2 volte)
TOTALE: €60-75/mese/utente
```

### vs Subscription Tradizionale
```
Traditional: €29.99/mese
Dual-Currency: €60-75/mese
INCREMENTO: +100-150% 🚀
```

---

## ⚙️ ARCHITETTURA TECNICA

### Autenticazione: Firebase Auth
- Email + password (principale)
- Google Sign-In (opzionale, social login)
- Firebase Auth token verificato lato backend su ogni richiesta protetta
- Middleware esistente: `functions/middleware/auth.js` (da estendere)
- Frontend: Firebase Auth SDK per React

### MongoDB — Nuove Collections

```javascript
// WALLET UTENTE
user_wallets {
  userId: string,                    // Firebase Auth UID
  revealTokens: number,
  shieldTokens: number,             // Mai scadono
  revealExpiry: [                    // FIFO: consuma prima quelli che scadono prima
    { amount: number, expiresAt: Date, packType: string }
  ],
  chatTokensUsedToday: number,      // Reset a mezzanotte
  chatTokensResetAt: Date,
  simUsedToday: number,             // Simulazioni usate oggi
  simResetAt: Date,
  currentPack: string,              // starter|basic|popular|pro|elite
  packPurchasedAt: Date,
  packExpiresAt: Date
}

// UTENTI
users {
  userId: string,                    // Firebase Auth UID
  email: string,
  displayName: string,
  role: string,                      // starter|basic|popular|pro|elite
  registeredAt: Date,
  lastLoginAt: Date,
  starterClaimed: boolean,           // Anti-abuse: 1 solo starter gratis
  deviceFingerprint: string          // Anti multi-account
}

// TRANSAZIONI
transactions {
  userId: string,
  type: string,                      // purchase_pack|purchase_shield|convert|refund
  packType: string,                  // starter|basic|popular|pro|elite
  revealAmount: number,
  shieldAmount: number,
  amountEur: number,
  stripePaymentId: string,
  createdAt: Date
}

// PRONOSTICI RIVELATI
predictions_revealed {
  userId: string,
  predictionId: string,              // ref → daily_predictions._id
  matchId: string,
  matchDate: Date,
  revealCost: number,                // sempre 3
  shieldUsed: boolean,
  result: string,                    // pending|won|lost
  refunded: boolean,                 // true se shield ha rimborsato
  refundedAt: Date,
  createdAt: Date
}

// SESSIONI CHAT
chat_sessions {
  userId: string,
  matchId: string,                   // partita di contesto (opzionale)
  messages: [
    { role: string, content: string, tokensUsed: number, timestamp: Date }
  ],
  model: string,                     // mistral-small|mistral-medium
  totalTokensUsed: number,
  createdAt: Date
}
```

### Backend — Nuovi Endpoint (Node.js `functions/routes/`)

```javascript
// === WALLET (walletRoutes.js) ===
GET    /wallet                     // Saldo corrente (reveal, shield, scadenze, pack attivo)
POST   /wallet/convert             // Shield → Reveal (5:1, multipli di 5)

// === ACQUISTI (purchaseRoutes.js — Stripe) ===
POST   /purchase/pack              // Compra pacchetto (crea Stripe session)
POST   /purchase/shield            // Ricarica solo shield
POST   /purchase/webhook           // Stripe webhook → accredita token
GET    /purchase/history           // Storico transazioni utente

// === PRONOSTICI (predictionsRoutes.js — estendere) ===
POST   /predictions/reveal         // Rivela pronostico: -3R, opz. -1S
GET    /predictions/my-revealed    // Lista pronostici rivelati dall'utente
POST   /predictions/process-results // Cron/webhook: verifica risultati → auto-refund shield

// === CHATBOT (chatRoutes.js) ===
POST   /chat/message               // Messaggio al chatbot (check budget token)
GET    /chat/budget                // Token rimanenti oggi
GET    /chat/history/:matchId      // Storico chat per partita (opzionale)

// === AUTH (authRoutes.js) ===
POST   /auth/register              // Registrazione + claim STARTER gratis
GET    /auth/profile               // Profilo utente + pack attivo
```

### Backend — Flusso Chatbot

```
POST /chat/message:
  1. Verifica Firebase Auth token
  2. Verifica pack attivo (almeno BASIC)
  3. Verifica budget token giornaliero (chatTokensUsedToday < limite pack)
  4. Carica dati partita da MongoDB (H2H, BVS, quote, affidabilità, stats)
  5. IF pack PRO/ELITE:
       → Mistral Medium 3.1 + web_search: true
     ELSE:
       → Mistral Small 3.1 + web_search: false
  6. Invia a Mistral API con system prompt + dati contesto
  7. Aggiorna chatTokensUsedToday += tokensUsed
  8. Salva in chat_sessions
  9. Ritorna { response, tokensRemaining }
```

### Backend — Middleware

```javascript
authMiddleware.js          // Verifica Firebase Auth token (già esiste, estendere)
walletMiddleware.js        // Verifica pack attivo + saldo sufficiente per operazione
rateLimitMiddleware.js     // Check limiti giornalieri (simulazioni, chat budget)
```

### Backend — Cron Jobs

```javascript
// Scadenza Reveal (giornaliero, mezzanotte)
- Scansiona user_wallets.revealExpiry
- Rimuove batch scaduti
- Invia notifica 3 giorni prima della scadenza

// Reset contatori giornalieri (mezzanotte)
- chatTokensUsedToday → 0
- simUsedToday → 0

// Verifica risultati partite (dopo fine partite)
- Incrocia predictions_revealed con h2h_by_round.real_score
- Se shieldUsed && result=lost → refund 3 Reveal
- Aggiorna result: won|lost
```

### Frontend — Nuovi Componenti

```
src/pages/
  LandingPage.tsx            // Pagina pubblica: hit rate, value prop, CTA signup
  Login.tsx                  // Firebase Auth login (email + Google)
  Signup.tsx                 // Firebase Auth registrazione + claim STARTER
  Shop.tsx                   // Acquisto pacchetti e shield (Stripe Checkout)
  Wallet.tsx                 // Saldo, scadenze, conversione S→R, storico

src/components/
  WalletBadge.tsx            // Mini widget saldo nell'header (🔵 45 | 🟡 12)
  RevealButton.tsx           // Bottone "Rivela — 3🔵" con opzione shield
  ShieldToggle.tsx           // Toggle protezione su singolo pronostico
  ChatBudgetBar.tsx          // Barra "Chatbot: 60% disponibile oggi"
  PredictionCard.tsx         // Card pronostico (blurred → revealed)
  PackCard.tsx               // Card pacchetto nello shop
  ExpiryWarning.tsx          // Banner "12🔵 in scadenza tra 3 giorni"

src/services/
  walletService.ts           // API calls wallet
  purchaseService.ts         // API calls acquisti + Stripe
  chatService.ts             // API calls chatbot
  authService.ts             // Firebase Auth helpers
```

### Pagamenti: Stripe
- Stripe Checkout per acquisto pacchetti e shield
- Webhook `POST /purchase/webhook` per conferma pagamento
- Accredito token solo dopo conferma webhook (non client-side)
- Stripe Customer ID salvato in `users` collection

---

## 🚀 NEXT STEPS

### Da Decidere
1. ~~**Scadenza Pacchetti**~~ ✅ DEFINITO (Reveal: 7/14/30/60/90 giorni, Shield: mai)

2. **Altre Features** (DA DECIDERE)
   - ~~Simulazioni costo?~~ ✅ DEFINITO (gratis con limiti giornalieri per pack)
   - ~~Algoritmi premium?~~ ✅ DEFINITO (PRO: scelta algo, ELITE: algo + cicli)
   - ~~Tier gratuito / demo per acquisizione?~~ ✅ DEFINITO (STARTER gratis alla registrazione)
   - ~~Chatbot AI?~~ ✅ DEFINITO (Mistral AI, 2 livelli profondità, budget token giornaliero per pack)
   - Bundle speciali weekend?

---

## 📈 KPI da Trackare

- Conversion rate trial → paid
- Pack distribution (quale vendono di più)
- Shield refill frequency
- Conversione usage rate
- LTV per tier
- Churn rate
- Upgrade/downgrade patterns

---

**Creato**: 2026-02-06
**Versione**: 1.7
**Status**: Sistema completo: business rules + flussi utente + chatbot + architettura tecnica. Opzionale: bundle weekend
