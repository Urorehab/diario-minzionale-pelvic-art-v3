if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(() => console.log('Service Worker registrato'))
      .catch(err => console.error('SW non registrato', err));
  });
}

const app = document.getElementById('app');

let minzioni = [];
let liquidi = [];
let nomePaziente = "";

// Caricamento dati locali
const datiSalvatiMinzioni = localStorage.getItem('minzioni');
const datiSalvatiLiquidi = localStorage.getItem('liquidi');
if (datiSalvatiMinzioni) minzioni = JSON.parse(datiSalvatiMinzioni);
if (datiSalvatiLiquidi) liquidi = JSON.parse(datiSalvatiLiquidi);

const nomeSalvato = localStorage.getItem('nomePaziente');
if (nomeSalvato) {
  nomePaziente = nomeSalvato;
  window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('input-paziente').value = nomePaziente;
  });
}

function aggiornaOrario() {
  const orario = new Date().toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit'
  });
  document.getElementById('orario-attuale').textContent = orario;
}

function aggiornaNomePaziente() {
  nomePaziente = document.getElementById('input-paziente').value.trim();
  localStorage.setItem('nomePaziente', nomePaziente);
}

function aggiungiMinzione() {
  const volume = parseInt(document.getElementById('input-minzione').value);
  if (!volume) return;
  minzioni.push({ id: Date.now(), data: new Date(), volume });
  localStorage.setItem('minzioni', JSON.stringify(minzioni));
  document.getElementById('input-minzione').value = '';
  aggiornaStorico();
  aggiornaRiepilogo();
}

function aggiungiLiquido() {
  const volume = parseInt(document.getElementById('input-liquido').value);
  const tipo = document.getElementById('tipo-liquido').value;
  if (!volume) return;
  liquidi.push({ id: Date.now(), data: new Date(), volume, tipo });
  localStorage.setItem('liquidi', JSON.stringify(liquidi));
  document.getElementById('input-liquido').value = '';
  aggiornaStorico();
  aggiornaRiepilogo();
}

function datiUltime24Ore() {
  const ora = new Date();
  const cutoff = new Date(ora.getTime() - 24 * 60 * 60 * 1000);
  const minzioni24 = minzioni.filter(m => new Date(m.data) > cutoff);
  const liquidi24 = liquidi.filter(l => new Date(l.data) > cutoff);
  return {
    numeroMinzioni: minzioni24.length,
    volumeTotaleUrina: minzioni24.reduce((sum, m) => sum + m.volume, 0),
    volumeTotaleLiquidi: liquidi24.reduce((sum, l) => sum + l.volume, 0)
  };
}

function aggiornaRiepilogo() {
  const dati = datiUltime24Ore();
  document.getElementById('riepilogo-minzioni').textContent = dati.numeroMinzioni;
  document.getElementById('riepilogo-urine').textContent = dati.volumeTotaleUrina + ' ml';
  document.getElementById('riepilogo-liquidi').textContent = dati.volumeTotaleLiquidi + ' ml';
}

function aggiornaStorico() {
  const listaMinzioni = document.getElementById('storico-minzioni');
  listaMinzioni.innerHTML = minzioni.map(m =>
    `<li>${new Date(m.data).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} - ${m.volume} ml</li>`
  ).join('');

  const listaLiquidi = document.getElementById('storico-liquidi');
  listaLiquidi.innerHTML = liquidi.map(l =>
    `<li>${new Date(l.data).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} - ${l.volume} ml (${l.tipo})</li>`
  ).join('');
}

function azzeraDati() {
  if (confirm("Sei sicuro di voler azzerare tutti i dati?")) {
    minzioni = [];
    liquidi = [];
    localStorage.removeItem('minzioni');
    localStorage.removeItem('liquidi');
    localStorage.removeItem('nomePaziente');
    document.getElementById('input-paziente').value = '';
    nomePaziente = '';
    aggiornaStorico();
    aggiornaRiepilogo();
  }
}

function esportaPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("Diario Minzionale", 10, 10);

  let y = 20;
  const oggi = new Date().toLocaleDateString('it-IT');
  doc.setFontSize(12);
  doc.text(`Data: ${oggi}`, 10, y);
  y += 10;

  if (nomePaziente) {
    doc.setFont(undefined, 'bold');
    doc.text(`Nome: ${nomePaziente}`, 10, y);
    y += 10;
  }

  const dati = datiUltime24Ore();
  doc.setFont(undefined, 'bold');
  doc.text(`Frequenza minzioni: ${dati.numeroMinzioni}`, 10, y); y += 8;
  doc.text(`Totale urine espulse: ${dati.volumeTotaleUrina} ml`, 10, y); y += 8;
  doc.text(`Totale liquidi assunti: ${dati.volumeTotaleLiquidi} ml`, 10, y); y += 15;
  doc.setFont(undefined, 'normal');

  doc.setFontSize(12);
  doc.text("Storico Minzioni", 10, y);
  y += 10;
  minzioni.forEach((m, i) => {
    const ora = new Date(m.data).toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    });
    doc.text(`${i + 1}. ${ora} - ${m.volume} ml`, 10, y);
    y += 6;
    if (y > 280) { doc.addPage(); y = 10; }
  });

  y += 10;
  doc.text("Storico Liquidi", 10, y);
  y += 10;
  liquidi.forEach((l, i) => {
    const ora = new Date(l.data).toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    });
    doc.text(`${i + 1}. ${ora} - ${l.volume} ml (${l.tipo})`, 10, y);
    y += 6;
    if (y > 280) { doc.addPage(); y = 10; }
  });

  doc.save("diario-minzionale.pdf");
}

function inviaEmail() {
  const destinatario = "urorehab@gmail.com";
  const oggetto = encodeURIComponent("Diario Minzionale - " + nomePaziente);
  const corpo = encodeURIComponent(`Buongiorno,\n\nin allegato il mio diario minzionale.\n\nNome: ${nomePaziente}\n\nGrazie.`);
  window.location.href = `mailto:${destinatario}?subject=${oggetto}&body=${corpo}`;
}

app.innerHTML = `
  <div class="banner">
    <img src="logo.png" alt="Logo Studio" class="logo" style="max-height: 60px; object-fit: contain;" />
    <div>
      <h1>Urorehab</h1>
      <p>Studio di Fisioterapia e Riabilitazione del Pavimento Pelvico</p>
    </div>
  </div>

  <div class="contenuto">
    <h1 class="titolo-pagina">Diario Minzionale</h1>

    <h2 class="sottotitolo">Riepilogo ultime 24h</h2>
    <div class="riepilogo-grid">
      <div class="riepilogo-item">
        <div class="label">Frequenza Minzioni</div>
        <div id="riepilogo-minzioni" class="value">0</div>
      </div>
      <div class="riepilogo-item">
        <div class="label">Volume Totale Urine</div>
        <div id="riepilogo-urine" class="value">0 ml</div>
      </div>
      <div class="riepilogo-item">
        <div class="label">Liquidi Assunti</div>
        <div id="riepilogo-liquidi" class="value">0 ml</div>
      </div>
    </div>

    <div style="margin: 1rem 0; text-align: center;">
      <input id="input-paziente" type="text" placeholder="Inserisci il tuo nome" oninput="aggiornaNomePaziente()" />
    </div>

    <div style="margin: 1rem 0; text-align: center;">
      <button onclick="azzeraDati()">Azzera Dati</button>
      <button onclick="esportaPDF()">Esporta PDF</button>
      <button onclick="inviaEmail()">Invia via email</button>
    </div>

    <h2>Registra Minzione</h2>
    <div class="box">
      <div>Ora attuale: <span id="orario-attuale"></span></div>
      <input id="input-minzione" type="number" placeholder="Volume in ml" />
      <button onclick="aggiungiMinzione()">Aggiungi</button>
    </div>

    <h2>Registra Liquido</h2>
    <div class="box">
      <input id="input-liquido" type="number" placeholder="Volume in ml" />
      <select id="tipo-liquido">
        <option value="acqua">Acqua</option>
        <option value="caffè">Caffè</option>
        <option value="tè">Tè</option>
        <option value="succo">Succo</option>
        <option value="altro">Altro</option>
      </select>
      <button onclick="aggiungiLiquido()">Aggiungi</button>
    </div>

    <div class="storico-grid">
      <div>
        <h2>Storico Minzioni</h2>
        <ul id="storico-minzioni" class="storico"></ul>
      </div>
      <div>
        <h2>Storico Liquidi</h2>
        <ul id="storico-liquidi" class="storico"></ul>
      </div>
    </div>
  </div>
`;

setInterval(aggiornaOrario, 1000);
aggiornaStorico();
aggiornaRiepilogo();





