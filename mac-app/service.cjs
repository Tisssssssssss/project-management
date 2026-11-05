const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {DatabaseSync,backup}=require('node:sqlite');
const {xlsx}=require('./xlsx.cjs');
function validate(d){if(!d||d.schemaVersion!==3||!Array.isArray(d.projects)||!Array.isArray(d.tasks)||!Array.isArray(d.ledger))throw Error('工作空间格式无效');const ids=new Set;for(const p of d.projects){if(!p.id||!p.name?.trim()||!p.unit?.trim()||ids.has(p.id)||!Array.isArray(p.events))throw Error('项目数据无效');ids.add(p.id)}for(const r of d.ledger)if(!ids.has(r.pid)||!Number.isSafeInteger(r.cents)||r.cents<0)throw Error('金额记录无效');for(const t of d.tasks)if(t.pid&&!ids.has(t.pid))throw Error('待办关联无效');}
async function startService({directory,assets}){
 fs.mkdirSync(directory,{recursive:true,mode:0o700});const dbPath=path.join(directory,'workspace.sqlite3'),db=new DatabaseSync(dbPath);db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS snapshots (revision INTEGER PRIMARY KEY, created TEXT DEFAULT CURRENT_TIMESTAMP, payload TEXT NOT NULL)');
 const read=()=>{const row=db.prepare('SELECT revision,payload FROM snapshots ORDER BY revision DESC LIMIT 1').get();return {revision:row?.revision||0,data:row?JSON.parse(row.payload):{schemaVersion:3,modelVersion:3,projects:[],ledger:[],tasks:[],finance:[],audit:[]}}};
 const token=crypto.randomBytes(32).toString('hex');let origin;
 const server=http.createServer(async(req,res)=>{
  const json=(status,obj)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(obj))};
  try{
   if(req.headers.host!==new URL(origin).host)return json(403,{error:'来源无效'});
   const u=new URL(req.url,origin);
   if(u.pathname==='/launch'&&u.searchParams.get('key')===token){res.writeHead(302,{'Set-Cookie':`yantai_session=${token}; HttpOnly; SameSite=Strict; Path=/`,'Location':'/workspace.html?desktop=app','Cache-Control':'no-store'});return res.end();}
   if(!req.headers.cookie?.split(';').some(c=>c.trim()===`yantai_session=${token}`))return json(403,{error:'请从砚台泼墨 App 打开'});
   if(req.headers.origin&&req.headers.origin!==origin)return json(403,{error:'来源不匹配'});
   if(req.method==='GET'&&u.pathname==='/api/health')return json(200,{ok:true,storage:'SQLite'});
   if(req.method==='GET'&&u.pathname==='/api/workspace')return json(200,read());
   if(req.method==='POST'&&['/api/workspace','/api/export-xlsx'].includes(u.pathname)){
    const chunks=[];let length=0;for await(const b of req){length+=b.length;if(length>12*1024*1024)return json(413,{error:'数据超过12MB'});chunks.push(b)}let input;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{return json(400,{error:'JSON格式无效'})}
    if(u.pathname==='/api/export-xlsx'){const bytes=xlsx(input.rows);res.writeHead(200,{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':"attachment; filename*=UTF-8''"+encodeURIComponent('项目台账.xlsx'),'Cache-Control':'no-store'});return res.end(bytes)}
    validate(input.data);db.exec('BEGIN IMMEDIATE');try{const current=read();if(input.revision!==current.revision){db.exec('ROLLBACK');return json(409,{error:'另一窗口已更新，请刷新后再保存'})}db.prepare('INSERT INTO snapshots(revision,payload) VALUES (?,?)').run(current.revision+1,JSON.stringify(input.data));db.exec('COMMIT');return json(200,{revision:current.revision+1})}catch(e){if(db.isTransaction)db.exec('ROLLBACK');throw e}
   }
   if(req.method!=='GET')return json(404,{error:'接口不存在'});
   const relative=decodeURIComponent(u.pathname).replace(/^\/+/,''),file=path.resolve(assets,relative||'workspace.html');if(!file.startsWith(path.resolve(assets)+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return json(404,{error:'文件不存在'});
   const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);
  }catch(e){json(400,{error:e.message||'操作失败'})}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});origin=`http://127.0.0.1:${server.address().port}`;
 return {origin,launch:origin+'/launch?key='+token,read,dbPath,async backup(file){await backup(db,file)},async close(){await new Promise(r=>server.close(r));db.close()}};
}
module.exports={startService,validate};
