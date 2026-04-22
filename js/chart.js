/* ══════════════════════════════════════════════════
   CHART & BUILD FUNCTIONS — DOPK Dashboard
   Menggunakan Chart.js 4.4.1
══════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════
   BUILD ALL
══════════════════════════════════════════════════ */
function buildAllPages(){
  const{vessels,fishData,label,keys}=MRG;
  const sub=vessels.length+' kunjungan · '+fishData.length+' transaksi ikan · '+keys.length+' bulan · '+label;
  document.getElementById('dtitle').textContent='Dashboard '+label;
  document.getElementById('dsub').textContent=sub;
  ['sub-ind','sub-keg','sub-kap','sub-akt','sub-gt','sub-ikn','sub-log','sub-rng'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=sub;});
  bUtama();bKegiatan();bKapal();bAktivitas();bGT();bIkan();bLogistik();bRingkas();
}

function bUtama(){
  const{vessels,fishData,keys}=MRG;
  const tKg=fishData.reduce((s,f)=>s+f.jumlah,0),tVal=fishData.reduce((s,f)=>s+f.nilai,0);
  const pen=vessels.filter(v=>v.jenisKapal.includes('PENANGKAP')).length,peng=vessels.filter(v=>v.jenisKapal.includes('PENGANGKUT')).length;
  const gtr=gtrRanges(vessels);
  document.getElementById('kr-utama').innerHTML=`
    <div class="kc"><div class="kt"><span class="ke">🚢</span><span class="ktag tg-t">${keys.length}bln</span></div><div class="kv">${vessels.length}</div><div class="kl">Total Kunjungan</div><div class="ks">~${Math.round(vessels.length/(keys.length||1))}/bulan</div></div>
    <div class="kc"><div class="kt"><span class="ke">🐟</span></div><div class="kv">${fN(tKg)} Kg</div><div class="kl">Total Produksi</div><div class="ks">~${fN(Math.round(tKg/(vessels.length||1)))} Kg/kapal</div></div>
    <div class="kc"><div class="kt"><span class="ke">💰</span></div><div class="kv" style="font-size:14px">${fRp(tVal)}</div><div class="kl">Nilai Produksi</div></div>
    <div class="kc"><div class="kt"><span class="ke">⚓</span><span class="ktag tg-g">Range GT</span></div><div class="kv">${vessels.length} Kapal</div><div class="kl">Armada</div><div class="gt-pills">${gtr.map(r=>`<div class="gtp">${r.l} <b>${r.c}</b></div>`).join('')}</div></div>
    <div class="kc"><div class="kt"><span class="ke">🎣</span></div><div class="kv">${pen}</div><div class="kl">Kapal Penangkap</div></div>
    <div class="kc"><div class="kt"><span class="ke">🏭</span></div><div class="kv">${peng}</div><div class="kl">Kapal Pengangkut</div></div>`;
  const bd={};vessels.forEach(v=>{bd[v.tglTiba]=(bd[v.tglTiba]||0)+1;});const days=Object.keys(bd).sort();
  kc('cD');CH['cD']=new Chart(document.getElementById('cD'),{type:'bar',data:{labels:days,datasets:[{data:days.map(d=>bd[d]),backgroundColor:'rgba(29,224,176,.6)',borderRadius:3,borderSkipped:false}]},options:{...CO,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'rgba(0,50,100,.4)',font:{size:7.5},maxTicksLimit:10},grid:{color:'rgba(0,80,140,.05)'}},y:{beginAtZero:true,ticks:{color:'rgba(0,50,100,.55)',stepSize:1},grid:{color:'rgba(0,80,140,.07)'}}}}});
  const jc={};vessels.forEach(v=>{const k=v.jenisKapal||'LAINNYA';jc[k]=(jc[k]||0)+1;});
  kc('cJ');CH['cJ']=new Chart(document.getElementById('cJ'),{type:'doughnut',data:{labels:Object.keys(jc),datasets:[{data:Object.values(jc),backgroundColor:PAL,borderWidth:0,hoverOffset:5}]},options:{responsive:true,cutout:'55%',plugins:{legend:{position:'bottom',labels:{color:'rgba(0,50,100,.7)',font:{size:9.5},padding:7}}}}});
  const im={};fishData.forEach(f=>{im[f.jenis]=(im[f.jenis]||0)+f.jumlah;});const t5=Object.entries(im).sort((a,b)=>b[1]-a[1]).slice(0,5);
  kc('cI5');CH['cI5']=new Chart(document.getElementById('cI5'),{type:'bar',data:{labels:t5.map(x=>x[0]),datasets:[{data:t5.map(x=>x[1]),backgroundColor:PAL.slice(0,5),borderRadius:3,borderSkipped:false}]},options:{indexAxis:'y',...CO,plugins:{legend:{display:false}},scales:{y:{ticks:{color:'rgba(0,50,100,.6)',font:{size:8.5}},grid:{display:false}},x:{ticks:{color:'rgba(180,220,238,.38)'},grid:{color:'rgba(0,80,140,.07)'}}}}});
}

function bIndikator(){
  const years=Object.keys(IND).sort().reverse();
  if(!years.length){
    // Coba build dari rekap dulu
    buildIndFromRekap();
    const yrs2=Object.keys(IND).sort().reverse();
    if(!yrs2.length){
      document.getElementById('kr-ind').innerHTML=`<div style="grid-column:1/-1;text-align:center;padding:32px;color:var(--DM)"><div style="font-size:32px;margin-bottom:8px">📈</div><div>Belum ada data rekap atau indikator yang dimuat.</div></div>`;
      document.getElementById('tbl-ind').innerHTML='';return;
    }
  }
  const yr=years[0];const ind=IND[yr];const{rows,activeMons}=ind;
  const find=kw=>rows.find(r=>r.nama.toLowerCase().includes(kw.toLowerCase()));
  const gT=row=>{if(!row)return 0;if(row.total!==null)return row.total;return activeMons.reduce((s,m)=>s+(row.values[m]||0),0);};
  const vP=find('Volume Produksi'),nP=find('Nilai Produksi'),vD=find('Volume Distribusi'),nD=find('Nilai Distribusi'),kj=find('Kunjungan Kapal Perikanan'),spb=find('Surat Persetujuan Berlayar'),lb=find('Log Book Kapal');
  const autoTag = ind.isAutoGenerated ? ' · <span style="background:rgba(15,157,88,.12);color:#0b7a5c;border:1px solid rgba(15,157,88,.25);border-radius:50px;padding:1px 8px;font-size:8.5px;font-weight:600">🔄 Dihitung dari rekap</span>' : ' · <span style="background:rgba(0,119,170,.1);color:#004e7c;border:1px solid rgba(0,119,170,.25);border-radius:50px;padding:1px 8px;font-size:8.5px;font-weight:600">📁 Upload file</span>';
  document.getElementById('sub-ind').innerHTML='Tahun '+yr+' · '+activeMons.join(', ')+autoTag;
  document.getElementById('kr-ind').innerHTML=`
    <div class="kc"><div class="kt"><span class="ke">📦</span><span class="ktag tg-t">Produksi</span></div><div class="kv">${fN(gT(vP))} Kg</div><div class="kl">Volume Produksi</div><div class="ks">${fRp(gT(nP))}</div></div>
    <div class="kc"><div class="kt"><span class="ke">🚚</span><span class="ktag tg-g">Distribusi</span></div><div class="kv">${fN(gT(vD))} Kg</div><div class="kl">Volume Distribusi</div><div class="ks">${fRp(gT(nD))}</div></div>
    <div class="kc"><div class="kt"><span class="ke">🚢</span></div><div class="kv">${gT(kj)}</div><div class="kl">Kunjungan Kapal</div></div>
    <div class="kc"><div class="kt"><span class="ke">📄</span></div><div class="kv">${gT(spb)}</div><div class="kl">SPB Diterbitkan</div></div>
    <div class="kc"><div class="kt"><span class="ke">📖</span></div><div class="kv">${gT(lb)}</div><div class="kl">Log Book Kapal</div></div>`;
  kc('cIT');CH['cIT']=new Chart(document.getElementById('cIT'),{type:'bar',data:{labels:activeMons,datasets:[{label:'Produksi (Kg)',data:activeMons.map(m=>vP?.values[m]||0),backgroundColor:'rgba(29,224,176,.65)',borderRadius:3,borderSkipped:false},{label:'Distribusi (Kg)',data:activeMons.map(m=>vD?.values[m]||0),backgroundColor:'rgba(245,166,35,.5)',borderRadius:3,borderSkipped:false}]},options:{...CO,scales:{x:{ticks:{color:'rgba(0,50,100,.65)'},grid:{display:false}},y:{ticks:{color:'rgba(0,50,100,.55)',callback:v=>fN(v)+' Kg'},grid:{color:'rgba(0,80,140,.07)'}}}}});
  kc('cIV');CH['cIV']=new Chart(document.getElementById('cIV'),{type:'bar',data:{labels:activeMons,datasets:[{label:'Nilai Produksi',data:activeMons.map(m=>nP?.values[m]||0),backgroundColor:'rgba(29,224,176,.6)',borderRadius:3,borderSkipped:false},{label:'Nilai Distribusi',data:activeMons.map(m=>nD?.values[m]||0),backgroundColor:'rgba(124,92,191,.5)',borderRadius:3,borderSkipped:false}]},options:{...CO,scales:{x:{ticks:{color:'rgba(0,50,100,.65)'},grid:{display:false}},y:{ticks:{color:'rgba(0,50,100,.55)',callback:v=>'Rp '+Number(v/1e6).toFixed(0)+'jt'},grid:{color:'rgba(0,80,140,.07)'}}}}});
  const pklR=find('Perjanjian Kerja Laut');
  kc('cID');CH['cID']=new Chart(document.getElementById('cID'),{type:'bar',data:{labels:activeMons,datasets:[{label:'SPB',data:activeMons.map(m=>spb?.values[m]||0),backgroundColor:PAL[0],borderRadius:3,borderSkipped:false},{label:'Log Book',data:activeMons.map(m=>lb?.values[m]||0),backgroundColor:PAL[1],borderRadius:3,borderSkipped:false},{label:'PKL',data:activeMons.map(m=>pklR?.values[m]||0),backgroundColor:PAL[2],borderRadius:3,borderSkipped:false}]},options:{...CO,scales:{x:{ticks:{color:'rgba(0,50,100,.65)'},grid:{display:false}},y:{ticks:{color:'rgba(180,220,238,.38)'},grid:{color:'rgba(0,80,140,.07)'}}}}});
  document.getElementById('cnt-ind').textContent=rows.length;
  const mH=activeMons.map(m=>`<th>${m}</th>`).join('');
  document.getElementById('tbl-ind').innerHTML=`<thead><tr><th>No</th><th>Indikator Kinerja</th><th>Satuan</th>${mH}<th>JUMLAH</th><th>Aksi</th></tr></thead>
  <tbody>${rows.map((r,ri)=>{
    const isRp=r.satuan&&r.satuan.toLowerCase().includes('rp');
    const mV=activeMons.map(m=>`<td class="${r.isSub?'':'ind-num'} ${isRp?'ind-rp':''}">${r.values[m]!==null?fN(r.values[m]):'—'}</td>`).join('');
    const tot=r.total!==null?`<td class="ind-tot ${isRp?'ind-rp':''}">${fN(r.total)}</td>`:'<td style="color:var(--DM)">—</td>';
    return`<tr id="ind-row-${ri}">
      <td class="ind-no">${r.no}</td>
      <td class="${r.isSub?'ind-sub':'ind-nm'}">${r.nama}</td>
      <td style="color:var(--DM);font-size:9px;white-space:nowrap">${r.satuan}</td>
      ${mV}${tot}
      <td><button class="btn-s bs-gold" style="font-size:9px;padding:2px 7px" onclick="openEditSingleInd(${ri})">✏️</button></td>
    </tr>`;
  }).join('')}</tbody>`;
}

/* ══════════════════════════════════════════════════
   SINKRONISASI PAGE
══════════════════════════════════════════════════ */
function bSinkron(){
  const{vessels,fishData,keys}=MRG;
  const cont=document.getElementById('sync-content');
  if(!keys.length){cont.innerHTML='<div class="alert alert-warn"><span class="ai">⚠️</span><div>Pilih periode terlebih dahulu dari selector di atas.</div></div>';return;}

  // Build sync data per month
  let html='';
  let totalMismatch=0;
  const yrCheck=Object.keys(IND).sort().reverse()[0];
  const ind=yrCheck?IND[yrCheck]:null;

  // Summary section
  html+=`<div class="sync-summary">
    <div class="sync-card"><h4>📊 DATA REKAP (${MRG.label})</h4>`;
  const tKg=fishData.reduce((s,f)=>s+f.jumlah,0),tVal=fishData.reduce((s,f)=>s+f.nilai,0),tKunjungan=vessels.length;
  html+=`<div class="sync-item"><span class="sync-key">Total Kunjungan</span><span class="sync-val ok-val">${tKunjungan}</span></div>
    <div class="sync-item"><span class="sync-key">Volume Produksi</span><span class="sync-val ok-val">${fN(tKg)} Kg</span></div>
    <div class="sync-item"><span class="sync-key">Nilai Produksi</span><span class="sync-val ok-val">${fRp(tVal)}</span></div>
    </div>`;

  if(ind){
    const vP=ind.rows.find(r=>r.nama.includes('Volume Produksi'));
    const nP=ind.rows.find(r=>r.nama.includes('Nilai Produksi'));
    const kj=ind.rows.find(r=>r.nama.includes('Kunjungan Kapal Perikanan'));
    const indTotalKg=ind.activeMons.reduce((s,m)=>s+(vP?.values[m]||0),0);
    const indTotalVal=ind.activeMons.reduce((s,m)=>s+(nP?.values[m]||0),0);
    const indKunjungan=ind.activeMons.reduce((s,m)=>s+(kj?.values[m]||0),0);
    const diffKg=tKg-indTotalKg,diffVal=tVal-indTotalVal,diffKunj=tKunjungan-indKunjungan;
    if(diffKg!==0||diffVal!==0||diffKunj!==0)totalMismatch++;
    html+=`<div class="sync-card"><h4>📈 DATA INDIKATOR (${ind.year})</h4>
      <div class="sync-item"><span class="sync-key">Total Kunjungan</span><span class="sync-val ${diffKunj===0?'ok-val':'bad-val'}">${indKunjungan}</span></div>
      <div class="sync-item"><span class="sync-key">Volume Produksi</span><span class="sync-val ${diffKg===0?'ok-val':'bad-val'}">${fN(indTotalKg)} Kg</span></div>
      <div class="sync-item"><span class="sync-key">Nilai Produksi</span><span class="sync-val ${diffVal===0?'ok-val':'bad-val'}">${fRp(indTotalVal)}</span></div>
      </div>
    <div class="sync-card"><h4>🔍 SELISIH</h4>
      <div class="sync-item"><span class="sync-key">Kunjungan</span><span class="sync-val ${diffKunj===0?'ok-val':'bad-val'}">${diffKunj===0?'✓ Sesuai':(diffKunj>0?'+':'')+fN(diffKunj)}</span></div>
      <div class="sync-item"><span class="sync-key">Volume (Kg)</span><span class="sync-val ${diffKg===0?'ok-val':'bad-val'}">${diffKg===0?'✓ Sesuai':(diffKg>0?'+':'')+fN(diffKg)+' Kg'}</span></div>
      <div class="sync-item"><span class="sync-key">Nilai (Rp)</span><span class="sync-val ${diffVal===0?'ok-val':'bad-val'}">${diffVal===0?'✓ Sesuai':(diffVal>0?'+':'')+fRp(diffVal)}</span></div>
      </div>`;
  }else{
    html+=`<div class="sync-card" style="grid-column:span 2"><div style="color:var(--DM);font-size:11px;padding:12px 0">⚠️ Data Indikator belum diupload. Upload file Indikator_Maret.xlsx untuk melihat perbandingan.</div></div>`;
  }
  html+='</div>';

  // Per-bulan breakdown
  html+=`<div class="tbox"><div class="th"><h3>Detail Perbandingan per Bulan</h3></div><div class="tw"><table style="min-width:600px">
    <thead><tr><th>Bulan</th><th>Kunjungan Rekap</th><th>Kunjungan Ind.</th><th>Vol. Prod. Rekap</th><th>Val. Prod. Ind.</th><th>Nilai Prod. Rekap</th><th>Nilai Prod. Ind.</th><th>Status</th><th>Aksi</th></tr></thead><tbody>`;

  keys.forEach(k=>{
    const d=db.get(k);if(!d)return;
    const mKg=d.fishData.reduce((s,f)=>s+f.jumlah,0);
    const mVal=d.fishData.reduce((s,f)=>s+f.nilai,0);
    const mKunj=d.vessels.length;
    let indKg=null,indVal=null,indKunj=null;
    if(ind){
      const vP=ind.rows.find(r=>r.nama.includes('Volume Produksi'));
      const nP=ind.rows.find(r=>r.nama.includes('Nilai Produksi'));
      const kj=ind.rows.find(r=>r.nama.includes('Kunjungan Kapal Perikanan'));
      indKg=vP?.values[d.month]??null;indVal=nP?.values[d.month]??null;indKunj=kj?.values[d.month]??null;
    }
    const kgOk=indKg===null||mKg===indKg,valOk=indVal===null||mVal===indVal,kunjOk=indKunj===null||mKunj===indKunj;
    const allOk=kgOk&&valOk&&kunjOk;
    if(!allOk)totalMismatch++;
    const status=allOk?`<span class="bdg be">✓ Sesuai</span>`:`<span class="bdg br">⚠ Beda</span>`;
    const errDetails=[];
    if(!kunjOk)errDetails.push('Kunjungan selisih '+(mKunj-indKunj));
    if(!kgOk)errDetails.push('Volume selisih '+fN(mKg-indKg)+' Kg');
    if(!valOk)errDetails.push('Nilai selisih '+fRp(mVal-indVal));
    html+=`<tr class="${allOk?'':'mismatch'}">
      <td class="vb">${d.month} ${d.year}</td>
      <td>${mKunj}</td><td>${indKunj!==null?indKunj:'—'}</td>
      <td>${fN(mKg)} Kg</td><td>${indKg!==null?fN(indKg)+' Kg':'—'}</td>
      <td class="vm">${fRp(mVal)}</td><td class="${valOk?'':'ind-rp'}">${indVal!==null?fRp(indVal):'—'}</td>
      <td>${status}${errDetails.length?'<div style="font-size:8.5px;color:var(--CO);margin-top:3px">'+errDetails.join('<br>')+'</div>':''}</td>
      <td><button class="btn-s bs-gold" style="font-size:9px;padding:2px 7px" onclick="openEditFish('${k}')">✏️ Edit Rekap</button></td>
    </tr>`;
  });
  html+=`</tbody></table></div></div>`;

  // Fish detail errors — items where nilai stored !== jumlah*harga
  html+=`<div class="tbox"><div class="th"><h3>🔍 Deteksi Error Nilai Ikan (Tersimpan vs Kalkulasi)</h3></div><div class="tw"><table style="min-width:500px">
    <thead><tr><th>Bulan</th><th>Kapal</th><th>Jenis Ikan</th><th>Jumlah</th><th>Harga</th><th>Nilai Tersimpan</th><th>Nilai Kalkulasi</th><th>Selisih</th><th>Aksi</th></tr></thead><tbody>`;
  let errorCount=0;
  MRG.fishData.forEach((f,fi)=>{
    const expected=f.jumlah*f.harga;
    if(Math.abs(f.nilai-expected)>0.5){
      errorCount++;
      html+=`<tr class="mismatch"><td class="vb">${f.bulan||'—'}</td><td>${f.kapal}</td><td>${f.jenis}</td>
        <td>${fN(f.jumlah)} Kg</td><td>${fN(f.harga)}</td>
        <td class="ind-rp">${fRp(f.nilai)}</td>
        <td class="vm">${fRp(expected)}</td>
        <td class="br" style="color:var(--CO);font-weight:700">${fRp(f.nilai-expected)}</td>
        <td><button class="btn-s bs-gold" style="font-size:9px;padding:2px 7px" onclick="fixFishValue(${JSON.stringify(f.bulan||'')},${JSON.stringify(f.kapal)},${JSON.stringify(f.jenis)})">🔧 Fix</button></td>
      </tr>`;
    }
  });
  if(errorCount===0)html+=`<tr><td colspan="9" style="text-align:center;padding:20px;color:var(--DM)">✓ Tidak ada error nilai ikan ditemukan — semua kalkulasi sesuai</td></tr>`;
  html+=`</tbody></table></div></div>`;

  // Summary alert
  const alertHtml=totalMismatch===0
    ?`<div class="alert alert-ok"><span class="ai">✅</span><div><strong>Data Sinkron!</strong> Semua nilai antara rekap dan indikator sesuai.</div></div>`
    :`<div class="alert alert-err"><span class="ai">⚠️</span><div><strong>${totalMismatch} perbedaan ditemukan.</strong> Gunakan tombol Edit untuk memperbaiki. Perbedaan nilai bisa terjadi karena kesalahan input harga di file Excel asli.</div></div>`;
  cont.innerHTML=alertHtml+html;
}

/* ══════════════════════════════════════════════════
   REMAINING BUILD FUNCTIONS
══════════════════════════════════════════════════ */
function bKegiatan(){
  const{vessels}=MRG;const bon=vessels.filter(v=>v.kegiatan.toLowerCase()==='bongkar').length,prb=vessels.filter(v=>v.kegiatan.toLowerCase()==='perbekalan').length;
  document.getElementById('kr-keg').innerHTML=`<div class="kc"><div class="kt"><span class="ke">📦</span></div><div class="kv">${bon}</div><div class="kl">Bongkar</div></div><div class="kc"><div class="kt"><span class="ke">⛽</span></div><div class="kv">${prb}</div><div class="kl">Perbekalan</div></div><div class="kc"><div class="kt"><span class="ke">📋</span></div><div class="kv">${vessels.length-bon-prb}</div><div class="kl">Lainnya</div></div><div class="kc"><div class="kt"><span class="ke">📊</span></div><div class="kv">${vessels.length}</div><div class="kl">Total</div></div>`;
  document.getElementById('cnt-keg').textContent=vessels.length;
  document.getElementById('tbl-keg').innerHTML=`<thead><tr><th>#</th><th>Bulan</th><th>Tanggal</th><th>Nama Kapal</th><th>Nakhoda</th><th>Kegiatan</th><th>Jenis Kapal</th><th>Alat Tangkap</th><th>ABK</th><th>Aksi</th></tr></thead>
  <tbody>${vessels.map((v,i)=>`<tr><td>${i+1}</td><td><span class="bdg bs2">${v.bulan}</span></td><td>${v.tglTiba}</td><td class="vb">${v.namaKapal}</td><td>${v.nakhoda}</td><td><span class="bdg ${v.kegiatan.toLowerCase()==='bongkar'?'bt':'bg'}">${v.kegiatan}</span></td><td><span class="bdg bs2">${v.jenisKapal}</span></td><td>${v.alatTangkap||'—'}</td><td>${v.abk}</td><td><button class="btn-s bs-gold" style="font-size:8.5px;padding:1.5px 6px" onclick="openEditFish('${v.bulan.replace(' ','_')}')">✏️</button></td></tr>`).join('')}</tbody>`;
}

function bKapal(){
  const{vessels}=MRG;document.getElementById('cnt-kap').textContent=vessels.length;
  document.getElementById('tbl-kap').innerHTML=`<thead><tr><th>#</th><th>Bulan</th><th>No.STBLKK</th><th>Nama Kapal</th><th>Selar</th><th>GT</th><th>Nakhoda</th><th>Perusahaan</th><th>Mesin</th><th>ABK</th><th>Tgl Tiba</th><th>Tgl Berangkat</th></tr></thead>
  <tbody>${vessels.map((v,i)=>`<tr><td>${i+1}</td><td><span class="bdg bs2">${v.bulan}</span></td><td style="font-size:8.5px;color:rgba(29,224,176,.45)">${v.noStblkk}</td><td class="vb">${v.namaKapal}</td><td>${v.tandaSelar}</td><td class="vb">${v.gt}</td><td>${v.nakhoda}</td><td>${v.perusahaan}</td><td>${v.merkMesin}</td><td>${v.abk}</td><td>${v.tglTiba}</td><td>${v.tglBerangkat}</td></tr>`).join('')}</tbody>`;
}

function bAktivitas(){
  const{vessels,fishData}=MRG;document.getElementById('cnt-akt').textContent=vessels.length;
  const nd={};fishData.forEach(f=>{nd[f.tanggal]=(nd[f.tanggal]||0)+f.nilai;});const days=Object.keys(nd).sort();
  kc('cN');CH['cN']=new Chart(document.getElementById('cN'),{type:'line',data:{labels:days,datasets:[{data:days.map(d=>nd[d]),borderColor:PAL[0],backgroundColor:'rgba(29,224,176,.06)',fill:true,tension:.4,pointRadius:2}]},options:{...CO,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'rgba(0,50,100,.4)',font:{size:7.5},maxTicksLimit:12},grid:{color:'rgba(0,80,140,.05)'}},y:{ticks:{color:'rgba(0,50,100,.55)',callback:v=>'Rp '+Number(v/1e6).toFixed(0)+'jt'},grid:{color:'rgba(0,80,140,.07)'}}}}});
  document.getElementById('tbl-akt').innerHTML=`<thead><tr><th>#</th><th>Bulan</th><th>Tanggal</th><th>Nama Kapal</th><th>Kegiatan</th><th>Alat Tangkap</th><th>Jenis Ikan</th><th>Total Kg</th><th>Nilai (Rp)</th></tr></thead>
  <tbody>${vessels.map((v,i)=>`<tr><td>${i+1}</td><td><span class="bdg bs2">${v.bulan}</span></td><td>${v.tglTiba}</td><td class="vb">${v.namaKapal}</td><td><span class="bdg bt">${v.kegiatan}</span></td><td>${v.alatTangkap||'—'}</td><td style="font-size:8.5px">${v.fish.map(f=>f.jenis).join('; ')||'—'}</td><td class="vb">${fN(v.fish.reduce((s,f)=>s+f.jumlah,0))}</td><td class="vm">${fRp(v.fish.reduce((s,f)=>s+f.nilai,0))}</td></tr>`).join('')}</tbody>`;
}

function bGT(){
  const{vessels}=MRG;const gtr=gtrRanges(vessels);const cL=['< 5 GT','5–10 GT','11–20 GT','21–30 GT','> 30 GT'];const cV=[0,0,0,0,0];vessels.forEach(v=>{const g=v.gt;if(g<5)cV[0]++;else if(g<=10)cV[1]++;else if(g<=20)cV[2]++;else if(g<=30)cV[3]++;else cV[4]++;});
  document.getElementById('kr-gt').innerHTML=gtr.map(r=>`<div class="kc"><div class="kt"><span class="ke">⚓</span></div><div class="kv">${r.c}</div><div class="kl">Kapal ${r.l}</div><div class="ks">${vessels.length?Math.round(r.c/vessels.length*100):0}% armada</div></div>`).join('')+`<div class="kc"><div class="kt"><span class="ke">🚢</span></div><div class="kv">${vessels.length}</div><div class="kl">Total Armada</div></div>`;
  kc('cGT');CH['cGT']=new Chart(document.getElementById('cGT'),{type:'pie',data:{labels:cL,datasets:[{data:cV,backgroundColor:PAL,borderWidth:0}]},options:{responsive:true,plugins:{legend:{position:'bottom',labels:{color:'rgba(180,220,238,.55)',font:{size:9.5}}}}}});
  const bj={};vessels.forEach(v=>{if(!bj[v.jenisKapal])bj[v.jenisKapal]={c:0};bj[v.jenisKapal].c++;});
  kc('cGJ');CH['cGJ']=new Chart(document.getElementById('cGJ'),{type:'bar',data:{labels:Object.keys(bj),datasets:[{data:Object.values(bj).map(x=>x.c),backgroundColor:PAL,borderRadius:3,borderSkipped:false}]},options:{...CO,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'rgba(0,50,100,.65)'},grid:{display:false}},y:{ticks:{color:'rgba(0,50,100,.55)',stepSize:1},grid:{color:'rgba(0,80,140,.07)'}}}}});
  document.getElementById('cnt-gt').textContent=vessels.length;
  document.getElementById('tbl-gt').innerHTML=`<thead><tr><th>#</th><th>Bulan</th><th>Nama Kapal</th><th>Selar</th><th>GT</th><th>Jenis Kapal</th><th>Kategori GT</th><th>Tgl Kunjungan</th></tr></thead>
  <tbody>${[...vessels].sort((a,b)=>b.gt-a.gt).map((v,i)=>{const g=v.gt;const k=g<5?'< 5 GT':g<=10?'5–10 GT':g<=20?'11–20 GT':g<=30?'21–30 GT':'> 30 GT';return`<tr><td>${i+1}</td><td><span class="bdg bs2">${v.bulan}</span></td><td class="vb">${v.namaKapal}</td><td>${v.tandaSelar}</td><td class="vb">${g}</td><td><span class="bdg bt">${v.jenisKapal}</span></td><td><span class="bdg bg">${k}</span></td><td>${v.tglTiba}</td></tr>`;}).join('')}</tbody>`;
}

function bIkan(){
  const{fishData}=MRG;const im={};fishData.forEach(f=>{if(!im[f.jenis])im[f.jenis]={jumlah:0,nilai:0,count:0,harga:f.harga};im[f.jenis].jumlah+=f.jumlah;im[f.jenis].nilai+=f.nilai;im[f.jenis].count++;});
  const sorted=Object.entries(im).sort((a,b)=>b[1].jumlah-a[1].jumlah);const tKg=fishData.reduce((s,f)=>s+f.jumlah,0);const mx=sorted[0]?.[1].jumlah||1;
  kc('cIK');CH['cIK']=new Chart(document.getElementById('cIK'),{type:'bar',data:{labels:sorted.map(x=>x[0]),datasets:[{data:sorted.map(x=>x[1].jumlah),backgroundColor:sorted.map((_,i)=>PAL[i%PAL.length]),borderRadius:3,borderSkipped:false}]},options:{...CO,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'rgba(180,220,238,.4)',font:{size:8}},grid:{display:false}},y:{ticks:{color:'rgba(180,220,238,.38)'},grid:{color:'rgba(0,80,140,.07)'}}}}});
  document.getElementById('cnt-ikn').textContent=sorted.length;
  document.getElementById('tbl-ikn').innerHTML=`<thead><tr><th>Jenis Ikan</th><th>Total (Kg)</th><th>Harga Rata (Rp)</th><th>Nilai (Rp)</th><th>Frek.</th><th>% Prod.</th></tr></thead>
  <tbody>${sorted.map(([nm,d])=>`<tr><td class="vb">${nm}</td><td>${fN(d.jumlah)}</td><td>${fN(d.harga)}</td><td class="vm">${fRp(d.nilai)}</td><td>${d.count}x</td><td><div class="pgrow"><div class="pgtr"><div class="pgfl" style="width:${Math.round(d.jumlah/mx*100)}%"></div></div><span class="pgpct">${tKg?Math.round(d.jumlah/tKg*100):0}%</span></div></td></tr>`).join('')}</tbody>`;
}

function bLogistik(){
  const{vessels}=MRG;const T={es:0,air:0,solar:0,oli:0,gas:0,bensin:0,beras:0,garam:0,gula:0,minyak:0,rokok:0};
  vessels.forEach(v=>{T.es+=v.logistik.es;T.air+=v.logistik.air;T.solar+=v.logistik.solar;T.oli+=v.logistik.oli;T.gas+=v.logistik.gas;T.bensin+=v.logistik.bensin;T.beras+=v.logistik.beras;T.garam+=v.logistik.garam;T.gula+=v.logistik.gula;T.minyak+=v.logistik.minyakGoreng;T.rokok+=v.logistik.rokok;});
  document.getElementById('kr-log').innerHTML=`<div class="kc"><div class="kt"><span class="ke">🧊</span></div><div class="kv">${fN(T.es)}</div><div class="kl">ES (Kg)</div></div><div class="kc"><div class="kt"><span class="ke">💧</span></div><div class="kv">${fN(T.air)}</div><div class="kl">Air (L)</div></div><div class="kc"><div class="kt"><span class="ke">⛽</span></div><div class="kv">${fN(T.solar)}</div><div class="kl">Solar (L)</div></div><div class="kc"><div class="kt"><span class="ke">🛢</span></div><div class="kv">${fN(T.oli)}</div><div class="kl">Oli (L)</div></div>`;
  kc('cLG');CH['cLG']=new Chart(document.getElementById('cLG'),{type:'bar',data:{labels:['ES','Air','Solar','Oli','Gas LPG','Bensin'],datasets:[{data:[T.es,T.air,T.solar,T.oli,T.gas,T.bensin],backgroundColor:PAL,borderRadius:4,borderSkipped:false}]},options:{...CO,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'rgba(0,50,100,.65)'},grid:{display:false}},y:{ticks:{color:'rgba(180,220,238,.38)'},grid:{color:'rgba(0,80,140,.07)'}}}}});
  const lv=vessels.filter(v=>v.logistik.solar>0||v.logistik.es>0||v.logistik.air>0);document.getElementById('cnt-log').textContent=lv.length;
  document.getElementById('tbl-log').innerHTML=`<thead><tr><th>Nama Kapal</th><th>Bulan</th><th>Tgl</th><th>ES</th><th>Air</th><th>Solar</th><th>Oli</th><th>Gas</th><th>Bensin</th><th>Beras</th><th>Garam</th><th>Gula</th><th>Minyak</th><th>Rokok</th></tr></thead>
  <tbody>${lv.map(v=>`<tr><td class="vb">${v.namaKapal}</td><td><span class="bdg bs2">${v.bulan}</span></td><td>${v.tglTiba}</td><td>${v.logistik.es||'—'}</td><td>${v.logistik.air||'—'}</td><td>${v.logistik.solar||'—'}</td><td>${v.logistik.oli||'—'}</td><td>${v.logistik.gas||'—'}</td><td>${v.logistik.bensin||'—'}</td><td>${v.logistik.beras||'—'}</td><td>${v.logistik.garam||'—'}</td><td>${v.logistik.gula||'—'}</td><td>${v.logistik.minyakGoreng||'—'}</td><td>${v.logistik.rokok||'—'}</td></tr>`).join('')}
  <tr style="background:rgba(29,224,176,.06);font-weight:700"><td colspan="3" style="color:var(--TL)">TOTAL</td><td>${T.es}</td><td>${T.air}</td><td>${T.solar}</td><td>${T.oli}</td><td>${T.gas}</td><td>${T.bensin}</td><td>${T.beras}</td><td>${T.garam}</td><td>${T.gula}</td><td>${T.minyak}</td><td>${T.rokok}</td></tr></tbody>`;
}

function bRingkas(){
  const{vessels,fishData,label,keys}=MRG;
  const tKg=fishData.reduce((s,f)=>s+f.jumlah,0),tVal=fishData.reduce((s,f)=>s+f.nilai,0);
  const pen=vessels.filter(v=>v.jenisKapal.includes('PENANGKAP')).length,peng=vessels.filter(v=>v.jenisKapal.includes('PENGANGKUT')).length;
  const bon=vessels.filter(v=>v.kegiatan.toLowerCase()==='bongkar').length;
  const tSol=vessels.reduce((s,v)=>s+v.logistik.solar,0),tEs=vessels.reduce((s,v)=>s+v.logistik.es,0);
  const im={};fishData.forEach(f=>{im[f.jenis]=(im[f.jenis]||0)+f.jumlah;});
  const iS=Object.entries(im).sort((a,b)=>b[1]-a[1]);const top3=iS.slice(0,3).map(x=>x[0]).join(', ');
  const gtr=gtrRanges(vessels);
  document.getElementById('rep-grid').innerHTML=`
    <div class="rc"><h4>📊 KUNJUNGAN KAPAL</h4><div class="rrow"><span class="rk">Total Kunjungan</span><span class="rv">${vessels.length} kapal</span></div><div class="rrow"><span class="rk">Penangkap</span><span class="rv">${pen} kapal</span></div><div class="rrow"><span class="rk">Pengangkut</span><span class="rv">${peng} kapal</span></div><div class="rrow"><span class="rk">Bongkar</span><span class="rv">${bon} kali</span></div><div class="rrow"><span class="rk">Range GT</span><span class="rv" style="font-size:8.5px">${gtr.map(r=>r.l+':'+r.c).join(' | ')}</span></div></div>
    <div class="rc"><h4>🐟 PRODUKSI IKAN</h4><div class="rrow"><span class="rk">Total Produksi</span><span class="rv">${fN(tKg)} Kg</span></div><div class="rrow"><span class="rk">Total Nilai</span><span class="rv" style="color:var(--G)">${fRp(tVal)}</span></div><div class="rrow"><span class="rk">Rata-rata/Kunjungan</span><span class="rv">${fN(Math.round(tKg/(vessels.length||1)))} Kg</span></div><div class="rrow"><span class="rk">Jenis Ikan</span><span class="rv">${Object.keys(im).length} jenis</span></div><div class="rrow"><span class="rk">3 Teratas</span><span class="rv" style="font-size:8.5px">${top3}</span></div></div>
    <div class="rc"><h4>⛽ LOGISTIK</h4><div class="rrow"><span class="rk">Total Solar</span><span class="rv">${fN(tSol)} L</span></div><div class="rrow"><span class="rk">Total ES</span><span class="rv">${fN(tEs)} Kg</span></div><div class="rrow"><span class="rk">Solar/Kapal</span><span class="rv">${Math.round(tSol/(vessels.length||1))} L</span></div></div>
    <div class="rc"><h4>📅 INFO LAPORAN</h4><div class="rrow"><span class="rk">Periode</span><span class="rv">${label}</span></div><div class="rrow"><span class="rk">Jumlah Bulan</span><span class="rv">${keys.length} bulan</span></div><div class="rrow"><span class="rk">Pelabuhan</span><span class="rv">Teluk Batang</span></div><div class="rrow"><span class="rk">Tanggal Cetak</span><span class="rv">${new Date().toLocaleDateString('id-ID')}</span></div></div>`;
  const nd={},kd={};fishData.forEach(f=>{nd[f.tanggal]=(nd[f.tanggal]||0)+f.nilai;kd[f.tanggal]=(kd[f.tanggal]||0)+f.jumlah;});const dT=Object.keys(nd).sort();
  kc('cTR');CH['cTR']=new Chart(document.getElementById('cTR'),{type:'line',data:{labels:dT,datasets:[{label:'Nilai',data:dT.map(d=>nd[d]),borderColor:PAL[0],backgroundColor:'rgba(29,224,176,.05)',fill:true,tension:.4,pointRadius:2,yAxisID:'y'},{label:'Produksi',data:dT.map(d=>kd[d]),borderColor:PAL[1],backgroundColor:'rgba(245,166,35,.05)',fill:true,tension:.4,pointRadius:2,yAxisID:'y1'}]},options:{...CO,scales:{x:{ticks:{color:'rgba(0,50,100,.4)',font:{size:7.5},maxTicksLimit:12},grid:{color:'rgba(0,80,140,.05)'}},y:{type:'linear',position:'left',ticks:{color:'rgba(0,50,100,.55)',callback:v=>'Rp '+Number(v/1e6).toFixed(0)+'jt'},grid:{color:'rgba(0,80,140,.07)'}},y1:{type:'linear',position:'right',grid:{drawOnChartArea:false},ticks:{color:'rgba(0,50,100,.55)',callback:v=>v+' Kg'}}}}});
  kc('cMN');CH['cMN']=new Chart(document.getElementById('cMN'),{type:'bar',data:{labels:keys.map(k=>{const d=db.get(k);return d?d.month:'?';}),datasets:[{label:'Produksi (Kg)',data:keys.map(k=>{const d=db.get(k);return d?d.fishData.reduce((s,f)=>s+f.jumlah,0):0;}),backgroundColor:'rgba(29,224,176,.6)',borderRadius:3,borderSkipped:false,yAxisID:'y'},{label:'Nilai (jt)',data:keys.map(k=>{const d=db.get(k);return d?Math.round(d.fishData.reduce((s,f)=>s+f.nilai,0)/1e6):0;}),backgroundColor:'rgba(245,166,35,.4)',borderRadius:3,borderSkipped:false,yAxisID:'y1'}]},options:{...CO,scales:{x:{ticks:{color:'rgba(0,50,100,.65)'},grid:{display:false}},y:{type:'linear',position:'left',ticks:{color:'rgba(0,50,100,.55)',callback:v=>v+' Kg'},grid:{color:'rgba(0,80,140,.07)'}},y1:{type:'linear',position:'right',grid:{drawOnChartArea:false},ticks:{color:'rgba(160,80,10,.6)',callback:v=>'Rp '+v+'jt'}}}}});
}

function bSaran(){
  const items=[
    {icon:'🌐',title:'Server Real-time (DONE)',tag:'✓ Tersedia',desc:'Data tersimpan di localStorage browser. Gunakan fitur 🔗 Bagikan untuk berbagi via URL antar perangkat.',done:true},
    {icon:'✏️',title:'Edit Data Langsung (DONE)',tag:'✓ Aktif',desc:'Gunakan tombol ✏️ di setiap tabel atau halaman Sinkron untuk mengedit data rekap dan indikator secara langsung.',done:true},
    {icon:'🔄',title:'Sinkronisasi Data (DONE)',tag:'✓ Aktif',desc:'Halaman Sinkron mendeteksi perbedaan antara data rekap dan indikator, termasuk error nilai ikan (tersimpan vs kalkulasi).',done:true},
    {icon:'📱',title:'Progressive Web App (PWA)',tag:'Rencana',desc:'Pasang manifest.json + service worker agar DOPK bisa diinstall di HP Android/iOS dan digunakan offline di lapangan.',done:false},
    {icon:'🔐',title:'Login & Hak Akses',tag:'Backend',desc:'Tambahkan autentikasi dengan peran Admin/Operator/Viewer menggunakan Firebase Auth atau Supabase — gratis untuk skala kecil.',done:false},
    {icon:'📊',title:'Perbandingan Tahun (YoY)',tag:'Analitik',desc:'Dashboard komparasi kinerja tahun ke tahun untuk semua indikator utama dengan visualisasi pertumbuhan %.',done:false},
    {icon:'🗺️',title:'Peta Fishing Ground (GIS)',tag:'Peta',desc:'Integrasi Leaflet.js untuk menampilkan posisi kapal, zona tangkap, dan jalur distribusi pada peta interaktif.',done:false},
    {icon:'🤖',title:'Prediksi Produksi AI',tag:'AI/ML',desc:'Model regresi linear sederhana menggunakan data historis untuk memprediksi estimasi produksi bulan berikutnya.',done:false},
    {icon:'📧',title:'Laporan Email/WhatsApp Otomatis',tag:'Notifikasi',desc:'Kirim ringkasan laporan bulanan otomatis ke pimpinan menggunakan EmailJS (gratis 200/bln) atau WA Business API.',done:false},
    {icon:'🖨️',title:'Ekspor PDF Laporan Resmi',tag:'Ekspor',desc:'Generate PDF berformat surat dinas dengan kop instansi menggunakan jsPDF + html2canvas langsung dari browser.',done:false},
    {icon:'⚡',title:'Notifikasi Anomali',tag:'Alert',desc:'Peringatan otomatis ketika produksi turun >30% dari rata-rata atau tidak ada kunjungan lebih dari X hari.',done:false},
    {icon:'🔗',title:'Integrasi API KKP',tag:'Integrasi',desc:'Sinkronisasi data dengan sistem SATU DATA Kementerian Kelautan dan Perikanan via REST API resmi.',done:false},
  ];
  document.getElementById('sg-grid').innerHTML=items.map(it=>`
    <div class="sgc ${it.done?'done':''}">
      ${it.done?'<span class="done-mark">✓</span>':''}
      <span class="sgc-ico">${it.icon}</span>
      <h4>${it.title}</h4>
      <p>${it.desc}</p>
      <span class="sgtag">${it.tag}</span>
    </div>`).join('');
}

/* ══════════════════════════════════════════════════
   BUILD INDIKATOR OTOMATIS DARI DATA REKAP
   Menggantikan ketergantungan pada file Indikator.xlsx
   Data dihitung per bulan dari vessels & fishData
══════════════════════════════════════════════════ */
function buildIndFromRekap() {
  const allKeys = sortedKeys();
  if(!allKeys.length) return;

  // Kelompokkan semua data per tahun
  const byYear = {};
  allKeys.forEach(k => {
    const d = db.get(k);
    if(!d || !d.vessels) return;
    const yr  = String(d.year  || k.split('_')[1] || '');
    const mon = String(d.month || k.split('_')[0] || '');
    if(!yr || !mon) return;
    if(!byYear[yr]) byYear[yr] = { year: yr, _monthly: {} };
    // Hitung nilai per bulan
    const kunjungan  = d.vessels.length;
    const volProd    = (d.fishData||[]).reduce((s,f) => s+(parseFloat(f.jumlah)||0), 0);
    const nilaiProd  = (d.fishData||[]).reduce((s,f) => s+(parseFloat(f.nilai)||0), 0);
    const kapalPenangkap  = d.vessels.filter(v => (v.jenisKapal||'').toUpperCase().includes('PENANGKAP')).length;
    const kapalPengangkut = d.vessels.filter(v => (v.jenisKapal||'').toUpperCase().includes('PENGANGKUT')).length;
    byYear[yr]._monthly[mon] = { kunjungan, volProd, nilaiProd, kapalPenangkap, kapalPengangkut };
  });

  // Bangun struktur IND per tahun
  Object.entries(byYear).forEach(([yr, data]) => {
    // Urutkan bulan sesuai kalender
    const sortedMons = Object.keys(data._monthly).sort((a,b) => MONTHS.indexOf(a) - MONTHS.indexOf(b));

    // Ambil nilai dari override (upload file) jika ada
    const override = IND[yr]; // sudah dimuat di openDash dari IND_OVERRIDE_

    // Helper: ambil nilai per bulan, prioritaskan override jika ada
    const buildRow = (nama, satuan, getter, overrideKey) => {
      const values = {};
      sortedMons.forEach(m => {
        const autoVal = getter(data._monthly[m] || {});
        // Jika ada override dari file Indikator dan field ini tersedia, pakai override
        if(override && overrideKey) {
          const ovRow = override.rows && override.rows.find(r => r.nama && r.nama.toLowerCase().includes(overrideKey.toLowerCase()));
          const ovVal = ovRow && ovRow.values && ovRow.values[m];
          values[m] = (ovVal !== null && ovVal !== undefined) ? ovVal : autoVal;
        } else {
          values[m] = autoVal;
        }
      });
      const total = sortedMons.reduce((s,m) => s+(values[m]||0), 0);
      return { no:'', nama, satuan, values, total, isSub:false };
    };

    // Baris yang bisa dihitung dari rekap (auto)
    const rows = [
      buildRow('Kunjungan Kapal Perikanan',  'Unit', m => m.kunjungan||0,   'Kunjungan Kapal'),
      buildRow('Volume Produksi',             'Kg',   m => m.volProd||0,     'Volume Produksi'),
      buildRow('Nilai Produksi',              'Rp',   m => m.nilaiProd||0,   'Nilai Produksi'),
      buildRow('Kapal Penangkap',             'Unit', m => m.kapalPenangkap||0, 'Kapal Penangkap'),
      buildRow('Kapal Pengangkut',            'Unit', m => m.kapalPengangkut||0,'Kapal Pengangkut'),
      // Baris dari override saja (tidak bisa dihitung dari rekap)
      buildRow('Volume Distribusi',           'Kg',   m => 0, 'Volume Distribusi'),
      buildRow('Nilai Distribusi',            'Rp',   m => 0, 'Nilai Distribusi'),
      buildRow('Surat Persetujuan Berlayar',  'Unit', m => 0, 'Surat Persetujuan'),
      buildRow('Log Book Kapal',              'Unit', m => 0, 'Log Book'),
    ];

    // Jika ada override dengan rows lebih banyak, tambahkan yang belum ada
    if(override && override.rows) {
      override.rows.forEach(ovRow => {
        const alreadyIn = rows.some(r => r.nama.toLowerCase().includes((ovRow.nama||'').toLowerCase().substring(0,8)));
        if(!alreadyIn && ovRow.nama) {
          const values = {};
          sortedMons.forEach(m => { values[m] = ovRow.values && ovRow.values[m] || 0; });
          rows.push({ ...ovRow, values, total: sortedMons.reduce((s,m)=>s+(values[m]||0),0) });
        }
      });
    }

    IND[yr] = {
      year: yr,
      rows,
      months: sortedMons,
      activeMons: sortedMons,
      fileName: override ? override.fileName : 'auto-generated',
      savedAt: new Date().toISOString(),
      isAutoGenerated: true
    };
  });
}
