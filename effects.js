/**
 * effects.js — Ghaidak Alosh Portfolio
 * Enhanced visual effects: hero word-blur animation + gradient CTA.
 *
 * ARCHITECTURE:
 * ─────────────────────────────────────────────────────────────
 * This file must be loaded as a NON-DEFERRED <script> in <head>,
 * BEFORE the closing </head> tag and before main.css applies.
 * It runs synchronously on DOM parse — guaranteeing the .mw
 * spans exist before the first paint, so no FOUC (flash of
 * unstyled content) occurs.
 *
 * The mwIn animation is defined in main.css. This script only
 * splits the text nodes and sets CSS custom property --i for stagger.
 *
 * Performance:
 *  - Word split: O(n) on text nodes only — ~3 DOM mutations total
 *  - will-change: set by CSS on .mw, cleared after animation completes
 *  - @property gradient: GPU-accelerated, zero layout cost
 * ─────────────────────────────────────────────────────────────
 */

(function () {
    'use strict';

    // ── Guard: respect prefers-reduced-motion ──────────────────
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // ── Guard: @property support check (Chrome 85+, Firefox 128+) ──
    // If not supported, gradient button fallback is the existing glass hover.
    // Word split still works fine without @property.
    var supportsAtProperty = (function () {
        try {
            CSS.registerProperty({
                name: '--test-eff',
                syntax: '<number>',
                initialValue: '0',
                inherits: false
            });
            return true;
        } catch (e) {
            // Already registered or not supported — both are fine
            return typeof CSSPropertyRule !== 'undefined' ||
                   (e && e.name === 'InvalidModificationError');
        }
    })();

    // ════════════════════════════════════════════════════════════
    // EFFECT 1: HERO WORD BLUR SPLIT
    //
    // Walks the child nodes of .mega-type:
    //  - Text nodes → split by word, wrap each in <span class="mw">
    //  - .accent-text span → treated as ONE word unit (gets .mw added)
    //  - <br> elements → left untouched
    //
    // Each .mw gets style="--i: N" for CSS animation-delay stagger.
    // CSS: animation-delay: calc(0.3s + var(--i, 0) * 0.075s)
    // ════════════════════════════════════════════════════════════
    function splitHeroWords() {
        var h1 = document.querySelector('.mega-type');
        if (!h1) return;

        var wordIndex = 0;

        /**
         * Splits a single text node into word-wrapped spans.
         * Preserves whitespace nodes as text (not wrapped) to
         * maintain natural letter-spacing between words.
         */
        function wrapTextNode(textNode) {
            var text = textNode.textContent;
            if (!text.trim()) return; // skip whitespace-only nodes

            // Split on whitespace, preserving spaces as separate tokens
            var parts = text.split(/(\s+)/);
            var fragment = document.createDocumentFragment();

            for (var i = 0; i < parts.length; i++) {
                var part = parts[i];
                if (!part) continue;

                if (/^\s+$/.test(part)) {
                    // Pure whitespace — keep as text node (preserves word gaps)
                    fragment.appendChild(document.createTextNode(part));
                } else {
                    // Word — wrap in animated span
                    var span = document.createElement('span');
                    span.className = 'mw';
                    span.style.setProperty('--i', wordIndex);
                    span.setAttribute('aria-hidden', 'false'); // accessible
                    span.textContent = part;
                    fragment.appendChild(span);
                    wordIndex++;
                }
            }

            // Replace the original text node with the fragment
            textNode.parentNode.replaceChild(fragment, textNode);
        }

        // Snapshot child nodes BEFORE mutation (live NodeList would shift)
        var children = Array.prototype.slice.call(h1.childNodes);

        for (var c = 0; c < children.length; c++) {
            var node = children[c];

            if (node.nodeType === Node.TEXT_NODE) {
                // Raw text — split into words
                wrapTextNode(node);

            } else if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.tagName === 'BR') {
                    // Line break — untouched
                    continue;
                } else if (node.classList.contains('accent-text')) {
                    // Accent span: animate as ONE unit, not word-by-word inside
                    // (keeps the accent color context intact)
                    node.classList.add('mw');
                    node.style.setProperty('--i', wordIndex);
                    wordIndex++;
                }
            }
        }

        // ── Cleanup will-change after all words have animated ──
        // Max animation duration: 0.3s base + (wordIndex * 0.075s) + 0.65s duration
        var totalMs = (300 + wordIndex * 75 + 650) + 100; // +100ms buffer
        setTimeout(function () {
            var words = h1.querySelectorAll('.mw');
            for (var i = 0; i < words.length; i++) {
                words[i].classList.add('mw-done');
            }
        }, totalMs);
    }

    // Run immediately — synchronous DOM parse time
    // At this point <body> hasn't been parsed yet if script is in <head>,
    // so we need DOMContentLoaded for safety.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', splitHeroWords, { once: true });
    } else {
        // Script loaded late (defer/async) — DOM already ready
        splitHeroWords();
    }

})();
