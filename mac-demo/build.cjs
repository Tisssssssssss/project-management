const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.join(__dirname,'out'),bundle=path.join(out,'砚台泼墨 Demo.app');
if(!fs.existsSync(path.join(__dirname,'node_modules/electron/dist/Electron.app')))cp.execFileSync(process.execPath,[path.join(__dirname,'node_modules/electron/install.js')],{stdio:'inherit'});
fs.mkdirSync(out,{recursive:true});fs.rmSync(bundle,{recursive:true,force:true});
cp.execFileSync('/usr/bin/ditto',[path.join(__dirname,'node_modules/electron/dist/Electron.app'),bundle]);
const app=path.join(bundle,'Contents/Resources/app');fs.mkdirSync(app,{recursive:true});
for(const file of ['main.cjs','seed.py','package.json'])fs.copyFileSync(path.join(__dirname,file),path.join(app,file));
const runtime=path.join(app,'runtime');fs.mkdirSync(runtime);fs.cpSync(path.join(root,'dist'),path.join(runtime,'dist'),{recursive:true,filter:src=>!/(preview|qingyuan-|yantai-brand)/.test(path.basename(src))});
let server=fs.readFileSync(path.join(root,'server.py'),'utf8');server=server.replace('import sqlite3,json,threading,argparse,tempfile,subprocess','import sqlite3,json,threading,argparse,tempfile,subprocess,os').replace("DB=BASE/'data'/'workspace.sqlite3'","DB=Path(os.environ['YANTAI_DEMO_DATA'])/'workspace.sqlite3'");server=server.replace(" print(f'云程 V0.3: http://127.0.0.1:{args.port}',flush=True)\n ThreadingHTTPServer(('127.0.0.1',args.port),Handler).serve_forever()"," server=ThreadingHTTPServer(('127.0.0.1',args.port),Handler)\n print(f'DEMO_READY http://127.0.0.1:{server.server_port}',flush=True)\n server.serve_forever()");
// Do not ship machine-specific spreadsheet runtime dependencies.
server=server.replace("  if self.path=='/api/export-xlsx':return self.export_xlsx()","  if self.path=='/api/export-xlsx':return self.send_json(501,{'error':'独立 Demo 暂不包含 Excel 引擎，请使用应用菜单备份数据库。'})");
fs.writeFileSync(path.join(runtime,'server.py'),server);
const plist=path.join(bundle,'Contents/Info.plist');for(const [key,value] of Object.entries({CFBundleDisplayName:'砚台泼墨 Demo',CFBundleName:'砚台泼墨 Demo',CFBundleIdentifier:'local.yantai.ink.demo',CFBundleShortVersionString:'0.1.0',CFBundleVersion:'1'}))cp.execFileSync('/usr/libexec/PlistBuddy',['-c',`Set :${key} ${value}`,plist]);
cp.execFileSync('/usr/bin/codesign',['--force','--deep','--sign','-',bundle]);
console.log(bundle);
