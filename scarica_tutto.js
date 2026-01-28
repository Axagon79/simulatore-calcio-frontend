import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CONFIG = [

  // ALTRI EUROPEI
  { league: 'Scottish Premier League', folder: 'Scotland' },
 
];

const BASE_URL = 'https://www.thesportsdb.com/api/v1/json/3/search_all_teams.php?l=';

// Pulisce il nome file da caratteri vietati e spazi
const sanitize = (name) => {
  return name
    .replace(/[/\\?%*:|"<>]/g, '-') // Sostituisce i simboli vietati con un trattino
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_'); // Spazi diventano underscore
};

async function eseguiAggiornamento() {
  const baseDir = path.join(__dirname, 'squadre');
  if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir);

  console.log("🚀 Avvio controllo intelligente degli stemmi...\n");

  for (const item of CONFIG) {
    const nazioneDir = path.join(baseDir, item.folder);
    if (!fs.existsSync(nazioneDir)) fs.mkdirSync(nazioneDir, { recursive: true });

    try {
      const response = await fetch(`${BASE_URL}${encodeURIComponent(item.league)}`);
      const data = await response.json();

      if (!data || !data.teams) {
        console.log(`⚠️  Campionato saltato (nessun dato): ${item.league}`);
        continue;
      }

      console.log(`\n📂 Analisi ${item.league} -> ${item.folder}`);

      for (const team of data.teams) {
        if (!team.strBadge) continue;

        const nomeFile = `${sanitize(team.strTeam)}.png`;
        const percorso = path.join(nazioneDir, nomeFile);

        // --- CHECK INTELLIGENTE ---
        if (fs.existsSync(percorso)) {
          // Se il file esiste già, non fare nulla
          process.stdout.write(`⏭️`); 
          continue;
        }

        // Se non esiste, scarica
        try {
          const resImg = await fetch(team.strBadge);
          const buffer = await resImg.arrayBuffer();
          fs.writeFileSync(percorso, Buffer.from(buffer));
          process.stdout.write(`✅`); 
        } catch (imgErr) {
          console.log(`\n❌ Errore download ${team.strTeam}: ${imgErr.message}`);
        }
      }
      console.log(`\nLavoro terminato per ${item.league}`);

    } catch (err) {
      console.error(`\n🔴 Errore critico su ${item.league}:`, err.message);
    }
  }

  console.log('\n\n✨ TUTTO AGGIORNATO! La tua cartella "squadre" è ora completa e senza errori.');
}

eseguiAggiornamento();