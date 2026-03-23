import { escapeHtml } from "./browser_helpers.js";

export function createStyleCard({
    artist,
    imageUrl,
    isUniq = false,
    isFav = false,
    onApply,
    onApplyToSlot,
    onToggleFavorite,
    onOpenSwipe,
}) {
    const card = document.createElement("div");
    card.className = "anima-card";
    card.dataset.tag = artist.tag;

    const rankHtml = isUniq && artist.uniquenessRank
        ? `<div class="anima-uniqueness-rank" title="Uniqueness score: ${Number(artist.uniqueness_score || 0).toFixed(2)}">#${artist.uniquenessRank}</div>`
        : "";

    card.innerHTML = `
        <div class="anima-card-img" data-init="${escapeHtml((artist.tag?.[0] || "?").toUpperCase())}">
            <img loading="lazy" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(artist.tag || "")}" onerror="this.style.display='none';this.parentElement.classList.add('no-img')"/>
            ${rankHtml}
            <div class="anima-card-overlay">
                <button class="anima-card-pick">Apply</button>
                <button class="anima-card-fav">${isFav ? "Unfavorite" : "Favorite"}</button>
            </div>
            <div class="anima-card-slot-actions">
                <button class="anima-card-slot-btn" data-slot-index="0">S1</button>
                <button class="anima-card-slot-btn" data-slot-index="1">S2</button>
                <button class="anima-card-slot-btn" data-slot-index="2">S3</button>
            </div>
        </div>
        <div class="anima-card-meta">
            <span class="anima-card-tag" title="@${escapeHtml(String(artist.tag || "").replace(/_/g, " "))}">@${escapeHtml(String(artist.tag || "").replace(/_/g, " "))}</span>
            ${(!isUniq && artist.works) ? `<span class="anima-card-works">${Number(artist.works).toLocaleString()} works</span>` : ""}
        </div>
    `;

    const mediaEl = card.querySelector(".anima-card-img");

    card.addEventListener("mouseenter", () => {
        const img = card.querySelector("img");
        if (img && (!img.complete || img.naturalWidth === 0)) {
            img.src = imageUrl + (imageUrl.includes("?") ? "&" : "?") + "t=" + Date.now();
        }
    }, { once: true });

    card.addEventListener("mousedown", (e) => {
        if (e.button !== 1) return;
        e.preventDefault();
        e.stopPropagation();
        onOpenSwipe?.(artist);
    });

    const pick = () => onApply?.(artist, mediaEl || card);
    card.querySelector(".anima-card-pick").addEventListener("click", (e) => {
        e.stopPropagation();
        pick();
    });

    card.querySelectorAll(".anima-card-slot-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const slotIndex = Number(btn.dataset.slotIndex);
            onApplyToSlot?.(artist, slotIndex, mediaEl || btn);
        });
    });

    const favBtn = card.querySelector(".anima-card-fav");
    favBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const res = await onToggleFavorite?.(artist, favBtn, mediaEl || favBtn);
        if (res?.ok && typeof res.favorited === "boolean") {
            favBtn.textContent = res.favorited ? "Unfavorite" : "Favorite";
        }
    });

    card.addEventListener("click", pick);
    return card;
}
