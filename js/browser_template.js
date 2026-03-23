export function getBrowserTemplate(siteBase) {
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
                        <div class="hdr-toggle-wrap" title="Show remote preview images from the internet">
                            <span class="hdr-toggle-label">Remote Images</span>
                            <label class="hdr-switch">
                                <input type="checkbox" id="anima-online-toggle"/>
                                <span class="hdr-slider"></span>
                            </label>
                        </div>
                        <div class="hdr-settings-wrap" title="Tools">
                            <button class="hdr-btn" id="anima-settings-gear" aria-label="Tools">&#9881;</button>
                            <div class="hdr-settings-menu">
                                <button class="hdr-btn-txt hdr-settings-item" id="anima-update-styles">Update Styles</button>
                                <button class="hdr-btn-txt hdr-settings-item" id="anima-dl-images">Download Previews</button>
                            </div>
                        </div>
                        <button class="hdr-btn" id="anima-refresh" title="Refresh View">&#8635;</button>
                    </div>
                    <button class="hdr-close" title="Close" style="margin-left:8px">&#10005;</button>
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
                    <span class="ftr-count">Local style browser workflow</span>
                    <div class="ftr-gap"></div>
                    <a class="ftr-link" href="${siteBase}" target="_blank" rel="noopener">thetacursed.github.io/Anima-Style-Explorer -&gt;</a>
                </div>
            </div>
    `;
}
