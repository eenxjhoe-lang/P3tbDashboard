/* ══════════════════════════════════════════════════
   APP.JS — Logika Utama DOPK Dashboard
   Navigasi, Parse, Storage, Edit, Export, Database
══════════════════════════════════════════════════ */
/* global Chart, XLSX */

/* ══════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded',()=>{
  initBG();
  document.getElementById('btn-up').addEventListener('click',e=>{e.stopPropagation();document.getElementById('fi').click();});
  document.getElementById('fi').addEventListener('change',e=>{[...e.target.files].forEach(processFile);e.target.value='';});
  const uc=document.getElementById('upcard');
  uc.addEventListener('dragover',e=>{e.preventDefault();uc.classList.add('drag-on');});
  uc.addEventListener('dragleave',()=>uc.classList.remove('drag-on'));
  uc.addEventListener('drop',e=>{e.preventDefault();uc.classList.remove('drag-on');[...e.dataTransfer.files].forEach(processFile);});
  document.getElementById('btn-exp').addEventListener('click',exportExcel);
  loadFromURL();
  renderLanding();
});

function initBG(){
  const bg=document.getElementById('bg');
  for(let i=0;i<8;i++){const b=document.createElement('div');b.className='bub';const s=7+Math.random()*20;b.style.cssText=`width:${s}px;height:${s}px;left:${Math.random()*100}%;animation-duration:${11+Math.random()*11}s;animation-delay:${Math.random()*7}s`;bg.appendChild(b);}
  ['🐟','🐠','🐡','🦈','🐬'].forEach((f,i)=>{const e=document.createElement('div');e.className='fsw';e.textContent=f;e.style.cssText=`top:${10+i*15}%;font-size:${13+i*2}px;animation-duration:${22+i*5}s;animation-delay:${i*3.5}s;transform:scaleX(${i%2?-1:1})`;bg.appendChild(e);});
}

/* ══════════════════════════════════════════════════
   SORT KEYS
══════════════════════════════════════════════════ */
function sortedKeys(){
  return db.allKeys().filter(k=>!k.startsWith('IND_')).sort((a,b)=>{
    const[ma,ya]=a.split('_'),[mb,yb]=b.split('_');
    return(+ya-+yb)||(MONTHS.indexOf(ma)-MONTHS.indexOf(mb));
  });
}

/* ══════════════════════════════════════════════════
   LANDING
══════════════════════════════════════════════════ */
function renderLanding(){
  db.allKeys().filter(k=>k.startsWith('IND_')).forEach(k=>{const d=db.get(k);if(d)IND[d.year]=d;});
  const keys=sortedKeys();
  const wrap=document.getElementById('sto-wrap'),grid=document.getElementById('mg');
  if(!keys.length){wrap.style.display='none';return;}
  wrap.style.display='block';
  grid.innerHTML=keys.map(k=>{
    const d=db.get(k);
    const tv=d.fishData.reduce((s,f)=>s+f.nilai,0);
    return`<div class="mc" onclick="quickOpen('${k}')">
      <button class="mc-del" onclick="event.stopPropagation();if(confirm('Hapus data '+d.month+' '+d.year+'?'))doDelKey('${k}')" title="Hapus">✕</button>  <span class="mc-ico">📅</span>
      <div class="mc-name">${d.month} ${d.year}</div>
      <div class="mc-ct">${d.vessels.length} kunjungan kapal</div>
      <div class="mc-val">${fRp(tv)}</div>
    </div>`;
  }).join('');
}

/* ══════════════════════════════════════════════════
   PROCESS FILE
══════════════════════════════════════════════════ */
function processFile(file){
  if(!file||!file.name.match(/\.(xlsx|xls)$/i)){toast('⚠️ Hanya file .xlsx/.xls');return;}
  showL('Membaca '+file.name+'...');
  const r=new FileReader();
  r.onload=e=>{
    try{
      const wb=XLSX.read(new Uint8Array(e.target.result),{type:'array',cellDates:true});
      const raw=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:null});
      if(isInd(raw)){
        const p=parseInd(raw,file.name);
        db.set('IND_'+p.year,p);IND[p.year]=p;
        toast('✅ Indikator '+p.year+' tersimpan!');
      }else{
        const p=parseRekap(raw,file.name);
        const k=p.month+'_'+p.year;
        const ex=db.get(k);
        if(ex){
          const ns=new Set(ex.vessels.map(v=>v.noStblkk));
          const nv=p.vessels.filter(v=>!ns.has(v.noStblkk));
          ex.vessels.push(...nv);
          ex.fishData.push(...nv.flatMap(v=>v.fish.map(f=>({...f,kapal:v.namaKapal,tanggal:v.tglTiba}))));
          db.set(k,ex);toast('🔄 '+nv.length+' data baru → '+p.month+' '+p.year);
        }else{db.set(k,p);toast('✅ Data '+p.month+' '+p.year+' tersimpan!');}
      }
      openDash();
    }catch(err){hideL();toast('❌ Error: '+err.message);console.error(err);}
  };
  r.onerror=()=>{hideL();toast('❌ Gagal membaca file');};
  r.readAsArrayBuffer(file);
}

/* ══════════════════════════════════════════════════
   DETECT & PARSE INDIKATOR
══════════════════════════════════════════════════ */
function isInd(raw){
  for(let i=0;i<6;i++){const r=raw[i];if(r&&r[0]&&typeof r[0]==='string'){const s=r[0].toUpperCase();if(s.includes('INDIKATOR')||s.includes('OPERASIONAL PELABUHAN'))return true;}}
  return false;
}

function parseInd(raw,fileName){
  const ym=fileName.match(/20\d{2}/);const year=ym?ym[0]:'2026';
  const monthRow=raw[6]||[];
  const colMon={};
  MONTHS.forEach(m=>{const idx=monthRow.findIndex(c=>c&&c.toString().toLowerCase().includes(m.toLowerCase()));if(idx>=0)colMon[idx]=m;});
  const rows=[];
  for(let i=7;i<=36;i++){
    const row=raw[i];if(!row)continue;
    const no=row[0],nama=row[1],satuan=row[2];
    if(!nama&&!no)continue;
    const noStr=(no!==null&&no!==undefined&&String(no).trim()!==''&&String(no).trim()!=='NaN')?String(no).trim():'';
    const item={no:noStr,nama:nama?String(nama).trim():'',satuan:satuan?String(satuan).trim():'',values:{},total:nON(row[15]),isSub:noStr===''};
    Object.entries(colMon).forEach(([col,mon])=>{item.values[mon]=nON(raw[i][+col]);});
    if(item.nama)rows.push(item);
  }
  const activeMons=MONTHS.filter(m=>Object.values(colMon).includes(m)&&rows.some(r=>r.values[m]!==null));
  return{rows,months:Object.values(colMon),activeMons,year,fileName,savedAt:new Date().toISOString()};
}

/* ══════════════════════════════════════════════════
   PARSE REKAP
══════════════════════════════════════════════════ */
function parseRekap(raw,fileName){
  const rows=raw.slice(4);const vessels=[],fishData=[];let cur=null;
  rows.forEach(row=>{
    const no=row[0];
    if(no!==null&&no!==''&&!isNaN(no)&&String(no).toUpperCase()!=='TOTAL'){
      cur={no,tglTiba:fD(row[2]),tglBerangkat:fD(row[3]),noStblkk:s(row[4]),namaKapal:s(row[5]),
        nakhoda:s(row[6]),perusahaan:s(row[7]),alamat:s(row[8]),tandaSelar:s(row[9]),
        gt:n(row[10]),abk:n(row[15]),jenisKapal:s(row[16]).toUpperCase(),merkMesin:s(row[17]),
        kegiatan:s(row[18]),alatTangkap:s(row[19]).toUpperCase(),
        logistik:{es:n(row[24]),air:n(row[25]),solar:n(row[26]),oli:n(row[27]),gas:n(row[28]),
                  bensin:n(row[29]),beras:n(row[30]),garam:n(row[31]),gula:n(row[32]),minyakGoreng:n(row[33]),rokok:n(row[34])},
        tujuan:s(row[35]),fish:[],bulan:''};
      if(row[20]&&row[21])pF(cur,row,fishData);
      vessels.push(cur);
    }else if(cur&&row[20]&&row[21])pF(cur,row,fishData);
  });
  const mm=fileName.match(/(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)/i);
  const ym=fileName.match(/20\d{2}/);
  const month=mm?cap(mm[1]):'BulanIni';const year=ym?ym[0]:String(new Date().getFullYear());
  vessels.forEach(v=>v.bulan=month+' '+year);
  return{vessels,fishData,month,year,fileName,savedAt:new Date().toISOString()};
}
function pF(c,row,fd){const j=n(row[21]),h=n(row[22]);const f={jenis:s(row[20]),jumlah:j,harga:h,nilai:j*h};c.fish.push(f);fd.push({...f,kapal:c.namaKapal,tanggal:c.tglTiba,bulan:c.bulan||''});}
// → dipindah ke utils.js
// → dipindah ke utils.js
// → dipindah ke utils.js
// → dipindah ke utils.js
// → dipindah ke utils.js
// → dipindah ke utils.js
// → dipindah ke utils.js

/* ══════════════════════════════════════════════════
   OPEN DASHBOARD
══════════════════════════════════════════════════ */
function openDash(){
  db.allKeys().filter(k=>k.startsWith('IND_')).forEach(k=>{const d=db.get(k);if(d)IND[d.year]=d;});
  const keys=sortedKeys();
  if(!keys.length){goLanding();return;}
  document.getElementById('landing').style.display='none';
  document.getElementById('dash').style.display='block';
  buildPSels(keys);applyRange();
}
function quickOpen(key){
  db.allKeys().filter(k=>k.startsWith('IND_')).forEach(k=>{const d=db.get(k);if(d)IND[d.year]=d;});
  const keys=sortedKeys();
  document.getElementById('landing').style.display='none';
  document.getElementById('dash').style.display='block';
  buildPSels(keys);
  document.getElementById('pFrom').value=key;document.getElementById('pTo').value=key;
  applyRange();
}
function goLanding(){document.getElementById('dash').style.display='none';document.getElementById('landing').style.display='flex';renderLanding();}
function buildPSels(keys){const o=keys.map(k=>{const d=db.get(k);return`<option value="${k}">${d.month} ${d.year}</option>`;}).join('');document.getElementById('pFrom').innerHTML=o;document.getElementById('pTo').innerHTML=o;document.getElementById('pTo').selectedIndex=keys.length-1;}
function applyRange(){
  const keys=sortedKeys();
  let fi=keys.indexOf(document.getElementById('pFrom').value),ti=keys.indexOf(document.getElementById('pTo').value);
  const f=Math.min(fi,ti),t=Math.max(fi,ti);
  const sel=keys.slice(f,t+1);
  const vessels=[],fishData=[];
  sel.forEach(k=>{const d=db.get(k);if(d){vessels.push(...d.vessels);fishData.push(...d.fishData);}});
  let label='';
  if(sel.length===1){const d=db.get(sel[0]);label=d.month+' '+d.year;}
  else if(sel.length>1){const d0=db.get(sel[0]),d1=db.get(sel[sel.length-1]);label=d0.month+' — '+d1.month+' '+d1.year;}
  MRG={vessels,fishData,label,keys:sel};
  document.getElementById('pbd').textContent=label;
  document.querySelectorAll('.pbds').forEach(e=>e.textContent=label);
  const tp=document.getElementById('topbar-period');if(tp)tp.textContent=label;
  buildIndFromRekap(); // Hitung ulang Indikator dari data rekap terbaru
  showL('Memuat '+label+'...');
  setTimeout(()=>{buildAllPages();hideL();},200);
}

/* ══════════════════════════════════════════════════
   CONFIRM / DELETE / UI
══════════════════════════════════════════════════ */
function openConf(msg,cb){CONF_CB=cb;document.getElementById('conf-msg').textContent=msg;document.getElementById('conf-modal').classList.add('on');document.getElementById('conf-ok-btn').onclick=()=>{closeConf();if(CONF_CB)CONF_CB();};}
function closeConf(){document.getElementById('conf-modal').classList.remove('on');CONF_CB=null;}
function doDelKey(k){const d=db.get(k);db.del(k);toast('🗑 Data '+d.month+' '+d.year+' dihapus');const r=sortedKeys();if(!r.length)goLanding();else openDash();}
function doDelActive(){const k=document.getElementById('pFrom').value;if(k)doDelKey(k);}
// → dipindah ke utils.js
// → dipindah ke utils.js
let _tt=null;// → dipindah ke utils.js
function G(name,btn){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.smenu-item,.nt').forEach(t=>t.classList.remove('active'));
  document.getElementById('page-'+name).classList.add('active');
  if(btn)btn.classList.add('active');
  if(name==='indikator')bIndikator();
  if(name==='sinkron')bSinkron();
  if(name==='saran')bSaran();
  if(name==='kelola'){bKelola();setTimeout(G_kelola_setup,100);}
  if(name==='dbkapal')bDbKapal();
  if(name==='dbikan')bDbIkan();
  if(name==='inputkapal')bInputKapal();
  if(name==='gssync')bGsSync();
}
function kc(id){if(CH[id]){CH[id].destroy();delete CH[id];}}
const PAL=['#1de0b0','#f5a623','#3a9bd5','#e8523a','#7c5cbf','#27ae60','#e67e22','#e91e63','#00bcd4','#ff9800'];
const CO={responsive:true,plugins:{legend:{labels:{color:'rgba(0,50,100,.7)',font:{size:9.5}}}},scales:{x:{ticks:{color:'rgba(180,220,238,.38)',font:{size:8.5}},grid:{color:'rgba(0,80,140,.07)'}},y:{ticks:{color:'rgba(180,220,238,.38)',font:{size:8.5}},grid:{color:'rgba(255,255,255,.035)'}}}};
function gtrRanges(vessels){return[{l:'<5GT',mn:0,mx:4.99},{l:'5-10GT',mn:5,mx:10},{l:'11-20GT',mn:11,mx:20},{l:'21-30GT',mn:21,mx:30},{l:'>30GT',mn:30.01,mx:9999}].map(d=>({...d,c:vessels.filter(v=>v.gt>=d.mn&&v.gt<=d.mx).length})).filter(r=>r.c>0);}

/* ══════════════════════════════════════════════════
   EDIT REKAP — FISH DATA
══════════════════════════════════════════════════ */
function openEditFish(key){
  EDIT_KEY=key;
  const d=db.get(key);if(!d)return;
  document.getElementById('modal-title').textContent='✏️ Edit Data Rekap — '+d.month+' '+d.year;
  const body=document.getElementById('modal-body');
  body.innerHTML=`
    <div class="alert alert-warn"><span class="ai">💡</span><div>Edit langsung data produksi ikan. Nilai akan dihitung ulang otomatis (Jumlah × Harga). Perubahan langsung tersimpan ke database browser.</div></div>
    <div class="section-ttl">Data Produksi Ikan</div>
    <table class="fish-table" id="edit-fish-tbl">
      <thead><tr><th>Kapal</th><th>Jenis Ikan</th><th>Jumlah (Kg)</th><th>Harga (Rp/Kg)</th><th>Nilai (Rp)</th><th>Del</th></tr></thead>
      <tbody id="edit-fish-tbody"></tbody>
    </table>
    <div style="margin-top:12px">
      <button class="btn-s bs-sky" onclick="addFishRow()">＋ Tambah Baris</button>
    </div>
    <div class="divider"></div>
    <div class="section-ttl">Ringkasan</div>
    <div id="edit-summary" style="font-size:11px;color:var(--DM)"></div>`;

  renderFishEditTable(d.fishData);
  document.getElementById('edit-modal').classList.add('open');
}

function renderFishEditTable(fishData){
  const tbody=document.getElementById('edit-fish-tbody');
  tbody.innerHTML=fishData.map((f,i)=>{
    const expected=f.jumlah*f.harga;const diff=Math.abs(f.nilai-expected)>0.5;
    return`<tr data-idx="${i}" class="${diff?'mismatch':''}">
      <td><input type="text" value="${escHtml(f.kapal)}" onchange="updateFishField(${i},'kapal',this.value)" style="min-width:100px"></td>
      <td><input type="text" value="${escHtml(f.jenis)}" onchange="updateFishField(${i},'jenis',this.value)" style="min-width:100px"></td>
      <td><input type="number" value="${f.jumlah}" onchange="updateFishField(${i},'jumlah',this.value)" onkeyup="recalcRow(${i})" style="min-width:70px;${diff?'border-color:var(--G)':''}"></td>
      <td><input type="number" value="${f.harga}" onchange="updateFishField(${i},'harga',this.value)" onkeyup="recalcRow(${i})" style="min-width:80px;${diff?'border-color:var(--G)':''}"></td>
      <td id="nilai-cell-${i}" style="font-weight:700;color:${diff?'var(--CO)':'var(--TL)'};padding:5px 8px;">${fRp(f.nilai)}<br><small style="color:var(--DM);font-size:8.5px">Kalk: ${fRp(expected)}</small></td>
      <td><button class="del-row" onclick="deleteFishRow(${i})" title="Hapus">🗑</button></td>
    </tr>`;
  }).join('');
  updateEditSummary();
}

let _editFishData=[];
function openEditFish2(key){EDIT_KEY=key;const d=db.get(key);_editFishData=JSON.parse(JSON.stringify(d.fishData));openEditFish(key);}

function updateFishField(idx,field,val){
  const d=db.get(EDIT_KEY);if(!d)return;
  d.fishData[idx][field]=field==='jenis'||field==='kapal'?val:n(val);
  if(field==='jumlah'||field==='harga'){d.fishData[idx].nilai=d.fishData[idx].jumlah*d.fishData[idx].harga;}
  db.set(EDIT_KEY,d);updateEditSummary();
}
function recalcRow(idx){
  const d=db.get(EDIT_KEY);if(!d)return;
  const tr=document.querySelector(`#edit-fish-tbody tr[data-idx="${idx}"]`);if(!tr)return;
  const jInput=tr.querySelectorAll('input[type=number]')[0];const hInput=tr.querySelectorAll('input[type=number]')[1];
  if(!jInput||!hInput)return;
  const j=n(jInput.value),h=n(hInput.value),val=j*h;
  d.fishData[idx].jumlah=j;d.fishData[idx].harga=h;d.fishData[idx].nilai=val;
  db.set(EDIT_KEY,d);
  const nc=document.getElementById('nilai-cell-'+idx);if(nc){nc.innerHTML=fRp(val)+`<br><small style="color:var(--DM);font-size:8.5px">Kalk: ${fRp(val)}</small>`;nc.style.color='var(--TL)';}
  tr.classList.remove('mismatch');updateEditSummary();
}
function deleteFishRow(idx){
  const d=db.get(EDIT_KEY);if(!d)return;
  d.fishData.splice(idx,1);
  // Also remove from associated vessel's fish array
  db.set(EDIT_KEY,d);renderFishEditTable(d.fishData);
}
function addFishRow(){
  const d=db.get(EDIT_KEY);if(!d)return;
  d.fishData.push({jenis:'',jumlah:0,harga:0,nilai:0,kapal:'',tanggal:'',bulan:d.month+' '+d.year});
  db.set(EDIT_KEY,d);renderFishEditTable(d.fishData);
}
function updateEditSummary(){
  const d=db.get(EDIT_KEY);if(!d)return;
  const tKg=d.fishData.reduce((s,f)=>s+f.jumlah,0);
  const tVal=d.fishData.reduce((s,f)=>s+f.nilai,0);
  const errs=d.fishData.filter(f=>Math.abs(f.nilai-f.jumlah*f.harga)>0.5).length;
  const el=document.getElementById('edit-summary');
  if(el)el.innerHTML=`<div class="sync-summary" style="grid-template-columns:1fr 1fr 1fr;gap:8px">
    <div class="sync-card"><div class="sync-item"><span class="sync-key">Total Kg</span><span class="sync-val ok-val">${fN(tKg)} Kg</span></div></div>
    <div class="sync-card"><div class="sync-item"><span class="sync-key">Total Nilai</span><span class="sync-val ok-val">${fRp(tVal)}</span></div></div>
    <div class="sync-card"><div class="sync-item"><span class="sync-key">Error Nilai</span><span class="sync-val ${errs===0?'ok-val':'bad-val'}">${errs===0?'✓ Tidak ada':errs+' error'}</span></div></div>
  </div>`;
}

function saveEditedEntry(){
  const d=db.get(EDIT_KEY);if(!d)return;
  // Recalculate all nilai
  d.fishData.forEach(f=>{f.nilai=f.jumlah*f.harga;});
  // Rebuild vessels fish from fishData
  d.vessels.forEach(v=>{v.fish=d.fishData.filter(f=>f.kapal===v.namaKapal&&f.tanggal===v.tglTiba);});
  db.set(EDIT_KEY,d);
  closeEditModal();
  toast('✅ Data berhasil disimpan & dihitung ulang!');
  applyRange();
}

function fixFishValue(bulan,kapal,jenis){
  // Auto-fix: set nilai = jumlah * harga for this specific fish
  const key=bulan?bulan.replace(' ','_'):'';
  // Find which key
  sortedKeys().forEach(k=>{
    const d=db.get(k);if(!d)return;
    let changed=false;
    d.fishData.forEach(f=>{
      if(f.kapal===kapal&&f.jenis===jenis&&Math.abs(f.nilai-f.jumlah*f.harga)>0.5){
        f.nilai=f.jumlah*f.harga;changed=true;
      }
    });
    if(changed){db.set(k,d);}
  });
  toast('🔧 Nilai diperbaiki: '+jenis+' → '+kapal);
  applyRange();setTimeout(()=>bSinkron(),300);
}

function closeEditModal(){document.getElementById('edit-modal').classList.remove('open');}

/* ══════════════════════════════════════════════════
   EDIT INDIKATOR
══════════════════════════════════════════════════ */
function openEditInd(){
  const yrs=Object.keys(IND).sort().reverse();if(!yrs.length){toast('⚠️ Belum ada data Indikator');return;}
  const yr=yrs[0],ind=IND[yr];const{rows,activeMons}=ind;
  const body=document.getElementById('ind-modal-body');
  body.innerHTML=`<div class="alert alert-warn"><span class="ai">💡</span><div>Edit nilai indikator. Perubahan tersimpan ke database browser.</div></div>
  <table class="fish-table" id="ind-edit-tbl">
    <thead><tr><th>No</th><th>Indikator</th><th>Satuan</th>${activeMons.map(m=>`<th>${m}</th>`).join('')}<th>Total</th></tr></thead>
    <tbody>${rows.map((r,ri)=>`<tr>
      <td class="ind-no">${r.no}</td>
      <td class="${r.isSub?'ind-sub':'ind-nm'}" style="white-space:nowrap">${r.nama}</td>
      <td style="color:var(--DM);font-size:9px">${r.satuan}</td>
      ${activeMons.map(m=>`<td><input type="number" data-row="${ri}" data-mon="${m}" value="${r.values[m]!==null?r.values[m]:''}" oninput="updateIndCell(${ri},'${m}',this.value)" style="width:80px;background:rgba(255,255,255,.06);border:1px solid rgba(29,224,176,.15);border-radius:5px;padding:4px 6px;color:var(--TX);font-family:'Plus Jakarta Sans',sans-serif;font-size:10px;outline:none"></td>`).join('')}
      <td style="font-weight:700;color:var(--G);font-size:10px" id="ind-tot-${ri}">${r.total!==null?fN(r.total):'—'}</td>
    </tr>`).join('')}
    </tbody>
  </table>`;
  document.getElementById('edit-ind-modal').classList.add('open');
}

function openEditSingleInd(ri){
  const yrs=Object.keys(IND).sort().reverse();if(!yrs.length)return;
  const yr=yrs[0],ind=IND[yr];const r=ind.rows[ri];const{activeMons}=ind;
  const body=document.getElementById('ind-modal-body');
  document.getElementById('edit-ind-modal').querySelector('.modal-head h3').textContent='📈 Edit Indikator: '+r.nama;
  body.innerHTML=`<div class="form-grid">
    ${activeMons.map(m=>`<div class="fg"><label>${m}</label><input type="number" data-row="${ri}" data-mon="${m}" value="${r.values[m]!==null?r.values[m]:''}" oninput="updateIndCell(${ri},'${m}',this.value)"><div class="hint">Nilai untuk bulan ${m}</div></div>`).join('')}
    <div class="fg"><label>Total (auto)</label><input type="text" id="ind-tot-inp-${ri}" value="${r.total!==null?fN(r.total):'—'}" readonly style="opacity:.6"></div>
  </div>`;
  document.getElementById('edit-ind-modal').classList.add('open');
}

function updateIndCell(ri,mon,val){
  const yrs=Object.keys(IND).sort().reverse();if(!yrs.length)return;
  const yr=yrs[0];const ind=JSON.parse(JSON.stringify(IND[yr]));
  ind.rows[ri].values[mon]=val===''||val===null?null:+val;
  // Recalc total
  const tot=ind.activeMons.reduce((s,m)=>s+(ind.rows[ri].values[m]||0),0);
  ind.rows[ri].total=tot;
  const totEl=document.getElementById('ind-tot-'+ri)||document.getElementById('ind-tot-inp-'+ri);
  if(totEl){totEl.textContent=fN(tot);totEl.value=fN(tot);}
  IND[yr]=ind;db.set('IND_'+yr,ind);
}

function saveIndikator(){
  const yrs=Object.keys(IND).sort().reverse();if(!yrs.length)return;
  const yr=yrs[0];db.set('IND_'+yr,IND[yr]);
  document.getElementById('edit-ind-modal').classList.remove('open');
  toast('✅ Data Indikator tersimpan!');
  bIndikator();
}

/* ══════════════════════════════════════════════════
   SHARE / URL
══════════════════════════════════════════════════ */
function shareData(){
  try{
    const all={};sortedKeys().forEach(k=>all[k]=db.get(k));
    db.allKeys().filter(k=>k.startsWith('IND_')).forEach(k=>all[k]=db.get(k));
    const b64=btoa(unescape(encodeURIComponent(JSON.stringify(all))));
    const url=window.location.href.split('#')[0]+'#d='+b64;
    navigator.clipboard.writeText(url).then(()=>toast('🔗 Link berhasil disalin!')).catch(()=>{document.getElementById('sh-url').textContent=url;document.getElementById('sh-out').classList.add('on');});
  }catch(e){toast('❌ Data terlalu besar. Gunakan Export Excel.');}
}
function loadFromURL(){
  const h=window.location.hash;if(!h.includes('d='))return;
  try{const all=JSON.parse(decodeURIComponent(escape(atob(h.split('d=')[1]))));Object.entries(all).forEach(([k,v])=>db.set(k,v));toast('✅ Data dari link dimuat!');history.replaceState(null,'',window.location.pathname);}catch(e){console.warn(e);}
}

/* ══════════════════════════════════════════════════
   KELOLA DATA PAGE
══════════════════════════════════════════════════ */
function bKelola(){
  refreshKelolaList();
}

function G_kelola_setup(){
  // Setup drag-drop for kelola page
  const dz=document.getElementById('kelola-drop-zone');
  if(!dz||dz._setup)return;
  dz._setup=true;
  const fi=document.getElementById('fi-kelola');
  document.getElementById('btn-kelola-up').addEventListener('click',e=>{e.stopPropagation();fi.click();});
  fi.addEventListener('change',e=>{[...e.target.files].forEach(f=>processFileKelola(f));e.target.value='';});
  dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('drag-on');});
  dz.addEventListener('dragleave',()=>dz.classList.remove('drag-on'));
  dz.addEventListener('drop',e=>{e.preventDefault();dz.classList.remove('drag-on');[...e.dataTransfer.files].forEach(f=>processFileKelola(f));});
}

function processFileKelola(file){
  if(!file||!file.name.match(/\.(xlsx|xls)$/i)){
    logKelola('⚠️ Hanya file .xlsx/.xls yang didukung: '+file.name,'err');return;
  }
  logKelola('📖 Membaca '+file.name+'...','info');
  const r=new FileReader();
  r.onload=e=>{
    try{
      const wb=XLSX.read(new Uint8Array(e.target.result),{type:'array',cellDates:true});
      const raw=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:null});
      if(isInd(raw)){
        const p=parseInd(raw,file.name);
        db.set('IND_'+p.year,p);IND[p.year]=p;
        logKelola('✅ Indikator '+p.year+' berhasil disimpan ('+p.rows.length+' baris)','ok');
      }else{
        const p=parseRekap(raw,file.name);
        const k=p.month+'_'+p.year;
        const ex=db.get(k);
        if(ex){
          const ns=new Set(ex.vessels.map(v=>v.noStblkk));
          const nv=p.vessels.filter(v=>!ns.has(v.noStblkk));
          ex.vessels.push(...nv);
          ex.fishData.push(...nv.flatMap(v=>v.fish.map(f=>({...f,kapal:v.namaKapal,tanggal:v.tglTiba}))));
          db.set(k,ex);
          logKelola('🔄 '+p.month+' '+p.year+': '+nv.length+' kunjungan baru ditambahkan','ok');
        }else{
          db.set(k,p);
          logKelola('✅ Data '+p.month+' '+p.year+' berhasil disimpan ('+p.vessels.length+' kunjungan)','ok');
        }
      }
      refreshKelolaList();
      // Refresh period selectors if dash is open
      const keys=sortedKeys();
      if(keys.length&&document.getElementById('dash').style.display!=='none'){
        buildPSels(keys);applyRange();
      }
    }catch(err){logKelola('❌ Error membaca '+file.name+': '+err.message,'err');console.error(err);}
  };
  r.onerror=()=>logKelola('❌ Gagal membaca file','err');
  r.readAsArrayBuffer(file);
}

function logKelola(msg,type='info'){
  const log=document.getElementById('kelola-upload-log');
  if(!log)return;
  log.style.display='block';
  const item=document.createElement('div');
  item.className='upload-log-item log-'+type;
  item.innerHTML='<span>'+msg+'</span>';
  log.insertBefore(item,log.firstChild);
  // Keep only last 8 messages
  while(log.children.length>8)log.removeChild(log.lastChild);
}

function refreshKelolaList(){
  // Load all indikator from storage
  db.allKeys().filter(k=>k.startsWith('IND_')).forEach(k=>{const d=db.get(k);if(d)IND[d.year]=d;});
  
  // --- Rekap table ---
  const keys=sortedKeys();
  const rekapEl=document.getElementById('kelola-rekap-list');
  if(!rekapEl)return;
  if(!keys.length){
    rekapEl.innerHTML='<div class="k-empty">📭 Belum ada data rekap tersimpan.<br>Upload file Rekap_Bulan.xlsx untuk memulai.</div>';
  }else{
    let html='<table class="kelola-table"><thead><tr><th>Periode</th><th>Kunjungan</th><th>Vol. Produksi</th><th>Nilai Produksi</th><th>Disimpan</th><th>Aksi</th></tr></thead><tbody>';
    keys.forEach(k=>{
      const d=db.get(k);
      const tKg=d.fishData.reduce((s,f)=>s+f.jumlah,0);
      const tVal=d.fishData.reduce((s,f)=>s+f.nilai,0);
      const saved=d.savedAt?new Date(d.savedAt).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—';
      html+=`<tr>
        <td><span class="k-badge k-badge-rekap">📅 ${d.month} ${d.year}</span></td>
        <td>${d.vessels.length} kapal</td>
        <td>${fN(tKg)} Kg</td>
        <td class="vm">${fRp(tVal)}</td>
        <td><span class="k-stat">${saved}</span></td>
        <td style="display:flex;gap:5px">
          <button class="btn-s bs-wave" style="font-size:9.5px;padding:3px 9px" onclick="quickOpen('${k}')">👁 Buka</button>
          <button class="btn-s bs-red" style="font-size:9.5px;padding:3px 9px" onclick="openConf('Hapus data ${d.month} ${d.year}?',()=>{doDelKey('${k}');refreshKelolaList();})">🗑 Hapus</button>
        </td>
      </tr>`;
    });
    html+='</tbody></table>';
    rekapEl.innerHTML=html;
  }

  // --- Indikator table ---
  const indEl=document.getElementById('kelola-ind-list');
  if(!indEl)return;
  const indYears=Object.keys(IND).sort().reverse();
  if(!indYears.length){
    indEl.innerHTML='<div class="k-empty">📭 Belum ada data Indikator tersimpan.<br>Upload file Indikator_Maret.xlsx untuk menambahkan.</div>';
  }else{
    let html='<table class="kelola-table"><thead><tr><th>Tahun</th><th>Bulan Data</th><th>Jumlah Indikator</th><th>File Sumber</th><th>Disimpan</th><th>Aksi</th></tr></thead><tbody>';
    indYears.forEach(yr=>{
      const d=IND[yr];
      const saved=d.savedAt?new Date(d.savedAt).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—';
      const mons=d.activeMons&&d.activeMons.length?d.activeMons.join(', '):(d.months||[]).join(', ')||'—';
      html+=`<tr>
        <td><span class="k-badge k-badge-ind">📈 Tahun ${yr}</span></td>
        <td style="font-size:10.5px;color:#456789">${mons}</td>
        <td>${d.rows.length} indikator</td>
        <td style="font-size:10px;color:#89afc8">${d.fileName||'—'}</td>
        <td><span class="k-stat">${saved}</span></td>
        <td style="display:flex;gap:5px">
          <button class="btn-s bs-gold" style="font-size:9.5px;padding:3px 9px" onclick="openEditInd()">✏️ Edit</button>
          <button class="btn-s bs-red" style="font-size:9.5px;padding:3px 9px" onclick="openConf('Hapus data Indikator ${yr}?',()=>deleteIndikator('${yr}'))">🗑 Hapus</button>
        </td>
      </tr>`;
    });
    html+='</tbody></table>';
    indEl.innerHTML=html;
  }
}

function deleteIndikator(year){
  db.del('IND_'+year);
  delete IND[year];
  toast('🗑 Data Indikator '+year+' dihapus');
  refreshKelolaList();
}

/* ══════════════════════════════════════════════════
   EXPORT EXCEL 9 SHEET
══════════════════════════════════════════════════ */
function exportExcel(){
  if(!MRG.vessels.length&&!Object.keys(IND).length){toast('❌ Tidak ada data');return;}
  showL('Membuat Excel...');
  setTimeout(()=>{
    try{
      const wb=XLSX.utils.book_new();
      const{vessels,fishData,label,keys}=MRG;
      const P=label||'Semua Periode';const now=new Date().toLocaleDateString('id-ID');
      const HDR=[['DOPK — Dashboard Operasional Pelabuhan & Kesyahbandaran'],['Pelabuhan Perikanan Pantai Teluk Batang'],['Periode: '+P+'   |   Dicetak: '+now],['']];
      const tKg=fishData.reduce((s,f)=>s+f.jumlah,0),tVal=fishData.reduce((s,f)=>s+f.nilai,0);
      const pen=vessels.filter(v=>v.jenisKapal.includes('PENANGKAP')).length,peng=vessels.filter(v=>v.jenisKapal.includes('PENGANGKUT')).length,bon=vessels.filter(v=>v.kegiatan.toLowerCase()==='bongkar').length;
      const im={};fishData.forEach(f=>{im[f.jenis]=(im[f.jenis]||0)+f.jumlah;});const iS=Object.entries(im).sort((a,b)=>b[1]-a[1]);
      const T={es:0,air:0,solar:0,oli:0,gas:0,bensin:0,beras:0,garam:0,gula:0,minyak:0,rokok:0};vessels.forEach(v=>{T.es+=v.logistik.es;T.air+=v.logistik.air;T.solar+=v.logistik.solar;T.oli+=v.logistik.oli;T.gas+=v.logistik.gas;T.bensin+=v.logistik.bensin;T.beras+=v.logistik.beras;T.garam+=v.logistik.garam;T.gula+=v.logistik.gula;T.minyak+=v.logistik.minyakGoreng;T.rokok+=v.logistik.rokok;});
      const gtr=gtrRanges(vessels);const cL=['< 5 GT','5-10 GT','11-20 GT','21-30 GT','> 30 GT'];const cV=[0,0,0,0,0];vessels.forEach(v=>{const g=v.gt;if(g<5)cV[0]++;else if(g<=10)cV[1]++;else if(g<=20)cV[2]++;else if(g<=30)cV[3]++;else cV[4]++;});
      const W=(data,widths)=>{const ws=XLSX.utils.aoa_to_sheet(data);ws['!cols']=widths.map(w=>({wch:w}));return ws;};

      // 1. Indikator
      const yrs=Object.keys(IND).sort().reverse();
      if(yrs.length>0){const ind=IND[yrs[0]];const{rows,activeMons}=ind;XLSX.utils.book_append_sheet(wb,W([['REKAPITULASI INDIKATOR KINERJA'],['OPERASIONAL PELABUHAN DAN KESYAHBANDARAN'],['PELABUHAN PERIKANAN PANTAI TELUK BATANG'],['TAHUN '+ind.year],[''],['No','INDIKATOR KINERJA','SATUAN',...activeMons,'JUMLAH'],...rows.map(r=>[r.no,r.nama,r.satuan,...activeMons.map(m=>r.values[m]!==null?r.values[m]:'—'),r.total!==null?r.total:'—'])],[6,46,10,...activeMons.map(()=>13),13]),'Indikator Kinerja');}

      // 2. Dashboard
      const bd={};vessels.forEach(v=>{bd[v.tglTiba]=(bd[v.tglTiba]||0)+1;});const dA=Object.entries(bd).sort((a,b)=>a[0].localeCompare(b[0]));
      XLSX.utils.book_append_sheet(wb,W([...HDR,['RINGKASAN UTAMA'],[''],['Indikator','Nilai','Satuan'],['Total Kunjungan',vessels.length,'Kapal'],['Total Produksi',tKg,'Kg'],['Total Nilai Produksi',tVal,'Rp'],['Kapal Penangkap',pen,'Unit'],['Kapal Pengangkut',peng,'Unit'],['Kegiatan Bongkar',bon,'Kali'],[''],['RANGE GT ARMADA'],['Kategori','Jumlah','%'],...cL.map((k,i)=>[k,cV[i],vessels.length?+(cV[i]/vessels.length*100).toFixed(1)+'%':'0%']),['TOTAL',vessels.length,'100%'],[''],['KUNJUNGAN HARIAN'],['Tanggal','Jumlah'],...dA,[''],['TOP 10 JENIS IKAN'],['Jenis','Kg','Nilai (Rp)','%'],...iS.slice(0,10).map(([nm,v])=>[nm,v,fishData.filter(f=>f.jenis===nm).reduce((s,f)=>s+f.nilai,0),tKg?+(v/tKg*100).toFixed(2)+'%':'0%'])],[30,17,11]),'Dashboard');

      // 3-9: remaining sheets (condensed)
      XLSX.utils.book_append_sheet(wb,W([...HDR,['REKAP KEGIATAN'],[''],['No','Bulan','Tanggal','Nama Kapal','Nakhoda','Kegiatan','Jenis Kapal','Alat Tangkap','ABK'],...vessels.map((v,i)=>[i+1,v.bulan,v.tglTiba,v.namaKapal,v.nakhoda,v.kegiatan,v.jenisKapal,v.alatTangkap||'-',v.abk]),['TOTAL','','','','','','','',vessels.reduce((s,v)=>s+v.abk,0)]],[5,13,12,25,19,12,16,26,8]),'Rekap Kegiatan');
      XLSX.utils.book_append_sheet(wb,W([...HDR,['REKAP KUNJUNGAN KAPAL'],[''],['No','Bulan','No.STBLKK','Nama Kapal','Selar','GT','Kat.GT','Nakhoda','Perusahaan','Mesin','ABK','Tgl Tiba','Tgl Berangkat','Jenis Kapal','Kegiatan'],...vessels.map((v,i)=>{const g=v.gt;const k=g<5?'<5GT':g<=10?'5-10GT':g<=20?'11-20GT':g<=30?'21-30GT':'>30GT';return[i+1,v.bulan,v.noStblkk,v.namaKapal,v.tandaSelar,g,k,v.nakhoda,v.perusahaan,v.merkMesin,v.abk,v.tglTiba,v.tglBerangkat,v.jenisKapal,v.kegiatan];}),['TOTAL',vessels.length]],[5,12,29,24,13,6,9,19,21,16,6,12,12,13,12]),'Kunjungan Kapal');
      XLSX.utils.book_append_sheet(wb,W([...HDR,['REKAP AKTIVITAS'],[''],['No','Bulan','Tanggal','Nama Kapal','Kegiatan','Alat Tangkap','Jenis Ikan','Total Kg','Nilai (Rp)'],...vessels.map((v,i)=>[i+1,v.bulan,v.tglTiba,v.namaKapal,v.kegiatan,v.alatTangkap||'-',v.fish.map(f=>f.jenis).join('; ')||'-',v.fish.reduce((s,f)=>s+f.jumlah,0),v.fish.reduce((s,f)=>s+f.nilai,0)]),['TOTAL','','','','','','',tKg,tVal],[''],['RINCIAN TRANSAKSI IKAN'],['No','Bulan','Tanggal','Kapal','Jenis Ikan','Jumlah (Kg)','Harga','Nilai (Rp)'],...fishData.map((f,i)=>[i+1,f.bulan||'',f.tanggal,f.kapal,f.jenis,f.jumlah,f.harga,f.nilai]),['TOTAL','','','','',tKg,'',tVal]],[5,12,12,24,13,24,38,11,15]),'Rekap Aktivitas');
      XLSX.utils.book_append_sheet(wb,W([...HDR,['REKAP GT KAPAL — DISTRIBUSI RANGE'],[''],['Kategori GT','Jumlah','%'],...cL.map((k,i)=>[k,cV[i],vessels.length?+(cV[i]/vessels.length*100).toFixed(1)+'%':'0%']),['TOTAL',vessels.length,'100%'],[''],['DETAIL PER KAPAL'],['No','Bulan','Nama Kapal','Selar','GT','Jenis Kapal','Kat.GT','Tgl Kunjungan'],...[...vessels].sort((a,b)=>b.gt-a.gt).map((v,i)=>{const g=v.gt;const k=g<5?'<5GT':g<=10?'5-10GT':g<=20?'11-20GT':g<=30?'21-30GT':'>30GT';return[i+1,v.bulan,v.namaKapal,v.tandaSelar,g,v.jenisKapal,k,v.tglTiba];})],[11,12,24,13,7,16,11,12]),'Rekap GT Kapal');
      XLSX.utils.book_append_sheet(wb,W([...HDR,['REKAP JENIS IKAN'],[''],['Jenis Ikan','Total (Kg)','Harga Rata (Rp/Kg)','Nilai Total (Rp)','Frekuensi','% Produksi'],...iS.map(([nm,v])=>{const rws=fishData.filter(f=>f.jenis===nm);const aH=rws.length?Math.round(rws.reduce((s,f)=>s+f.harga,0)/rws.length):0;return[nm,v,aH,rws.reduce((s,f)=>s+f.nilai,0),rws.length,tKg?+(v/tKg*100).toFixed(2)+'%':'0%'];}),['TOTAL',tKg,'',tVal,fishData.length,'100%'],[''],['RINCIAN TRANSAKSI'],['No','Bulan','Tanggal','Kapal','Jenis','Jumlah (Kg)','Harga','Nilai (Rp)'],...fishData.map((f,i)=>[i+1,f.bulan||'',f.tanggal,f.kapal,f.jenis,f.jumlah,f.harga,f.nilai]),['TOTAL','','','','',tKg,'',tVal]],[33,13,19,15,9,9]),'Rekap Jenis Ikan');
      XLSX.utils.book_append_sheet(wb,W([...HDR,['REKAP LOGISTIK'],[''],['Item','Total','Satuan'],['ES',T.es,'Kg'],['Air',T.air,'L'],['Solar',T.solar,'L'],['Oli',T.oli,'L'],['Gas LPG',T.gas,'Tabung'],['Bensin',T.bensin,'L'],['Beras',T.beras,'Kg'],['Garam',T.garam,'Kg'],['Gula',T.gula,'Kg'],['Minyak Goreng',T.minyak,'Kg'],['Rokok',T.rokok,'Slop'],[''],['DETAIL PER KAPAL'],['Nama Kapal','Bulan','Tgl','ES','Air','Solar','Oli','Gas','Bensin','Beras','Garam','Gula','Minyak','Rokok'],...vessels.filter(v=>v.logistik.solar>0||v.logistik.es>0||v.logistik.air>0).map(v=>[v.namaKapal,v.bulan,v.tglTiba,v.logistik.es||0,v.logistik.air||0,v.logistik.solar||0,v.logistik.oli||0,v.logistik.gas||0,v.logistik.bensin||0,v.logistik.beras||0,v.logistik.garam||0,v.logistik.gula||0,v.logistik.minyakGoreng||0,v.logistik.rokok||0]),['TOTAL','','',T.es,T.air,T.solar,T.oli,T.gas,T.bensin,T.beras,T.garam,T.gula,T.minyak,T.rokok]],[22,12,11,7,7,7,7,7,8,8,8,7,8,8]),'Logistik');
      const tSol=vessels.reduce((s,v)=>s+v.logistik.solar,0),tEs2=vessels.reduce((s,v)=>s+v.logistik.es,0);const top3=iS.slice(0,3).map(x=>x[0]).join(', ');
      XLSX.utils.book_append_sheet(wb,W([['LAPORAN RINGKAS'],['DOPK — Dashboard Operasional Pelabuhan & Kesyahbandaran'],['Pelabuhan Perikanan Pantai Teluk Batang'],['Periode: '+P+'   |   Dicetak: '+now+'   |   '+keys.length+' Bulan Data'],[''],['━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'],['A. KUNJUNGAN KAPAL'],[''],['   Total Kunjungan',vessels.length,'kunjungan'],['   Penangkap',pen,'unit'],['   Pengangkut',peng,'unit'],['   Bongkar',bon,'kali'],['   Range GT',...gtr.map(r=>r.l+': '+r.c)],[''],['━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'],['B. PRODUKSI IKAN'],[''],['   Total Produksi',tKg,'Kg'],['   Total Nilai',tVal,'Rp'],['   Rata-rata/Kunjungan',Math.round(tKg/(vessels.length||1)),'Kg'],['   Jenis Ikan',Object.keys(im).length,'jenis'],['   3 Teratas',top3,''],[''],['━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'],['C. LOGISTIK'],[''],['   Solar',tSol,'L'],['   ES',tEs2,'Kg'],['   Solar/Kapal',Math.round(tSol/(vessels.length||1)),'L'],[''],['━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'],['D. PRODUKSI PER BULAN'],[''],['   Bulan','   Kunjungan','   Produksi (Kg)','   Nilai (Rp)'],...keys.map(k=>{const d=db.get(k);if(!d)return[];return['   '+d.month+' '+d.year,d.vessels.length,d.fishData.reduce((s,f)=>s+f.jumlah,0),d.fishData.reduce((s,f)=>s+f.nilai,0)];}),['   TOTAL',vessels.length,tKg,tVal],[''],['━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'],['E. TOP 10 JENIS IKAN'],[''],['   Jenis','   Total (Kg)','   Nilai (Rp)','   %'],...iS.slice(0,10).map(([nm,v])=>['   '+nm,v,fishData.filter(f=>f.jenis===nm).reduce((s,f)=>s+f.nilai,0),tKg?+(v/tKg*100).toFixed(2)+'%':'0%'])],[40,18,15,9]),'Laporan Ringkas');

      const safe=P.replace(/[^a-zA-Z0-9]/g,'_');const fname='DOPK_'+safe+'_'+now.replace(/\//g,'-')+'.xlsx';
      const out=XLSX.write(wb,{bookType:'xlsx',type:'array'});
      const blob=new Blob([out],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
      const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=fname;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(url);document.body.removeChild(a);},800);
      hideL();toast('📥 '+fname+' — 9 sheet berhasil!');
    }catch(err){hideL();toast('❌ Export gagal: '+err.message);console.error(err);}
  },300);
}

// → dipindah ke utils.js

/* ══════════════════════════════════════════════════
   DATABASE KAPAL & IKAN — v9
══════════════════════════════════════════════════ */
const DB_KAPAL = [{"no": "1", "nama_kapal": "KM. MIRANDA TS", "nakhoda": "HAMDANI", "perusahaan": "Hamdani", "alamat": "Tanjung Satai", "selar": "KLB.7 NO.187", "gt": "5", "alat_tangkap": "GILLNET", "mesin": "TIANLI 27 HP"}, {"no": "2", "nama_kapal": "KM.PUTRA PANTAI AB", "nakhoda": "Yusran", "perusahaan": "Yusran", "alamat": "TELUK BATANG", "selar": "KLB 7 No.74", "gt": "4", "alat_tangkap": "Jaring Insang Hanyut", "mesin": "DONGFENG 25 HP"}, {"no": "3", "nama_kapal": "KM. SINAR HARAPAN 05 AB", "nakhoda": "KAMARUDIN", "perusahaan": "Adiansyah", "alamat": "TELUK BATANG", "selar": "KLB 7 No. 79", "gt": "2", "alat_tangkap": "Jaring Insang Hanyut", "mesin": "DOMPENG 25 PK"}, {"no": "4", "nama_kapal": "KM. SINAR PANTAI AB", "nakhoda": "Juanda", "perusahaan": "Juanda", "alamat": "ALUR BANDUNG", "selar": "KLB 7 No.87", "gt": "1", "alat_tangkap": "Jaring Ingsang Hanyut", "mesin": "JF 30 HP"}, {"no": "5", "nama_kapal": "KM. BOLANI", "nakhoda": "BOLANI", "perusahaan": "BOLANI", "alamat": "DUSUN KECIL PULAU MAYA", "selar": "-", "gt": "5", "alat_tangkap": "Jaring Ingsang Tetap", "mesin": "DOMPENG 25 PK"}, {"no": "6", "nama_kapal": "KM. CAHAYA SATAI", "nakhoda": "DEDDY YANTO", "perusahaan": "TAN TONG SENG", "alamat": "JL. VETERAN GG SYUKUR 5 NO 21 PONTIANAK", "selar": "GT. 35 NO. 5017/Hha", "gt": "35", "alat_tangkap": "PENGANGKUT", "mesin": "MITSUBISHI/ 120 PK"}, {"no": "7", "nama_kapal": "KM. CAHAYA SATAI 01", "nakhoda": "ABDURAHMAN", "perusahaan": "TAN TONG SENG", "alamat": "Tanjung Satai", "selar": "GT. 23 NO. 5080/HHA", "gt": "23", "alat_tangkap": "PENGANGKUT", "mesin": "MITSUBISHI 100 PK"}, {"no": "8", "nama_kapal": "KM. CAHAYA SATAI 03", "nakhoda": "MUHAMMAD DARWIN", "perusahaan": "TAN TONG SENG", "alamat": "Tanjung Satai", "selar": "GT. 30 NO. 6215/HHA", "gt": "30", "alat_tangkap": "PENGANGKUT", "mesin": "MITSUBISHI 100 PK"}, {"no": "9", "nama_kapal": "KM. JAILIN", "nakhoda": "JAILIN", "perusahaan": "JAILIN", "alamat": "DUSUN KECIL PULAU MAYA", "selar": "-", "gt": "3", "alat_tangkap": "JARING INSANG BERLAPIS", "mesin": "DOMPENG 25 PK"}, {"no": "10", "nama_kapal": "KM. JAYA UTAMA 19", "nakhoda": "MISRAN", "perusahaan": "HENDI GUNAWAN", "alamat": "Tanjung Satai", "selar": "GT. 28 NO. 5075/Hha", "gt": "28", "alat_tangkap": "PENGANGKUT", "mesin": "MITSUBISHI/ 160 PK"}, {"no": "11", "nama_kapal": "KM. LAUT KUNANG - KUNANG AB", "nakhoda": "KAMARUDIN A", "perusahaan": "ADIANSYAH", "alamat": "TELUK BATANG", "selar": "KLB.7 NO.96", "gt": "1", "alat_tangkap": "JARING INSANG TETAP", "mesin": "DOMPENG 10 HP"}, {"no": "12", "nama_kapal": "KM. LAUTAN ANUGRAH", "nakhoda": "TAMRIN", "perusahaan": "LIM KHENG PIAU", "alamat": "DUSUN NIRWANA SUNGAI KAKAP", "selar": "GT.28 NO. 4749/Hhe", "gt": "28", "alat_tangkap": "PENGANGKUT", "mesin": "MITSUBISHI/ 90 PK"}, {"no": "13", "nama_kapal": "KM. MIRANDA TS", "nakhoda": "HAMDANI", "perusahaan": "HAMDANI", "alamat": "Tanjung Satai", "selar": "KLB. 7 NO.187", "gt": "5", "alat_tangkap": "GILLNET", "mesin": "TIANLI 27 HP"}, {"no": "14", "nama_kapal": "KM. PANTAI MANDIRI", "nakhoda": "ALFIANSYAH", "perusahaan": "ALFIANSYAH", "alamat": "Tanjung Satai", "selar": "-", "gt": "5", "alat_tangkap": "PENGANGKUT", "mesin": "DOMPENG 25 PK"}, {"no": "15", "nama_kapal": "KM. PUTRI AYU 71", "nakhoda": "MOHAMMAD DARWIS", "perusahaan": "WEWET", "alamat": "KEPULAUAN ANAMBAS", "selar": "KIJANG/GT.30 NO.1546/PPq", "gt": "30", "alat_tangkap": "PENGANGKUT", "mesin": "CUMMINS/300"}, {"no": "16", "nama_kapal": "KM. PUTRI KAYONG", "nakhoda": "SADIKIN", "perusahaan": "SADIKIN", "alamat": "SUKADANA", "selar": "GT. 15 NO. 6247/Hha", "gt": "15", "alat_tangkap": "JARING INSANG HANYUT", "mesin": "MITSUBISHI 100 PK"}, {"no": "17", "nama_kapal": "KM. REZEKI ABADI III", "nakhoda": "UPEK SUWANDI", "perusahaan": "YAM SAI", "alamat": "KETAPANG", "selar": "GT.29 NO. 498/Hhe", "gt": "29", "alat_tangkap": "PURSE SEINE", "mesin": "MITSUBISHI 120 PK"}, {"no": "18", "nama_kapal": "KM. SINAR HARAPAN 05 AB", "nakhoda": "MAT LAHIR", "perusahaan": "ADIANSYAH", "alamat": "TELUK BATANG", "selar": "KLB 7 No. 79", "gt": "2", "alat_tangkap": "JARING INSANG TETAP", "mesin": "DOMPENG 25 PK"}, {"no": "19", "nama_kapal": "KM. SINAR INDAH 39", "nakhoda": "SUPARDI TONO", "perusahaan": "LIM KHENG PIAU", "alamat": "DUSUN NIRWANA DESA SUNGAI KAKAP", "selar": "GT. 25 NO. 588/HHc", "gt": "25", "alat_tangkap": "PENGANGKUT", "mesin": "MITSUBISHI/ 180 PK"}, {"no": "20", "nama_kapal": "KM. SUMANTRI", "nakhoda": "SUMANTRI", "perusahaan": "SUMANTRI", "alamat": "TELUK BATANG", "selar": "-", "gt": "1", "alat_tangkap": "PENGANGKUT", "mesin": "DOMPENG 25 PK"}, {"no": "21", "nama_kapal": "KM. SUMBER MAJU 79", "nakhoda": "ABDUL SAMAD", "perusahaan": "TAN TONG SENG", "alamat": "PONTIANAK SELATAN, JL VETERAN", "selar": "GT. 30 NO.6052/Hha", "gt": "30", "alat_tangkap": "PENGANGKUT", "mesin": "MITSUBISHI 190 PK"}, {"no": "22", "nama_kapal": "KM. SUMBER SAMUDERA A6", "nakhoda": "MAT JEMAN", "perusahaan": "SELVI", "alamat": "JL. KOM YOS SUDARSO PONTIANAK", "selar": "GT.30 NO. 5048/Hha", "gt": "30", "alat_tangkap": "PURSE SEINE", "mesin": "MITSUBISHI/ 180 pk"}, {"no": "23", "nama_kapal": "KM. SURYA UTAMA 2", "nakhoda": "BAMBANG SETIADI", "perusahaan": "LIE TJAI KIM", "alamat": "Tanjung Satai", "selar": "GT. 22 NO. 414/Hhe", "gt": "22", "alat_tangkap": "PENGANGKUT", "mesin": "MITSUBISHI/ 160 PK"}, {"no": "24", "nama_kapal": "KM. TERATAI AB", "nakhoda": "SUKARDI", "perusahaan": "ADIANSYAH", "alamat": "TELUK BATANG", "selar": "KLB 7 No. 73", "gt": "1", "alat_tangkap": "JARING INSANG HANYUT", "mesin": "JF 10 HP"}, {"no": "25", "nama_kapal": "KM. TIGA PUTRA 02", "nakhoda": "RAMLAN", "perusahaan": "RAMLAN", "alamat": "DESA KAMBOJA", "selar": "-", "gt": "6", "alat_tangkap": "JARING INSANG TETAP", "mesin": "DOMPENG 30 PK"}, {"no": "26", "nama_kapal": "KM. USAHA LAUT-II", "nakhoda": "MAT JEMAN", "perusahaan": "LIM KHENG PIAU", "alamat": "DUSUN NIRWANA, SUNGAI KAKAP", "selar": "GT.19 NO. 595/HHc", "gt": "19", "alat_tangkap": "PURSE SEINE", "mesin": "MITSUBISHI/ 160 PK"}, {"no": "27", "nama_kapal": "KM. JULUNG LAUT AB", "nakhoda": "SALIMAN", "perusahaan": "SALIMAN", "alamat": "Dusun Nelayan RT 005/000 Desa Alur Bandung Teluk Batang", "selar": "KLB 7 No. 101", "gt": "3", "alat_tangkap": "JARING INSANG HANYUT", "mesin": "SUMO/25 HP"}, {"no": "28", "nama_kapal": "KM. KEJORA AB", "nakhoda": "JUSMANTO", "perusahaan": "JUSMANTO", "alamat": "Dusun Nelayan RT 013/000 Desa Alur Bandung Teluk Batang", "selar": "KLB 7 No. 85", "gt": "5", "alat_tangkap": "JARING INSANG HANYUT", "mesin": "RADIN/30 HP"}, {"no": "29", "nama_kapal": "KM. MOHON DOA IBU AB", "nakhoda": "SUNARDI", "perusahaan": "SUNARDI", "alamat": "Dusun Nelayan RT 013/000 Desa Alur Bandung Teluk Batang", "selar": "KLB 7 No. 66", "gt": "5", "alat_tangkap": "JARING INSANG HANYUT", "mesin": "TIANLI 33 HP"}, {"no": "30", "nama_kapal": "KM. JANI", "nakhoda": "JANI", "perusahaan": "JANI", "alamat": "Pintau, Kecamatan Pulau Maya", "selar": "-", "gt": "2", "alat_tangkap": "JARING INSANG TETAP", "mesin": "DOMPENG 25 PK"}, {"no": "31", "nama_kapal": "KM. PREEDATOR SINAR ALAM AB", "nakhoda": "ZUL SARIPUDIN", "perusahaan": "ZUL SARIPUDIN", "alamat": "Dusun Nelayan RT 005/000 Desa Alur Bandung Teluk Batang", "selar": "KLB 7 No. 60", "gt": "2", "alat_tangkap": "JARING INSANG HANYUT", "mesin": "TIANLI 27 HP"}, {"no": "32", "nama_kapal": "KM. BERKAT SABAR AB", "nakhoda": "HERMANTO", "perusahaan": "HERMANTO", "alamat": "Dusun Nelayan RT 005/000 Desa Alur Bandung Teluk Batang", "selar": "KLB 7 No. 68", "gt": "4", "alat_tangkap": "JARING INSANG HANYUT", "mesin": "TIANLI 24 HP"}, {"no": "33", "nama_kapal": "KM. BURUNG PUTIH AB", "nakhoda": "SAIMIN", "perusahaan": "SAIMIN", "alamat": "Dusun Nelayan RT 013/000 Desa Alur Bandung Teluk Batang", "selar": "KLB 7 No. 89", "gt": "2", "alat_tangkap": "JARING INSANG HANYUT", "mesin": "SHARK 24 HP"}, {"no": "34", "nama_kapal": "KM. KARYA BERSAM 1A", "nakhoda": "MUHAMMAD MIRAD", "perusahaan": "TAN TONG SENG", "alamat": "Tanjung Satai", "selar": "GT. 30 No. 4875/Hha", "gt": "30", "alat_tangkap": "PENGANGKUT", "mesin": "MITSUBISHI 190 PK"}, {"no": "35", "nama_kapal": "KM. SURYA UTAMA 1", "nakhoda": "GILANG SAKSONO", "perusahaan": "LIE TJAI KIM", "alamat": "Tanjung Satai", "selar": "GT. 28 NO. 413/Hhe", "gt": "28", "alat_tangkap": "PENGANGKUT", "mesin": "-"}, {"no": "36", "nama_kapal": "KM. SINAR BERLIAN 3", "nakhoda": "Jumadi", "perusahaan": "Tan Tong Seng", "alamat": "Tanjung Satai", "selar": "GT. 27 No.6405/Hha", "gt": "27", "alat_tangkap": "PUKAT CINCIN PELAGIS KECIL 1 KAPAL", "mesin": "HYUNDAI 190 PK"}, {"no": "37", "nama_kapal": "KM. MITRA USAHA 4", "nakhoda": "Pani", "perusahaan": "Firman Junip", "alamat": "-", "selar": "GT. 19 No.960/Hhe", "gt": "-", "alat_tangkap": "-", "mesin": "-"}, {"no": "38", "nama_kapal": "KM. HARAPAN UTAMA 01", "nakhoda": "Hendri", "perusahaan": "Tan Tong Seng", "alamat": "Tanjung Satai", "selar": "GT. 21 No.6047/Hha", "gt": "21", "alat_tangkap": "PUKAT CINCIN PELAGIS KECIL 1 KAPAL", "mesin": "MITSUBISHI 100 PK"}, {"no": "39", "nama_kapal": "KM. MUTIARA 99A", "nakhoda": "HARTA", "perusahaan": "RICU", "alamat": "Jl. Gajah Mada Dalam, RT 025/003, Desa Sampit, Ketapang", "selar": "GT.26 No.6078/Hha", "gt": "26", "alat_tangkap": "PUKAT CINCIN PELAGIS KECIL 1 KAPAL", "mesin": "-"}, {"no": "40", "nama_kapal": "KM.MUTMAINAH", "nakhoda": "RICU", "perusahaan": "RICU", "alamat": "Jl. Gajah Mada Dalam, RT 025/003, Desa Sampit, Ketapang", "selar": "GT.28 No.408/Hha", "gt": "28", "alat_tangkap": "PUKAT CINCIN PELAGIS KECIL 1 KAPAL", "mesin": "-"}, {"no": "41", "nama_kapal": "KM.JAI", "nakhoda": "JAI", "perusahaan": "JAI", "alamat": "Dusun Sungai Cina, Desa Riam Berasap, Kec. Sukadana", "selar": "-", "gt": "1", "alat_tangkap": "RAWAI", "mesin": "-"}, {"no": "42", "nama_kapal": "KM.508", "nakhoda": "SAPARANI", "perusahaan": "SAPARANI", "alamat": "Dusun Sungai Cina, Desa Riam Berasap, Kec. Sukadana", "selar": "KLB 7 No. 41", "gt": "1", "alat_tangkap": "RAWAI & JARING INSANG HANYUT", "mesin": "DONGHAI 18 HP"}, {"no": "43", "nama_kapal": "KM.MITRA LAUT", "nakhoda": "BAMBANG HERTANTO", "perusahaan": "BAMBANG HERTANTO", "alamat": "Dusun Sungai Cina, Desa Riam Berasap, Kec. Sukadana", "selar": "KLB 7 No.44", "gt": "4", "alat_tangkap": "RAWAI", "mesin": "WECO-22HP"}, {"no": "44", "nama_kapal": "Mitra Jaya AB", "nakhoda": "Usmandi", "perusahaan": "Usmandi", "alamat": "Dusun nelayan, RT.005/RW/000, Desa Alur Bandung, Kec. Teluk Batang, Kab. Kayong Utara, Kalimantan Barat", "selar": "-", "gt": "1", "alat_tangkap": "JARING INGSANG HANYUT", "mesin": "JINGSANG 25 HP"}, {"no": "45", "nama_kapal": "SUMBER REJEKI 01", "nakhoda": "Dandi Hartandi", "perusahaan": "Dandi Hartandi", "alamat": "Dusun Sungai Cina, Desa Riam Berasap, Kec. Sukadana", "selar": "-", "gt": "3", "alat_tangkap": "RAWAI SENGGOL", "mesin": "WEKO-30HP"}, {"no": "46", "nama_kapal": "SINAR BARU", "nakhoda": "Rianto", "perusahaan": "Rianto", "alamat": "Dusun Sungai Cina, Desa Riam Berasap, Kec. Sukadana", "selar": "-", "gt": "3", "alat_tangkap": "RAWAI SENGGOL", "mesin": "WEKO-30HP"}, {"no": "47", "nama_kapal": "KM.USAHA", "nakhoda": "Amsyah", "perusahaan": "Amsyah", "alamat": "Dusun Sungai Cina, Desa Riam Berasap, Kec. Sukadana", "selar": "KLB 7 No.37", "gt": "1", "alat_tangkap": "GILLNET & RAWAI", "mesin": "DONGFENG 15 PK"}, {"no": "48", "nama_kapal": "KM MADU I", "nakhoda": "BAHARUDIN", "perusahaan": "BAHARUDIN", "alamat": "Dusun Baru Utara II, RT 007/RW 004 Kel. Baru Kec. Manggar Kab. Belitung Timur Prov. Kepulauan Bangka Belitung", "selar": "GT.12 No 19/FFB", "gt": "12", "alat_tangkap": "JARING INGSANG HANYUT", "mesin": "PS 100"}, {"no": "49", "nama_kapal": "KM Sinar Jaya", "nakhoda": "Sahrudin", "perusahaan": "Sahrudin", "alamat": "Pintau, Kecamatan Pulau Maya", "selar": "-", "gt": "3", "alat_tangkap": "PENGANGKUT", "mesin": "DOMPENG 30 PK"}, {"no": "50", "nama_kapal": "KM Sembalo TB", "nakhoda": "Joni", "perusahaan": "Sariman TB", "alamat": "Tanjung Satai, Kecamatan Pulau Maya", "selar": "B.25 NO 23", "gt": "6", "alat_tangkap": "JARING INGSANG HANYUT", "mesin": "PS 100"}, {"no": "51", "nama_kapal": "KM Sinar Surya Abadi 09", "nakhoda": "Alianto", "perusahaan": "Tan Tong Seng", "alamat": "JL. VETERAN GG SYUKUR 5 NO 21 PONTIANAK", "selar": "GT.23 NO. 6437/Hha", "gt": "23", "alat_tangkap": "PUKAT CINCIN PELAGIS KECIL 1 KAPAL", "mesin": "MITSUBISHI 190 PK"}, {"no": "52", "nama_kapal": "KM Bintang Timur 04 AB", "nakhoda": "Sahbudin", "perusahaan": "Sahbudin", "alamat": "DUSUN PANCURAN RT 006/ RW 000 DESA ALUR BANDUNG KECAMATAN TELUK BATANG", "selar": "KLB 7 NO.72", "gt": "1", "alat_tangkap": "JARING INSANG HANYUT", "mesin": "DONGFENG"}, {"no": "53", "nama_kapal": "Dua Putra", "nakhoda": "Suriadi", "perusahaan": "Suriadi", "alamat": "Dusun Panca Bakti III, Kelurahan Teluk Batang Selatan, Kecamatan Teluk Batang, Kabupaten Kayong Utara, Provinsi Kalimantan Barat , 78856", "selar": "GT.3/B61000984/KP", "gt": "3", "alat_tangkap": "JARING INSANG BERLAPIS", "mesin": "DH 26 Hp"}, {"no": "54", "nama_kapal": "Rajawali III", "nakhoda": "Abdul Halim", "perusahaan": "Abdul halim", "alamat": "Dusun Karya Baru RT 013, Desa Teluk Batang, Kecamatan Teluk Batang, Kabupaten Kayong Utara", "selar": "GT.4/B61000995/KP", "gt": "4", "alat_tangkap": "JARING INSANG BERLAPIS", "mesin": "TIANLI 27 Hp"}, {"no": "55", "nama_kapal": "KM. Kenari SP", "nakhoda": "Ryan Tono", "perusahaan": "Ryan Tono", "alamat": "Sepuk Mengkalang, RT.004/002, Desa Sungai Nibung, Kec. Teluk Pakedai, Kab.Kubu Raya, Prov. Kalimantan Barat", "selar": "GT. 19 No.533/Hhe", "gt": "19", "alat_tangkap": "Jaring Insang Hanyut", "mesin": "Mitsubishi 100"}, {"no": "56", "nama_kapal": "KM. Sinar Fajar Baru SP", "nakhoda": "Rusdianto", "perusahaan": "Andi", "alamat": "Sepok Pangkalan, Desa/Kel. Sungai Nibung, Kec.Teluk Pakedai, Kab.Kubu Raya, Prov. Kalimantan Barat", "selar": "GT.24 No.532/Hhe", "gt": "24", "alat_tangkap": "Jaring  Insang Hanyut", "mesin": "MITSUBISHI 120 PK"}, {"no": "57", "nama_kapal": "KM. Cahaya Laut", "nakhoda": "Harjoni", "perusahaan": "Harjoni", "alamat": "Rt. 004/002, Sepok Pangkalan, Desa/Kel. Sungai Nibung, Kec.Teluk Pakedai, Kab.Kubu Raya, Prov. Kalimantan Barat", "selar": "GT.24 No.6514/HHa", "gt": "24", "alat_tangkap": "Jaring  Insang Hanyut", "mesin": "MITSUBISHI 185 PK"}, {"no": "58", "nama_kapal": "KM. Lautan Teduh", "nakhoda": "Susanto", "perusahaan": "Susanto", "alamat": "Rt. 004/002, Sepok Pangkalan, Desa/Kel. Sungai Nibung, Kec.Teluk Pakedai, Kab.Kubu Raya, Prov. Kalimantan Barat", "selar": "GT.12 NO. 538/Hhe", "gt": "12", "alat_tangkap": "Jaring  Insang Hanyut", "mesin": "MITSUBISHI 190 PK"}, {"no": "59", "nama_kapal": "KM. Hiu Macan", "nakhoda": "Arifin A Rahman", "perusahaan": "Tan Tong Seng", "alamat": "Tanjung Satai", "selar": "GT.27 No.4665/Hha", "gt": "27", "alat_tangkap": "PUKAT CINCIN PELAGIS KECIL 1 KAPAL", "mesin": "MITSUBISHI 100 PS"}, {"no": "60", "nama_kapal": "KM. Usaha Baru Jaya I", "nakhoda": "Abdul Murad", "perusahaan": "Abdul Murad", "alamat": "Tanjung Satai", "selar": "GT.18 No.417/Hhe", "gt": "18", "alat_tangkap": "PUKAT CINCIN PELAGIS KECIL 1 KAPAL", "mesin": "Mitsubishi 100"}];
const DB_IKAN = [{"no": "1", "jenis": "Alu-Alu", "harga": "22.000"}, {"no": "2", "jenis": "Bawal Hitam", "harga": "40.000"}, {"no": "3", "jenis": "Bawal Putih", "harga": "45.000"}, {"no": "4", "jenis": "Belanak", "harga": "17.000"}, {"no": "5", "jenis": "Cumi-Cumi", "harga": "40.000"}, {"no": "6", "jenis": "Gulamah; Tiga Waja; Diles; Gulama", "harga": "14.000"}, {"no": "7", "jenis": "Kakap Jenaha", "harga": "40.000"}, {"no": "8", "jenis": "Kakap Hitam", "harga": "36.000"}, {"no": "9", "jenis": "Kakap Merah", "harga": "50.000"}, {"no": "10", "jenis": "Kakap Sejati/Putih", "harga": "45.000"}, {"no": "11", "jenis": "Kembung [RAB]", "harga": "28.000"}, {"no": "12", "jenis": "Kerapu Lumpur", "harga": "30.000"}, {"no": "13", "jenis": "Ketang-Ketang/ Baronang Lingkis", "harga": "15.000"}, {"no": "14", "jenis": "Kurisi", "harga": "12.000"}, {"no": "15", "jenis": "Kuro ; Senangin ;Kurau [QHX]", "harga": "50.000"}, {"no": "16", "jenis": "Manyung", "harga": "22.000"}, {"no": "17", "jenis": "Pari Burung", "harga": "15.000"}, {"no": "18", "jenis": "Remang", "harga": "20.000"}, {"no": "19", "jenis": "Selanget", "harga": "10.000"}, {"no": "20", "jenis": "Sembilang", "harga": "22.000"}, {"no": "21", "jenis": "Talang-Talang", "harga": "40.000"}, {"no": "22", "jenis": "Tenggiri (COM)", "harga": "35.000"}, {"no": "23", "jenis": "Tenggiri Papan [GUT]", "harga": "38.000"}, {"no": "24", "jenis": "Udang Dogol", "harga": "45.000"}, {"no": "25", "jenis": "Udang Krosok", "harga": "28.000"}, {"no": "26", "jenis": "Udang ketak/Mantis", "harga": "175.000"}, {"no": "27", "jenis": "Udang Jerbung/Putih", "harga": "25.000"}, {"no": "28", "jenis": "Udang Wangkang", "harga": "50.000"}, {"no": "29", "jenis": "Nila", "harga": "24.000"}, {"no": "30", "jenis": "Bandeng", "harga": "25.000"}, {"no": "31", "jenis": "Bawal Mas", "harga": "25.000"}, {"no": "32", "jenis": "Kepiting Bakau", "harga": "50.000"}, {"no": "33", "jenis": "Lele", "harga": "20.000"}, {"no": "34", "jenis": "Mas", "harga": "24.000"}, {"no": "35", "jenis": "Nila", "harga": "24.000"}, {"no": "36", "jenis": "Patin", "harga": "28.000"}, {"no": "37", "jenis": "Rajungan", "harga": "25.000"}, {"no": "38", "jenis": "Kerang Darah", "harga": "14.000"}, {"no": "39", "jenis": "Nomei/ Pelepah Keladi", "harga": "8.000"}, {"no": "40", "jenis": "Udang Lurik", "harga": "25.000"}, {"no": "41", "jenis": "Kerapu Sunu", "harga": "32.000"}, {"no": "42", "jenis": "Kerapu Macan", "harga": "34.000"}, {"no": "43", "jenis": "Kerapu", "harga": "36.000"}, {"no": "44", "jenis": "Sumpit", "harga": "15.000"}, {"no": "45", "jenis": "Puput/ Gemprang", "harga": "17.000"}];

/* ── DB KAPAL ── */
function bDbKapal(){renderDbKapal(DB_KAPAL);}
function renderDbKapal(data){
  const tb=document.getElementById('tbody-dbkap');
  document.getElementById('cnt-dbkap').textContent=data.length;
  tb.innerHTML=data.map((k,i)=>`<tr>
    <td style="color:#456789;font-size:9.5px">${i+1}</td>
    <td class="vb">${escHtml(k.nama_kapal)}</td>
    <td>${escHtml(k.nakhoda)}</td>
    <td style="font-size:10px">${escHtml(k.perusahaan)}</td>
    <td style="font-size:9.5px;color:#0077aa">${escHtml(k.selar)}</td>
    <td class="vm">${escHtml(k.gt)}</td>
    <td><span class="bdg bt" style="font-size:8px">${escHtml(k.alat_tangkap)}</span></td>
    <td style="font-size:9.5px;color:#456789">${escHtml(k.mesin)}</td>
    <td style="font-size:9px;color:#789aaa;max-width:160px;white-space:normal">${escHtml(k.alamat)}</td>
  </tr>`).join('');
}
function filterDbKapal(q){
  const lq=q.toLowerCase();
  const filtered=DB_KAPAL.filter(k=>
    k.nama_kapal.toLowerCase().includes(lq)||
    k.nakhoda.toLowerCase().includes(lq)||
    k.selar.toLowerCase().includes(lq)||
    k.perusahaan.toLowerCase().includes(lq)||
    k.alat_tangkap.toLowerCase().includes(lq)
  );
  renderDbKapal(filtered);
}

/* ── DB IKAN ── */
function bDbIkan(){renderDbIkan(DB_IKAN);}
function renderDbIkan(data){
  const tb=document.getElementById('tbody-dbikan');
  document.getElementById('cnt-dbikan').textContent=data.length;
  tb.innerHTML=data.map((k,i)=>{
    const harga=parseInt((k.harga||'0').replace(/\./g,''))||0;
    const bar=Math.round((harga/175000)*100);
    return`<tr>
      <td style="color:#456789;font-size:9.5px">${k.no}</td>
      <td class="vb" style="font-size:11px">${escHtml(k.jenis)}</td>
      <td>
        <div class="pgrow">
          <span class="vm" style="min-width:70px;font-size:11px">Rp ${k.harga}</span>
          <div class="pgtr" style="min-width:60px"><div class="pgfl" style="width:${bar}%"></div></div>
        </div>
      </td>
    </tr>`;
  }).join('');
}
function filterDbIkan(q){
  const lq=q.toLowerCase();
  const filtered=DB_IKAN.filter(k=>k.jenis.toLowerCase().includes(lq));
  renderDbIkan(filtered);
}

/* ── FORM INPUT KAPAL ── */
let fishRowCount=0;
let sessionEntries=[];
let kapalDDIndex=-1;

function bInputKapal(){
  const keys=sortedKeys();
  if(!keys.length){
    document.getElementById('form-period-warn').style.display='block';
    document.getElementById('form-period-info').style.display='none';
    return;
  }
  document.getElementById('form-period-warn').style.display='none';
  document.getElementById('form-period-info').style.display='flex';
  const activeKey=keys[keys.length-1];
  const d=db.get(activeKey);
  document.getElementById('form-aktif-label').textContent=(d?d.month+' '+d.year:activeKey);
  document.getElementById('form-vessel-count').textContent=(d?d.vessels.length+' kapal terdaftar':'');
  if(document.getElementById('fish-rows-wrap').children.length===0)addFishInputRow();
  renderLogEntry();
}

function kapalAutoComplete(q){
  const dd=document.getElementById('kapal-dropdown');
  kapalDDIndex=-1;
  if(!q||q.length<2){dd.style.display='none';return;}
  const lq=q.toLowerCase();
  const matches=DB_KAPAL.filter(k=>k.nama_kapal.toLowerCase().includes(lq)).slice(0,10);
  if(!matches.length){dd.style.display='none';return;}
  dd.innerHTML=matches.map((k,i)=>`<div class="kapal-dd-item" data-idx="${i}" onclick="selectKapal(${DB_KAPAL.indexOf(k)})">
    ${escHtml(k.nama_kapal)}
    <strong>Nakhoda: ${escHtml(k.nakhoda)} | Selar: ${escHtml(k.selar)} | GT: ${escHtml(k.gt)}</strong>
  </div>`).join('');
  dd.style.display='block';
  // Store matches for keyboard nav
  dd._matches=matches;
}

function kapalNavKey(e){
  const dd=document.getElementById('kapal-dropdown');
  const items=dd.querySelectorAll('.kapal-dd-item');
  if(!items.length)return;
  if(e.key==='ArrowDown'){e.preventDefault();kapalDDIndex=Math.min(kapalDDIndex+1,items.length-1);}
  else if(e.key==='ArrowUp'){e.preventDefault();kapalDDIndex=Math.max(kapalDDIndex-1,0);}
  else if(e.key==='Enter'&&kapalDDIndex>=0){e.preventDefault();items[kapalDDIndex].click();return;}
  else if(e.key==='Escape'){dd.style.display='none';return;}
  items.forEach((el,i)=>el.classList.toggle('active',i===kapalDDIndex));
  if(kapalDDIndex>=0)items[kapalDDIndex].scrollIntoView({block:'nearest'});
}

function selectKapal(idx){
  const k=DB_KAPAL[idx];
  if(!k)return;
  document.getElementById('fi-nama-kapal').value=k.nama_kapal;
  document.getElementById('fi-nakhoda').value=k.nakhoda;
  document.getElementById('fi-perusahaan').value=k.perusahaan;
  document.getElementById('fi-selar').value=k.selar;
  document.getElementById('fi-gt').value=k.gt;
  document.getElementById('fi-alat').value=k.alat_tangkap;
  document.getElementById('fi-mesin').value=k.mesin;
  document.getElementById('kapal-dropdown').style.display='none';
}

// Close dropdown on outside click
document.addEventListener('click',e=>{
  if(!e.target.closest('#fi-nama-kapal')&&!e.target.closest('#kapal-dropdown'))
    document.getElementById('kapal-dropdown').style.display='none';
});

function addFishInputRow(){
  const id='fr'+fishRowCount++;
  const wrap=document.getElementById('fish-rows-wrap');
  const div=document.createElement('div');
  div.className='fish-row';div.id=id;
  const opts=DB_IKAN.map(k=>`<option value="${escHtml(k.jenis)}" data-harga="${(k.harga||'0').replace(/\./g,'')}">${escHtml(k.jenis)} — Rp${k.harga}/Kg</option>`).join('');
  div.innerHTML=`
    <select onchange="onFishSelect(this,'${id}')" style="font-size:10px">
      <option value="">— Pilih Jenis Ikan —</option>
      ${opts}
    </select>
    <input type="number" id="${id}-kg" placeholder="Kg" min="0" step="0.1" oninput="recalcFishRow('${id}')" style="text-align:right">
    <input type="text" id="${id}-rp" placeholder="Harga/Kg" oninput="recalcFishTotals()" style="text-align:right;color:#9b5800" readonly>
    <button class="fish-del-btn" onclick="removeFishRow('${id}')">✕</button>`;
  wrap.appendChild(div);
}

function onFishSelect(sel,id){
  const opt=sel.options[sel.selectedIndex];
  const harga=opt.dataset.harga||0;
  const rp=document.getElementById(id+'-rp');
  if(rp)rp.value=harga?parseInt(harga).toLocaleString('id-ID'):'';
  recalcFishTotals();
}

function recalcFishRow(id){recalcFishTotals();}
function recalcFishTotals(){
  let totalKg=0,totalRp=0;
  document.querySelectorAll('.fish-row').forEach(row=>{
    const sel=row.querySelector('select');
    const kg=parseFloat(row.querySelector('input[id$="-kg"]')?.value)||0;
    const opt=sel?.options[sel.selectedIndex];
    const harga=parseInt(opt?.dataset.harga||0)||0;
    totalKg+=kg;totalRp+=kg*harga;
  });
  document.getElementById('fi-total-kg').textContent=totalKg.toLocaleString('id-ID',{maximumFractionDigits:1})+' Kg';
  document.getElementById('fi-total-rp').textContent='Rp '+totalRp.toLocaleString('id-ID');
}
function removeFishRow(id){
  const el=document.getElementById(id);if(el)el.remove();recalcFishTotals();
}

function submitInputKapal(){
  const namaKapal=document.getElementById('fi-nama-kapal').value.trim();
  const noStblkk=document.getElementById('fi-stblkk').value.trim();
  const tglTiba=document.getElementById('fi-tiba').value;
  if(!namaKapal){toast('⚠️ Nama kapal wajib diisi!');return;}
  if(!tglTiba){toast('⚠️ Tanggal tiba wajib diisi!');return;}

  // Build fish array
  const fish=[];
  document.querySelectorAll('.fish-row').forEach(row=>{
    const sel=row.querySelector('select');
    const jenis=sel?.value||'';
    if(!jenis)return;
    const kg=parseFloat(row.querySelector('input[id$="-kg"]')?.value)||0;
    const opt=sel.options[sel.selectedIndex];
    const harga=parseInt(opt?.dataset.harga||0)||0;
    fish.push({jenis,jumlah:kg,harga,nilai:kg*harga});
  });

  // Format date
  const fmtDate=d=>{
    if(!d)return'-';
    const [y,m,dd]=d.split('-');
    return`${dd}/${m}/${y}`;
  };

  // Get period key
  const keys=sortedKeys();
  if(!keys.length){toast('⚠️ Tidak ada data periode aktif!');return;}
  const activeKey=keys[keys.length-1];
  const d=db.get(activeKey);
  if(!d){toast('⚠️ Data periode tidak ditemukan!');return;}

  const vessel={
    no: d.vessels.length+1,
    tglTiba:fmtDate(tglTiba),
    tglBerangkat:fmtDate(document.getElementById('fi-berangkat').value),
    noStblkk:noStblkk||'-',
    namaKapal:namaKapal,
    nakhoda:document.getElementById('fi-nakhoda').value||'-',
    perusahaan:document.getElementById('fi-perusahaan').value||'-',
    alamat:'-',
    tandaSelar:document.getElementById('fi-selar').value||'-',
    gt:parseFloat(document.getElementById('fi-gt').value)||0,
    abk:parseInt(document.getElementById('fi-abk').value)||0,
    jenisKapal:'PENANGKAP',
    merkMesin:document.getElementById('fi-mesin').value||'-',
    kegiatan:document.getElementById('fi-kegiatan').value||'BONGKAR',
    alatTangkap:document.getElementById('fi-alat').value||'-',
    logistik:{es:0,air:0,solar:0,oli:0,gas:0,bensin:0,beras:0,garam:0,gula:0,minyakGoreng:0,rokok:0},
    tujuan:document.getElementById('fi-tujuan').value||'-',
    fish:fish,
    bulan:d.month+' '+d.year
  };

  // Add fish to fishData
  const newFishData=fish.map(f=>(({...f,kapal:vessel.namaKapal,tanggal:vessel.tglTiba,bulan:vessel.bulan})));

  d.vessels.push(vessel);
  d.fishData.push(...newFishData);
  db.set(activeKey,d);

  // Update MRG if this key is in the current range
  MRG.vessels.push(vessel);
  MRG.fishData.push(...newFishData);

  // Log entry
  sessionEntries.push(vessel);
  renderLogEntry();

  toast('✅ Data kapal '+namaKapal+' berhasil disimpan!');
  gsPushVessel(vessel); // sinkron ke Google Sheets
  document.getElementById('fi-status').textContent='✅ Tersimpan: '+namaKapal;
  setTimeout(()=>document.getElementById('fi-status').textContent='',4000);

  // Partial reset (keep kapal data, clear dates/stblkk)
  document.getElementById('fi-stblkk').value='';
  document.getElementById('fi-tiba').value='';
  document.getElementById('fi-berangkat').value='';
  document.getElementById('fi-abk').value='';
  document.getElementById('fi-tujuan').value='';
  document.getElementById('fish-rows-wrap').innerHTML='';
  fishRowCount=0;
  addFishInputRow();
  recalcFishTotals();

  // Update relevant displayed tabs
  applyRange();
}

function resetFormInput(){
  ['fi-nama-kapal','fi-nakhoda','fi-perusahaan','fi-selar','fi-gt','fi-alat','fi-mesin',
   'fi-stblkk','fi-tiba','fi-berangkat','fi-abk','fi-tujuan'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.value='';
  });
  document.getElementById('fish-rows-wrap').innerHTML='';
  fishRowCount=0;addFishInputRow();recalcFishTotals();
  document.getElementById('fi-status').textContent='';
}

function renderLogEntry(){
  const tb=document.getElementById('tbody-log-entry');
  document.getElementById('cnt-log-entry').textContent=sessionEntries.length;
  if(!sessionEntries.length){tb.innerHTML='<tr><td colspan="8" style="text-align:center;color:#789aaa;padding:14px">Belum ada entri manual sesi ini</td></tr>';return;}
  tb.innerHTML=sessionEntries.map((v,i)=>`<tr>
    <td style="color:#456789">${i+1}</td>
    <td class="vb">${escHtml(v.namaKapal)}</td>
    <td style="font-size:9px;color:#0077aa">${escHtml(v.noStblkk)}</td>
    <td>${escHtml(v.nakhoda)}</td>
    <td>${escHtml(v.tglTiba)}</td>
    <td style="font-size:9.5px">${v.fish.length} jenis (${v.fish.map(f=>f.jenis).slice(0,2).join(', ')}${v.fish.length>2?'...':''})</td>
    <td class="vm">${v.fish.reduce((s,f)=>s+f.jumlah,0).toLocaleString('id-ID')} Kg</td>
    <td><button class="btn-s bs-red" style="padding:2px 7px;font-size:9px" onclick="deleteSessionEntry(${i})">🗑</button></td>
  </tr>`).join('');
}

function deleteSessionEntry(idx){
  const v=sessionEntries[idx];
  // Remove from db
  const keys=sortedKeys();
  if(keys.length){
    const activeKey=keys[keys.length-1];
    const d=db.get(activeKey);
    if(d){
      d.vessels=d.vessels.filter(x=>x.noStblkk!==v.noStblkk||x.namaKapal!==v.namaKapal);
      d.fishData=d.fishData.filter(x=>!(x.kapal===v.namaKapal&&x.tanggal===v.tglTiba));
      db.set(activeKey,d);
    }
  }
  sessionEntries.splice(idx,1);
  renderLogEntry();
  applyRange();
  toast('🗑 Entri dihapus');
}