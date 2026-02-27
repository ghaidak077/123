window.addEventListener('load', () => {

    const mq     = window.matchMedia('(max-width:1024px)');
    const noMo   = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
    let isMobile = mq.matches;
    mq.addEventListener('change', e => { isMobile = e.matches; });

    const revealFallback = setTimeout(() => {
        document.querySelectorAll('.reveal-up').forEach(el => {
            el.style.opacity = '1';
            el.style.transform = 'none';
        });
    }, 500);

    if (window.gsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

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
            if (progressBar) progressBar.style.width = `${Math.min((s / max) * 100, 100)}%`;

            const past = s > 60;
            if (past !== navScrolled) { navScrolled = past; navEl?.classList.toggle('scrolled', past); }

            const fold = s > 600;
            if (fold !== btnVisible) { btnVisible = fold; scrollTopBtn?.classList.toggle('visible', fold); }

            ticking = false;
        });
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    const dot  = document.getElementById('cursorDot');
    const ring = document.getElementById('cursorRing');

    if (!isMobile && !noMo && window.gsap && dot && ring) {
        document.body.style.cursor = 'none';
        gsap.set([dot, ring], { xPercent:-50, yPercent:-50 });
        const xDot  = gsap.quickTo(dot,  'x', { duration:.08, ease:'none' });
        const yDot  = gsap.quickTo(dot,  'y', { duration:.08, ease:'none' });
        const xRing = gsap.quickTo(ring, 'x', { duration:.5,  ease:'power3.out' });
        const yRing = gsap.quickTo(ring, 'y', { duration:.5,  ease:'power3.out' });

        window.addEventListener('mousemove', e => {
            xDot(e.clientX);  yDot(e.clientY);
            xRing(e.clientX); yRing(e.clientY);
        });

        document.querySelectorAll('.hover-trigger, a, button, input, select, textarea').forEach(el => {
            el.addEventListener('mouseenter', () => {
                document.body.classList.add('hovering');
                if (!el.matches('input, select, textarea')) el.style.cursor = 'none';
            });
            el.addEventListener('mouseleave', () => {
                document.body.classList.remove('hovering');
                if (!el.matches('input, select, textarea')) el.style.cursor = '';
            });
        });
    }

    const menuBtn = document.getElementById('menuBtn');
    const overlay = document.getElementById('mobileOverlay');
    let lenisRef  = null;

    if (typeof Lenis !== 'undefined' && !isMobile) {
        try {
            lenisRef = new Lenis({
                duration: 1.2,
                easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
                smoothTouch: false,
            });
            
            lenisRef.on('scroll', ScrollTrigger.update);
            gsap.ticker.add((time) => { lenisRef.raf(time * 1000); });
            gsap.ticker.lagSmoothing(0, 0);

            scrollTopBtn?.addEventListener('click', () => lenisRef.scrollTo(0, { duration:1.4 }));

            document.querySelectorAll('a[href^="#"]').forEach(a => {
                a.addEventListener('click', function(e) {
                    const id = this.getAttribute('href');
                    if (id === '#' || id.includes('brief')) return;
                    const tgt = document.querySelector(id);
                    if (tgt) { e.preventDefault(); lenisRef.scrollTo(tgt, { offset:-80, duration:1.5 }); }
                });
            });
        } catch (err) {
            lenisRef = null;
        }
    }

    if (!lenisRef) {
        scrollTopBtn?.addEventListener('click', () => window.scrollTo({ top:0, behavior:'smooth' }));
        document.querySelectorAll('a[href^="#"]').forEach(a => {
            a.addEventListener('click', function(e) {
                const id = this.getAttribute('href');
                if (id === '#' || id.includes('brief')) return;
                const tgt = document.querySelector(id);
                if (tgt) {
                    e.preventDefault();
                    tgt.scrollIntoView({ behavior:'smooth', block:'start' });
                    overlay.classList.remove('active');
                    if (menuBtn) menuBtn.textContent = 'MENU';
                    document.body.style.overflow = '';
                }
            });
        });
    }

    menuBtn?.addEventListener('click', () => {
        const open = overlay.classList.toggle('active');
        menuBtn.textContent = open ? 'CLOSE' : 'MENU';
        menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (lenisRef) { open ? lenisRef.stop() : lenisRef.start(); }
        else          { document.body.style.overflow = open ? 'hidden' : ''; }
    });

    const briefModal = document.getElementById('briefModal');
    const closeBrief = document.getElementById('closeBrief');
    const briefForm  = document.getElementById('briefForm');
    let formDirty    = false;
    let isSubmitting = false;

    briefForm?.querySelectorAll('input, textarea, select').forEach(input => {
        input.addEventListener('input', () => { formDirty = true; });
    });

    const openModal = (e) => {
        e.preventDefault();
        briefModal.classList.add('active');
        briefModal.removeAttribute('aria-hidden');
        if (lenisRef) lenisRef.stop();
        document.body.style.overflow = 'hidden';
        overlay.classList.remove('active');
        if (menuBtn) menuBtn.textContent = 'MENU';
    };

    const closeModal = (e, force = false) => {
        if (e) e.preventDefault();
        if (formDirty && !force) {
            const confirmClose = window.confirm('You have unsaved details. Are you sure you want to close this?');
            if (!confirmClose) return;
        }
        briefModal.classList.remove('active');
        briefModal.setAttribute('aria-hidden', 'true');
        if (lenisRef) lenisRef.start();
        document.body.style.overflow = '';
        if (force) { briefForm.reset(); formDirty = false; }
    };

    document.querySelectorAll('.open-brief').forEach(btn => btn.addEventListener('click', openModal));
    closeBrief?.addEventListener('click', closeModal);

    briefModal?.addEventListener('click', e => {
        if (e.target !== briefModal) return;
        const glass = document.querySelector('.brief-glass');
        if (!glass) return;
        glass.style.transform = 'translateY(0) scale(1.018)';
        setTimeout(() => { glass.style.transform = 'translateY(0) scale(1)'; }, 150);
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && briefModal?.classList.contains('active')) closeModal(null);
    });

    briefForm?.addEventListener('submit', async function(e) {
        e.preventDefault();
        if (isSubmitting) return;
        isSubmitting = true;
        
        const btn          = this.querySelector('button[type="submit"]');
        const originalHTML = btn.innerHTML;

        btn.innerHTML           = '<span>SENDING...</span>';
        btn.style.opacity       = '0.55';
        btn.style.pointerEvents = 'none';

        const endpoint = '/api/submit-brief'; 
        const formData = new FormData(this);
        
        formData.append('source_url', window.location.href);
        formData.append('timestamp', new Date().toISOString());

        try {
            const response = await fetch(endpoint, {
                method:  'POST',
                body:    formData,
                headers: { 'Accept': 'application/json' },
            });

            if (response.ok) {
                btn.innerHTML        = '<span>BRIEF SECURED</span>';
                btn.style.background = '#4CAF50';
                btn.style.color      = '#fff';
                formDirty = false;
                setTimeout(() => {
                    closeModal(null, true);
                    btn.innerHTML           = originalHTML;
                    btn.style.opacity       = '1';
                    btn.style.pointerEvents = 'auto';
                    btn.style.background    = 'var(--accent)';
                    btn.style.color         = '#000';
                    isSubmitting            = false;
                }, 1600);
            } else {
                btn.innerHTML        = '<span>SUBMISSION FAILED - RETRY</span>';
                btn.style.background = '#b00020';
                btn.style.color      = '#fff';
                setTimeout(() => {
                    btn.innerHTML           = originalHTML;
                    btn.style.opacity       = '1';
                    btn.style.pointerEvents = 'auto';
                    btn.style.background    = 'var(--accent)';
                    btn.style.color         = '#000';
                    isSubmitting            = false;
                }, 2500);
            }
        } catch (error) {
            btn.innerHTML        = '<span>CONNECTION ERROR</span>';
            btn.style.background = 'rgba(255,255,255,0.08)';
            btn.style.color      = 'var(--ink)';
            setTimeout(() => {
                btn.innerHTML           = originalHTML;
                btn.style.opacity       = '1';
                btn.style.pointerEvents = 'auto';
                btn.style.background    = 'var(--accent)';
                btn.style.color         = '#000';
                isSubmitting            = false;
            }, 2500);
        }
    });

    const budgetInput = document.getElementById('brief-budget');
    const budgetRange = document.getElementById('brief-budget-range');
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

    const portItems = document.querySelectorAll('.port-item');
    const portBgs   = document.querySelectorAll('.port-bg');

    if (portItems.length > 0) {
        const activateIndex = (idx) => {
            portItems.forEach((item, i) => item.classList.toggle('is-active', i === idx));
            portBgs.forEach((bg, i) => bg.classList.toggle('is-active', i === idx));
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const idx = Array.from(portItems).indexOf(entry.target);
                    activateIndex(idx);
                }
            });
        }, { threshold: 0.5 });

        portItems.forEach(item => observer.observe(item));
    }

    if (!window.gsap || !window.ScrollTrigger) {
        clearTimeout(revealFallback);
        document.querySelectorAll('.reveal-up').forEach(el => {
            el.style.opacity   = '1';
            el.style.transform = 'none';
        });
        return;
    }

    if (!noMo) {
        portItems.forEach(item => {
            const wrap = item.querySelector('.port-text-wrap');
            if (!wrap) return;
            gsap.fromTo(wrap,
                { z:-40, rotateX:4 },
                { z:0, rotateX:0, ease:'none', scrollTrigger:{ trigger:item, start:'top bottom', end:'center center', scrub:1.2 } }
            );
            gsap.to(wrap, {
                z:-20, rotateX:-3, ease:'none',
                scrollTrigger:{ trigger:item, start:'center center', end:'bottom top', scrub:1.2 }
            });
            const bg = document.getElementById(item.dataset.target);
            if (bg) {
                gsap.set(bg, { scale:1.08 });
                gsap.fromTo(bg,
                    { yPercent:-6 },
                    { yPercent:6, ease:'none', scrollTrigger:{ trigger:item, start:'top bottom', end:'bottom top', scrub:1.5 } }
                );
            }
        });

        gsap.utils.toArray('.reveal-up').forEach(el => {
            gsap.fromTo(el,
                { y:44, opacity:0 },
                {
                    y:0, opacity:1,
                    duration:1.1,
                    ease:'power3.out',
                    scrollTrigger:{ trigger:el, start:'top 88%' },
                    onComplete: () => clearTimeout(revealFallback),
                }
            );
        });

        ScrollTrigger.refresh();
    } else {
        clearTimeout(revealFallback);
        document.querySelectorAll('.reveal-up').forEach(el => {
            el.style.opacity   = '1';
            el.style.transform = 'none';
        });
    }
});