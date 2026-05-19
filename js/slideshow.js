(function () {
    const AUTO_SCROLL_INTERVAL_MS = 5000;
    const BUFFER = 2;

    const track = document.getElementById('slideshow-track');
    const dotsContainer = document.getElementById('slideshow-dots');
    const prevBtn = document.getElementById('slideshow-prev');
    const nextBtn = document.getElementById('slideshow-next');
    const root = document.querySelector('.slideshow');

    if (!track || !dotsContainer || !prevBtn || !nextBtn || !root) return;

    const dataEl = root.querySelector('.slideshow-data');
    let SLIDES = [];
    if (dataEl) {
        try {
            SLIDES = JSON.parse(dataEl.textContent);
        } catch (e) {
            console.warn('Slideshow: invalid JSON in .slideshow-data', e);
        }
    }
    if (!SLIDES.length) return;

    const total = SLIDES.length;
    // DOM layout: [clone(-2), clone(-1), slide0..slideN-1, clone(+1), clone(+2)]
    // realIndex is the DOM position of the centered slide. At rest it sits in [BUFFER, BUFFER + total - 1].
    let currentIndex = 0;
    let realIndex = BUFFER;
    let isAnimating = false;
    let autoScrollTimer = null;

    function buildSlide(slide) {
        const el = document.createElement('div');
        el.className = 'slideshow-slide';

        const frame = document.createElement('div');
        frame.className = 'slideshow-frame';
        const link = document.createElement('a');
        link.className = 'slideshow-frame-link';
        link.href = slide.link || '#';
        link.setAttribute('aria-label', slide.alt || 'Open game page');
        const img = document.createElement('img');
        img.src = slide.src;
        img.alt = slide.alt;
        img.draggable = false;
        link.appendChild(img);
        frame.appendChild(link);

        const meta = document.createElement('div');
        meta.className = 'slideshow-meta';

        const caption = document.createElement('div');
        caption.className = 'slideshow-caption';
        caption.textContent = slide.caption || '';

        const button = document.createElement('a');
        button.className = 'slideshow-button';
        button.href = slide.link || '#';
        button.textContent = 'More Info';

        meta.appendChild(caption);
        meta.appendChild(button);

        el.appendChild(frame);
        el.appendChild(meta);
        return el;
    }

    function buildTrack() {
        const frag = document.createDocumentFragment();
        // Leading buffer: clones of last BUFFER slides, in order.
        for (let i = BUFFER; i > 0; i--) {
            frag.appendChild(buildSlide(SLIDES[(total - i) % total]));
        }
        SLIDES.forEach(s => frag.appendChild(buildSlide(s)));
        // Trailing buffer: clones of first BUFFER slides, in order.
        for (let i = 0; i < BUFFER; i++) {
            frag.appendChild(buildSlide(SLIDES[i % total]));
        }
        track.appendChild(frag);
    }

    function buildDots() {
        for (let i = 0; i < total; i++) {
            const dot = document.createElement('button');
            dot.className = 'slideshow-dot';
            dot.type = 'button';
            dot.setAttribute('role', 'tab');
            dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
            dot.addEventListener('click', () => goTo(i));
            dotsContainer.appendChild(dot);
        }
    }

    function getSlideStep() {
        // Use offsetLeft (layout position) not getBoundingClientRect (visual position),
        // because slides have transform: scale() applied which warps visual measurements.
        const slides = track.querySelectorAll('.slideshow-slide');
        if (slides.length < 2) return 0;
        return slides[1].offsetLeft - slides[0].offsetLeft;
    }

    function getCenterOffset() {
        const slides = track.querySelectorAll('.slideshow-slide');
        if (!slides.length) return 0;
        const slideWidth = slides[0].offsetWidth;
        const viewportWidth = track.parentElement.clientWidth;
        return (viewportWidth - slideWidth) / 2;
    }

    function applyTransform(animate) {
        const step = getSlideStep();
        const centerOffset = getCenterOffset();
        const x = centerOffset - realIndex * step;
        if (animate) {
            track.classList.add('is-animating');
        } else {
            track.classList.remove('is-animating');
        }
        track.style.transform = `translateX(${x}px)`;
    }

    function updateActiveStates() {
        const slides = track.querySelectorAll('.slideshow-slide');
        slides.forEach((s, i) => {
            s.classList.toggle('is-active', i === realIndex);
        });
        const dots = dotsContainer.querySelectorAll('.slideshow-dot');
        dots.forEach((d, i) => {
            d.classList.toggle('is-active', i === currentIndex);
            d.setAttribute('aria-selected', i === currentIndex ? 'true' : 'false');
        });
    }

    function next() {
        if (isAnimating) return;
        isAnimating = true;
        realIndex += 1;
        currentIndex = (currentIndex + 1) % total;
        applyTransform(true);
        updateActiveStates();
    }

    function prev() {
        if (isAnimating) return;
        isAnimating = true;
        realIndex -= 1;
        currentIndex = (currentIndex - 1 + total) % total;
        applyTransform(true);
        updateActiveStates();
    }

    function goTo(index) {
        if (isAnimating || index === currentIndex) return;
        isAnimating = true;
        currentIndex = index;
        realIndex = index + BUFFER;
        applyTransform(true);
        updateActiveStates();
    }

    function handleTransitionEnd(e) {
        if (e.target !== track) return;
        isAnimating = false;
        if (realIndex >= BUFFER && realIndex < BUFFER + total) return;

        // We landed on a clone. Swap to the matching real slide without any visible animation:
        // 1. Suppress the scale transition on slides so the .is-active reassignment is instant.
        // 2. Reposition the track (no animation — it doesn't have .is-animating).
        // 3. Re-enable transitions on the next frame.
        const slides = track.querySelectorAll('.slideshow-slide');
        const animatedParts = track.querySelectorAll('.slideshow-slide, .slideshow-frame, .slideshow-caption, .slideshow-meta, .slideshow-button');
        animatedParts.forEach(el => { el.style.transition = 'none'; });

        if (realIndex < BUFFER) {
            realIndex += total;
        } else {
            realIndex -= total;
        }
        slides.forEach((s, i) => s.classList.toggle('is-active', i === realIndex));
        applyTransform(false);

        // Force a reflow so the transition:none takes effect before we strip it.
        void track.offsetWidth;
        requestAnimationFrame(() => {
            animatedParts.forEach(el => { el.style.transition = ''; });
        });
    }

    function startAutoScroll() {
        stopAutoScroll();
        autoScrollTimer = setInterval(next, AUTO_SCROLL_INTERVAL_MS);
    }

    function stopAutoScroll() {
        if (autoScrollTimer) {
            clearInterval(autoScrollTimer);
            autoScrollTimer = null;
        }
    }

    function bindEvents() {
        nextBtn.addEventListener('click', () => { next(); });
        prevBtn.addEventListener('click', () => { prev(); });

        track.addEventListener('transitionend', handleTransitionEnd);

        root.addEventListener('mouseenter', stopAutoScroll);
        root.addEventListener('mouseleave', startAutoScroll);
        root.addEventListener('focusin', stopAutoScroll);
        root.addEventListener('focusout', startAutoScroll);

        window.addEventListener('resize', () => applyTransform(false));
    }

    function waitForImages() {
        const imgs = track.querySelectorAll('img');
        const pending = [];
        imgs.forEach(img => {
            if (!img.complete) {
                pending.push(new Promise(res => {
                    img.addEventListener('load', res, { once: true });
                    img.addEventListener('error', res, { once: true });
                }));
            }
        });
        return Promise.all(pending);
    }

    function init() {
        buildTrack();
        buildDots();
        applyTransform(false);
        updateActiveStates();
        bindEvents();

        waitForImages().then(() => applyTransform(false));

        startAutoScroll();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
