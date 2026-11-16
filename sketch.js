let giocatori = [];
let erroreCaricamento = false;
let minRating=0;
let maxRating=0;
let maxPartite = 0;
let media = {};
let paginaDettaglio = window.location.pathname.includes("detail");
let giocatore = null;
let selezionato=null;
let COL_VITTORIA = [70, 210, 255];
let COL_PATTA = [150, 150, 150];
let COL_SCONFITTA = [255, 70, 110];


function setup()
{
  createCanvas(windowWidth, windowHeight);
  textFont("Courier New");

  caricaCSV();
}
async function caricaCSV()
{
  let testo = null;

  for (let percorso of ["chessplayers.csv", "assets/chessplayers.csv"]) {
 try {
      let risposta = await fetch(percorso);
      if (risposta.ok) {
        testo = await risposta.text();
        break;
      }
    } catch (e) {}
  }

  if (!testo) { erroreCaricamento = true; return; }

  leggiGiocatori(testo);


  if (paginaDettaglio && giocatori.length > 0)
  {
  let id = new URLSearchParams(window.location.search).get("id");
    giocatore = id ? giocatori.find(g => g.id === id.trim()) : giocatori[0];
  }
}

function draw() {
  background(0);

  if (erroreCaricamento)
  {
  fill(255, 70, 110);
    noStroke();
    textSize(15);
    textAlign(LEFT, TOP);
    text("Dataset chessplayers.csv non trovato.", 40, 40);
    return;
  }

  if (giocatori.length === 0) return;

  noStroke();
  textAlign(LEFT, TOP);

  if (paginaDettaglio) {   disegnaDettaglio();
  } else {
    disegnaInsieme();
  }
}


function dividiRigaCSV(riga)
{
    let campi = [];
    let corrente = "";
    let traVirgolette = false;

    for (let i = 0; i < riga.length; i++) {
        let c = riga[i];
        if (c === '"') {
            traVirgolette = !traVirgolette;
        } else if (c === "," && !traVirgolette) {
            campi.push(corrente.trim());
            corrente = "";
        } else {
            corrente += c;
        }
    }
    campi.push(corrente.trim());
    return campi;
}

function leggiGiocatori(testoCSV) {
  let righe = testoCSV.trim().split(/\r?\n/);
  if (righe.length < 2) return;

  let header = dividiRigaCSV(righe[0]);
  let col = {};
  for (let i=0; i<header.length; i++) {
    col[header[i]] = i;
  }


  for (let i = 1; i < righe.length; i++)
  {
    if (!righe[i].trim()) continue;
    let c = dividiRigaCSV(righe[i]);

    let rating = Number(c[col["rating"]]);
    let bTot = Number(c[col["white_total"]]);
    let bVinte = Number(c[col["white_win_num"]]);
    let bPatte = Number(c[col["white_draw_num"]]);
    let nTot = Number(c[col["black_total"]]);
    let nVinte = Number(c[col["black_win_num"]]);

    if (isNaN(rating) || isNaN(bTot) || isNaN(nTot)) continue;
    if (bTot === 0 || nTot === 0) continue;

    let nome = c[col["name"]];
    let pezzi = nome.split(", ");
    if (pezzi.length === 2) nome = pezzi[1] + " " + pezzi[0];

    let bPerse = bTot - bVinte - bPatte;

    giocatori.push({
      id: c[col["fide_id"]],
      nome: nome,
      federazione: c[col["federation"]],
      nascita: Number(c[col["birth_year"]]),
      rating: rating,
      bTot: bTot, bVinte: bVinte, bPatte: bPatte, bPerse: bPerse,
      nTot: nTot, nVinte: nVinte,
      pbV: bVinte / bTot,
      pbP: bPatte / bTot,
      pbS: bPerse / bTot,
      pnV: nVinte / nTot
    });
  }

  giocatori.sort((a, b) => b.rating - a.rating);

  minRating = giocatori[giocatori.length - 1].rating;
  maxRating = giocatori[0].rating;
  let somma = { rating: 0, pbV: 0, pbP: 0, pbS: 0, pnV: 0, partite: 0 };

  for (let g of giocatori) {
    maxPartite = max(maxPartite, g.bTot + g.nTot);
    somma.rating += g.rating;
    somma.pbV += g.pbV;
    somma.pbP += g.pbP;
    somma.pbS += g.pbS;
    somma.pnV += g.pnV;
    somma.partite += g.bTot + g.nTot;
  }
  for (let k in somma) {
    media[k] = somma[k] / giocatori.length;
  }
}


function disegnaInsieme()
{
  let margine = 40;
  let gapColonne = 44;

  let leftX = margine;
  let leftW = max(270, width * 0.34);

  let rightX = leftX + leftW + gapColonne;
  let rightW = width - rightX - margine;
  let rightH = height - margine * 2;

  let colonne = 10;
  let righe = ceil(giocatori.length / colonne);
  let cella = min(rightW / colonne, rightH / righe);

  let boardW = cella * colonne;
  let boardH = cella * righe;
  let startX = width - margine - boardW;
  let startY = (height - boardH) / 2;

  noStroke();
  textAlign(LEFT, TOP);

  fill(140);
  textSize(12);
  text("CLASSIFICA FIDE · APRILE 2026", leftX, startY);

  let titoloSize = constrain(leftW * 0.082, 22, 34);
  fill(255);
  textSize(titoloSize);
  textLeading(titoloSize * 1.18);
  text("I 100 MIGLIORI\nGIOCATORI\nDI SCACCHI", leftX, startY + 26);

  let descY = startY + 26 + titoloSize * 1.18 * 3 + 22;
  fill(165);
  textSize(13);
  textLeading(20);
  text("Ogni casella contiene un giocatore, ordinato dal rating più alto al più basso (da #1 a #100).\n\nClicca su un pezzo per aprire il dettaglio.", leftX, descY, leftW);

  disegnaLegendaSinistra(leftX, startY + boardH, leftW);


  selezionato = null;
  let selX = 0;
  let selY = 0;

  for (let i = 0; i < giocatori.length; i++) {
    let col = i % colonne;
    let riga = floor(i / colonne);
    let x0 = startX + col * cella;
    let y0 = startY + riga * cella;

    let hover = mouseX >= x0 && mouseX < x0 + cella && mouseY >= y0 && mouseY < y0 + cella;
    if (hover) {
      selezionato = giocatori[i];
      selX = x0;
      selY = y0;
    }

    let casellaChiara = (col + riga) % 2 === 0;
    noStroke();
    if (hover) fill(65);
    else fill(casellaChiara ? 42 : 20);
    rect(x0, y0, cella, cella);

    let scala = map(giocatori[i].rating, minRating, maxRating, 0.35, 1.0);
    let altMax = cella * 0.80;
    let bottomY = y0 + cella * 0.91;
    disegnaPezzo(i, x0 + cella / 2, bottomY, altMax, scala);
  }

  noFill();
  stroke(75);
  strokeWeight(1);
  rect(startX, startY, boardW, boardH);

  if (selezionato) {
    noFill();
    stroke(255);
    strokeWeight(1.5);
    rect(selX, selY, cella, cella);
    cursor(HAND);
  } else {
    cursor(ARROW);
  }

  if (selezionato) disegnaTooltip(selezionato);
}

function disegnaLegendaSinistra(x, bottomY, larg) {
  let altezzaLegenda = 200;
  let y = bottomY - altezzaLegenda;

  stroke(55);
  strokeWeight(1);
  line(x, y, x + larg, y);

  noStroke();
  textAlign(LEFT, TOP);

  fill(255);
  textSize(12);
  text("PEZZI · PER ORDINE DI VALORE", x, y + 14);

  let voci = [
    { idx: 0, label: "#1 RE" },
    { idx: 1, label: "#2 REGINA" },
    { idx: 2, label: "#3 ALFIERE" },
    { idx: 3, label: "#4 CAVALLO" },
    { idx: 4, label: "#5 TORRE" },
    { idx: 5, label: "#6–100 PEDONE" }
  ];

  let colW = larg / 2;
  for (let i = 0; i < voci.length; i++) {
    let col = i % 2;
    let riga = floor(i / 2);
    let vx = x + col * colW;
    let vy = y + 38 + riga * 34;

    disegnaPezzo(voci[i].idx, vx + 10, vy + 24, 24, 1.0);
    fill(235);
    textSize(11);
    text(voci[i].label, vx + 26, vy + 6);
  }

  fill(255);
  textSize(12);
  text("GRANDEZZA = RATING FIDE", x, y + 148);
  fill(150);
  textLeading(17);
  text("più grande = rating più alto, sempre più piccolo scendendo", x, y + 166, larg);
}

function mousePressed()
{
  if (!paginaDettaglio && selezionato) {
    window.location.href = "detail.html?id=" + selezionato.id;
  }
}

function disegnaTooltip(g) {
  let pos = giocatori.indexOf(g) + 1;
  let righe = ["#" + pos + " · " + g.nome, g.federazione + " · rating " + g.rating, "clicca per il dettaglio"];

  textSize(13);
  textAlign(LEFT, TOP);
  let w = 0;
  for (let i = 0; i < righe.length; i++) {
    w = max(w, textWidth(righe[i]));
  }
  w += 24;
  let h = righe.length * 20 + 14;

  let x = min(mouseX + 15, width - w - 10);
  let y = min(mouseY + 15, height - h - 10);

  fill(0, 240);
  stroke(255);
  strokeWeight(1);
  rect(x, y, w, h);

  noStroke();
  for (let i = 0; i < righe.length; i++) {
    if (i === 0) fill(255);
    else fill(150);
    text(righe[i], x + 12, y + 8 + i * 20);
  }
}


function disegnaDettaglio()
{
  if (!giocatore) {
    fill(255);
    textSize(20);
    text("Giocatore non trovato.", 40, 40);
    return;
  }

  let g = giocatore;
  let idx = giocatori.indexOf(g);
  let posizione = idx + 1;

  fill(150);
  textSize(12);
  text("DETTAGLIO GIOCATORE", 40, 30);

  let boxSize = min(width * 0.34, height * 0.52);
  let boxX = width * 0.27 - boxSize / 2;
  let boxY = height * 0.44 - boxSize / 2;

  fill(28);
  stroke(75);
  strokeWeight(1);
  rect(boxX, boxY, boxSize, boxSize);

  let scala = map(g.rating, minRating, maxRating, 0.35, 1.0);
  let altMax = boxSize * 0.80;
  let bottomY = boxY + boxSize * 0.91;
  disegnaPezzo(idx, boxX + boxSize / 2, bottomY, altMax, scala);

  disegnaLegendaDettaglio(40, height - 55, idx);

  let x0 = width * 0.55;
  let larg = width - x0 - 40;

  fill(255);
  textSize(30);
  text(g.nome, x0, 70);
  fill(150);
  textSize(13);
  text(g.federazione + " · nato nel " + g.nascita + " (" + (2026 - g.nascita) + " anni) · n° " + posizione + " su " + giocatori.length, x0, 114);

  let barre = [
    { nome: "RATING", valore: g.rating, media: media.rating, da: 2600, a: 2850,
      testo: g.rating + " (media " + round(media.rating) + ")", colore: [255, 255, 255] },
    { nome: "VITTORIE COL BIANCO", valore: g.pbV, media: media.pbV, da: 0, a: 1,
      testo: percentuale(g.pbV) + "  (" + g.bVinte + " su " + g.bTot + ")", colore: COL_VITTORIA },
    { nome: "PATTE COL BIANCO", valore: g.pbP, media: media.pbP, da: 0, a: 1,
      testo: percentuale(g.pbP) + "  (" + g.bPatte + " su " + g.bTot + ")", colore: COL_PATTA },
    { nome: "SCONFITTE COL BIANCO", valore: g.pbS, media: media.pbS, da: 0, a: 1,
      testo: percentuale(g.pbS) + "  (" + g.bPerse + " su " + g.bTot + ")", colore: COL_SCONFITTA },
    { nome: "VITTORIE COL NERO", valore: g.pnV, media: media.pnV, da: 0, a: 1,
      testo: percentuale(g.pnV) + "  (" + g.nVinte + " su " + g.nTot + ")", colore: COL_VITTORIA },
    { nome: "PARTITE GIOCATE", valore: g.bTot + g.nTot, media: media.partite, da: 0, a: maxPartite,
      testo: (g.bTot + g.nTot) + " (media " + round(media.partite) + ")", colore: [255, 255, 255] }
  ];

  let y = 170;
  for (let b of barre) {
    disegnaBarra(b, x0, y, larg);
    y += 62;
  }

  noStroke();
  fill(150);
  textSize(12);
  textAlign(LEFT, TOP);
  text("la linea bianca indica la media dei 100 giocatori", x0, y);
}

function disegnaBarra(b, x, y, larg) {
  noStroke();
  textSize(12);
  fill(150);
  textAlign(LEFT, TOP);
  text(b.nome, x, y);
  fill(255);
  textAlign(RIGHT, TOP);
  text(b.testo, x + larg, y);

  fill(40);
  rect(x, y + 20, larg, 12);
  let t = constrain(map(b.valore, b.da, b.a, 0, 1), 0, 1);
  fill(b.colore[0], b.colore[1], b.colore[2]);
  rect(x, y + 20, larg * t, 12);

  let tMedia = constrain(map(b.media, b.da, b.a, 0, 1), 0, 1);
  stroke(255);
  strokeWeight(2);
  line(x + larg * tMedia, y + 16, x + larg * tMedia, y + 36);
}

function percentuale(v) {
  return (v * 100).toFixed(1) + "%";
}

function disegnaPezzo(idx, cx, bottomY, altMax, scala) {
  if (idx === 0) disegnaRe(cx, bottomY, altMax, scala);
  else if (idx === 1) disegnaRegina(cx, bottomY, altMax, scala);
  else if (idx === 2) disegnaAlfiere(cx, bottomY, altMax, scala);
  else if (idx === 3) disegnaCavallo(cx, bottomY, altMax, scala);
  else if (idx === 4) disegnaTorre(cx, bottomY, altMax, scala);
  else disegnaPedone(cx, bottomY, altMax, scala);
}

function disegnaBaseECorpo(cx, bottomY, h, w, ratioTopW, ratioBodyH, ratioBaseH) {
  noStroke();
  fill(255);

  let baseH = h * ratioBaseH;
  let baseY = bottomY - baseH;
  rect(cx - w / 2, baseY, w, baseH);

  let gap = max(1.5, h * 0.03);
  let trapBottomY = baseY - gap;
  let trapH = h * ratioBodyH;
  let trapTopY = trapBottomY - trapH;
  let trapTopW = w * ratioTopW;

  quad(
    cx - trapTopW / 2, trapTopY,
    cx + trapTopW / 2, trapTopY,
    cx + w / 2, trapBottomY,
    cx - w / 2, trapBottomY
  );

  return { trapTopY: trapTopY, trapTopW: trapTopW };
}

function disegnaRe(cx, bottomY, altMax, scala) {
  let h = altMax * 1.07 * scala;
  let w = h * 0.44;
  let topY = bottomY - h;

  let corpo = disegnaBaseECorpo(cx, bottomY, h, w, 0.31, 0.38, 0.13);

  noStroke();
  fill(255);

  let rectH = h * 0.27;
  let rectTopY = corpo.trapTopY - rectH;
  let rectW = w * 0.56;
  rect(cx - rectW / 2, rectTopY, rectW, rectH + 1);

  let crossStemW = w * 0.16;
  let crossStemH = rectTopY - topY;
  rect(cx - crossStemW / 2, topY, crossStemW, crossStemH + 1);

  let crossBarW = w * 0.44;
  let crossBarH = h * 0.042;
  let crossBarY = topY + crossStemH * 0.36;
  rect(cx - crossBarW / 2, crossBarY, crossBarW, crossBarH);
}

function disegnaRegina(cx, bottomY, altMax, scala) {
  let h = altMax * scala;
  let w = h * 0.50;
  let topY = bottomY - h;

  let corpo = disegnaBaseECorpo(cx, bottomY, h, w, 0.32, 0.43, 0.14);

  noStroke();
  fill(255);

  let ballR = w * 0.09;
  let ballY = topY + ballR;
  let crownTopY = ballY + ballR * 0.65;
  let crownBotW = w * 0.42;
  let crownTopW = w * 0.62;

  quad(
    cx - crownTopW / 2, crownTopY,
    cx + crownTopW / 2, crownTopY,
    cx + crownBotW / 2, corpo.trapTopY + 1,
    cx - crownBotW / 2, corpo.trapTopY + 1
  );

  circle(cx, ballY, ballR * 2);
}

function disegnaAlfiere(cx, bottomY, altMax, scala) {
  let h = altMax * scala;
  let w = h * 0.52;
  let topY = bottomY - h;

  let corpo = disegnaBaseECorpo(cx, bottomY, h, w, 0.33, 0.41, 0.14);

  noStroke();
  fill(255);

  let ballR = w * 0.085;
  let ballY = topY + ballR;
  let mitreTopY = ballY + ballR * 0.55;
  let mitreMidY = lerp(mitreTopY, corpo.trapTopY, 0.53);
  let mitreW = w * 0.50;

  beginShape();
  vertex(cx, mitreTopY);
  vertex(cx + mitreW / 2, mitreMidY);
  vertex(cx + corpo.trapTopW * 0.60, corpo.trapTopY + 1);
  vertex(cx - corpo.trapTopW * 0.60, corpo.trapTopY + 1);
  vertex(cx - mitreW / 2, mitreMidY);
  endShape(CLOSE);

  circle(cx, ballY, ballR * 2);
}

function disegnaCavallo(cx, bottomY, altMax, scala) {
  let h = altMax * scala;
  let w = h * 0.54;
  let topY = bottomY - h;

  noStroke();
  fill(255);

  let baseH = h * 0.14;
  let baseY = bottomY - baseH;
  rect(cx - w / 2, baseY, w, baseH);

  let gap = max(1.5, h * 0.03);
  let bodyBotY = baseY - gap;

  beginShape();
  vertex(cx - w * 0.46, bodyBotY);
  vertex(cx + w * 0.46, bodyBotY);
  vertex(cx + w * 0.34, topY + h * 0.20);
  vertex(cx + w * 0.18, topY);
  vertex(cx + w * 0.02, topY + h * 0.13);
  vertex(cx - w * 0.44, topY + h * 0.26);
  vertex(cx - w * 0.38, topY + h * 0.39);
  vertex(cx - w * 0.08, topY + h * 0.39);
  endShape(CLOSE);
}

function disegnaTorre(cx, bottomY, altMax, scala) {
  let h = altMax * scala;
  let w = h * 0.54;
  let topY = bottomY - h;

  let corpo = disegnaBaseECorpo(cx, bottomY, h, w, 0.46, 0.45, 0.14);

  noStroke();
  fill(255);

  let headW = w * 0.64;
  let merlonH = h * 0.085;
  let headBaseY = topY + merlonH;
  let headH = corpo.trapTopY - headBaseY;

  rect(cx - headW / 2, headBaseY, headW, headH + 1);

  let merlonW = headW * 0.22;
  rect(cx - headW / 2, topY, merlonW, merlonH + 1);
  rect(cx - merlonW / 2, topY, merlonW, merlonH + 1);
  rect(cx + headW / 2 - merlonW, topY, merlonW, merlonH + 1);
}

function disegnaPedone(cx, bottomY, altMax, scala) {
  let h = altMax * scala;
  let w = h * 0.56;

  noStroke();
  fill(255);

  let baseH = h * 0.17;
  let baseY = bottomY - baseH;
  rect(cx - w / 2, baseY, w, baseH);

  let gap = max(1.5, h * 0.03);
  let trapBottomY = baseY - gap;

  let headR = w * 0.285;
  let headY = bottomY - h + headR;
  circle(cx, headY, headR * 2);

  let trapTopY = headY + headR * 0.72;
  let topW = headR * 1.05;
  quad(
    cx - topW / 2, trapTopY,
    cx + topW / 2, trapTopY,
    cx + w / 2, trapBottomY,
    cx - w / 2, trapBottomY
  );
}
function disegnaLegendaDettaglio(x, y, idx) {
  noStroke();
  textSize(12);
  textAlign(LEFT, CENTER);

  let nomi = ["RE = #1", "REGINA = #2", "ALFIERE = #3", "CAVALLO = #4", "TORRE = #5"];
  let etichetta = idx < nomi.length ? nomi[idx] : "PEDONE = GIOCATORE";

  fill(150);
  text(etichetta, x, y);

  let x2 = x + textWidth(etichetta) + 28;
  fill(255);
  text("GRANDEZZA = RATING FIDE (più grande = rating più alto)", x2, y);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
