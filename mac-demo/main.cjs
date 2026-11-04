const {app,BrowserWindow,Menu,dialog,shell}=require('electron');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
app.setName('砚台泼墨 Demo');
app.setPath('userData',path.join(app.getPath('appData'),'YantaiInk-Mac-Demo'));
let child,win,origin,quitting=false;
const runtime=path.join(__dirname,'runtime');
const demoData=path.join(app.getPath('userData'),'data');
const python='/usr/bin/python3';
if(!app.requestSingleInstanceLock())app.quit();
else {
 app.on('second-instance',()=>{if(win){win.restore();win.focus();}});
 app.whenReady().then(start).catch(fail);
}
async function start(){
 fs.mkdirSync(demoData,{recursive:true,mode:0o700});
 await new Promise((resolve,reject)=>{const seed=spawn(python,[path.join(__dirname,'seed.py'),demoData],{stdio:['ignore','pipe','pipe']});let err='';seed.stderr.on('data',b=>err+=b);seed.on('error',reject);seed.on('exit',code=>code?reject(Error(err||'演示数据库初始化失败')):resolve());});
 child=spawn(python,[path.join(runtime,'server.py'),'--port','0'],{env:{...process.env,YANTAI_DEMO_DATA:demoData},stdio:['ignore','pipe','pipe']});
 const log=fs.createWriteStream(path.join(app.getPath('userData'),'service.log'),{flags:'a',mode:0o600});child.stderr.pipe(log);
 origin=await new Promise((resolve,reject)=>{let buffer='';const timer=setTimeout(()=>reject(Error('本地服务启动超时')),15000);child.on('error',e=>{clearTimeout(timer);reject(e)});child.on('exit',code=>{clearTimeout(timer);reject(Error('本地服务退出：'+code))});child.stdout.on('data',b=>{buffer+=b;const m=buffer.match(/DEMO_READY (http:\/\/127\.0\.0\.1:\d+)/);if(m){clearTimeout(timer);resolve(m[1]);}});});
 child.on('exit',()=>{if(!quitting){dialog.showErrorBox('演示服务已停止','请退出并重新打开 Demo。正式程序未受影响。');}});
 createWindow();
 Menu.setApplicationMenu(Menu.buildFromTemplate([
  {label:app.name,submenu:[{role:'about'},{type:'separator'},{label:'打开演示数据目录',click:()=>shell.openPath(app.getPath('userData'))},{type:'separator'},{role:'hide'},{role:'hideOthers'},{role:'unhide'},{type:'separator'},{role:'quit'}]},
  {label:'文件',submenu:[{label:'新建项目',accelerator:'CmdOrCtrl+N',click:()=>click('[data-action="new"]')},{label:'保存当前表单',accelerator:'CmdOrCtrl+S',click:()=>win?.webContents.executeJavaScript("document.querySelector('.dialog form')?.requestSubmit()")},{label:'备份演示数据库',click:backup},{role:'close'}]},
  {label:'编辑',submenu:[{role:'undo'},{role:'redo'},{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'},{label:'搜索项目',accelerator:'CmdOrCtrl+F',click:()=>win?.webContents.executeJavaScript("document.querySelector('[aria-label=\"项目台账\"]')?.click();document.querySelector('#search')?.focus()")}]},
  {label:'显示',submenu:[{role:'reload'},{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'},{role:'togglefullscreen'}]},
  {label:'窗口',submenu:[{role:'minimize'},{role:'zoom'},{role:'front'}]}
 ]));
}
function click(selector){return win?.webContents.executeJavaScript(`document.querySelector(${JSON.stringify(selector)})?.click()`);}
function createWindow(){
 win=new BrowserWindow({width:1440,height:900,minWidth:1024,minHeight:640,title:'砚台泼墨 · 独立演示',titleBarStyle:'hiddenInset',trafficLightPosition:{x:18,y:19},backgroundColor:'#eef3f8',show:false,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,partition:'persist:yantai-demo'}});
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 win.webContents.on('will-navigate',(e,url)=>{if(new URL(url).origin!==origin)e.preventDefault();});
 win.webContents.session.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
 win.webContents.session.on('will-download',async(e,item)=>{const result=await dialog.showSaveDialog(win,{defaultPath:item.getFilename()});if(result.canceled)item.cancel();else item.setSavePath(result.filePath);});
 win.webContents.on('did-finish-load',()=>win.webContents.insertCSS('body{padding-top:38px!important;height:100vh;box-sizing:border-box}body:before{content:"砚台泼墨 Demo · 独立演示数据";position:fixed;top:0;left:0;right:0;height:38px;line-height:38px;text-align:center;font:12px/38px -apple-system,BlinkMacSystemFont,sans-serif;color:#65758b;background:#f4f8fc;z-index:99999;-webkit-app-region:drag}.main,.v4-main{max-height:calc(100vh - 38px)}'));
 win.once('ready-to-show',()=>win.show());win.on('closed',()=>{win=null});win.loadURL(origin+'/workspace.html?desktop=demo');
}
async function backup(){const result=await dialog.showSaveDialog(win,{defaultPath:'砚台泼墨-Demo备份.sqlite3'});if(result.canceled)return;const proc=spawn(python,['-c','import sqlite3,sys; a=sqlite3.connect(sys.argv[1]); b=sqlite3.connect(sys.argv[2]); a.backup(b); b.close(); a.close()',path.join(demoData,'workspace.sqlite3'),result.filePath]);proc.on('exit',code=>code?dialog.showErrorBox('备份失败','请检查保存位置。'):dialog.showMessageBox(win,{message:'演示数据库已备份'}));}
function fail(error){dialog.showErrorBox('无法启动 Demo',error.message+'\n本 Demo 需要本机 /usr/bin/python3。正式程序与数据未修改。');app.quit();}
app.on('activate',()=>{if(!win&&origin)createWindow()});
app.on('before-quit',()=>{quitting=true;if(child)child.kill('SIGTERM')});
app.on('window-all-closed',()=>app.quit());
