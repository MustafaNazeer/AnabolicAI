// Runs synchronously before paint to set data-theme and data-mode,
// preventing a flash of the wrong accent or appearance.
export const NO_FLASH_SCRIPT = `(function(){try{
var THEMES=['cobalt','magenta','emerald','crimson','rose'];
var t=localStorage.getItem('onyx-theme');
if(THEMES.indexOf(t)===-1)t='cobalt';
var m=localStorage.getItem('onyx-mode');
if(['system','light','dark'].indexOf(m)===-1)m='system';
var a=m==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):m;
var el=document.documentElement;
el.setAttribute('data-theme',t);
el.setAttribute('data-mode',a);
}catch(e){}})();`;
