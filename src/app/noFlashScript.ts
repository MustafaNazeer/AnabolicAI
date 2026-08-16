// Runs synchronously before paint to set data-theme and data-mode,
// preventing a flash of the wrong accent or appearance.
// The theme and mode lists below are hardcoded because this inline script
// cannot import modules. Keep them in sync with THEMES in src/lib/theme.ts
// and MODES in src/lib/appearance.ts.
export const NO_FLASH_SCRIPT = `(function(){try{
var THEMES=['cobalt','magenta','emerald','crimson','rose'];
// These two keys must match ThemeProvider and AppearanceProvider exactly, or
// every page load flashes the wrong theme before hydration. Still "onyx" after
// the rename. See docs/rename.md.
var t=localStorage.getItem('onyx-theme');
if(THEMES.indexOf(t)===-1)t='crimson';
var m=localStorage.getItem('onyx-mode');
if(['system','light','dark'].indexOf(m)===-1)m='system';
var a=m==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):m;
var el=document.documentElement;
el.setAttribute('data-theme',t);
el.setAttribute('data-mode',a);
}catch(e){}})();`;
