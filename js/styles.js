export function injectCSS() {
    if (document.getElementById("anima-css")) return;
    const s = document.createElement("style");
    s.id = "anima-css";
    s.textContent = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

#anima-browser { position:fixed; inset:0; z-index:99998; display:flex; align-items:center; justify-content:center; font-family:'Inter',sans-serif; }
#anima-browser.hidden { display:none; }
#anima-browser .backdrop { position:absolute; inset:0; background:rgba(0,0,0,.8); backdrop-filter:blur(10px); }
#anima-browser .window { position:relative; z-index:1; width:min(96vw,1160px); height:min(93vh,880px); background:#0b0b0f; border:1px solid #1e1e28; border-radius:14px; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 40px 100px #000c; animation:anima-in .2s cubic-bezier(.22,1,.36,1); }
@keyframes anima-in { from{opacity:0;transform:translateY(16px) scale(.97)} to{opacity:1;transform:none} }

#anima-browser .hdr { display:flex; align-items:center; gap:8px; padding:11px 14px; border-bottom:1px solid #16161e; flex-shrink:0; }
#anima-browser .hdr-title { font-size:13px; font-weight:600; color:#c0c0d0; letter-spacing:.02em; white-space:nowrap; }
#anima-browser .hdr-pill { background:#141420; border:1px solid #1e1e30; color:#707090; font-size:9.5px; font-family:'JetBrains Mono',monospace; padding:2px 7px; border-radius:20px; }
#anima-browser .hdr-gap { flex:1; }
#anima-browser .search-wrap { position:relative; flex:1; max-width:300px; }
#anima-browser .search-icon { position:absolute; left:9px; top:50%; transform:translateY(-50%); color:#2e2e42; font-size:11px; pointer-events:none; font-style:normal; font-family:'JetBrains Mono',monospace; }
#anima-browser .search-input { width:100%; padding:7px 10px 7px 27px; background:#0f0f16; border:1px solid #1e1e2c; border-radius:7px; color:#a0a0bc; font-family:'JetBrains Mono',monospace; font-size:12px; outline:none; transition:border-color .15s; box-sizing:border-box; }
#anima-browser .search-input::placeholder { color:#26263a; }
#anima-browser .search-input:focus { border-color:#343450; }
#anima-browser .hdr-select { padding:6px 8px; background:#0f0f16; border:1px solid #1e1e2c; border-radius:7px; color:#606080; font-size:11px; cursor:pointer; outline:none; }
#anima-browser .hdr-btn { width:29px; height:29px; display:flex; align-items:center; justify-content:center; background:#0f0f16; border:1px solid #1e1e2c; border-radius:7px; color:#404058; cursor:pointer; font-size:13px; transition:all .12s; flex-shrink:0; }
#anima-browser .hdr-btn:hover { background:#1e1e2c; color:#fff; border-color:#4a4a6a; }
#anima-browser .hdr-close { width:29px; height:29px; display:flex; align-items:center; justify-content:center; background:transparent; border:1px solid #28181a; border-radius:7px; color:#583040; cursor:pointer; font-size:13px; transition:all .12s; flex-shrink:0; }
#anima-browser .hdr-close:hover { background:#241010; border-color:#4a2020; color:#c05060; }
#anima-browser .hdr-btn-txt { background:#151525; border:1px solid #2a2a40; color:#8080a0; font-family:'Inter',sans-serif; font-size:10px; font-weight:600; padding:6px 12px; border-radius:6px; cursor:pointer; transition:all .15s; margin-right:4px; }
#anima-browser .hdr-btn-txt:hover { background:#1c1c30; border-color:#4a4a6a; color:#c0c0e0; }
#anima-browser .hdr-btn-txt.disabled { opacity:0.5; pointer-events:none; }

#anima-browser .cycle-bar { display:flex; align-items:center; gap:8px; padding:7px 14px; border-bottom:1px solid #13131a; background:#0d0d12; flex-shrink:0; }
#anima-browser .cycle-label { font-size:10.5px; color:#c0c0d0; font-family:'JetBrains Mono',monospace; white-space:nowrap; }
.anima-play-btn { display:flex; align-items:center; gap:5px; padding:5px 14px; border-radius:6px; cursor:pointer; font-family:'Inter',sans-serif; font-size:11px; font-weight:600; border:1px solid #1e3020; background:#121a12; color:#70a070; transition:all .15s; white-space:nowrap; }
.anima-play-btn:hover { background:#162016; border-color:#2a4030; color:#90c090; }
.anima-play-btn.running { background:#1e1010; border-color:#4a2020; color:#a05060; }
.anima-swipe-btn { display:flex; align-items:center; gap:6px; padding:5px 12px; border-radius:6px; cursor:pointer; font-family:'Inter',sans-serif; font-size:11px; font-weight:600; border:1px solid #203040; background:#101820; color:#80a0c0; transition:all .15s; white-space:nowrap; }
.anima-swipe-btn:hover { background:#142030; border-color:#2a405a; color:#b0d0f0; }
.anima-cycle-status { font-size:10.5px; color:#a0a0bc; font-family:'JetBrains Mono',monospace; }
.anima-cycle-status.active { color:#a0c0a0; }
#anima-browser .cycle-gap { flex:1; }
#anima-browser .cycle-search { position:relative; width:220px; margin-left:12px; }
#anima-browser .cycle-search i { position:absolute; left:8px; top:50%; transform:translateY(-50%); color:#2e2e42; font-size:10px; font-family:'JetBrains Mono',monospace; font-style:normal; pointer-events:none; }
#anima-browser .cycle-search input { width:100%; padding:5px 8px 5px 22px; background:#0a0a0f; border:1px solid #1a1a24; border-radius:6px; color:#a0a0bc; font-size:11px; font-family:'JetBrains Mono',monospace; outline:none; transition:border-color .15s; }
#anima-browser .cycle-search input:focus { border-color:#343450; }
#anima-browser .cycle-hint { font-size:10px; color:#8080a0; font-family:'Inter',sans-serif; opacity:0.9; font-style:italic; }

#anima-browser .slot-bar { display:flex; align-items:center; gap:14px; padding:9px 14px 10px; border-bottom:1px solid #15151d; background:linear-gradient(180deg,#0e1018,#0b0d14); flex-shrink:0; }
#anima-browser .slot-bar-copy { display:flex; flex-direction:column; gap:2px; min-width:150px; }
#anima-browser .slot-bar-label { font-size:10px; color:#d9def2; font-family:'JetBrains Mono',monospace; letter-spacing:.06em; text-transform:uppercase; }
#anima-browser .slot-bar-hint { font-size:10px; color:#7f88a8; line-height:1.35; }
#anima-browser .slot-bar-slots { display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:8px; flex:1; }
#anima-browser .slot-chip { display:flex; align-items:center; gap:10px; min-height:36px; padding:8px 10px; border-radius:10px; border:1px solid #22283b; background:#101625; color:#a9b4d4; cursor:pointer; transition:all .14s ease; min-width:0; }
#anima-browser .slot-chip:hover { border-color:#3b4e7a; background:#141d33; color:#e1e9ff; }
#anima-browser .slot-chip:disabled { opacity:0.55; cursor:default; }
#anima-browser .slot-chip.active { border-color:#5b74b3; background:#1a2440; color:#eef3ff; box-shadow:0 0 0 1px rgba(112,145,230,.18); }
#anima-browser .slot-chip-id { font-family:'JetBrains Mono',monospace; font-size:10px; font-weight:700; color:#c4d1f5; flex-shrink:0; }
#anima-browser .slot-chip-tag { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:10.5px; }

#anima-browser .body { flex:1; overflow-y:auto; padding:12px; scrollbar-width:thin; scrollbar-color:#1c1c28 transparent; }
#anima-browser .body::-webkit-scrollbar { width:5px; }
#anima-browser .body::-webkit-scrollbar-thumb { background:#1c1c28; border-radius:3px; }

.anima-grid { }
.anima-chunk { display:grid; grid-template-columns:repeat(auto-fill,minmax(142px,1fr)); gap:7px; width:100%; contain:content; }
.anima-empty { grid-column:1/-1; display:flex; flex-direction:column; align-items:center; gap:10px; padding:60px; color:#222230; font-size:12px; }
.hdr-toggle-wrap { display:inline-flex; align-items:center; gap:10px; margin-right:6px; background:linear-gradient(180deg,#10182b,#0b1120); padding:5px 10px 5px 12px; border-radius:10px; border:1px solid #25314a; box-shadow:inset 0 1px 0 rgba(255,255,255,.03); }
.hdr-toggle-label { font-size:10.5px; font-weight:600; color:#d4defd; letter-spacing:.01em; background:transparent; padding:0; border:none; margin-right:0; white-space:nowrap; }
.hdr-toggle-hint { display:none; }
.hdr-switch { position:relative; display:inline-block; width:34px; height:20px; transition:transform 0.18s cubic-bezier(0.175, 0.885, 0.32, 1.275); flex-shrink:0; }
.hdr-switch input { opacity:0; width:0; height:0; }
.hdr-slider { position:absolute; cursor:pointer; inset:0; background-color:#12182b; transition:.2s; border-radius:999px; border:1px solid #33425f; }
.hdr-slider:before { position:absolute; content:''; height:12px; width:12px; left:3px; bottom:3px; background-color:#91a1c9; transition:.2s; border-radius:50%; }
.hdr-switch:hover { transform:scale(1.08); }
input:checked + .hdr-slider { background-color:#1b2640; border-color:#51689c; }
input:checked + .hdr-slider:before { transform:translateX(14px); background-color:#8cb5ff; box-shadow:0 0 10px #5f8cff88; }

.hdr-data-btns { display:flex; align-items:center; gap:8px; margin-left:10px; border-left:1px solid #1a1a24; padding-left:10px; }
.hdr-settings-wrap { position:relative; display:flex; align-items:center; }
.hdr-settings-wrap #anima-settings-gear { font-size:15px; color:#8f96be; }
.hdr-settings-wrap:hover #anima-settings-gear,
.hdr-settings-wrap:focus-within #anima-settings-gear { color:#c7d4ff; border-color:#4a5f92; background:#1a2038; }
.hdr-settings-menu {
    position:absolute;
    top:calc(100% + 6px);
    right:0;
    min-width:170px;
    padding:6px;
    border-radius:8px;
    border:1px solid #2b3552;
    background:#0f1324;
    box-shadow:0 14px 28px rgba(0,0,0,.45);
    display:flex;
    flex-direction:column;
    gap:6px;
    opacity:0;
    transform:translateY(-6px) scale(.98);
    pointer-events:none;
    transition:opacity .14s ease, transform .14s ease;
    z-index:40;
}
.hdr-settings-wrap:hover .hdr-settings-menu,
.hdr-settings-wrap:focus-within .hdr-settings-menu {
    opacity:1;
    transform:translateY(0) scale(1);
    pointer-events:auto;
}
.hdr-settings-item { width:100%; margin-right:0; text-align:left; }
.hdr-settings-option {
    display:flex;
    align-items:center;
    gap:8px;
    padding:6px 8px;
    border:1px solid #25304f;
    border-radius:6px;
    color:#b6c5ef;
    font-size:10px;
    font-family:'Inter',sans-serif;
    cursor:pointer;
    background:#121a30;
}
.hdr-settings-option:hover { background:#172241; border-color:#3c4f80; color:#d6e1ff; }
.hdr-settings-option input { width:13px; height:13px; accent-color:#6b8bff; }

.anima-spinner { width:24px; height:24px; border:2px solid #181824; border-top-color:#363650; border-radius:50%; animation:anima-spin .6s linear infinite; }
@keyframes anima-spin { to { transform:rotate(360deg); } }

.anima-card { border-radius:8px; overflow:hidden; background:#0e0e14; border:1px solid #191922; cursor:pointer; transition:transform .15s,border-color .15s,box-shadow .15s; }
.anima-card:hover { transform:translateY(-2px); border-color:#2e2e48; box-shadow:0 6px 20px #0009; }
.anima-card.selected { border-color:#384838; box-shadow:0 0 0 2px #202e20; }
.anima-card-img { position:relative; aspect-ratio:1; overflow:hidden; background:#0c0c12; }
.anima-card-img img { width:100%; height:100%; object-fit:cover; display:block; transition:transform .25s; }
.anima-card:hover .anima-card-img img { transform:scale(1.06); }
.anima-card-img.no-img { display:flex; align-items:center; justify-content:center; }
.anima-card-img.no-img::after { content:attr(data-init); font-family:'JetBrains Mono',monospace; font-size:26px; font-weight:700; color:#1c1c28; text-transform:uppercase; }
.anima-card-overlay { position:absolute; inset:0; background:rgba(0,0,0,.65); display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity .18s; }
.anima-uniqueness-rank { position:absolute; top:8px; left:8px; min-width:44px; height:28px; padding:0 10px; border-radius:999px; background:rgba(0,0,0,.55); border:1px solid #2e2e48; color:#e0e0f0; font-family:'JetBrains Mono',monospace; font-size:10px; font-weight:700; display:flex; align-items:center; justify-content:center; box-shadow:0 10px 30px #0009; z-index:2; }
.anima-card:hover .anima-card-overlay { opacity:1; }
.anima-card-pick { background:#101020; border:1px solid #282840; color:#8080a8; font-family:'Inter',sans-serif; font-weight:500; font-size:11px; padding:6px 13px; border-radius:6px; cursor:pointer; transition:all .12s; }
.anima-card-pick:hover { background:#181830; border-color:#404060; color:#b0b0d0; }
.anima-card-fav { background:#161622; border:1px solid #343450; color:#9ea8cf; font-family:'Inter',sans-serif; font-weight:500; font-size:10px; padding:6px 10px; border-radius:6px; cursor:pointer; transition:all .12s; margin-left:8px; }
.anima-card-fav:hover { background:#1f2338; border-color:#4b5b94; color:#d8e1ff; }
.anima-card-slot-actions { position:absolute; left:8px; right:8px; bottom:8px; display:flex; gap:6px; justify-content:center; opacity:0; transform:translateY(4px); transition:opacity .18s, transform .18s; }
.anima-card:hover .anima-card-slot-actions { opacity:1; transform:translateY(0); }
.anima-card-slot-btn { min-width:34px; padding:5px 8px; border-radius:999px; border:1px solid #31446f; background:rgba(13,20,38,.9); color:#d8e4ff; font-family:'JetBrains Mono',monospace; font-size:10px; cursor:pointer; transition:all .12s; }
.anima-card-slot-btn:hover { background:#1e2f55; border-color:#6284dc; color:#fff; }
.anima-card-meta { padding:6px 8px 8px; }
.anima-card-tag { display:block; font-size:10px; font-weight:500; font-family:'JetBrains Mono',monospace; color:#d0d0e0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.anima-card-works { display:block; font-size:9px; color:#8080a8; font-family:'JetBrains Mono',monospace; margin-top:2px; }

#anima-browser .ftr { display:flex; align-items:center; gap:10px; padding:8px 14px; border-top:1px solid #13131a; flex-shrink:0; }
#anima-browser .ftr-count { font-size:10px; font-family:'JetBrains Mono',monospace; color:#9090b0; }
#anima-browser .ftr-gap { flex:1; }
#anima-browser .ftr-link { font-size:10px; font-family:'JetBrains Mono',monospace; color:#c0c0d0; text-decoration:none; transition:color .12s; }
#anima-browser .ftr-link:hover { color:#606080; }

#anima-ac { position:fixed; z-index:99999; background:#0d0d14; border:1px solid #1e1e2c; border-radius:8px; overflow:hidden; max-height:260px; overflow-y:auto; box-shadow:0 12px 36px #000a; font-family:'Inter',sans-serif; min-width:240px; scrollbar-width:thin; }
#anima-ac.hidden { display:none; }
.anima-ac-row { display:flex; align-items:center; gap:8px; padding:6px 10px; cursor:pointer; border-bottom:1px solid #12121a; transition:background .1s; }
.anima-ac-row:last-child { border-bottom:none; }
.anima-ac-row:hover,.anima-ac-row.on { background:#141422; }
.anima-ac-thumb { width:30px; height:30px; border-radius:4px; object-fit:cover; background:#14141e; flex-shrink:0; }
.anima-ac-tag { flex:1; font-size:11.5px; font-family:'JetBrains Mono',monospace; color:#8080a0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.anima-ac-works { font-size:9.5px; font-family:'JetBrains Mono',monospace; color:#222230; white-space:nowrap; }

#anima-swipe { position:fixed; inset:0; z-index:100000; display:flex; align-items:center; justify-content:center; font-family:'Inter',sans-serif; }
#anima-swipe.hidden { display:none; }
#anima-swipe .backdrop { position:absolute; inset:0; background:rgba(0,0,0,.82); backdrop-filter:blur(12px); }
#anima-swipe .swipe-header { position:absolute; top:18px; left:0; width:100%; display:flex; align-items:center; justify-content:space-between; padding:0 20px; color:#e0e0f0; z-index:2; }
#anima-swipe .swipe-title { position:absolute; left:50%; transform:translateX(-50%); text-align:center; font-size:24px; font-weight:700; text-shadow:0 2px 8px rgba(0,0,0,.5); }
#anima-swipe .swipe-counter { font-size:12px; font-family:'JetBrains Mono',monospace; background:rgba(0,0,0,.4); padding:6px 12px; border-radius:999px; border:1px solid #2a2a40; color:#c0c0d0; user-select:none; }
#anima-swipe .swipe-actions { display:flex; align-items:center; gap:10px; margin-left:auto; }
#anima-swipe .swipe-favorite { min-height:38px; padding:0 14px; border-radius:999px; border:1px solid #2f4468; background:rgba(9,16,30,.55); color:#c8d7fb; cursor:pointer; font-family:'JetBrains Mono',monospace; font-size:11px; transition:background .15s,color .15s,border-color .15s; }
#anima-swipe .swipe-favorite:hover { background:rgba(18,28,50,.72); border-color:#5273ac; color:#f2f6ff; }
#anima-swipe .swipe-favorite[data-active="true"] { border-color:#4f7a54; background:rgba(12,32,20,.72); color:#d4f7dc; }
#anima-swipe .swipe-close { width:38px; height:38px; border-radius:10px; background:rgba(0,0,0,.25); border:1px solid #2a2a40; color:#c0c0d0; cursor:pointer; font-size:16px; line-height:1; display:flex; align-items:center; justify-content:center; transition:background .15s,color .15s,transform .15s; }
#anima-swipe .swipe-close:hover { background:rgba(0,0,0,.45); color:#fff; transform:scale(1.05); }
#anima-swipe .swipe-container { position:relative; width:100%; height:100%; display:flex; align-items:center; justify-content:center; z-index:1; overflow:hidden; }
#anima-swipe .swipe-container.swipe-transition .swipe-image { transition:transform .3s ease, opacity .3s ease, filter .3s ease; }
#anima-swipe .swipe-image { max-height:85vh; max-width:min(72vw, calc(100vw - 320px)); object-fit:contain; border-radius:14px; box-shadow:0 10px 40px rgba(0,0,0,.35); }
#anima-swipe .swipe-image--current { transform:scale(1); opacity:1; z-index:3; cursor:pointer; }
#anima-swipe .swipe-image--prev, #anima-swipe .swipe-image--next { position:absolute; opacity:.5; filter:blur(8px); z-index:2; cursor:pointer; }
#anima-swipe .swipe-image--prev { transform:scale(.8) translateX(-50vw); }
#anima-swipe .swipe-image--next { transform:scale(.8) translateX(50vw); }
#anima-swipe .swipe-slot-panel { position:absolute; top:50%; right:32px; transform:translateY(-50%); width:min(220px, 22vw); padding:14px; border-radius:16px; border:1px solid rgba(68,86,127,.72); background:rgba(8,12,22,.78); box-shadow:0 20px 42px rgba(0,0,0,.36); backdrop-filter:blur(10px); z-index:4; }
#anima-swipe .swipe-slot-panel__header { margin-bottom:10px; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:#d8e3ff; font-family:'JetBrains Mono',monospace; }
#anima-swipe .swipe-slot-panel__list { display:flex; flex-direction:column; gap:8px; }
#anima-swipe .swipe-slot-panel__empty { font-size:11px; line-height:1.5; color:#93a2c9; }
#anima-swipe .swipe-slot-chip { display:flex; flex-direction:column; gap:4px; min-height:52px; padding:10px 12px; border-radius:12px; border:1px solid rgba(50,64,98,.9); background:rgba(11,18,33,.82); color:#b6c5ea; }
#anima-swipe .swipe-slot-chip.active { border-color:#6f8fd8; background:rgba(24,34,64,.9); box-shadow:0 0 0 1px rgba(111,143,216,.16); color:#eef4ff; }
#anima-swipe .swipe-slot-chip__id { font-size:10px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; font-family:'JetBrains Mono',monospace; color:#d8e3ff; }
#anima-swipe .swipe-slot-chip__tag { font-size:11px; line-height:1.35; color:inherit; word-break:break-word; }
#anima-swipe .swipe-hint { position:absolute; bottom:18px; z-index:2; font-size:12px; color:#9090b0; background:rgba(0,0,0,.35); padding:6px 12px; border-radius:999px; border:1px solid #1a1a24; font-family:'JetBrains Mono',monospace; user-select:none; }
@media (max-width: 1180px) {
    #anima-swipe .swipe-image { max-width:min(78vw, calc(100vw - 260px)); }
    #anima-swipe .swipe-slot-panel { right:18px; width:min(200px, 24vw); padding:12px; }
}
@media (max-width: 900px) {
    #anima-swipe .swipe-header { top:14px; padding:0 14px; }
    #anima-swipe .swipe-title { top:54px; width:calc(100% - 28px); font-size:18px; }
    #anima-swipe .swipe-actions { gap:8px; }
    #anima-swipe .swipe-favorite { min-height:34px; padding:0 10px; font-size:10px; }
    #anima-swipe .swipe-close { width:34px; height:34px; }
    #anima-swipe .swipe-container { align-items:flex-start; padding:112px 14px 120px; box-sizing:border-box; }
    #anima-swipe .swipe-image { max-width:100%; max-height:calc(100vh - 300px); }
    #anima-swipe .swipe-image--prev { transform:scale(.76) translateX(-58vw); }
    #anima-swipe .swipe-image--next { transform:scale(.76) translateX(58vw); }
    #anima-swipe .swipe-slot-panel { top:auto; right:14px; left:14px; bottom:18px; transform:none; width:auto; }
    #anima-swipe .swipe-slot-panel__list { display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:8px; }
    #anima-swipe .swipe-slot-chip { min-height:0; padding:9px 10px; }
    #anima-swipe .swipe-slot-chip__tag { font-size:10px; }
    #anima-swipe .swipe-hint { left:12px; right:12px; bottom:12px; text-align:center; white-space:normal; }
}

#anima-toast-host {
    position:fixed;
    right:18px;
    bottom:18px;
    z-index:100120;
    display:flex;
    flex-direction:column;
    gap:8px;
    pointer-events:none;
}
.anima-toast {
    min-width:200px;
    max-width:340px;
    padding:8px 11px;
    border-radius:8px;
    border:1px solid #2a324d;
    background:rgba(15, 20, 35, 0.96);
    color:#dbe5ff;
    font-size:11px;
    font-family:'Inter',sans-serif;
    box-shadow:0 10px 24px rgba(0,0,0,.45);
    opacity:0;
    transform:translateY(8px);
    transition:opacity .16s ease, transform .16s ease;
}
.anima-toast.show { opacity:1; transform:translateY(0); }
.anima-toast-success { border-color:#2f5b45; background:rgba(12,34,24,.96); color:#b9f5d0; }
.anima-toast-error { border-color:#6a2d3b; background:rgba(44,16,26,.96); color:#ffc9d5; }
.anima-inline-toast {
    position:absolute;
    left:50%;
    top:50%;
    transform:translate(-50%, -46%) scale(.92);
    min-width:128px;
    max-width:calc(100% - 18px);
    padding:10px 14px;
    border-radius:999px;
    border:1px solid #2d3f63;
    background:rgba(11, 16, 28, 0.9);
    color:#eef4ff;
    font-size:11px;
    font-family:'Inter',sans-serif;
    font-weight:600;
    letter-spacing:.01em;
    box-shadow:0 16px 34px rgba(0,0,0,.42);
    backdrop-filter:blur(8px);
    white-space:nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
    opacity:0;
    transition:opacity .16s ease, transform .16s ease;
    pointer-events:none;
    z-index:5;
}
.anima-inline-toast.show { opacity:1; transform:translate(-50%, -50%) scale(1); }
.anima-inline-toast-success { border-color:#2f5b45; background:rgba(11, 31, 22, 0.9); color:#c9f8d8; }
.anima-inline-toast-error { border-color:#6a2d3b; background:rgba(45, 18, 28, 0.92); color:#ffd4de; }
.anima-upload-modal {
    position:absolute;
    inset:0;
    z-index:30;
    display:flex;
    align-items:center;
    justify-content:center;
    padding:18px;
    background:rgba(5, 8, 14, 0.78);
    backdrop-filter:blur(8px);
}
.anima-upload-modal.hidden { display:none; }
.anima-upload-panel {
    width:min(940px, 100%);
    max-height:100%;
    display:flex;
    flex-direction:column;
    border-radius:14px;
    border:1px solid #26314c;
    background:linear-gradient(180deg, #0f1422 0%, #090d17 100%);
    box-shadow:0 28px 70px rgba(0,0,0,.42);
    overflow:hidden;
}
.anima-upload-header {
    display:flex;
    align-items:flex-start;
    justify-content:space-between;
    gap:14px;
    padding:16px 18px 14px;
    border-bottom:1px solid #192235;
}
.anima-upload-copy { display:flex; flex-direction:column; gap:5px; }
.anima-upload-copy strong {
    font-size:14px;
    color:#edf2ff;
    letter-spacing:.01em;
}
.anima-upload-copy span {
    max-width:560px;
    font-size:11px;
    line-height:1.5;
    color:#9fb0d6;
}
.anima-upload-tools { display:flex; align-items:center; gap:8px; }
.anima-upload-options {
    display:grid;
    grid-template-columns:repeat(2, minmax(0, 1fr));
    gap:10px;
    padding:0 18px 14px;
    border-bottom:1px solid #192235;
}
.anima-upload-option {
    display:grid;
    grid-template-columns:auto 1fr;
    grid-template-rows:auto auto;
    column-gap:10px;
    row-gap:2px;
    align-items:center;
    padding:10px 12px;
    border:1px solid #24304a;
    border-radius:10px;
    background:#10182b;
    cursor:pointer;
}
.anima-upload-option:hover {
    border-color:#3d5385;
    background:#14203a;
}
.anima-upload-option input {
    grid-row:1 / span 2;
    width:14px;
    height:14px;
    accent-color:#79a0ff;
}
.anima-upload-option-title {
    font-size:11px;
    font-weight:600;
    color:#eef4ff;
}
.anima-upload-option small {
    color:#9cafda;
    font-size:10px;
    line-height:1.4;
}
.anima-upload-body {
    padding:16px 18px 18px;
    overflow:auto;
    min-height:260px;
    max-height:min(72vh, 720px);
}
.anima-upload-grid {
    display:grid;
    grid-template-columns:repeat(auto-fill, minmax(190px, 1fr));
    gap:12px;
}
.anima-upload-empty {
    min-height:260px;
    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:center;
    gap:10px;
    text-align:center;
    color:#90a0c8;
}
.anima-upload-empty strong {
    font-size:13px;
    color:#e3ebff;
}
.anima-upload-empty span {
    max-width:460px;
    font-size:11px;
    line-height:1.5;
    color:#90a0c8;
}
.anima-upload-empty-loading strong,
.anima-upload-empty-loading span { color:#a8b8db; }
.anima-upload-card {
    display:flex;
    flex-direction:column;
    background:#0d1220;
    border:1px solid #1f2940;
    border-radius:12px;
    overflow:hidden;
    box-shadow:0 10px 28px rgba(0,0,0,.24);
    transition:transform .14s ease, border-color .14s ease, box-shadow .14s ease;
}
.anima-upload-card:hover {
    transform:translateY(-2px);
    border-color:#3e5384;
    box-shadow:0 16px 34px rgba(0,0,0,.32);
}
.anima-upload-thumb {
    position:relative;
    aspect-ratio:1.08;
    background:#080b13;
    overflow:hidden;
}
.anima-upload-thumb img {
    width:100%;
    height:100%;
    object-fit:cover;
    display:block;
}
.anima-upload-thumb.no-img {
    display:flex;
    align-items:center;
    justify-content:center;
}
.anima-upload-thumb.no-img::after {
    content:attr(data-init);
    font-family:'JetBrains Mono',monospace;
    font-size:28px;
    color:#2c3550;
}
.anima-upload-badge {
    position:absolute;
    left:10px;
    top:10px;
    max-width:calc(100% - 20px);
    padding:5px 8px;
    border-radius:999px;
    background:rgba(9, 14, 24, 0.84);
    border:1px solid #31466f;
    color:#dfeaff;
    font-size:10px;
    font-family:'JetBrains Mono',monospace;
    white-space:nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
    backdrop-filter:blur(8px);
}
.anima-upload-meta {
    display:flex;
    flex-direction:column;
    gap:8px;
    padding:11px;
}
.anima-upload-row {
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:10px;
}
.anima-upload-artist {
    font-family:'JetBrains Mono',monospace;
    font-size:10px;
    color:#d9e5ff;
    white-space:nowrap;
    overflow:hidden;
    text-overflow:ellipsis;
}
.anima-upload-time {
    font-family:'JetBrains Mono',monospace;
    font-size:9px;
    color:#7586af;
    white-space:nowrap;
}
.anima-upload-prompt {
    min-height:46px;
    margin:0;
    color:#9fb0d6;
    font-size:10px;
    line-height:1.45;
    display:-webkit-box;
    -webkit-line-clamp:3;
    -webkit-box-orient:vertical;
    overflow:hidden;
}
.anima-upload-action {
    width:100%;
    min-height:30px;
    border-radius:8px;
    border:1px solid #385083;
    background:#17213a;
    color:#d8e5ff;
    font-size:10.5px;
    font-weight:600;
    cursor:pointer;
    transition:all .14s ease;
}
.anima-upload-action:hover {
    background:#203055;
    border-color:#5775bf;
    color:#ffffff;
}
.anima-upload-action:disabled {
    opacity:.65;
    cursor:wait;
}
`;

s.textContent += `
.anima-key-modal {
    position:absolute;
    inset:0;
    z-index:31;
    display:flex;
    align-items:center;
    justify-content:center;
    padding:18px;
    background:rgba(5, 8, 14, 0.78);
    backdrop-filter:blur(8px);
}
.anima-key-modal.hidden { display:none; }
.anima-key-panel {
    width:min(640px, 100%);
    border-radius:14px;
    border:1px solid #26314c;
    background:linear-gradient(180deg, #0f1422 0%, #090d17 100%);
    box-shadow:0 28px 70px rgba(0,0,0,.42);
    overflow:hidden;
}
.anima-key-header {
    display:flex;
    align-items:flex-start;
    justify-content:space-between;
    gap:14px;
    padding:16px 18px 14px;
    border-bottom:1px solid #192235;
}
.anima-key-copy { display:flex; flex-direction:column; gap:5px; }
.anima-key-copy strong {
    font-size:14px;
    color:#edf2ff;
    letter-spacing:.01em;
}
.anima-key-copy span {
    font-size:11px;
    line-height:1.55;
    color:#9fb0d6;
    max-width:520px;
}
.anima-key-body {
    padding:16px 18px 8px;
    display:flex;
    flex-direction:column;
    gap:12px;
}
.anima-key-link {
    display:inline-flex;
    align-self:flex-start;
    min-height:28px;
    padding:6px 10px;
    border-radius:8px;
    border:1px solid #385083;
    background:#17213a;
    color:#d8e5ff;
    text-decoration:none;
    font-size:10.5px;
    font-weight:600;
}
.anima-key-link:hover {
    background:#203055;
    border-color:#5775bf;
    color:#ffffff;
}
.anima-key-field {
    display:flex;
    flex-direction:column;
    gap:6px;
}
.anima-key-field span {
    color:#dce6ff;
    font-size:11px;
    font-weight:600;
}
.anima-key-field textarea {
    width:100%;
    resize:vertical;
    min-height:84px;
    padding:12px 14px;
    border-radius:12px;
    border:1px solid #24304a;
    background:#0b1120;
    color:#e8efff;
    font-family:'JetBrains Mono',monospace;
    font-size:11px;
    line-height:1.5;
    box-sizing:border-box;
}
.anima-key-hint {
    margin:0;
    color:#8ea1cf;
    font-size:10.5px;
    line-height:1.5;
}
.anima-key-actions {
    display:flex;
    justify-content:flex-end;
    padding:0 18px 18px;
}
`;
    document.head.appendChild(s);
}
