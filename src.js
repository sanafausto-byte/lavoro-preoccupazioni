const THEMES = [
 { name:'Primo lavoro ed esperienza', keys:['primo lavoro','esperienz','assun','colloqu','curriculum','cv','stage','tirocin','non trovar','trovare lavoro','occupazion','disoccup'] },
 { name:'Stabilità e precarietà', keys:['precar','stabil','contratt','tempo determinato','licenzi','sicurezz','posto fisso','perdere il lavoro'] },
 { name:'Stipendio e costo della vita', keys:['stipend','salari','retribuz','pagat','soldi','econom','caro vita','costo della vita','affitt','guadagn','vivere da sol','pension'] },
 { name:'IA e automazione', keys:['intelligenza artificiale','artificial intelligence','chatgpt','automaz','robot','macchin','algoritm','ai ',' ia ','sostitui','tecnolog'] },
 { name:'Competenze e formazione', keys:['competenz','formaz','impar','qualific','diplom','laure','studia','aggiornar','preparat','abilità'] },
 { name:'Opportunità e territorio', keys:['territor','paese','estero','emigra','lontan','trasferir','opportun','possibilit','azienda','imprese','settore','trasport'] },
 { name:'Tempo e vita privata', keys:['tempo libero','vita privata','famigli','orari','turni','weekend','ferie','equilibr','concilia','straordinar','tempo per me'] },
 { name:'Benessere e stress', keys:['stress','ansia','paura','pression','burnout','stanc','salute','benesser','ambiente tossic','esaurim','fatica','ritmi'] },
 { name:'Parità e discriminazioni', keys:['discrimin','razzis','sessis','parit','pregiudiz','ingiust','molesti','esclusion','inclusion','genere'] },
 { name:'Orientamento e incertezza', keys:['non so','scegli','scelta','incertez','futuro','indecis','direzione','orientam','confus','non sapere','quale lavoro','strada'] }
];
const THEME_NAMES = [...THEMES.map(x=>x.name), 'Altri temi'];
const JSON_HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
function json(v,status=200,headers={}){return new Response(JSON.stringify(v),{status,headers:{...JSON_HEADERS,...headers}})}
function bad(message,status=400){return json({error:message},status)}
function norm(s){return ` ${String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim()} `}
function classify(body){const s=norm(body);let matched=THEMES.filter(t=>t.keys.some(k=>s.includes(norm(k).trim()))).map(t=>t.name);return matched.length?matched:['Altri temi']}
function escapeCsv(s){return '"'+String(s??'').replace(/"/g,'""')+'"'}
async function sha(s){let bytes=new TextEncoder().encode(s);let hash=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function same(a,b){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0}
function cookie(req,key){const str=req.headers.get('cookie')||'';return str.split(';').map(s=>s.trim()).find(s=>s.startsWith(key+'='))?.slice(key.length+1)||''}
async function requireAdmin(req,env){const token=cookie(req,'form_admin');if(!/^[a-f0-9]{64}$/.test(token))return false;const found=await env.DB.prepare('SELECT 1 FROM admin_tokens WHERE token_hash = ? AND expires_at > ?').bind(await sha(token),Date.now()).first();return !!found}
function code(){const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let a=new Uint8Array(8);crypto.getRandomValues(a);return [...a].map(v=>alphabet[v%alphabet.length]).join('')}
const publicSessionSql='SELECT id,code,title,is_open,created_at FROM sessions WHERE code=?';
async function sessionByCode(env,c){return env.DB.prepare(publicSessionSql).bind(c).first()}
async function publicStats(env,s){
 const rows=await env.DB.prepare("SELECT themes,approved_quote,body FROM answers WHERE session_id=? AND status='visible' ORDER BY created_at DESC").bind(s.id).all();
 const totals=Object.fromEntries(THEME_NAMES.map(t=>[t,0]));let quotes=[];
 for(const x of rows.results){let arr=JSON.parse(x.themes);for(const t of new Set(arr)){if(t in totals)totals[t]++}if(x.approved_quote)quotes.push(x.body)}
 const total=rows.results.length;
 return {code:s.code,title:s.title,is_open:!!s.is_open,total,participants:(await env.DB.prepare('SELECT COUNT(DISTINCT device_hash) n FROM answers WHERE session_id=?').bind(s.id).first()).n, themes:Object.entries(totals).filter(([,count])=>count>0).sort((a,b)=>b[1]-a[1]).map(([name,count])=>({name,count,percent:total?Math.round(100*count/total):0})),quotes:quotes.slice(0,10)};
}
async function requestJson(req){try{return await req.json()}catch{return null}}
async function handle(req,env){
 const url=new URL(req.url),p=url.pathname,method=req.method;
 if(!env.DB)return bad('Database D1 non configurato',503);
 if(p==='/api/health')return json({ok:true});
 if(p==='/api/themes')return json({themes:THEME_NAMES});
 if(p==='/api/admin/login'&&method==='POST'){
  if(!env.ADMIN_PASSWORD||!env.ADMIN_EMAIL)return bad('Configurare ADMIN_PASSWORD e ADMIN_EMAIL prima di accedere.',503);
  const data=await requestJson(req);const email=String(data?.email||'').trim().toLowerCase(),password=String(data?.password||'');
  if(!same(email,String(env.ADMIN_EMAIL).trim().toLowerCase())||!same(await sha(password),await sha(env.ADMIN_PASSWORD)))return bad('Credenziali non valide.',401);
  const token=[...crypto.getRandomValues(new Uint8Array(32))].map(x=>x.toString(16).padStart(2,'0')).join('');
  await env.DB.prepare('INSERT INTO admin_tokens (token_hash,expires_at) VALUES (?,?)').bind(await sha(token),Date.now()+8*60*60*1000).run();
  return json({ok:true},200,{'set-cookie':`form_admin=${token}; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`});
 }
 if(p==='/api/admin/logout'&&method==='POST'){
  const token=cookie(req,'form_admin');if(token)await env.DB.prepare('DELETE FROM admin_tokens WHERE token_hash=?').bind(await sha(token)).run();
  return json({ok:true},200,{'set-cookie':'form_admin=; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=0'});
 }
 if(p==='/api/admin/me')return json({authenticated:await requireAdmin(req,env)});
 // Public: code must be 8 chars; no public endpoint returns raw responses other than approved quotes.
 let m=p.match(/^\/api\/session\/([A-Z2-9]{8})$/);
 if(m&&method==='GET'){const s=await sessionByCode(env,m[1]);return s?json(await publicStats(env,s)):bad('Sessione inesistente.',404)}
 m=p.match(/^\/api\/session\/([A-Z2-9]{8})\/answer$/);
 if(m&&method==='POST'){
  const s=await sessionByCode(env,m[1]);if(!s)return bad('Sessione non trovata.',404);if(!s.is_open)return bad('La raccolta è terminata.',403);
  const data=await requestJson(req),body=String(data?.answer||'').trim().replace(/\s+/g,' '),device=String(data?.device||'');
  if(body.length<20||body.length>300)return bad('Scrivi una risposta da 20 a 300 caratteri.');
  if(!/^[a-f0-9-]{36}$/.test(device))return bad('Identificatore dispositivo non valido.');
  if(/(?:[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b\+?\d[\d\s-]{8,}\b)/i.test(body))return bad('Non inserire email o numeri telefonici nella risposta.');
  const devhash=await sha(`${env.DEVICE_SALT||'device'}:${device}:${s.id}`);
  const count=await env.DB.prepare('SELECT COUNT(*) n FROM answers WHERE session_id=? AND device_hash=?').bind(s.id,devhash).first();
  if(count.n>=3)return bad('Hai già inviato tre contributi a questa sessione.',429);
  const dupe=await env.DB.prepare('SELECT 1 FROM answers WHERE session_id=? AND device_hash=? AND body=?').bind(s.id,devhash,body).first();
  if(dupe)return bad('Hai già inviato questa risposta.',409);
  const tags=classify(body);await env.DB.prepare('INSERT INTO answers (id,session_id,device_hash,body,themes) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(),s.id,devhash,body,JSON.stringify(tags)).run();
  return json({ok:true,tags},201);
 }
 if(!p.startsWith('/api/admin/'))return bad('Risorsa non trovata.',404);
 if(!await requireAdmin(req,env))return bad('Accesso riservato al formatore.',401);
 if(p==='/api/admin/sessions'&&method==='GET'){
  const rows=await env.DB.prepare('SELECT id,code,title,created_at,is_open FROM sessions ORDER BY created_at DESC LIMIT 100').all();return json({sessions:rows.results});
 }
 if(p==='/api/admin/sessions'&&method==='POST'){
  const data=await requestJson(req);const title=String(data?.title||'Sessione di orientamento').trim().slice(0,80);
  const id=crypto.randomUUID();let c=code();for(let i=0;i<5;i++){let exists=await env.DB.prepare('SELECT 1 FROM sessions WHERE code=?').bind(c).first();if(!exists)break;c=code()}
  await env.DB.prepare('INSERT INTO sessions(id,code,title) VALUES (?,?,?)').bind(id,c,title).run();return json({id,code:c,title,is_open:true},201);
 }
 m=p.match(/^\/api\/admin\/sessions\/([0-9a-f-]{36})$/);
 if(m){const id=m[1];const ses=await env.DB.prepare('SELECT id,code,title,is_open,created_at FROM sessions WHERE id=?').bind(id).first();if(!ses)return bad('Sessione non trovata.',404);
  if(method==='GET')return json({...ses,stats:await publicStats(env,ses)});
  if(method==='PATCH'){const data=await requestJson(req);if(typeof data?.is_open!=='boolean')return bad('Valore non valido.');await env.DB.prepare('UPDATE sessions SET is_open=? WHERE id=?').bind(Number(data.is_open),id).run();return json({ok:true})}
  if(method==='DELETE'){await env.DB.prepare('DELETE FROM answers WHERE session_id=?').bind(id).run();await env.DB.prepare('DELETE FROM sessions WHERE id=?').bind(id).run();return json({ok:true})}
 }
 m=p.match(/^\/api\/admin\/sessions\/([0-9a-f-]{36})\/answers$/);
 if(m&&method==='GET'){const session=await env.DB.prepare('SELECT id FROM sessions WHERE id=?').bind(m[1]).first();if(!session)return bad('Sessione non trovata.',404);
  const rows=await env.DB.prepare('SELECT id,body,themes,status,approved_quote,created_at FROM answers WHERE session_id=? ORDER BY created_at DESC').bind(m[1]).all();return json({answers:rows.results.map(x=>({...x,themes:JSON.parse(x.themes)}))});
 }
 m=p.match(/^\/api\/admin\/sessions\/([0-9a-f-]{36})\/export$/);
 if(m&&method==='GET'){const rows=await env.DB.prepare('SELECT body,themes,status,approved_quote,created_at FROM answers WHERE session_id=? ORDER BY created_at').bind(m[1]).all();
  const lines=[['Risposta anonima','Temi','Stato','Citazione approvata','Data (UTC)'].map(escapeCsv).join(';'),...rows.results.map(x=>[x.body,JSON.parse(x.themes).join(' | '),x.status,x.approved_quote?'Sì':'No',x.created_at].map(escapeCsv).join(';'))];
  return new Response('\uFEFF'+lines.join('\r\n'),{headers:{'content-type':'text/csv; charset=utf-8','content-disposition':'attachment; filename="preoccupazioni-lavoro.csv"','cache-control':'no-store'}});
 }
 m=p.match(/^\/api\/admin\/answers\/([0-9a-f-]{36})$/);
 if(m&&method==='PATCH'){
  const data=await requestJson(req);const row=await env.DB.prepare('SELECT id FROM answers WHERE id=?').bind(m[1]).first();if(!row)return bad('Risposta non trovata.',404);
  const sets=[],vals=[];
  if(data?.status!==undefined){if(!['visible','hidden'].includes(data.status))return bad('Stato non valido.');sets.push('status=?');vals.push(data.status)}
  if(data?.approved_quote!==undefined){if(typeof data.approved_quote!=='boolean')return bad('Valore non valido.');sets.push('approved_quote=?');vals.push(Number(data.approved_quote))}
  if(data?.themes!==undefined){if(!Array.isArray(data.themes)||data.themes.length<1||data.themes.length>THEME_NAMES.length||!data.themes.every(t=>THEME_NAMES.includes(t)))return bad('Temi non validi.');sets.push('themes=?');vals.push(JSON.stringify([...new Set(data.themes)]))}
  if(!sets.length)return bad('Nessuna modifica richiesta.');vals.push(m[1]);await env.DB.prepare(`UPDATE answers SET ${sets.join(',')} WHERE id=?`).bind(...vals).run();return json({ok:true});
 }
 return bad('Risorsa non trovata.',404);
}
export default {async fetch(req,env){try{const url=new URL(req.url);if(url.pathname.startsWith('/api/'))return await handle(req,env);return env.ASSETS.fetch(req)}catch(error){console.error(error);return bad('Errore temporaneo del server.',500)}}};
