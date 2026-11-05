const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('yantaiFiles',Object.freeze({
 pick:()=>ipcRenderer.invoke('files:pick'),
 link:name=>ipcRenderer.invoke('files:link',String(name)),
 open:fileId=>ipcRenderer.invoke('files:open',String(fileId))
}));
