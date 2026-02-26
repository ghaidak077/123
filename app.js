document.addEventListener('DOMContentLoaded', () => {
    const mq     = window.matchMedia("(max-width:1024px)");
    const noMo   = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
    let isMobile = mq.matches;
    mq.addEventListener('change', e => { isMobile = e.matches; });

    if (window.gsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

    const progressBar = document.getElementById('scrollProgress');
    const updateProgress = () => {
        const scrollPx = document.documentElement.scrollTop || document.body.scrollTop;
        const winHeightPx = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (scrollPx / winHeightPx) * 100;
        progressBar.style.width = `${scrolled}%`;
    };

    const navEl = document.querySelector('.hud-nav');
    const scrollTopBtn = document.getElementById('scrollTop');
    let navScrolled = false, btnVisible = false;
    let ticking = false;

    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                updateProgress();
                const s = window.scrollY;
                const past = s > 60;
                if (past !== navScrolled) {
                    navScrolled = past;
                    navEl?.classList.toggle('scrolled', past);
                }
                const pastFold = s > 600;
                if (pastFold !== btnVisible) {
                    btnVisible = pastFold;
                    scrollTopBtn?.classList.toggle('visible', pastFold);
                }
                ticking = false;
            });
            ticking = true;
        }
    }, { passive:true });

    const menuBtn = document.getElementById('menuBtn');
    const overlay = document.getElementById('mobileOverlay');
    let lenisRef  = null;

    menuBtn?.addEventListener('click', () => {
        const open = overlay.classList.toggle('active');
        menuBtn.textContent = open ? 'CLOSE' : 'MENU';
        open ? lenisRef?.stop() : lenisRef?.start();
    });
    overlay?.querySelectorAll('.mobile-link').forEach(l => {
        l.addEventListener('click', () => {
            overlay.classList.remove('active');
            menuBtn.textContent = 'MENU';
            lenisRef?.start();
        });
    });

    if (typeof Lenis !== 'undefined' && !isMobile) {
        lenisRef = new Lenis({
            duration: 1.25,
            lerp: .065,
            easing: t => Math.min(1, 1.001 - Math.pow(2, -10*t)),
            smoothTouch: false
        });
        const raf = t => { lenisRef.raf(t); requestAnimationFrame(raf); };
        requestAnimationFrame(raf);

        scrollTopBtn?.addEventListener('click', () => lenisRef.scrollTo(0));

        document.querySelectorAll('a[href^="#"]').forEach(a => {
            a.addEventListener('click', function(e) {
                const id = this.getAttribute('href');
                if (id === '#') return;
                const tgt = document.querySelector(id);
                if (tgt) { e.preventDefault(); lenisRef.scrollTo(tgt, { offset:-80, duration:1.5 }); }
            });
        });
    } else {
        scrollTopBtn?.addEventListener('click', () => window.scrollTo({top:0, behavior:'smooth'}));
    }

    const portItems = document.querySelectorAll('.port-item');
    const portBgs   = document.querySelectorAll('.port-bg');

    if ('IntersectionObserver' in window && portItems.length > 0) {
        const obs = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                portItems.forEach(i => i.classList.remove('is-active'));
                entry.target.classList.add('is-active');
                const id = entry.target.getAttribute('data-target');
                portBgs.forEach(b => b.classList.remove('is-active'));
                const bg = document.getElementById(id);
                if (bg) {
                    if (bg.dataset.src) { bg.src = bg.dataset.src; delete bg.dataset.src; }
                    bg.classList.add('is-active');
                }
            });
        }, { rootMargin:"-45% 0px -45% 0px", threshold:0 });
        portItems.forEach(i => obs.observe(i));
    }

    if (window.gsap && window.ScrollTrigger && !noMo) {
        const initialBg = document.getElementById('bg-1');
        if (initialBg && portItems.length > 0) {
            gsap.fromTo(initialBg,
                { filter: 'blur(32px) brightness(0.1)', scale: 1.1 },
                {
                    filter: 'blur(0px) brightness(0.45)',
                    scale: 1,
                    ease: 'none',
                    scrollTrigger: {
                        trigger: portItems[0],
                        start: 'top 85%',
                        end: 'center center',
                        scrub: 1.2
                    }
                }
            );
        }

        portItems.forEach((item, idx) => {
            gsap.fromTo(item.querySelector('.port-text-wrap'),
                { z: -40, rotateX: 4 },
                {
                    z: 0, rotateX: 0,
                    ease: "none",
                    scrollTrigger: { trigger: item, start: "top bottom", end: "center center", scrub: 1.2 }
                }
            );
            gsap.to(item.querySelector('.port-text-wrap'), {
                z: -20, rotateX: -3,
                ease: "none",
                scrollTrigger: { trigger: item, start: "center center", end: "bottom top", scrub: 1.2 }
            });
            const bg = document.getElementById(item.dataset.target);
            if (bg) {
                gsap.fromTo(bg,
                    { yPercent: -8 },
                    { yPercent: 8, ease: "none", scrollTrigger: { trigger: item, start: "top bottom", end: "bottom top", scrub: 1.5 } }
                );
            }
        });
    }

    if (window.gsap && window.ScrollTrigger && !noMo) {
        gsap.utils.toArray('.reveal-up').forEach(el => {
            gsap.fromTo(el,
                { y:44, opacity:0 },
                { scrollTrigger:{ trigger:el, start:"top 87%" }, y:0, opacity:1, duration:1.15, ease:"power3.out" }
            );
        });

        gsap.utils.toArray('.process-item').forEach((el, i) => {
            gsap.fromTo(el,
                { y:50, opacity:0 },
                { scrollTrigger:{ trigger:el, start:"top 88%" }, y:0, opacity:1, duration:1, ease:"power3.out", delay: i * .08 }
            );
        });

        gsap.utils.toArray('.cap-card').forEach((el, i) => {
            gsap.fromTo(el,
                { y:35, opacity:0 },
                { scrollTrigger:{ trigger:el, start:"top 90%" }, y:0, opacity:1, duration:.9, ease:"power3.out", delay: i * .07 }
            );
        });
    }
});
