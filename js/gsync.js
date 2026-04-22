/* ══════════════════════════════════════════════════
   GOOGLE SHEETS SYNC — DOPK v10 (CORS-SAFE + DIAGNOSTIK)
══════════════════════════════════════════════════ */
let GS_URL = localStorage.getItem('dopk_gs_url') || '';
let gsLogs = [];

document.addEventListener('DOMContentLoaded', () => {
  GS_URL = localStorage.getItem('dopk_gs_url') || '';
  if(GS_URL) {
    const inp = document.getElementById('gs-url-input');
    if(inp) inp.value = GS_URL;
    gsUpdateStatusBar(true, 'URL tersimpan — belum diverifikasi');
  }
  // Tampilkan tombol Sheets di landing
  gsCheckLanding();
});

function bGsSync() {
  const inp = document.getElementById('gs-url-input');
  if(inp && GS_URL) inp.value = GS_URL;
  gsUpdateStatusBar(!!GS_URL, GS_URL ? 'URL tersimpan' : null);
  gsRenderLog();
  // Render tombol buka URL
  const diagEl = document.getElementById('gs-diag-url');
  if(diagEl && GS_URL) {
    diagEl.style.display = 'block';
    const link = document.getElementById('gs-open-url');
    if(link) link.href = GS_URL + '?action=ping';
  }
}

function gsUrlChanged() {
  const v = (document.getElementById('gs-url-input').value||'').trim();
  GS_URL = v;
  gsUpdateStatusBar(false);
  const diagEl = document.getElementById('gs-diag-url');
  if(diagEl) diagEl.style.display = v ? 'block' : 'none';
  const link = document.getElementById('gs-open-url');
  if(link && v) link.href = v + '?action=ping';
}

function gsSaveUrl() {
  const v = (document.getElementById('gs-url-input').value||'').trim();
  if(!v) { toast('⚠️ URL tidak boleh kosong!'); return; }
  if(!v.includes('script.google.com')) { toast('⚠️ URL harus dari script.google.com'); return; }
  if(!v.endsWith('/exec')) { toast('⚠️ URL harus diakhiri /exec bukan /dev!'); return; }
  GS_URL = v;
  localStorage.setItem('dopk_gs_url', GS_URL);
  gsUpdateStatusBar(true, 'URL tersimpan');
  toast('✅ URL Apps Script tersimpan!');
  const btn = document.getElementById('btn-pull');
  if(btn) btn.style.display = 'block';
  const diagEl = document.getElementById('gs-diag-url');
  if(diagEl) diagEl.style.display = 'block';
  const link = document.getElementById('gs-open-url');
  if(link) link.href = GS_URL + '?action=ping';
}

// ══ JSONP Helper ══
function gsJsonp(url) {
  return new Promise((resolve, reject) => {
    const cbName = 'dopk_cb_' + Date.now();
    const script = document.createElement('script');
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Timeout 15 detik — Apps Script tidak merespons'));
    }, 15000);
    function cleanup() {
      clearTimeout(timer);
      delete window[cbName];
      if(script.parentNode) script.parentNode.removeChild(script);
    }
    window[cbName] = (data) => { cleanup(); resolve(data); };
    script.onerror = (e) => {
      cleanup();
      reject(new Error('Script gagal dimuat — lihat panduan di bawah'));
    };
    const sep = url.includes('?') ? '&' : '?';
    script.src = url + sep + 'callback=' + cbName + '&_t=' + Date.now();
    document.head.appendChild(script);
  });
}

// ══ POST Helper ══
async function gsPost(data) {
  const res = await fetch(GS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(data)
  });
  if(!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

// ── Tes Koneksi ──
async function gsPing() {
  if(!GS_URL) { toast('⚠️ Masukkan URL dulu!'); return; }
  const el = document.getElementById('gs-ping-result');
  const setEl = (bg, bdr, html2) => {
    if(!el) return;
    el.style.cssText = `display:block;margin-top:8px;padding:10px 14px;border-radius:8px;font-size:10.5px;background:${bg};border:1px solid ${bdr}`;
    el.innerHTML = html2;
  };

  // Validasi URL dulu
  if(!GS_URL.endsWith('/exec')) {
    setEl('rgba(234,67,53,.1)','rgba(234,67,53,.3)',
      '❌ <strong>URL salah!</strong> URL harus diakhiri dengan <code style="background:rgba(0,0,0,.08);padding:1px 5px;border-radius:3px">/exec</code> bukan <code>/dev</code>');
    return;
  }

  setEl('rgba(251,188,4,.1)','rgba(251,188,4,.3)','⏳ Menghubungi Apps Script...');
  gsSetDot('syncing');

  try {
    const data = await gsJsonp(GS_URL + '?action=ping');
    if(data.status === 'ok') {
      setEl('rgba(15,157,88,.1)','rgba(15,157,88,.3)',
        '✅ <strong>Terhubung!</strong> Pelabuhan: <strong>'+(data.pelabuhan||'-')+'</strong> | Server: '+new Date(data.time).toLocaleString('id-ID'));
      gsSetDot('online');
      gsUpdateStatusBar(true, 'Terhubung — '+new Date().toLocaleTimeString('id-ID'));
      gsAddLog('PING','Berhasil — '+(data.pelabuhan||'-'));
      const btn = document.getElementById('btn-pull'); if(btn) btn.style.display='block';
      document.getElementById('gs-troubleshoot') && (document.getElementById('gs-troubleshoot').style.display='none');
    } else throw new Error(data.error||'Respons tidak valid');
  } catch(e) {
    const errMsg = e.message;
    setEl('rgba(234,67,53,.1)','rgba(234,67,53,.3)',
      '❌ <strong>Gagal:</strong> ' + errMsg);
    gsSetDot('offline');
    gsUpdateStatusBar(false, errMsg);
    gsAddLog('PING_GAGAL', errMsg);
    // Tampilkan panduan troubleshoot
    const ts = document.getElementById('gs-troubleshoot');
    if(ts) ts.style.display = 'block';
  }
}

// ── Pull ──
async function gsPullData() {
  if(!GS_URL) { toast('⚠️ Atur URL Apps Script dulu!'); return; }
  showL('Mengambil data dari Google Sheets...');
  gsSetDot('syncing'); gsLogAction('⏳ Mengambil data...');
  try {
    const json = await gsJsonp(GS_URL + '?action=getData');
    if(json.error) throw new Error(json.error);
    const grouped=json.data||{}, keys=json.keys||[];
    let count=0;
    keys.forEach(k=>{
      const d=grouped[k]; if(!d)return;
      // Pastikan fishData lengkap — rebuild dari vessel.fish jika perlu
      if(!d.fishData||!d.fishData.length) {
        d.fishData=[];
        (d.vessels||[]).forEach(v=>{
          (v.fish||[]).forEach(f=>{
            d.fishData.push({...f, kapal:v.namaKapal, tanggal:v.tglTiba, bulan:d.month+' '+d.year});
          });
        });
      }
      const ex=db.get(k);
      if(ex){
        const nos=new Set(ex.vessels.map(v=>v.noStblkk));
        const nv=d.vessels.filter(v=>!nos.has(v.noStblkk));
        ex.vessels.push(...nv);
        // Gabungkan fishData baru (hindari duplikat)
        const exFishSet=new Set(ex.fishData.map(f=>f.kapal+'|'+f.tanggal+'|'+f.jenis));
        ex.fishData.push(...d.fishData.filter(f=>!exFishSet.has(f.kapal+'|'+f.tanggal+'|'+f.jenis)));
        db.set(k,ex); count+=nv.length;
      } else { db.set(k,d); count+=d.vessels.length; }
    });
    hideL(); gsSetDot('online');
    const msg='✅ Berhasil ambil '+count+' kapal dari '+keys.length+' periode';
    gsUpdateStatusBar(true,'Sinkron: '+new Date().toLocaleString('id-ID'));
    gsLogAction(msg); gsAddLog('PULL',count+' kapal | '+keys.length+' periode');
    toast(msg); openDash();
  } catch(e) {
    hideL(); gsSetDot('offline');
    gsLogAction('❌ Gagal: '+e.message);
    gsAddLog('PULL_GAGAL',e.message); toast('❌ Gagal: '+e.message);
  }
}

// ── Push semua ──
async function gsPushAllData() {
  if(!GS_URL){toast('⚠️ Atur URL dulu!');return;}
  const keys=sortedKeys(); if(!keys.length){toast('⚠️ Tidak ada data!');return;}
  showL('Mengirim ke Google Sheets...'); gsSetDot('syncing');
  gsLogAction('⏳ Mengirim '+keys.length+' periode...');
  let saved=0,dup=0,err=0;
  for(const k of keys){
    const d=db.get(k); if(!d||!d.vessels.length)continue;
    try{
      const j=await gsPost({action:'saveBatch',data:{vessels:d.vessels}});
      if(j.error)throw new Error(j.error);
      saved+=j.results?.saved||0; dup+=j.results?.duplicate||0;
    }catch(e){err++;}
  }
  // Push data Indikator ke Sheets
  try {
    const BULAN_ID=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const indRows=[];
    Object.entries(IND).forEach(([yr,indObj])=>{
      BULAN_ID.forEach(bln=>{
        const m=indObj.months&&indObj.months[bln];
        if(m)indRows.push({tahun:yr,bulan:bln,kunjungan:m.kunjungan||0,produksi:m.produksi||0,nilai:m.nilai||0,penangkap:m.penangkap||0,pengangkut:m.pengangkut||0});
      });
    });
    if(indRows.length){
      await gsPost({action:'saveIndikator',data:{rows:indRows}});
      gsAddLog('PUSH_IND',indRows.length+' baris indikator');
    }
  } catch(ei){ console.warn('Push indikator gagal:',ei.message); }

  hideL(); gsSetDot('online');
  const msg='✅ Selesai — Tersimpan: '+saved+' | Duplikat: '+dup+' | Gagal: '+err;
  gsLogAction(msg); gsAddLog('PUSH','Tersimpan: '+saved+' | Duplikat: '+dup); toast(msg);
}

// ── Push satu kapal ──
async function gsPushVessel(vessel) {
  if(!GS_URL)return;
  try{
    const j=await gsPost({action:'saveVessel',data:{vessel,sumber:'manual'}});
    if(j.status==='ok'){
      gsAddLog('TAMBAH',vessel.namaKapal+' — '+vessel.tglTiba);
      gsUpdateStatusBar(true,'Terakhir sync: '+new Date().toLocaleTimeString('id-ID'));
    }
  }catch(e){console.warn('Push kapal gagal:',e.message);}
}

function unduhPanduanGs(){
  const a=document.createElement('a');
  a.href='data:text/plain;charset=utf-8,'+encodeURIComponent('// Download file .gs dari admin sistem');
  a.download='DOPK_AppsScript_Code.gs'; a.click();
}

function gsUpdateStatusBar(connected,msg){
  const ids={dot:'gs-main-dot',dotSb:'gs-dot-sb',lbl:'gs-main-label',sub:'gs-main-sub',
             badge:'gs-sync-badge',panel:'gs-status-panel',sbSt:'gs-status-sb',pull:'btn-pull'};
  const el=k=>document.getElementById(ids[k]);
  if(connected){
    ['dot','dotSb'].forEach(k=>{if(el(k))el(k).className='gs-dot online';});
    if(el('lbl'))el('lbl').textContent='Terhubung ke Google Sheets';
    if(el('sub'))el('sub').textContent=msg||'Data tersinkron';
    if(el('badge')){el('badge').className='sync-badge sb-cloud';el('badge').textContent='☁️ Cloud Sync';}
    if(el('panel')){el('panel').className='gs-panel';el('panel').style.borderColor='rgba(15,157,88,.25)';}
    if(el('sbSt'))el('sbSt').textContent=msg||'Terhubung';
    if(el('pull'))el('pull').style.display='block';
  }else{
    ['dot','dotSb'].forEach(k=>{if(el(k))el(k).className='gs-dot offline';});
    if(el('lbl'))el('lbl').textContent=GS_URL?'Koneksi Bermasalah':'Belum Terhubung';
    if(el('sub'))el('sub').textContent=msg||(GS_URL?'Coba Tes Koneksi':'Masukkan URL Apps Script');
    if(el('badge')){el('badge').className='sync-badge sb-local';el('badge').textContent='💾 Data Lokal';}
    if(el('panel'))el('panel').className='gs-panel warn';
    if(el('sbSt'))el('sbSt').textContent=GS_URL?'Bermasalah':'Belum terhubung';
  }
}
function gsSetDot(s){['gs-main-dot','gs-dot-sb'].forEach(id=>{const el=document.getElementById(id);if(el)el.className='gs-dot '+s;});}
function gsLogAction(m){const el=document.getElementById('gs-action-log');if(el){el.style.display='block';el.textContent=m;}}
function gsAddLog(a,d){gsLogs.unshift({ts:new Date().toLocaleString('id-ID'),aksi:a,detail:d});if(gsLogs.length>20)gsLogs.pop();gsRenderLog();}
function setTTab(name) {
  document.querySelectorAll('.ttab').forEach(t => t.classList.remove('active'));
  const el = document.getElementById('ttab-' + name);
  if(el) el.classList.add('active');
}
// Override G() untuk sync ttab
const _G_orig = G;
// Patch smenu-item klik juga sync ttab
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.smenu-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ttab').forEach(t => t.classList.remove('active'));
    });
  });
});


// → buildIndFromRekap dipindah ke chart.js



function gsRenderLog(){
  const el=document.getElementById('gs-log-list');if(!el)return;
  if(!gsLogs.length){el.textContent='Belum ada aktivitas';return;}
  el.innerHTML=gsLogs.map(l=>`<div style="display:flex;gap:8px;padding:5px 0;border-bottom:1px solid rgba(0,0,0,.05)">
    <span style="color:#456789;min-width:130px;font-size:9.5px">${l.ts}</span>
    <span style="font-weight:600;color:#004e7c;min-width:90px;font-size:10px">${l.aksi}</span>
    <span style="color:#456789;font-size:10px">${l.detail}</span></div>`).join('');
}

// ══ Tampilkan tombol Sheets di landing jika URL sudah tersimpan ══
function gsCheckLanding() {
  const url = localStorage.getItem('dopk_gs_url') || '';
  const panel = document.getElementById('gs-landing-panel');
  if(panel) panel.style.display = url ? 'block' : 'none';
}

// ══ Muat data dari Sheets langsung dari halaman landing ══
async function landingLoadFromSheets() {
  const url = localStorage.getItem('dopk_gs_url') || '';
  if(!url) return;
  GS_URL = url;

  const btn = document.getElementById('btn-load-sheets');
  const sts = document.getElementById('gs-landing-status');
  if(btn) { btn.disabled = true; btn.textContent = '⏳ Memuat data...'; }
  if(sts) sts.textContent = 'Menghubungi Google Sheets...';

  try {
    // 1. Ambil data rekap kapal
    if(sts) sts.textContent = '☁️ Mengambil data kunjungan kapal...';
    const json = await gsJsonp(url + '?action=getData');
    if(json.error) throw new Error(json.error);

    const grouped = json.data || {}, keys = json.keys || [];
    let countVessel = 0;
    keys.forEach(k => {
      const d = grouped[k]; if(!d) return;
      // Rebuild fishData dari vessel.fish jika kosong
      if(!d.fishData||!d.fishData.length) {
        d.fishData=[];
        (d.vessels||[]).forEach(v=>{
          (v.fish||[]).forEach(f=>{
            d.fishData.push({...f, kapal:v.namaKapal, tanggal:v.tglTiba, bulan:d.month+' '+d.year});
          });
        });
      }
      db.set(k, d);
      countVessel += d.vessels.length;
    });

    // 2. Ambil data indikator
    if(sts) sts.textContent = '📊 Mengambil data indikator...';
    try {
      const jsonInd = await gsJsonp(url + '?action=getIndikator');
      if(jsonInd.status === 'ok' && jsonInd.data) {
        Object.entries(jsonInd.data).forEach(([yr, indData]) => {
          db.set('IND_' + yr, indData);
          IND[yr] = indData;
        });
      }
    } catch(ei) {
      console.warn('Indikator tidak tersedia di Sheets:', ei.message);
    }

    if(btn) { btn.disabled = false; btn.textContent = '☁️ Muat dari Google Sheets'; }
    if(sts) sts.textContent = '✅ ' + countVessel + ' kapal dari ' + keys.length + ' periode berhasil dimuat!';

    // Buka dashboard
    buildIndFromRekap();
    setTimeout(() => openDash(), 800);

  } catch(e) {
    if(btn) { btn.disabled = false; btn.textContent = '☁️ Muat dari Google Sheets'; }
    if(sts) sts.textContent = '❌ Gagal: ' + e.message + ' — Cek koneksi & URL di menu Sinkronisasi';
  }
}