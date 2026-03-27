export function getBrowserTemplate() {
    return `
            <div class="backdrop"></div>
            <div class="window">
                <div class="hdr">
                    <span class="hdr-title" style="margin-right:4px">Anima Artist Browser</span>
                    <button class="hdr-btn-txt" id="anima-cat-all" style="margin-left:8px; opacity:1;">All Styles</button>
                    <button class="hdr-btn-txt" id="anima-cat-favorites" style="opacity:0.5;">Favorites</button>
                    <select class="hdr-select" style="margin-left:8px">
                        <option value="works">Popularity</option>
                        <option value="uniqueness">Uniqueness</option>
                        <option value="name">A - Z</option>
                    </select>
                    <div class="hdr-gap"></div>
                    <div class="hdr-data-btns">
                        <span class="hdr-sync-warning" title="Local snapshot download size estimate">Approx. 750 MB download</span>
                        <button class="hdr-sync-btn" id="anima-sync-local" title="Download artist data and preview images into this custom node folder">Sync Local Snapshot</button>
                        <button class="hdr-btn" id="anima-refresh" title="Refresh View">&#8635;</button>
                    </div>
                    <button class="hdr-close" title="Close" style="margin-left:8px">&#10005;</button>
                </div>
                <div class="sync-strip" id="anima-sync-strip" data-state="idle">
                    <div class="sync-strip-copy">
                        <span class="sync-strip-label">Local Snapshot</span>
                        <span class="sync-strip-status" id="anima-sync-status">Normal browsing uses local files only. Run sync to refresh the snapshot.</span>
                    </div>
                    <div class="sync-strip-progress" aria-hidden="true">
                        <div class="sync-strip-progress-bar" id="anima-sync-progress-bar" style="width:0%"></div>
                    </div>
                    <span class="sync-strip-count" id="anima-sync-progress-text">Idle</span>
                </div>
                <div class="cycle-bar">
                    <span class="cycle-label">Queue Mode</span>
                    <button class="anima-play-btn" id="anima-cycle-btn">
                        <span class="btn-icon">&#9654;</span>
                        <span class="btn-lbl">Play</span>
                    </button>
                    <span class="anima-cycle-status" id="anima-cycle-status">stopped</span>
                    <button class="anima-swipe-btn" id="anima-swipe-btn" title="Swipe through styles one by one">Swipe Mode</button>
                    <div class="cycle-search">
                        <i>@</i>
                        <input type="text" placeholder="Search artists..." autocomplete="off" spellcheck="false"/>
                    </div>
                    <div class="cycle-gap"></div>
                    <span class="cycle-hint">Play uses the node's After Queue and Auto Queue settings for the active slot</span>
                </div>
                <div class="slot-bar" id="anima-slot-bar">
                    <div class="slot-bar-copy">
                        <span class="slot-bar-label">Target Slots</span>
                        <span class="slot-bar-hint" id="anima-slot-hint">Open from a node to target slots directly</span>
                    </div>
                    <div class="slot-bar-slots" id="anima-slot-list">
                        <button class="slot-chip" data-slot-index="0" type="button">
                            <span class="slot-chip-id">S1</span>
                            <span class="slot-chip-tag">(empty)</span>
                        </button>
                        <button class="slot-chip" data-slot-index="1" type="button">
                            <span class="slot-chip-id">S2</span>
                            <span class="slot-chip-tag">(empty)</span>
                        </button>
                        <button class="slot-chip" data-slot-index="2" type="button">
                            <span class="slot-chip-id">S3</span>
                            <span class="slot-chip-tag">(empty)</span>
                        </button>
                    </div>
                </div>
                <div class="body">
                    <div class="anima-grid" id="anima-grid">
                        <div class="anima-empty"><div class="anima-spinner"></div><span>Loading styles...</span></div>
                    </div>
                </div>
                <div class="ftr">
                    <span class="ftr-count" id="anima-count"></span>
                    <span class="ftr-count"> | </span>
                    <span class="ftr-count">Local snapshot only during normal use</span>
                    <div class="ftr-gap"></div>
                    <span class="ftr-count">Remote sync is manual and local-only</span>
                </div>
            </div>
    `;
}
