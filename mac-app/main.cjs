const {app,BrowserWindow,Menu,dialog,shell,screen,ipcMain}=require('electron');
const fs=require('node:fs'),path=require('node:path');
const {startService}=require('./service.cjs');
const {createFiles}=require('./files.cjs');
const { createBackup, inspectBackup, restoreBackup } = require('./workspace-backup.cjs');
app.setName('砚台泼墨');app.setPath('userData',path.join(app.getPath('appData'),'YantaiInk'));
let service,win,closing=false,css,fileLinks;
const folder=app.getPath('userData'),prefsFile=path.join(folder,'window.json');
if(!app.requestSingleInstanceLock())app.quit();else{app.on('second-instance',()=>{win?.restore();win?.focus()});app.whenReady().then(start).catch(fail)}
async function start(){
 fileLinks=createFiles(folder);
 installFileHandlers();
 css=fs.readFileSync(path.join(__dirname,'desktop.css'),'utf8');
 service=await startService({directory:path.join(folder,'data'),assets:path.join(__dirname,'runtime/dist')});
 const backups=path.join(folder,'backups');fs.mkdirSync(backups,{recursive:true,mode:0o700});await service.backup(path.join(backups,'startup-'+new Date().toISOString().replace(/[:.]/g,'-')+'.sqlite3'));const files=fs.readdirSync(backups).filter(f=>f.startsWith('startup-')).sort();for(const f of files.slice(0,-14))fs.unlinkSync(path.join(backups,f));
 Menu.setApplicationMenu(Menu.buildFromTemplate([
 {label:app.name,submenu:[{role:'about'},{type:'separator'},{label:'打开数据与备份目录',click:()=>shell.openPath(folder)},{type:'separator'},{role:'hide'},{role:'hideOthers'},{role:'unhide'},{type:'separator'},{role:'quit'}]},
 {label:'文件',submenu:[{label:'新建项目',accelerator:'CmdOrCtrl+N',click:()=>click('[data-action="new"]')},{label:'保存当前表单',accelerator:'CmdOrCtrl+S',click:()=>js("document.querySelector('.dialog form')?.requestSubmit()")},{label:'备份数据库…',click:backup},{label:'完整工作区备份…',click:backupWorkspace},{label:'从完整工作区备份恢复…',click:restoreWorkspace},{label:'检查旧保存版本…',click:reviewSnapshotRetention},{role:'close'}]},
 {label:'编辑',submenu:[{role:'undo'},{role:'redo'},{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'},{label:'搜索项目',accelerator:'CmdOrCtrl+F',click:()=>js("document.querySelector('[aria-label=\"项目台账\"]')?.click();document.querySelector('#search')?.focus()")}]},
 {label:'显示',submenu:[{role:'reload'},{label:'标准比例',accelerator:'CmdOrCtrl+0',click:()=>win?.webContents.setZoomFactor(1)},{label:'放大',accelerator:'CmdOrCtrl+Plus',click:()=>zoom(.05)},{label:'缩小',accelerator:'CmdOrCtrl+-',click:()=>zoom(-.05)},{role:'togglefullscreen'}]},
 {label:'窗口',submenu:[{role:'minimize'},{role:'zoom'},{role:'front'}]}
 ]));createWindow();
}
function js(code){return win?.webContents.executeJavaScript(code).catch(()=>{})}function click(selector){return js(`document.querySelector(${JSON.stringify(selector)})?.click()`)}function zoom(delta){win?.webContents.setZoomFactor(Math.max(.85,Math.min(1.2,win.webContents.getZoomFactor()+delta)))}
function createWindow(){const area=screen.getPrimaryDisplay().workArea;let pref={};try{pref=JSON.parse(fs.readFileSync(prefsFile,'utf8'))}catch{}const width=Math.min(pref.width||1380,area.width-48),height=Math.min(pref.height||860,area.height-40);
 win=new BrowserWindow({width,height,minWidth:1024,minHeight:620,title:'砚台泼墨',titleBarStyle:'hiddenInset',trafficLightPosition:{x:16,y:12},backgroundColor:'#eef3f8',show:false,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,partition:'persist:yantai-formal',preload:path.join(__dirname,'preload.cjs')}});
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',(e,url)=>{if(new URL(url).origin!==service.origin)e.preventDefault()});win.webContents.session.setPermissionRequestHandler((_wc,_p,cb)=>cb(false));
 win.webContents.session.on('will-download',async(_event,item)=>{item.pause();const r=await dialog.showSaveDialog(win,{defaultPath:item.getFilename()});if(r.canceled)item.cancel();else{item.setSavePath(r.filePath);item.resume()}});
 win.webContents.on('did-finish-load',()=>{win.webContents.insertCSS(css);win.webContents.setZoomFactor(pref.zoom||1)});win.once('ready-to-show',()=>{win.show();win.focus()});win.on('close',()=>{const b=win.getNormalBounds();fs.writeFileSync(prefsFile,JSON.stringify({width:b.width,height:b.height,zoom:win.webContents.getZoomFactor()}),{mode:0o600})});win.on('closed',()=>{win=null});win.loadURL(service.launch);
}
async function backup(){const r=await dialog.showSaveDialog(win,{defaultPath:'砚台泼墨备份-'+new Date().toISOString().slice(0,10)+'.sqlite3'});if(r.canceled)return;try{await service.backup(r.filePath);dialog.showMessageBox(win,{message:'数据库备份完成'})}catch(e){dialog.showErrorBox('备份失败',e.message)}}
async function backupWorkspace() {
 try {
  const options = await dialog.showMessageBox(win, {
   type: 'question', message: '创建完整工作区备份', detail: '附件原件只有勾选后才会复制到备份目录。',
   checkboxLabel: '包含附件原件', checkboxChecked: false,
   buttons: ['选择保存位置', '取消'], cancelId: 1
  });
  if (options.response !== 0) return;
  const destination = await dialog.showOpenDialog(win, { properties: ['openDirectory', 'createDirectory'] });
  if (destination.canceled) return;
  const result = await createBackup({ parent: destination.filePaths[0], service, files: fileLinks,
   includeOriginals: options.checkboxChecked });
  await dialog.showMessageBox(win, { message: '工作区备份完成', detail:
   result.folder + (options.checkboxChecked ? `\n已复制 ${result.originals} 个原件，${result.missing} 个关联无法复制。` : '\n本次备份未复制附件原件。') });
 } catch (error) {
  dialog.showErrorBox('工作区备份失败', error.message);
 }
}

async function restoreWorkspace() {
 try {
  if (await win.webContents.executeJavaScript("Boolean(document.querySelector('.dialog form'))")) {
   throw Error('请先保存或关闭当前编辑窗口');
  }
  const selection = await dialog.showOpenDialog(win, { properties: ['openDirectory'] });
  if (selection.canceled) return;
  const candidate = await inspectBackup(selection.filePaths[0]);
  const { revision } = service.read();
  const approval = await dialog.showMessageBox(win, {
   type: 'warning', message: '用备份替换当前工作区？',
   detail: `${candidate.data.projects.length} 个项目，${candidate.data.tasks.length} 项待办，${candidate.files.size} 个可恢复的附件原件。其余附件若找不到原件，需要重新关联。系统会保留恢复前的数据库副本。`,
   buttons: ['取消', '恢复'], defaultId: 0, cancelId: 0
  });
  if (approval.response !== 1) return;
  const recovery = await fs.promises.mkdtemp(path.join(folder, 'backups', 'before-restore-'));
  await service.backup(path.join(recovery, 'workspace.sqlite3'));
  await restoreBackup({ candidate, profile: folder, service, files: fileLinks, expectedRevision: revision });
  await win.loadURL(service.launch);
 } catch (error) {
  dialog.showErrorBox('工作区恢复失败', error.message);
 }
}

let reviewingSnapshots = false;
async function reviewSnapshotRetention() {
 if (reviewingSnapshots) return;
 reviewingSnapshots = true;
 try {
  const plan = service.snapshotRetention();
  const action = await dialog.showMessageBox(win, {
   type: 'question',
   message: '工作区保存版本',
   detail: `保留最近 50 个版本，以及更早的最多 12 个月份各一个版本。\n\n本次保留 ${plan.keep} 个版本，可清理 ${plan.discard.length} 个旧版本。项目进展、台账和待办仍保存在当前版本中。`,
   buttons: plan.discard.length ? ['取消', '创建备份并清理'] : ['关闭'],
   defaultId: 0, cancelId: 0
  });
  if (!plan.discard.length || action.response !== 1) return;

  const recovery = await fs.promises.mkdtemp(path.join(folder, 'backups', 'before-prune-'));
  const snapshot = await createBackup({ parent: recovery, service, files: fileLinks, includeOriginals: false });
  const removed = service.pruneSnapshots(plan);
  let compacted = true;
  try {
   await new Promise(resolve => setImmediate(resolve));
   service.compactSnapshots();
  } catch {
   compacted = false;
  }
  await dialog.showMessageBox(win, {
   message: `已清理 ${removed} 个旧保存版本`,
   detail: `清理前备份：${snapshot.folder}` +
    (compacted ? '' : '\n本次未完成磁盘压缩，SQLite 会继续复用已释放的空间。')
  });
 } catch (error) {
  dialog.showErrorBox('保存版本维护未完成', error.message);
 } finally {
  reviewingSnapshots = false;
 }
}

function fail(e){dialog.showErrorBox('启动失败',e.message+'\n原网页程序及备份保持不变。');app.quit()}
app.on('activate',()=>{if(!win&&service)createWindow()});app.on('window-all-closed',()=>app.quit());app.on('before-quit',e=>{if(service&&!closing){e.preventDefault();closing=true;service.close().finally(()=>app.quit())}});

function installFileHandlers(){
 const secure=(event)=>{if(!win||event.sender!==win.webContents||event.senderFrame!==win.webContents.mainFrame||new URL(event.senderFrame.url).origin!==service.origin)throw Error('文件操作来源无效');};
 const result=fn=>async(event,arg)=>{try{secure(event);return {ok:true,value:await fn(arg)}}catch(e){return {ok:false,error:e.message}}};
 ipcMain.handle('files:pick',result(async()=>{const r=await dialog.showOpenDialog(win,{title:'添加项目资料',properties:['openFile','multiSelections'],filters:[{name:'文档、表格和图片',extensions:['pdf','xls','xlsx','csv','doc','docx','ppt','pptx','txt','md','rtf','png','jpg','jpeg','gif','webp','heic','numbers','pages','key']}]});return r.canceled?[]:r.filePaths.map(f=>fileLinks.register(f))}));
 ipcMain.handle('files:link',result(async(name)=>{const r=await dialog.showOpenDialog(win,{title:'关联原文件：'+String(name).slice(0,160),properties:['openFile']});if(r.canceled)return null;return fileLinks.register(r.filePaths[0])}));
 ipcMain.handle('files:open',result(async(fileId)=>{const filename=fileLinks.resolve(fileId),error=await shell.openPath(filename);if(error)throw Error(error);return true}));
}
