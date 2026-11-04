const {app,BrowserWindow,Menu,dialog,shell,screen}=require('electron');
const fs=require('node:fs'),path=require('node:path');
const {startService}=require('./service.cjs');
app.setName('砚台泼墨');app.setPath('userData',path.join(app.getPath('appData'),'YantaiInk'));
let service,win,closing=false,css;
const folder=app.getPath('userData'),prefsFile=path.join(folder,'window.json');
if(!app.requestSingleInstanceLock())app.quit();else{app.on('second-instance',()=>{win?.restore();win?.focus()});app.whenReady().then(start).catch(fail)}
async function start(){
 css=fs.readFileSync(path.join(__dirname,'desktop.css'),'utf8');
 service=await startService({directory:path.join(folder,'data'),assets:path.join(__dirname,'runtime/dist')});
 const backups=path.join(folder,'backups');fs.mkdirSync(backups,{recursive:true,mode:0o700});await service.backup(path.join(backups,'startup-'+new Date().toISOString().replace(/[:.]/g,'-')+'.sqlite3'));const files=fs.readdirSync(backups).filter(f=>f.startsWith('startup-')).sort();for(const f of files.slice(0,-14))fs.unlinkSync(path.join(backups,f));
 Menu.setApplicationMenu(Menu.buildFromTemplate([
 {label:app.name,submenu:[{role:'about'},{type:'separator'},{label:'打开数据与备份目录',click:()=>shell.openPath(folder)},{type:'separator'},{role:'hide'},{role:'hideOthers'},{role:'unhide'},{type:'separator'},{role:'quit'}]},
 {label:'文件',submenu:[{label:'新建项目',accelerator:'CmdOrCtrl+N',click:()=>click('[data-action="new"]')},{label:'保存当前表单',accelerator:'CmdOrCtrl+S',click:()=>js("document.querySelector('.dialog form')?.requestSubmit()")},{label:'备份数据库…',click:backup},{role:'close'}]},
 {label:'编辑',submenu:[{role:'undo'},{role:'redo'},{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'},{label:'搜索项目',accelerator:'CmdOrCtrl+F',click:()=>js("document.querySelector('[aria-label=\"项目台账\"]')?.click();document.querySelector('#search')?.focus()")}]},
 {label:'显示',submenu:[{role:'reload'},{label:'标准比例',accelerator:'CmdOrCtrl+0',click:()=>win?.webContents.setZoomFactor(1)},{label:'放大',accelerator:'CmdOrCtrl+Plus',click:()=>zoom(.05)},{label:'缩小',accelerator:'CmdOrCtrl+-',click:()=>zoom(-.05)},{role:'togglefullscreen'}]},
 {label:'窗口',submenu:[{role:'minimize'},{role:'zoom'},{role:'front'}]}
 ]));createWindow();
}
function js(code){return win?.webContents.executeJavaScript(code).catch(()=>{})}function click(selector){return js(`document.querySelector(${JSON.stringify(selector)})?.click()`)}function zoom(delta){win?.webContents.setZoomFactor(Math.max(.85,Math.min(1.2,win.webContents.getZoomFactor()+delta)))}
function createWindow(){const area=screen.getPrimaryDisplay().workArea;let pref={};try{pref=JSON.parse(fs.readFileSync(prefsFile,'utf8'))}catch{}const width=Math.min(pref.width||1380,area.width-48),height=Math.min(pref.height||860,area.height-40);
 win=new BrowserWindow({width,height,minWidth:1024,minHeight:620,title:'砚台泼墨',titleBarStyle:'hiddenInset',trafficLightPosition:{x:16,y:12},backgroundColor:'#eef3f8',show:false,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,partition:'persist:yantai-formal'}});
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',(e,url)=>{if(new URL(url).origin!==service.origin)e.preventDefault()});win.webContents.session.setPermissionRequestHandler((_wc,_p,cb)=>cb(false));
 win.webContents.session.on('will-download',async(_event,item)=>{item.pause();const r=await dialog.showSaveDialog(win,{defaultPath:item.getFilename()});if(r.canceled)item.cancel();else{item.setSavePath(r.filePath);item.resume()}});
 win.webContents.on('did-finish-load',()=>{win.webContents.insertCSS(css);win.webContents.setZoomFactor(pref.zoom||1)});win.once('ready-to-show',()=>{win.show();win.focus()});win.on('close',()=>{const b=win.getNormalBounds();fs.writeFileSync(prefsFile,JSON.stringify({width:b.width,height:b.height,zoom:win.webContents.getZoomFactor()}),{mode:0o600})});win.on('closed',()=>{win=null});win.loadURL(service.launch);
}
async function backup(){const r=await dialog.showSaveDialog(win,{defaultPath:'砚台泼墨备份-'+new Date().toISOString().slice(0,10)+'.sqlite3'});if(r.canceled)return;try{await service.backup(r.filePath);dialog.showMessageBox(win,{message:'数据库备份完成'})}catch(e){dialog.showErrorBox('备份失败',e.message)}}
function fail(e){dialog.showErrorBox('启动失败',e.message+'\n原网页程序及备份保持不变。');app.quit()}
app.on('activate',()=>{if(!win&&service)createWindow()});app.on('window-all-closed',()=>app.quit());app.on('before-quit',e=>{if(service&&!closing){e.preventDefault();closing=true;service.close().finally(()=>app.quit())}});
