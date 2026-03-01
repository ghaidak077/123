/**
 * app.js — Ghaidak Alosh Portfolio
 *
 * KEY ARCHITECTURE NOTES:
 * ────────────────────────────────────────────────────────────────
 * STARTUP GLITCH FIX:
 *   Old code wrapped everything in window.addEventListener('load'),
 *   which fires AFTER all images (heavy .avif files) finish loading.
 *   On slow connections = hero invisible for 3–10+ seconds.
 *
 *   New flow:
 *   1. DOM parse → defer scripts execute immediately
 *   2. Hero elements use CSS @keyframes (no JS dependency)
 *   3. Only scroll-triggered animations wait for window.load
 *   4. Off-screen .reveal-up elements hidden via JS class,
 *      not baked into CSS — so they're visible if JS is slow
 *
 * MOBILE PERFORMANCE:
 *   - No Lenis on mobile (scroll momentum handled by OS)
 *   - No cursor on mobile
 *   - IntersectionObserver replaces GSAP ScrollTrigger on mobile
 *   - GSAP ScrollTrigger only on desktop
 *   - Passive scroll listeners everywhere
 *   - requestIdleCallback for non-critical initialization
 * ────────────────────────────────────────────────────────────────
 */

(function () {
    'use strict';

    // ─── Breakpoint detection ──────────────────────────────────
    const MQ_MOBILE  = window.matchMedia('(max-width:1024px)');
    const REDUCED_MO = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
    let isMobile = MQ_MOBILE.matches;
    MQ_MOBILE.addEventListener('change', e => { isMobile = e.matches; });

    // ─── DOM queries (cached once) ────────────────────────────
    const $  = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

    // ═══════════════════════════════════════════════════════════
    // STEP 1: IMMEDIATE HERO REVEAL FIX
    //
    // Hero .reveal-up elements animate via CSS @keyframes (see main.css).
    // We only need to make sure they're NOT marked reveal-ready
    // (which would set opacity:0 and fight the CSS animation).
    // All other .reveal-up elements get reveal-ready → hidden until
    // GSAP / IntersectionObserver brings them in.
    //
    // Runs synchronously on DOM parse — no event listener needed.
    // ═══════════════════════════════════════════════════════════
    const heroSection    = $('#hero');
    const allRevealEls   = $$('.reveal-up');
    const heroRevealEls  = heroSection ? $$('.reveal-up', heroSection) : [];
    const scrollRevealEls = allRevealEls.filter(el => !heroRevealEls.includes(el));

    // Mark non-hero reveal elements as hidden (gated by CSS: html:not(.no-js) .reveal-up.reveal-ready)
    scrollRevealEls.forEach(el => el.classList.add('reveal-ready'));

    // ═══════════════════════════════════════════════════════════
    // STEP 2: SCROLL PROGRESS + NAV + SCROLL-TOP BUTTON
    // These are critical UI — init immediately, no load dependency.
    // ═══════════════════════════════════════════════════════════
    const progressBar  = $('#scrollProgress');
    const navEl        = $('.hud-nav');
    const scrollTopBtn = $('#scrollTop');
    let navScrolled = false, btnVisible = false, rafPending = false;

    const onScroll = () => {
        if (rafPending) return;
        rafPending = true;
        window.requestAnimationFrame(() => {
            const s   = window.scrollY;
            const max = document.documentElement.scrollHeight - document.documentElement.clientHeight;

            if (progressBar) {
                progressBar.style.width = max > 0 ? `${Math.min((s / max) * 100, 100)}%` : '0%';
            }

            const past = s > 60;
            if (past !== navScrolled) {
                navScrolled = past;
                navEl?.classList.toggle('scrolled', past);
            }

            const fold = s > 600;
            if (fold !== btnVisible) {
                btnVisible = fold;
                scrollTopBtn?.classList.toggle('visible', fold);
            }

            rafPending = false;
        });
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    // ═══════════════════════════════════════════════════════════
    // STEP 3: MOBILE MENU
    // Fast — no GSAP, no heavy dependencies.
    // ═══════════════════════════════════════════════════════════
    const menuBtn = $('#menuBtn');
    const overlay = $('#mobileOverlay');

    menuBtn?.addEventListener('click', () => {
        const open = overlay.classList.toggle('active');
        menuBtn.textContent = open ? 'CLOSE' : 'MENU';
        menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        document.body.style.overflow = open ? 'hidden' : '';
    });

    // Close overlay on nav link click (mobile)
    overlay?.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', () => {
            overlay.classList.remove('active');
            if (menuBtn) menuBtn.textContent = 'MENU';
            menuBtn?.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
        });
    });

    // ═══════════════════════════════════════════════════════════
    // STEP 4: BRIEF MODAL
    // ═══════════════════════════════════════════════════════════
    const briefModal = $('#briefModal');
    const closeBrief = $('#closeBrief');
    const briefForm  = $('#briefForm');
    let formDirty    = false;
    let isSubmitting = false;
    let lenisRef     = null; // will be set after window.load

    briefForm?.querySelectorAll('input, textarea, select').forEach(input => {
        input.addEventListener('input', () => { formDirty = true; });
    });

    const openModal = (e) => {
        e.preventDefault();
        if (!briefModal) return;
        briefModal.classList.add('active');
        briefModal.removeAttribute('aria-hidden');
        lenisRef?.stop();
        document.body.style.overflow = 'hidden';
        // Close mobile overlay if open
        overlay?.classList.remove('active');
        if (menuBtn) { menuBtn.textContent = 'MENU'; menuBtn.setAttribute('aria-expanded', 'false'); }
    };

    const closeModal = (e, force = false) => {
        if (e) e.preventDefault();
        if (formDirty && !force) {
            if (!window.confirm('You have unsaved details. Are you sure you want to close this?')) return;
        }
        briefModal?.classList.remove('active');
        briefModal?.setAttribute('aria-hidden', 'true');
        lenisRef?.start();
        document.body.style.overflow = '';
        if (force) { briefForm?.reset(); formDirty = false; }
    };

    $$('.open-brief').forEach(btn => btn.addEventListener('click', openModal));
    closeBrief?.addEventListener('click', e => closeModal(e));

    // Click outside → shake glass (don't close)
    briefModal?.addEventListener('click', e => {
        if (e.target !== briefModal) return;
        const glass = $('.brief-glass');
        if (!glass) return;
        glass.style.transform = 'translateY(0) scale(1.018)';
        setTimeout(() => { glass.style.transform = ''; }, 150);
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && briefModal?.classList.contains('active')) closeModal(null);
    });

    // ─── Form submission ──────────────────────────────────────
    briefForm?.addEventListener('submit', async function (e) {
        e.preventDefault();
        if (isSubmitting) return;
        isSubmitting = true;

        const btn          = this.querySelector('button[type="submit"]');
        const originalHTML = btn.innerHTML;

        const setState = (html, bg, color, pEvents) => {
            btn.innerHTML           = html;
            btn.style.opacity       = pEvents === 'none' ? '0.55' : '1';
            btn.style.background    = bg;
            btn.style.color         = color;
            btn.style.pointerEvents = pEvents;
        };

        setState('<span>SENDING...</span>', 'var(--accent)', '#000', 'none');

        const formData = new FormData(this);
        formData.append('source_url', window.location.href);
        formData.append('timestamp',  new Date().toISOString());

        try {
            const response = await fetch('/api/submit-brief', {
                method:  'POST',
                body:    formData,
                headers: { 'Accept': 'application/json' },
            });

            if (response.ok) {
                setState('<span>BRIEF SECURED</span>', '#4CAF50', '#fff', 'none');
                formDirty = false;
                setTimeout(() => {
                    closeModal(null, true);
                    setState(originalHTML, 'var(--accent)', '#000', 'auto');
                    isSubmitting = false;
                }, 1600);
            } else {
                setState('<span>SUBMISSION FAILED — RETRY</span>', '#b00020', '#fff', 'none');
                setTimeout(() => { setState(originalHTML, 'var(--accent)', '#000', 'auto'); isSubmitting = false; }, 2500);
            }
        } catch {
            setState('<span>CONNECTION ERROR</span>', 'rgba(255,255,255,0.08)', 'var(--ink)', 'none');
            setTimeout(() => { setState(originalHTML, 'var(--accent)', '#000', 'auto'); isSubmitting = false; }, 2500);
        }
    });

    // ─── Budget range quick-select ────────────────────────────
    const budgetInput = $('#brief-budget');
    const budgetRange = $('#brief-budget-range');
    const budgetLabels = {
        starter:    '$500 - $1,500 (Starter Package)',
        growth:     '$1,500 - $3,500 (Growth Package)',
        premium:    '$3,500 - $7,000 (Premium Identity)',
        enterprise: '$7,000+ (Full Brand & Strategy)',
    };
    budgetRange?.addEventListener('change', () => {
        const label = budgetLabels[budgetRange.value];
        if (label && budgetInput) {
            budgetInput.value = label;
            budgetInput.dispatchEvent(new Event('input'));
            setTimeout(() => { budgetRange.selectedIndex = 0; }, 120);
        }
    });

    // ═══════════════════════════════════════════════════════════
    // STEP 5: WINDOW LOAD — heavy libs, scroll animations
    //
    // Everything below this point depends on GSAP/Lenis.
    // We wait for window.load so we don't block render.
    // BUT: the UI is already functional above — no white screen.
    // ═══════════════════════════════════════════════════════════
    window.addEventListener('load', () => {

        // Register GSAP plugin if available
        if (window.gsap && window.ScrollTrigger) {
            gsap.registerPlugin(ScrollTrigger);
        }

        // ── Portfolio section: IntersectionObserver ──────────
        // Works on all devices — no GSAP needed.
        const portItems = $$('.port-item');
        const portBgs   = $$('.port-bg');

        if (portItems.length > 0) {
            const activateIndex = (idx) => {
                portItems.forEach((item, i) => item.classList.toggle('is-active', i === idx));
                portBgs.forEach((bg, i) => bg.classList.toggle('is-active', i === idx));
            };

            const portObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        activateIndex(portItems.indexOf(entry.target));
                    }
                });
            }, { threshold: 0.5 });

            portItems.forEach(item => portObserver.observe(item));
        }

        // ── Smooth scroll / Lenis: DESKTOP ONLY ─────────────
        // Lenis on mobile is counterproductive — it overrides
        // native momentum scrolling which is already optimized by the OS.
        if (!isMobile && typeof Lenis !== 'undefined') {
            try {
                lenisRef = new Lenis({
                    duration:     1.2,
                    easing:       t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
                    smoothTouch:  false,
                });

                if (window.gsap && window.ScrollTrigger) {
                    lenisRef.on('scroll', ScrollTrigger.update);
                    gsap.ticker.add(time => { lenisRef.raf(time * 1000); });
                    gsap.ticker.lagSmoothing(0, 0);
                } else {
                    // Lenis without GSAP ticker: use rAF loop
                    const raf = time => { lenisRef.raf(time); requestAnimationFrame(raf); };
                    requestAnimationFrame(raf);
                }

                scrollTopBtn?.addEventListener('click', () => lenisRef.scrollTo(0, { duration: 1.4 }));

                // Anchor link smooth scroll via Lenis
                $$('a[href^="#"]').forEach(a => {
                    a.addEventListener('click', function (e) {
                        const id = this.getAttribute('href');
                        if (id === '#' || id.includes('brief')) return;
                        const tgt = document.querySelector(id);
                        if (tgt) {
                            e.preventDefault();
                            lenisRef.scrollTo(tgt, { offset: -80, duration: 1.5 });
                        }
                    });
                });

                // Re-expose so openModal/closeModal can access updated ref
                // (already closure-captured via lenisRef variable)

            } catch (err) {
                lenisRef = null;
            }
        }

        // Fallback scroll-to-top (no Lenis)
        if (!lenisRef) {
            scrollTopBtn?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

            $$('a[href^="#"]').forEach(a => {
                a.addEventListener('click', function (e) {
                    const id = this.getAttribute('href');
                    if (id === '#' || id.includes('brief')) return;
                    const tgt = document.querySelector(id);
                    if (tgt) {
                        e.preventDefault();
                        tgt.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                });
            });
        }

        // ── Reveal animations ─────────────────────────────────
        if (REDUCED_MO) {
            // Instant show, no animation for users who prefer it
            scrollRevealEls.forEach(el => {
                el.classList.remove('reveal-ready');
                el.style.opacity   = '1';
                el.style.transform = 'none';
            });
            return; // Skip all motion-based code below
        }

        // MOBILE: Use IntersectionObserver for reveal-up.
        // Cheaper than GSAP ScrollTrigger — no layout thrashing, no rAF tie-in.
        if (isMobile || !window.gsap || !window.ScrollTrigger) {
            const revealObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;
                    const el = entry.target;
                    // CSS transition drives the animation — JS just removes the class
                    el.style.transition = 'opacity 0.75s ease, transform 0.75s ease';
                    el.classList.remove('reveal-ready');
                    el.style.opacity   = '1';
                    el.style.transform = 'none';
                    revealObserver.unobserve(el); // Once seen, done
                });
            }, {
                threshold: 0.08,
                rootMargin: '0px 0px -40px 0px',
            });

            scrollRevealEls.forEach(el => revealObserver.observe(el));
            return; // Done for mobile — skip GSAP block
        }

        // DESKTOP: GSAP ScrollTrigger reveals + portfolio parallax
        // ─────────────────────────────────────────────────────
        scrollRevealEls.forEach(el => {
            gsap.fromTo(el,
                { y: 44, opacity: 0 },
                {
                    y: 0, opacity: 1,
                    duration: 1.1,
                    ease: 'power3.out',
                    scrollTrigger: {
                        trigger:  el,
                        start:    'top 88%',
                        // Mark element after animation — prevents re-triggering
                        onComplete: () => el.classList.remove('reveal-ready'),
                    },
                }
            );
        });

        // Portfolio 3D parallax on desktop only
        portItems.forEach(item => {
            const wrap = item.querySelector('.port-text-wrap');
            if (!wrap) return;

            gsap.fromTo(wrap,
                { z: -40, rotateX: 4 },
                { z: 0, rotateX: 0, ease: 'none',
                  scrollTrigger: { trigger: item, start: 'top bottom', end: 'center center', scrub: 1.2 } }
            );
            gsap.to(wrap, {
                z: -20, rotateX: -3, ease: 'none',
                scrollTrigger: { trigger: item, start: 'center center', end: 'bottom top', scrub: 1.2 },
            });

            const bg = document.getElementById(item.dataset.target);
            if (bg) {
                gsap.set(bg, { scale: 1.08 });
                gsap.fromTo(bg,
                    { yPercent: -6 },
                    { yPercent: 6, ease: 'none',
                      scrollTrigger: { trigger: item, start: 'top bottom', end: 'bottom top', scrub: 1.5 } }
                );
            }
        });

        ScrollTrigger.refresh();

    }); // end window.load

    // ═══════════════════════════════════════════════════════════
    // STEP 6: CUSTOM CURSOR — DESKTOP ONLY, IDLE INIT
    // Non-critical — deferred to idle time so it doesn't block
    // anything that matters for FCP/LCP.
    // ═══════════════════════════════════════════════════════════
    const initCursor = () => {
        if (isMobile || REDUCED_MO) return;

        const dot  = $('#cursorDot');
        const ring = $('#cursorRing');
        if (!window.gsap || !dot || !ring) return;

        document.body.style.cursor = 'none';
        gsap.set([dot, ring], { xPercent: -50, yPercent: -50 });

        const xDot  = gsap.quickTo(dot,  'x', { duration: .08, ease: 'none' });
        const yDot  = gsap.quickTo(dot,  'y', { duration: .08, ease: 'none' });
        const xRing = gsap.quickTo(ring, 'x', { duration: .5,  ease: 'power3.out' });
        const yRing = gsap.quickTo(ring, 'y', { duration: .5,  ease: 'power3.out' });

        window.addEventListener('mousemove', e => {
            xDot(e.clientX);  yDot(e.clientY);
            xRing(e.clientX); yRing(e.clientY);
        }, { passive: true });

        $$('.hover-trigger, a, button, input, select, textarea').forEach(el => {
            el.addEventListener('mouseenter', () => {
                document.body.classList.add('hovering');
                if (!el.matches('input, select, textarea')) el.style.cursor = 'none';
            }, { passive: true });
            el.addEventListener('mouseleave', () => {
                document.body.classList.remove('hovering');
                if (!el.matches('input, select, textarea')) el.style.cursor = '';
            }, { passive: true });
        });
    };

    // Use requestIdleCallback if available, otherwise setTimeout
    if ('requestIdleCallback' in window) {
        // Wait for window.load first, then idle init
        window.addEventListener('load', () => {
            requestIdleCallback(initCursor, { timeout: 2000 });
        });
    } else {
        window.addEventListener('load', () => {
            setTimeout(initCursor, 200);
        });
    }

})();
