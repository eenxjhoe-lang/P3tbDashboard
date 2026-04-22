/* ══════════════════════════════════════════════════
   STORAGE
══════════════════════════════════════════════════ */
const SK='dopk_v5';
// Single source of truth: localStorage only (no in-memory cache that causes stale-delete bugs)
const db={
  load(){try{return JSON.parse(localStorage.getItem(SK)||'{}')}catch{return{}}},
  save(d){try{localStorage.setItem(SK,JSON.stringify(d))}catch(e){}},
  allKeys(){return Object.keys(this.load());},
  get(k){return this.load()[k]||null;},
  set(k,v){const d=this.load();d[k]=v;this.save(d);},
  del(k){
    // Completely remove from localStorage
    const d=this.load();
    delete d[k];
    this.save(d);
    // Also clear any legacy v6 data that might exist
    try{
      const old=JSON.parse(localStorage.getItem('dopk_v6')||'{}');
      if(old[k]){delete old[k];localStorage.setItem('dopk_v6',JSON.stringify(old));}
    }catch(e){}
  },
  clear(){localStorage.removeItem(SK);}
};

/* ══════════════════════════════════════════════════
   GLOBALS
══════════════════════════════════════════════════ */
const MONTHS=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
let CH={},CONF_CB=null,EDIT_KEY=null,EDIT_IDX=null;
let MRG={vessels:[],fishData:[],label:'',keys:[]};
let IND={};


/* ══════════════════════════════════════════════════
   HELPER FUNCTIONS
══════════════════════════════════════════════════ */
function fD(d){if(!d)return'-';if(d instanceof Date)return d.toLocaleDateString('id-ID',{day:'2-digit',month:'2-digit',year:'numeric'});return String(d).split('T')[0];}
function n(v){if(v===null||v===undefined||v===''||v==='-')return 0;const x=+v;return isNaN(x)?0:x;}
function nON(v){if(v===null||v===undefined||v===''||v==='-')return null;const x=+v;return isNaN(x)?null:x;}
function s(v){return(v||'').toString().trim();}
function cap(v){return v.charAt(0).toUpperCase()+v.slice(1);}
function fN(v){return(+v||0).toLocaleString('id-ID');}
function fRp(v){return'Rp '+(+v||0).toLocaleString('id-ID');}
function escHtml(t){return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function showL(m){document.getElementById('l-txt').textContent=m;document.getElementById('loader').classList.add('on');}
function hideL(){document.getElementById('loader').classList.remove('on');}
function toast(msg,dur=3200){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('on');setTimeout(()=>t.classList.remove('on'),dur);}
