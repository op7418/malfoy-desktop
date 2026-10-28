const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("malfoyHost", {
  exitInteractive: () => ipcRenderer.send("exit-interactive"),
});
