"use strict";(()=>{var v="nixcord_settings",p={plugins:{},themes:{enabled:[],customCSS:""},general:{devMode:!1,updateBranch:"main",autoUpdate:!0,lastUpdateCheck:0}},S=class{constructor(){this.listeners=new Map;this.saveTimer=null;this.data=this.load()}load(){try{let e=localStorage.getItem(v);return e?this.deepMerge(structuredClone(p),JSON.parse(e)):structuredClone(p)}catch{return structuredClone(p)}}deepMerge(e,n){for(let r in n){let o=n[r],s=e[r];o&&typeof o=="object"&&!Array.isArray(o)&&s&&typeof s=="object"?this.deepMerge(s,o):o!==void 0&&(e[r]=o)}return e}scheduleSave(){this.saveTimer&&clearTimeout(this.saveTimer),this.saveTimer=setTimeout(()=>{try{localStorage.setItem(v,JSON.stringify(this.data))}catch(e){console.error("[Nixcord] Failed to persist settings:",e)}},300)}get(e){return this.data[e]}set(e,n){this.data[e]=n,this.emit(e,n),this.scheduleSave()}getPlugin(e){return this.data.plugins[e]||(this.data.plugins[e]={}),this.data.plugins[e]}setPlugin(e,n,r){this.data.plugins[e]||(this.data.plugins[e]={}),this.data.plugins[e][n]=r,this.emit(`plugin:${e}:${n}`,r),this.scheduleSave()}getPluginSetting(e,n,r){let o=this.data.plugins[e]?.[n];return o!==void 0?o:r}on(e,n){return this.listeners.has(e)||this.listeners.set(e,new Set),this.listeners.get(e).add(n),()=>this.listeners.get(e)?.delete(n)}emit(e,n){this.listeners.get(e)?.forEach(r=>{try{r(n)}catch{}})}reset(){this.data=structuredClone(p),localStorage.removeItem(v)}export(){return JSON.stringify(this.data,null,2)}import(e){try{let n=JSON.parse(e);this.data=this.deepMerge(structuredClone(p),n),this.scheduleSave()}catch(n){throw new Error(`Invalid settings JSON: ${n}`)}}},a=new S;var E=new Map;function k(t){for(let[e,n]of E.entries()){let r=n.filter(o=>o.id!==t);r.length!==n.length&&E.set(e,r)}}var x=new Map;async function X(t){let e=x.get(t);if(!e)return console.error(`[Nixcord] Cannot start unknown plugin: ${t}`),!1;if(e.running)return!0;try{return await e.plugin.start(),e.running=!0,e.error=null,console.log(`[Nixcord] Plugin started: ${t}`),!0}catch(n){return e.error=String(n),console.error(`[Nixcord] Plugin "${t}" failed to start:`,n),!1}}async function K(t){let e=x.get(t);if(!e||!e.running)return!1;try{await e.plugin.stop()}catch(n){console.error(`[Nixcord] Plugin "${t}" threw during stop:`,n)}return k(t),e.running=!1,console.log(`[Nixcord] Plugin stopped: ${t}`),!0}async function N(t){if(!x.get(t))return!1;let n=C(t);return n?(await K(t),a.setPlugin(t,"_enabled",!1)):(a.setPlugin(t,"_enabled",!0),await X(t)),!n}function C(t){return a.getPluginSetting(t,"_enabled",!1)}function $(){return Array.from(x.values())}var L="nixcord-theme-",W="nixcord-custom-css",m=new Map;function M(t){if(m.has(t))return m.get(t);let e=document.createElement("style");return e.id=t,e.setAttribute("data-nixcord","true"),document.head.appendChild(e),m.set(t,e),e}function G(t){let e=m.get(t);e&&(e.remove(),m.delete(t))}async function q(t){if(!t.isRemote)return t.source;try{let e=await fetch(t.source,{cache:"no-cache"});if(!e.ok)throw new Error(`HTTP ${e.status}`);return await e.text()}catch(e){return console.error(`[Nixcord] Failed to fetch theme "${t.id}":`,e),""}}var U=new Map;function _(){return Array.from(U.values())}async function Y(t){let e=U.get(t);if(!e)return console.error(`[Nixcord] Theme not found: ${t}`),!1;let n=await q(e);if(!n)return!1;let r=M(`${L}${t}`);r.textContent=n;let o=a.get("themes").enabled;return o.includes(t)||a.set("themes",{...a.get("themes"),enabled:[...o,t]}),console.log(`[Nixcord] Theme enabled: ${t}`),!0}function Q(t){G(`${L}${t}`);let e=a.get("themes");a.set("themes",{...e,enabled:e.enabled.filter(n=>n!==t)}),console.log(`[Nixcord] Theme disabled: ${t}`)}function w(t){return a.get("themes").enabled.includes(t)}async function R(t){return w(t)?(Q(t),!1):await Y(t)}function T(t){let e=M(W);e.textContent=t,a.set("themes",{...a.get("themes"),customCSS:t})}function A(){return a.get("themes").customCSS}var H="NISPAX-InfoTech",D="nixcord",Z="https://api.github.com",ee="https://raw.githubusercontent.com",h="f507f10519a84d42e5fef3b968a8cd28c0bd4113";async function te(t){let e=await fetch(t,{headers:{Accept:"application/vnd.github.v3+json"},cache:"no-cache"});if(!e.ok)throw new Error(`GitHub API error: ${e.status} ${e.statusText}`);return e.json()}async function P(){let t=a.get("general").updateBranch||"main",e=await te(`${Z}/repos/${H}/${D}/commits?sha=${t}&per_page=1`);if(!e.length)throw new Error("No commits found on branch");let n=e[0],r=n.sha;return a.set("general",{...a.get("general"),lastUpdateCheck:Date.now()}),{hasUpdate:h!=="dev"&&r!==h,latestSha:r,currentSha:h,message:n.commit.message,timestamp:n.commit.author.date}}async function ne(t){let e=a.get("general").updateBranch||"main",n=`${ee}/${H}/${D}/${e}/dist/nixcord.js`,r=await fetch(n,{cache:"no-cache"});if(!r.ok)throw new Error(`Failed to download build: ${r.status}`);return r.text()}async function re(t){try{return localStorage.setItem("nixcord_pending_update",t),window.location.reload(),{success:!0}}catch(e){return{success:!1,error:String(e)}}}async function oe(t){try{if(typeof window.nixcordBridge?.applyUpdate=="function")return await window.nixcordBridge.applyUpdate(t),{success:!0};throw new Error("Desktop bridge not available")}catch(e){return{success:!1,error:String(e)}}}async function z(){try{let t=await P();if(!t.hasUpdate)return{success:!0};let e=await ne(t.latestSha);return typeof window<"u"&&typeof window.nixcordBridge<"u"?oe(e):re(e)}catch(t){return console.error("[Nixcord] Update failed:",t),{success:!1,error:String(t)}}}function F(){let t=a.get("general").lastUpdateCheck;return t?new Date(t):null}function I(){return h}var O="nixcord-settings-styles";function ie(){if(document.getElementById(O))return;let t=document.createElement("style");t.id=O,t.textContent=`
    .nixcord-settings-root {
      padding: 24px;
      color: #dcddde;
      font-family: 'gg sans', 'Noto Sans', sans-serif;
      max-width: 740px;
    }
    .nixcord-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
    }
    .nixcord-logo {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, #5865F2, #7289da);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: bold;
    }
    .nixcord-title { font-size: 20px; font-weight: 700; color: #fff; }
    .nixcord-subtitle { font-size: 12px; color: #72767d; margin-top: 2px; }
    .nixcord-tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 20px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      padding-bottom: 8px;
    }
    .nixcord-tab {
      padding: 6px 14px;
      border-radius: 6px 6px 0 0;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      color: #b9bbbe;
      background: transparent;
      border: none;
      transition: all 0.15s;
    }
    .nixcord-tab:hover { color: #dcddde; background: rgba(255,255,255,0.04); }
    .nixcord-tab.active { color: #fff; background: rgba(88,101,242,0.2); border-bottom: 2px solid #5865F2; }
    .nixcord-search {
      width: 100%;
      padding: 8px 12px;
      background: rgba(0,0,0,0.2);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 6px;
      color: #dcddde;
      font-size: 14px;
      margin-bottom: 16px;
      outline: none;
      box-sizing: border-box;
    }
    .nixcord-search:focus { border-color: #5865F2; }
    .nixcord-plugin-card {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 14px 16px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 8px;
      margin-bottom: 8px;
      transition: background 0.1s;
    }
    .nixcord-plugin-card:hover { background: rgba(255,255,255,0.05); }
    .nixcord-plugin-name { font-size: 14px; font-weight: 600; color: #fff; }
    .nixcord-plugin-desc { font-size: 12px; color: #72767d; margin-top: 3px; line-height: 1.4; }
    .nixcord-plugin-meta { font-size: 11px; color: #4f545c; margin-top: 4px; }
    .nixcord-plugin-error { font-size: 11px; color: #ed4245; margin-top: 4px; }
    .nixcord-plugin-tags { display: flex; gap: 4px; margin-top: 6px; flex-wrap: wrap; }
    .nixcord-tag {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 10px;
      background: rgba(88,101,242,0.15);
      color: #7289da;
      font-weight: 500;
    }
    .nixcord-toggle {
      position: relative;
      width: 40px;
      height: 22px;
      flex-shrink: 0;
      margin-left: 12px;
      cursor: pointer;
    }
    .nixcord-toggle input { display: none; }
    .nixcord-toggle-track {
      width: 100%;
      height: 100%;
      background: #4f545c;
      border-radius: 11px;
      transition: background 0.2s;
    }
    .nixcord-toggle.on .nixcord-toggle-track { background: #5865F2; }
    .nixcord-toggle-thumb {
      position: absolute;
      top: 3px;
      left: 3px;
      width: 16px;
      height: 16px;
      background: #fff;
      border-radius: 50%;
      transition: left 0.2s;
    }
    .nixcord-toggle.on .nixcord-toggle-thumb { left: 21px; }
    .nixcord-update-card {
      padding: 16px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 8px;
      margin-bottom: 12px;
    }
    .nixcord-update-card h3 { margin: 0 0 8px; font-size: 14px; font-weight: 600; color: #fff; }
    .nixcord-update-meta { font-size: 12px; color: #72767d; line-height: 1.6; }
    .nixcord-btn {
      padding: 8px 16px;
      background: #5865F2;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 10px;
      transition: background 0.15s;
    }
    .nixcord-btn:hover { background: #4752c4; }
    .nixcord-btn:disabled { background: #4f545c; cursor: not-allowed; }
    .nixcord-btn.danger { background: #ed4245; }
    .nixcord-btn.danger:hover { background: #c03537; }
    .nixcord-css-editor {
      width: 100%;
      min-height: 300px;
      background: #1e1f22;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 8px;
      color: #dcddde;
      font-family: 'Fira Code', 'Consolas', monospace;
      font-size: 13px;
      padding: 12px;
      resize: vertical;
      outline: none;
      box-sizing: border-box;
    }
    .nixcord-css-editor:focus { border-color: #5865F2; }
    .nixcord-status-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 6px;
    }
    .nixcord-status-dot.green { background: #3ba55c; }
    .nixcord-status-dot.yellow { background: #faa61a; }
    .nixcord-status-dot.red { background: #ed4245; }
    .nixcord-empty { text-align: center; color: #4f545c; padding: 40px; font-size: 14px; }
  `,document.head.appendChild(t)}function j(t,e){let n=document.createElement("label");n.className=`nixcord-toggle ${t?"on":""}`;let r=document.createElement("div");r.className="nixcord-toggle-track";let o=document.createElement("div");return o.className="nixcord-toggle-thumb",n.appendChild(r),n.appendChild(o),n.addEventListener("click",()=>{let s=!n.classList.contains("on");n.classList.toggle("on",s),e(s)}),n}function se(t){t.innerHTML="";let e=document.createElement("input");e.className="nixcord-search",e.placeholder="Search plugins...",t.appendChild(e);let n=document.createElement("div");t.appendChild(n);function r(o=""){n.innerHTML="";let s=$().filter(({plugin:i})=>!o||i.name.toLowerCase().includes(o)||i.description.toLowerCase().includes(o));if(!s.length){n.innerHTML='<div class="nixcord-empty">No plugins found.</div>';return}for(let{plugin:i,error:d}of s){let c=document.createElement("div");c.className="nixcord-plugin-card";let l=document.createElement("div");l.style.flex="1";let u=document.createElement("div");u.className="nixcord-plugin-name",u.textContent=i.name;let f=document.createElement("div");f.className="nixcord-plugin-desc",f.textContent=i.description;let b=document.createElement("div");if(b.className="nixcord-plugin-meta",b.textContent=`v${i.version} by ${i.author}`,l.appendChild(u),l.appendChild(f),l.appendChild(b),d){let g=document.createElement("div");g.className="nixcord-plugin-error",g.textContent=`\u26A0 ${d}`,l.appendChild(g)}if(i.tags?.length){let g=document.createElement("div");g.className="nixcord-plugin-tags";for(let J of i.tags){let y=document.createElement("span");y.className="nixcord-tag",y.textContent=J,g.appendChild(y)}l.appendChild(g)}let V=j(C(i.id),async()=>{await N(i.id),r(e.value.trim().toLowerCase())});c.appendChild(l),c.appendChild(V),n.appendChild(c)}}r(),e.addEventListener("input",()=>r(e.value.trim().toLowerCase()))}function ae(t){t.innerHTML="";let e=_();if(!e.length){t.innerHTML='<div class="nixcord-empty">No themes installed.</div>';return}for(let n of e){let r=document.createElement("div");r.className="nixcord-plugin-card";let o=document.createElement("div");o.style.flex="1";let s=document.createElement("div");s.className="nixcord-plugin-name",s.textContent=n.name;let i=document.createElement("div");i.className="nixcord-plugin-desc",i.textContent=n.description;let d=document.createElement("div");d.className="nixcord-plugin-meta",d.textContent=`v${n.version} by ${n.author}${n.isRemote?" \xB7 Remote":" \xB7 Local"}`,o.appendChild(s),o.appendChild(i),o.appendChild(d);let c=j(w(n.id),async()=>{await R(n.id)});r.appendChild(o),r.appendChild(c),t.appendChild(r)}}async function B(t){t.innerHTML='<div class="nixcord-update-card"><h3>Checking for updates...</h3></div>';let e=I(),n=F();try{let r=await P();t.innerHTML="";let o=document.createElement("div");if(o.className="nixcord-update-card",o.innerHTML=`
      <h3>
        <span class="nixcord-status-dot ${r.hasUpdate?"yellow":"green"}"></span>
        ${r.hasUpdate?"Update Available":"Up to Date"}
      </h3>
      <div class="nixcord-update-meta">
        <strong>Current:</strong> ${e==="dev"?"dev build":e.slice(0,7)}<br>
        <strong>Latest:</strong> ${r.latestSha.slice(0,7)}<br>
        <strong>Commit:</strong> ${r.message}<br>
        <strong>Date:</strong> ${new Date(r.timestamp).toLocaleString()}<br>
        <strong>Last checked:</strong> ${n?n.toLocaleString():"Just now"}
      </div>
    `,r.hasUpdate){let i=document.createElement("button");i.className="nixcord-btn",i.textContent="Install Update",i.addEventListener("click",async()=>{i.disabled=!0,i.textContent="Updating...";let d=await z();d.success?i.textContent="Reloading...":(i.textContent=`Failed: ${d.error}`,i.disabled=!1)}),o.appendChild(i)}let s=document.createElement("button");s.className="nixcord-btn",s.style.marginLeft=r.hasUpdate?"8px":"0",s.textContent="Check Again",s.addEventListener("click",()=>B(t)),o.appendChild(s),t.appendChild(o)}catch(r){t.innerHTML=`
      <div class="nixcord-update-card">
        <h3><span class="nixcord-status-dot red"></span>Update Check Failed</h3>
        <div class="nixcord-update-meta">${String(r)}</div>
      </div>
    `}}function ce(t){t.innerHTML="";let e=document.createElement("div");e.style.cssText="font-size:12px;color:#72767d;margin-bottom:10px;",e.textContent="Write custom CSS to inject into Discord. Changes apply immediately.";let n=document.createElement("textarea");n.className="nixcord-css-editor",n.value=A(),n.placeholder="/* your custom CSS here */";let r;n.addEventListener("input",()=>{clearTimeout(r),r=setTimeout(()=>T(n.value),500)});let o=document.createElement("button");o.className="nixcord-btn danger",o.style.marginTop="10px",o.textContent="Clear CSS",o.addEventListener("click",()=>{n.value="",T("")}),t.appendChild(e),t.appendChild(n),t.appendChild(o)}function de(t){ie(),t.innerHTML="";let e=document.createElement("div");e.className="nixcord-settings-root";let n=document.createElement("div");n.className="nixcord-header",n.innerHTML=`
    <div class="nixcord-logo">N</div>
    <div>
      <div class="nixcord-title">Nixcord</div>
      <div class="nixcord-subtitle">by NISPAX InfoTech</div>
    </div>
  `;let r=document.createElement("div");r.className="nixcord-tabs";let o=document.createElement("div"),s=[{id:"plugins",label:"Plugins"},{id:"themes",label:"Themes"},{id:"customcss",label:"Custom CSS"},{id:"updater",label:"Updater"}],i="plugins";function d(c){switch(i=c,r.querySelectorAll(".nixcord-tab").forEach(l=>l.classList.remove("active")),r.querySelector(`[data-tab="${c}"]`)?.classList.add("active"),o.innerHTML="",c){case"plugins":se(o);break;case"themes":ae(o);break;case"customcss":ce(o);break;case"updater":B(o);break}}for(let{id:c,label:l}of s){let u=document.createElement("button");u.className=`nixcord-tab${c===i?" active":""}`,u.textContent=l,u.dataset.tab=c,u.addEventListener("click",()=>d(c)),r.appendChild(u)}e.appendChild(n),e.appendChild(r),e.appendChild(o),t.appendChild(e),d("plugins")}function Ce(){let t=new MutationObserver(()=>{let e=document.querySelector('[class*="sidebar-"]');if(!e||e.querySelector(".nixcord-settings-entry"))return;let n=document.createElement("div");n.style.cssText="height:1px;background:rgba(255,255,255,0.06);margin:8px 8px;";let r=document.createElement("div");r.className="nixcord-settings-entry",r.style.cssText=`
      padding: 6px 10px;
      margin: 2px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      color: #b9bbbe;
      transition: background 0.1s, color 0.1s;
    `,r.textContent="Nixcord",r.addEventListener("mouseenter",()=>{r.style.background="rgba(255,255,255,0.06)",r.style.color="#dcddde"}),r.addEventListener("mouseleave",()=>{r.style.background="transparent",r.style.color="#b9bbbe"}),r.addEventListener("click",()=>{let o=document.querySelector('[class*="contentRegion-"], [class*="content-"]');o&&de(o)}),e.appendChild(n),e.appendChild(r)});return t.observe(document.body,{childList:!0,subtree:!0}),()=>t.disconnect()}})();
