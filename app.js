document.addEventListener('DOMContentLoaded', () => {
    const mq     = window.matchMedia("(max-width:1024px)");
    const noMo   = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
    let isMobile = mq.matches;
    mq.addEventListener('change', e => { isMobile = e.matches; });

    // ── Hard fallback: force-reveal everything after 2.5s if animations never fire
    const revealFallback = setTimeout(() => {
        document.querySelectorAll('.reveal-up').forEach(el => {
            el.style.opacity = '1';
            el.style.transform = 'none';
        });
    }, 2500);

    if (window.gsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

    // ── Scroll progress bar
    const progressBar  = document.getElementById('scrollProgress');
    const navEl        = document.querySelector('.hud-nav');
    const scrollTopBtn = document.getElementById('scrollTop');
    let navScrolled = false, btnVisible = false, ticking = false;

    const onScroll = () => {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(() => {
            const s   = window.scrollY;
            const max = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            if (progressBar) progressBar.style.width = `${(s / max) * 100}%`;

            const past = s > 60;
            if (past !== navScrolled) { navScrolled = past; navEl?.classList.toggle('scrolled', past); }

            const fold = s > 600;
            if (fold !== btnVisible) { btnVisible = fold; scrollTopBtn?.classList.toggle('visible', fold); }

            ticking = false;
        });
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    // ── Custom cursor (desktop only)
    const dot  = document.getElementById('cursorDot');
    const ring = document.getElementById('cursorRing');

    if (!isMobile && !noMo && window.gsap && dot && ring) {
        document.body.style.cursor = 'none';
        
        gsap.set([dot, ring], { xPercent: -50, yPercent: -50 });
        const xDot  = gsap.quickTo(dot,  'x', { duration: .08, ease: 'none' });
        const yDot  = gsap.quickTo(dot,  'y', { duration: .08, ease: 'none' });
        const xRing = gsap.quickTo(ring, 'x', { duration: .5,  ease: 'power3.out' });
        const yRing = gsap.quickTo(ring, 'y', { duration: .5,  ease: 'power3.out' });

        window.addEventListener('mousemove', e => {
            xDot(e.clientX);  yDot(e.clientY);
            xRing(e.clientX); yRing(e.clientY);
        });
        
        document.querySelectorAll('.hover-trigger, a, button').forEach(el => {
            el.addEventListener('mouseenter', () => {
                document.body.classList.add('hovering');
                el.style.cursor = 'none'; 
            });
            el.addEventListener('mouseleave', () => {
                document.body.classList.remove('hovering');
                el.style.cursor = '';
            });
        });
    }

    // ── Lenis smooth scroll
    const menuBtn = document.getElementById('menuBtn');
    const overlay = document.getElementById('mobileOverlay');
    let lenisRef  = null;

    if (typeof Lenis !== 'undefined' && !isMobile) {
        try {
            lenisRef = new Lenis({
                duration   : 1.25,
                easing     : t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
                smoothTouch: false,
            });

            const raf = t => { lenisRef.raf(t); requestAnimationFrame(raf); };
            requestAnimationFrame(raf);

            scrollTopBtn?.addEventListener('click', () => lenisRef.scrollTo(0, { duration: 1.4 }));

            document.querySelectorAll('a[href^="#"]').forEach(a => {
                a.addEventListener('click', function(e) {
                    const id  = this.getAttribute('href');
                    if (id === '#') return;
                    const tgt = document.querySelector(id);
                    if (tgt) { e.preventDefault(); lenisRef.scrollTo(tgt, { offset: -80, duration: 1.5 }); }
                });
            });
        } catch(err) {
            console.warn('[Lenis] Init failed:', err);
            lenisRef = null;
        }
    }

    if (!lenisRef) {
        scrollTopBtn?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
        document.querySelectorAll('a[href^="#"]').forEach(a => {
            a.addEventListener('click', function(e) {
                const id  = this.getAttribute('href');
                if (id === '#') return;
                const tgt = document.querySelector(id);
                if (tgt) { e.preventDefault(); tgt.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
            });
        });
    }

    // ── Mobile menu
    menuBtn?.addEventListener('click', () => {
        const open = overlay.classList.toggle('active');
        menuBtn.textContent = open ? 'CLOSE' : 'MENU';
        if (lenisRef) { open ? lenisRef.stop() : lenisRef.start(); }
        else          { document.body.style.overflow = open ? 'hidden' : ''; }
    });
    overlay?.querySelectorAll('.mobile-link').forEach(l => {
        l.addEventListener('click', () => {
            overlay.classList.remove('active');
            menuBtn.textContent = 'MENU';
            if (lenisRef) lenisRef.start();
            else          document.body.style.overflow = '';
        });
    });

    // ── Portfolio background switcher
    const portItems = document.querySelectorAll('.port-item');
    const portBgs   = document.querySelectorAll('.port-bg');

    if (portItems.length > 0) {
        let activeIndex = -1;

        const activateIndex = (idx) => {
            if (idx === activeIndex) return;
            activeIndex = idx;
            portItems.forEach((item, i) => item.classList.toggle('is-active', i === idx));
            portBgs.forEach((bg, i)     => bg.classList.toggle('is-active',   i === idx));
        };

        const updatePortfolio = () => {
            const mid = window.innerHeight / 2;
            let bestIdx  = 0;
            let bestDist = Infinity;
            portItems.forEach((item, i) => {
                const rect    = item.getBoundingClientRect();
                const itemMid = rect.top + rect.height / 2;
                const dist    = Math.abs(itemMid - mid);
                if (dist < bestDist) { bestDist = dist; bestIdx = i; }
            });
            activateIndex(bestIdx);
        };

        activateIndex(0);

        window.addEventListener('scroll', updatePortfolio, { passive: true });
        window.addEventListener('resize', updatePortfolio, { passive: true });
    }

    // ── GSAP animations
    if (!window.gsap || !window.ScrollTrigger) {
        clearTimeout(revealFallback);
        document.querySelectorAll('.reveal-up').forEach(el => {
            el.style.opacity = '1'; el.style.transform = 'none';
        });
        return;
    }

    if (!noMo) {
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
                scrollTrigger: { trigger: item, start: 'center center', end: 'bottom top', scrub: 1.2 }
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

        gsap.utils.toArray('.reveal-up').forEach(el => {
            gsap.fromTo(el,
                { y: 44, opacity: 0 },
                { y: 0, opacity: 1, duration: 1.15, ease: 'power3.out',
                  scrollTrigger: { trigger: el, start: 'top 87%' },
                  onComplete: () => clearTimeout(revealFallback) }
            );
        });

        gsap.utils.toArray('.process-item').forEach((el, i) => {
            gsap.fromTo(el,
                { y: 50, opacity: 0 },
                { y: 0, opacity: 1, duration: 1, ease: 'power3.out', delay: i * .08,
                  scrollTrigger: { trigger: el, start: 'top 88%' } }
            );
        });

        gsap.utils.toArray('.cap-card').forEach((el, i) => {
            gsap.fromTo(el,
                { y: 35, opacity: 0 },
                { y: 0, opacity: 1, duration: .9, ease: 'power3.out', delay: i * .07,
                  scrollTrigger: { trigger: el, start: 'top 90%' } }
            );
        });

        ScrollTrigger.refresh();

    } else {
        clearTimeout(revealFallback);
        document.querySelectorAll('.reveal-up').forEach(el => {
            el.style.opacity = '1'; el.style.transform = 'none';
        });
    }
});
