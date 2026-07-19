/**
 * 前置主题初始化 script。
 *
 * 在 <head> 里注入，先于 next-themes 的 inline script 执行，提前把主题
 * 设置到 <html> 上。即使 next-themes 的 script 因 Turbopack minify bug
 * 抛错（e is not defined），主题也已经设好了，避免 FOUC。
 *
 * 逻辑与 next-themes 0.4.6 的 inline script 一致：
 *   - 从 localStorage 读 "theme" key（和 ThemeProvider 的 storageKey 一致）
 *   - 值为 "system" 或不存在时，用 prefers-color-scheme 媒体查询
 *   - 给 <html> 加 class="light"|"dark"（attribute="class"）
 *   - 设置 style.colorScheme 让原生表单控件跟随
 *
 * 必须是纯字符串字面量，不能经过任何函数生成或 minify，否则可能再次触发
 * Turbopack 的 minify bug。
 */
const themeInitScript = `(function(){try{var s=localStorage.getItem("theme")||"system";var t=s==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):s;var r=document.documentElement;r.classList.remove("light","dark");r.classList.add(t);r.style.colorScheme=t}catch(e){}})()`;

export { themeInitScript };
