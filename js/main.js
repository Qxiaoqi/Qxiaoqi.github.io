const sidebarFn = () => {
    const $toggleMenu = document.getElementById('toggle-menu');
    const $mobileSidebarMenus = document.getElementById('sidebar-menus');
    const $menuMask = document.getElementById('menu-mask');
    const $body = document.body;

    const toggleMobileSidebar = (isOpen) => {
        utils.sidebarPaddingR();
        $body.style.overflow = isOpen ? 'hidden' : '';
        $body.style.paddingRight = isOpen ? '' : '';
        utils[isOpen ? 'fadeIn' : 'fadeOut']($menuMask, 0.5);
        $mobileSidebarMenus.classList[isOpen ? 'add' : 'remove']('open');
    }
    const closeMobileSidebar = () => {
        if ($mobileSidebarMenus.classList.contains('open')) {
            toggleMobileSidebar(false);
        }
    }
    $toggleMenu.addEventListener('click', () => toggleMobileSidebar(true));
    $menuMask.addEventListener('click', closeMobileSidebar);

    window.addEventListener('resize', () => {
        if (utils.isHidden($toggleMenu) && $mobileSidebarMenus.classList.contains('open')) {
            closeMobileSidebar();
        }
        sco.refreshWaterFall();
    });
}
const scrollFn = () => {
    const innerHeight = window.innerHeight;
    let initTop = 0;
    const $header = document.getElementById('page-header');
    const throttledScroll = utils.throttle((e) => {
        initThemeColor();
        const currentTop = window.scrollY || document.documentElement.scrollTop;
        const isDown = scrollDirection(currentTop);
        if (currentTop > 0) {
            if (isDown) {
                if ($header.classList.contains('nav-visible')) $header.classList.remove('nav-visible');
            } else {
                if (!$header.classList.contains('nav-visible')) $header.classList.add('nav-visible');
            }
            $header.classList.add('nav-fixed');
        } else {
            $header.classList.remove('nav-fixed', 'nav-visible');
        }
    }, 200);
    window.addEventListener('scroll', (e) => {
        throttledScroll(e);
        if (window.scrollY === 0) {
            $header.classList.remove('nav-fixed', 'nav-visible');
        }
    });

    function scrollDirection(currentTop) {
        const result = currentTop > initTop;
        initTop = currentTop;
        return result;
    }
}
const percent = () => {
    const docEl = document.documentElement;
    const body = document.body;
    const scrollPos = window.pageYOffset || docEl.scrollTop;
    const totalScrollableHeight = Math.max(body.scrollHeight, docEl.scrollHeight, body.offsetHeight, docEl.offsetHeight, body.clientHeight, docEl.clientHeight) - docEl.clientHeight;
    const scrolledPercent = Math.round((scrollPos / totalScrollableHeight) * 100);
    const navToTop = document.querySelector("#nav-totop");
    const percentDisplay = document.querySelector("#percent");
    const isNearEnd = (window.scrollY + docEl.clientHeight) >= (document.getElementById("post-comment") || document.getElementById("footer")).offsetTop;
    navToTop.classList.toggle("long", isNearEnd || scrolledPercent > 90);
    percentDisplay.textContent = isNearEnd || scrolledPercent > 90 ? GLOBAL_CONFIG.lang.backtop : scrolledPercent;
    document.querySelectorAll(".needEndHide").forEach(item => item.classList.toggle("hide", totalScrollableHeight - scrollPos < 100));
}
const showTodayCard = () => {
    const el = document.getElementById('todayCard');
    const topGroup = document.querySelector('.topGroup');
    topGroup?.addEventListener('mouseleave', () => el?.classList.remove('hide'));
}
const initObserver = () => {
    const commentElement = document.getElementById("post-comment");
    const paginationElement = document.getElementById("pagination");
    const commentBarrageElement = document.querySelector(".comment-barrage");
    if (commentElement && paginationElement) {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                const action = entry.isIntersecting ? 'add' : 'remove';
                paginationElement.classList[action]("show-window");
                if (GLOBAL_CONFIG.comment.commentBarrage) {
                    commentBarrageElement.style.bottom = entry.isIntersecting ? "-200px" : "0px";
                }
            });
        });
        observer.observe(commentElement);
    }
};
let mermaidViewerState;
const clampMermaidViewerValue = (value, min, max) => Math.min(Math.max(value, min), max);
const getMermaidViewerDiagramSize = svg => {
    const viewBox = svg.viewBox?.baseVal;
    if (viewBox?.width > 0 && viewBox?.height > 0) return {width: viewBox.width, height: viewBox.height};
    const widthAttr = svg.getAttribute('width');
    const heightAttr = svg.getAttribute('height');
    const width = widthAttr && !widthAttr.includes('%') ? parseFloat(widthAttr) : NaN;
    const height = heightAttr && !heightAttr.includes('%') ? parseFloat(heightAttr) : NaN;
    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) return {width, height};
    const rect = svg.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return {width: rect.width, height: rect.height};
    try {
        const box = svg.getBBox();
        if (box.width > 0 && box.height > 0) return {width: box.width, height: box.height};
    } catch (error) {
        console.warn('Failed to read Mermaid SVG bounds:', error);
    }
    return {width: 960, height: 640};
}
const getMermaidViewerTitle = diagram => {
    const headings = document.querySelectorAll('#article-container h1, #article-container h2, #article-container h3, #article-container h4, #article-container h5, #article-container h6');
    let title = '';
    headings.forEach(heading => {
        if (heading.compareDocumentPosition(diagram) & Node.DOCUMENT_POSITION_FOLLOWING) {
            title = heading.textContent.trim();
        }
    });
    return title || 'Mermaid 图表';
}
const getMermaidViewer = () => {
    if (mermaidViewerState) return mermaidViewerState;
    const overlay = document.createElement('div');
    overlay.className = 'mermaid-viewer';
    overlay.innerHTML = `
        <div class="mermaid-viewer__panel" role="dialog" aria-modal="true" aria-label="Mermaid 图表查看器">
            <div class="mermaid-viewer__header">
                <div class="mermaid-viewer__meta">
                    <div class="mermaid-viewer__title"></div>
                    <div class="mermaid-viewer__hint">拖动画布，滚轮或按钮缩放，双击复位，按 ESC 关闭</div>
                </div>
                <div class="mermaid-viewer__actions">
                    <button type="button" class="mermaid-viewer__action" data-action="zoom-out" aria-label="缩小">-</button>
                    <button type="button" class="mermaid-viewer__action" data-action="fit">适应</button>
                    <button type="button" class="mermaid-viewer__action" data-action="zoom-in" aria-label="放大">+</button>
                    <div class="mermaid-viewer__zoom" aria-live="polite">100%</div>
                    <button type="button" class="mermaid-viewer__close">关闭</button>
                </div>
            </div>
            <div class="mermaid-viewer__body">
                <div class="mermaid-viewer__stage"></div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    const title = overlay.querySelector('.mermaid-viewer__title');
    const stage = overlay.querySelector('.mermaid-viewer__stage');
    const zoom = overlay.querySelector('.mermaid-viewer__zoom');
    const state = {
        canvas: null,
        width: 1,
        height: 1,
        scale: 1,
        minScale: 0.05,
        maxScale: 12,
        x: 0,
        y: 0,
        pointerId: null,
        startX: 0,
        startY: 0,
        originX: 0,
        originY: 0
    };
    const updateZoom = () => {
        zoom.textContent = `${Math.round(state.scale * 100)}%`;
    };
    const clampPosition = () => {
        if (!state.canvas) return;
        const rect = stage.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const contentWidth = state.width * state.scale;
        const contentHeight = state.height * state.scale;
        const edgePadding = 48;
        if (contentWidth <= rect.width) {
            state.x = (rect.width - contentWidth) / 2;
        } else {
            state.x = clampMermaidViewerValue(state.x, rect.width - contentWidth - edgePadding, edgePadding);
        }
        if (contentHeight <= rect.height) {
            state.y = (rect.height - contentHeight) / 2;
        } else {
            state.y = clampMermaidViewerValue(state.y, rect.height - contentHeight - edgePadding, edgePadding);
        }
    };
    const render = () => {
        if (!state.canvas) return;
        clampPosition();
        state.canvas.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
        updateZoom();
    };
    const setScaleAtPoint = (nextScale, originX, originY) => {
        if (!state.canvas) return;
        const scale = clampMermaidViewerValue(nextScale, state.minScale, state.maxScale);
        if (Math.abs(scale - state.scale) < 0.001) return;
        const contentX = (originX - state.x) / state.scale;
        const contentY = (originY - state.y) / state.scale;
        state.scale = scale;
        state.x = originX - contentX * state.scale;
        state.y = originY - contentY * state.scale;
        render();
    };
    const zoomFromCenter = factor => {
        const rect = stage.getBoundingClientRect();
        setScaleAtPoint(state.scale * factor, rect.width / 2, rect.height / 2);
    };
    const fitToStage = () => {
        if (!state.canvas) return;
        const rect = stage.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const padding = 48;
        const fitScale = Math.min(
            Math.max((rect.width - padding) / state.width, 0.05),
            Math.max((rect.height - padding) / state.height, 0.05)
        );
        const safeFitScale = Number.isFinite(fitScale) && fitScale > 0 ? fitScale : 1;
        state.minScale = Math.max(Math.min(safeFitScale * 0.35, safeFitScale), 0.05);
        state.maxScale = Math.max(safeFitScale * 6, 4);
        state.scale = safeFitScale;
        state.x = (rect.width - state.width * state.scale) / 2;
        state.y = (rect.height - state.height * state.scale) / 2;
        render();
    };
    const stopPanning = pointerId => {
        if (pointerId != null && pointerId !== state.pointerId) return;
        if (state.pointerId != null && stage.hasPointerCapture(state.pointerId)) {
            stage.releasePointerCapture(state.pointerId);
        }
        state.pointerId = null;
        stage.classList.remove('is-dragging');
    };
    const close = () => {
        stopPanning();
        overlay.classList.remove('is-active');
        document.body.classList.remove('mermaid-viewer-open');
        stage.textContent = '';
        state.canvas = null;
    };
    overlay.querySelectorAll('.mermaid-viewer__action').forEach(button => {
        button.addEventListener('click', () => {
            const action = button.dataset.action;
            if (action === 'zoom-in') zoomFromCenter(1.2);
            if (action === 'zoom-out') zoomFromCenter(1 / 1.2);
            if (action === 'fit') fitToStage();
        });
    });
    overlay.querySelector('.mermaid-viewer__close').addEventListener('click', close);
    overlay.addEventListener('click', event => {
        if (event.target === overlay) close();
    });
    stage.addEventListener('wheel', event => {
        if (!state.canvas) return;
        event.preventDefault();
        const rect = stage.getBoundingClientRect();
        const zoomFactor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
        setScaleAtPoint(state.scale * zoomFactor, event.clientX - rect.left, event.clientY - rect.top);
    }, {passive: false});
    stage.addEventListener('dblclick', () => fitToStage());
    stage.addEventListener('pointerdown', event => {
        if (!state.canvas || event.button !== 0) return;
        state.pointerId = event.pointerId;
        state.startX = event.clientX;
        state.startY = event.clientY;
        state.originX = state.x;
        state.originY = state.y;
        stage.setPointerCapture(event.pointerId);
        stage.classList.add('is-dragging');
    });
    stage.addEventListener('pointermove', event => {
        if (!state.canvas || event.pointerId !== state.pointerId) return;
        state.x = state.originX + event.clientX - state.startX;
        state.y = state.originY + event.clientY - state.startY;
        render();
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => {
        stage.addEventListener(type, event => stopPanning(event.pointerId));
    });
    window.addEventListener('resize', () => {
        if (overlay.classList.contains('is-active')) fitToStage();
    });
    document.addEventListener('keydown', event => {
        if (!overlay.classList.contains('is-active')) return;
        if (event.key === 'Escape') close();
        if (event.key === '+' || event.key === '=') zoomFromCenter(1.2);
        if (event.key === '-') zoomFromCenter(1 / 1.2);
        if (event.key === '0') fitToStage();
    });
    mermaidViewerState = {overlay, title, stage, close, fitToStage, state};
    window.closeMermaidViewer = close;
    return mermaidViewerState;
}
const openMermaidViewer = diagram => {
    const svg = diagram.querySelector('svg');
    if (!svg) return;
    const viewer = getMermaidViewer();
    const size = getMermaidViewerDiagramSize(svg);
    const frame = document.createElement('div');
    frame.className = 'mermaid mermaid-viewer__canvas';
    const clonedSvg = svg.cloneNode(true);
    clonedSvg.style.maxWidth = 'none';
    clonedSvg.style.width = `${size.width}px`;
    clonedSvg.style.height = `${size.height}px`;
    frame.appendChild(clonedSvg);
    viewer.stage.replaceChildren(frame);
    viewer.state.canvas = frame;
    viewer.state.width = size.width;
    viewer.state.height = size.height;
    viewer.title.textContent = getMermaidViewerTitle(diagram);
    viewer.overlay.classList.add('is-active');
    document.body.classList.add('mermaid-viewer-open');
    window.requestAnimationFrame(() => viewer.fitToStage());
}
window.initMermaidViewer = () => {
    document.querySelectorAll('#article-container .mermaid').forEach(diagram => {
        if (!diagram.querySelector('svg')) return;
        diagram.classList.add('mermaid-interactive');
        let toolbar = diagram.querySelector('.mermaid-toolbar');
        if (!toolbar) {
            toolbar = document.createElement('div');
            toolbar.className = 'mermaid-toolbar';
            toolbar.innerHTML = `
                <span class="mermaid-hint">正文为预览，点击图表放大查看细节</span>
                <button type="button" class="mermaid-open">放大查看</button>
            `;
        }
        let preview = diagram.querySelector('.mermaid-preview');
        if (!preview) {
            preview = document.createElement('div');
            preview.className = 'mermaid-preview';
        }
        Array.from(diagram.childNodes).forEach(node => {
            if (node === toolbar || node === preview) return;
            preview.appendChild(node);
        });
        diagram.replaceChildren(toolbar, preview);
        const openButton = toolbar.querySelector('.mermaid-open');
        if (diagram.dataset.mermaidEnhanced === 'true') return;
        diagram.dataset.mermaidEnhanced = 'true';
        let pointerStart;
        const clearPointer = () => pointerStart = null;
        openButton.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            openMermaidViewer(diagram);
        });
        diagram.addEventListener('pointerdown', event => {
            if (event.target.closest('.mermaid-toolbar')) return;
            pointerStart = {x: event.clientX, y: event.clientY};
        });
        diagram.addEventListener('pointerup', event => {
            if (!pointerStart || event.target.closest('.mermaid-toolbar, a, button')) return clearPointer();
            const deltaX = Math.abs(event.clientX - pointerStart.x);
            const deltaY = Math.abs(event.clientY - pointerStart.y);
            clearPointer();
            if (deltaX <= 6 && deltaY <= 6) openMermaidViewer(diagram);
        });
        ['pointercancel', 'pointerleave'].forEach(type => diagram.addEventListener(type, clearPointer));
    });
};
const addCopyright = () => {
    if (!GLOBAL_CONFIG.copyright) return;
    const {limit, author, link, source, info} = GLOBAL_CONFIG.copyright;
    document.body.addEventListener('copy', (e) => {
        e.preventDefault();
        const copyText = window.getSelection().toString();
        const text = copyText.length > limit ? `${copyText}\n\n${author}\n${link}${window.location.href}\n${source}\n${info}` : copyText;
        e.clipboardData.setData('text', text);
    });
};
const asideStatus = () => {
    const status = utils.saveToLocal.get('aside-status');
    document.documentElement.classList.toggle('hide-aside', status === 'hide');
}

function initThemeColor() {
    const currentTop = window.scrollY || document.documentElement.scrollTop;
    const themeColor = currentTop > 0 ? '--efu-card-bg' : PAGE_CONFIG.is_post ? '--efu-main' : '--efu-background';
    applyThemeColor(getComputedStyle(document.documentElement).getPropertyValue(themeColor));
}

function applyThemeColor(color) {
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    const appleMobileWebAppMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    themeColorMeta?.setAttribute("content", color);
    appleMobileWebAppMeta?.setAttribute("content", color);
    if (window.matchMedia("(display-mode: standalone)").matches) {
        document.body.style.backgroundColor = color;
    }
}

const handleThemeChange = mode => {
    const themeChange = window.globalFn?.themeChange || {}
    for (let key in themeChange) {
        themeChange[key](mode)
    }
}
const sco = {
    lastSayHello: "",
    wasPageHidden: false,
    musicPlaying: false,
    hideCookie() {
        const cookiesWindow = document.getElementById("cookies-window");
        if (cookiesWindow) {
            setTimeout(() => {
                cookiesWindow.classList.add("cw-hide");
                setTimeout(() => cookiesWindow.style.display = "none", 1000);
            }, 3000);
        }
    },
    scrollTo(elementId) {
        const targetElement = document.getElementById(elementId);
        if (targetElement) {
            const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - 80;
            window.scroll({
                top: targetPosition,
                behavior: "smooth"
            });
        }
    },
    musicToggle() {
        const $music = document.querySelector('#nav-music');
        const $meting = document.querySelector('meting-js');
        const $console = document.getElementById('consoleMusic');
        const $rm_text = document.querySelector('#menu-music-toggle span');
        const $rm_icon = document.querySelector('#menu-music-toggle i');
        this.musicPlaying = !this.musicPlaying;
        $music.classList.toggle("playing", this.musicPlaying);
        $console.classList.toggle("on", this.musicPlaying);
        if (this.musicPlaying) {
            $meting.aplayer.play();
            rm?.menuItems.music[0] && ($rm_text.textContent = GLOBAL_CONFIG.right_menu.music.stop) && ($rm_icon.className = 'solitude st-pause-fill')
        } else {
            $meting.aplayer.pause();
            rm?.menuItems.music[0] && ($rm_text.textContent = GLOBAL_CONFIG.right_menu.music.start) && ($rm_icon.className = 'solitude st-play-fill')
        }
    },
    switchCommentBarrage() {
        let commentBarrageElement = document.querySelector(".comment-barrage");
        if (!commentBarrageElement) return;
        const isDisplayed = window.getComputedStyle(commentBarrageElement).display === "flex";
        commentBarrageElement.style.display = isDisplayed ? "none" : "flex";
        document.querySelector("#consoleCommentBarrage").classList.toggle("on", !isDisplayed);
        utils.saveToLocal.set("commentBarrageSwitch", !isDisplayed, .2);
        rm?.menuItems.barrage && rm.barrage(isDisplayed)
    },
    switchHideAside() {
        const htmlClassList = document.documentElement.classList;
        const consoleHideAside = document.querySelector("#consoleHideAside");
        const isHideAside = htmlClassList.contains("hide-aside");
        utils.saveToLocal.set("aside-status", isHideAside ? "show" : "hide", 1);
        htmlClassList.toggle("hide-aside");
        consoleHideAside.classList.toggle("on", !isHideAside);
    },
    switchKeyboard() {
        this.sco_keyboards = !this.sco_keyboards;
        const consoleKeyboard = document.querySelector("#consoleKeyboard");
        const keyboardFunction = this.sco_keyboards ? openKeyboard : closeKeyboard;
        consoleKeyboard.classList.toggle("on", this.sco_keyboards);
        keyboardFunction();
        localStorage.setItem("keyboard", this.sco_keyboards);
        document.getElementById('keyboard-tips')?.classList.remove('show');
    },
    initConsoleState() {
        const consoleHideAside = document.querySelector("#consoleHideAside");
        if(!consoleHideAside) return;
        consoleHideAside.classList.toggle("on", document.documentElement.classList.contains("hide-aside"));
    },
    changeSayHelloText() {
        const greetings = GLOBAL_CONFIG.aside.sayhello2;
        const greetingElement = document.getElementById("author-info__sayhi");
        let randomGreeting;
        do {
            randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
        } while (randomGreeting === this.lastSayHello);
        greetingElement.textContent = randomGreeting;
        this.lastSayHello = randomGreeting;
    },
    switchDarkMode() {
        const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
        const newMode = isDarkMode ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newMode);
        utils.saveToLocal.set('theme', newMode, 0.02);
        utils.snackbarShow(GLOBAL_CONFIG.lang.theme[newMode], false, 2000);
        if (typeof rm === 'object') rm.mode(!isDarkMode) && rm.hideRightMenu();
        handleThemeChange(newMode);
    },
    hideTodayCard: () => document.getElementById('todayCard').classList.add('hide'),
    toTop: () => utils.scrollToDest(0),
    showConsole: () => document.getElementById('console')?.classList.toggle('show', true),
    hideConsole: () => document.getElementById('console')?.classList.remove('show'),
    refreshWaterFall() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        waterfall(entry.target) || entry.target.classList.add('show');
                    }, 300);
                }
            });
        });
        document.querySelectorAll('.waterfall').forEach(el => observer.observe(el));
    },
    addRuntime() {
        let el = document.getElementById('runtimeshow');
        el && GLOBAL_CONFIG.runtime && (el.innerText = utils.timeDiff(new Date(GLOBAL_CONFIG.runtime), new Date()) + GLOBAL_CONFIG.lang.day);
    },
    toTalk(txt) {
        const inputs = ["#wl-edit", ".el-textarea__inner", "#veditor", ".atk-textarea"];
        inputs.forEach(selector => {
            const el = document.querySelector(selector);
            if (el) {
                el.dispatchEvent(new Event('input', {bubble: true, cancelable: true}));
                el.value = '> ' + txt.replace(/\n/g, '\n> ') + '\n\n';
                utils.scrollToDest(utils.getEleTop(document.getElementById('post-comment')), 300);
                el.focus();
                el.setSelectionRange(-1, -1);
            }
        });
        utils.snackbarShow(GLOBAL_CONFIG.lang.totalk, false, 2000);
    },
    initbbtalk() {
        const bberTalkElement = document.querySelector('#bber-talk');
        if (bberTalkElement) {
            new Swiper('.swiper-container', {
                direction: 'vertical',
                loop: true,
                autoplay: {
                    delay: 3000,
                    pauseOnMouseEnter: true
                },
            });
        }
    },
    addPhotoFigcaption() {
        document.querySelectorAll('#article-container img:not(.gallery-item img)').forEach(image => {
            const captionText = image.getAttribute('alt');
            captionText && image.insertAdjacentHTML('afterend', `<div class="img-alt is-center">${captionText}</div>`);
        });
    },
    scrollToComment: () => utils.scrollToDest(utils.getEleTop(document.getElementById('post-comment')), 300),
    setTimeState() {
        const el = document.getElementById('author-info__sayhi');
        if (el) {
            const hours = new Date().getHours();
            const lang = GLOBAL_CONFIG.aside.sayhello;

            const localData = getLocalData(['twikoo', 'WALINE_USER_META', 'WALINE_USER', '_v_Cache_Meta', 'ArtalkUser']);

            function getLocalData(keys) {
                for (let key of keys) {
                    const data = localStorage.getItem(key);
                    if (data) {
                        return JSON.parse(data);
                    }
                }
                return null;
            };
            const nick = localData ? (localData.nick ? localData.nick : localData.display_name) : null;

            let prefix;
            if (this.wasPageHidden) {
                prefix = GLOBAL_CONFIG.aside.sayhello3.back + nick;
                this.wasPageHidden = false;
            } else {
                prefix = GLOBAL_CONFIG.aside.sayhello3.prefix + nick;
            }

            const greetings = [
                {start: 0, end: 5, text: nick ? prefix : lang.goodnight},
                {start: 6, end: 10, text: nick ? prefix : lang.morning},
                {start: 11, end: 14, text: nick ? prefix : lang.noon},
                {start: 15, end: 18, text: nick ? prefix : lang.afternoon},
                {start: 19, end: 24, text: nick ? prefix : lang.night},
            ];
            const greeting = greetings.find(g => hours >= g.start && hours <= g.end);
            el.innerText = greeting.text;
        }
    },
    tagPageActive() {
        const decodedPath = decodeURIComponent(window.location.pathname);
        const isTagPage = /\/tags\/.*?\//.test(decodedPath);
        if (isTagPage) {
            const tag = decodedPath.split("/").slice(-2, -1)[0];
            const tagElement = document.getElementById(tag);
            if (tagElement) {
                document.querySelectorAll("a.select").forEach(link => {
                    link.classList.remove("select");
                });
                tagElement.classList.add("select");
            }
        }
    },
    categoriesBarActive() {
        const categoryBar = document.querySelector("#category-bar");
        const currentPath = decodeURIComponent(window.location.pathname);
        const isHomePage = currentPath === GLOBAL_CONFIG.root;
        if (categoryBar) {
            const categoryItems = categoryBar.querySelectorAll(".category-bar-item");
            categoryItems.forEach(item => item.classList.remove("select"));
            const activeItemId = isHomePage ? "category-bar-home" : currentPath.split("/").slice(-2, -1)[0];
            const activeItem = document.getElementById(activeItemId);
            if (activeItem) {
                activeItem.classList.add("select");
            }
        }
    },
    scrollCategoryBarToRight() {
        const scrollBar = document.getElementById("category-bar-items");
        const nextElement = document.getElementById("category-bar-next");
        if (scrollBar) {
            const isScrollBarAtEnd = () => scrollBar.scrollLeft + scrollBar.clientWidth >= scrollBar.scrollWidth - 8;
            const scroll = () => {
                if (isScrollBarAtEnd()) {
                    scrollBar.scroll({left: 0, behavior: "smooth"});
                } else {
                    scrollBar.scrollBy({left: scrollBar.clientWidth, behavior: "smooth"});
                }
            };
            scrollBar.addEventListener("scroll", () => {
                clearTimeout(this.timeoutId);
                this.timeoutId = setTimeout(() => {
                    nextElement.style.transform = isScrollBarAtEnd() ? "rotate(180deg)" : "";
                }, 150);
            });
            scroll();
        }
    },
    openAllTags() {
        document.querySelectorAll(".card-allinfo .card-tag-cloud").forEach(tagCloudElement => tagCloudElement.classList.add("all-tags"));
        document.getElementById("more-tags-btn")?.remove();
    },
    listenToPageInputPress() {
        const toGroup = document.querySelector(".toPageGroup")
        const pageText = document.getElementById("toPageText");
        if (!pageText) return;
        const pageButton = document.getElementById("toPageButton");
        const pageNumbers = document.querySelectorAll(".page-number");
        const lastPageNumber = +pageNumbers[pageNumbers.length - 1].textContent;
        if (!pageText || lastPageNumber === 1) {
            toGroup.style.display = "none";
            return
        }
        pageText.addEventListener("keydown", (event) => {
            if (event.keyCode === 13) {
                sco.toPage();
                pjax.loadUrl(pageButton.href);
            }
        });
        pageText.addEventListener("input", () => {
            pageButton.classList.toggle("haveValue", pageText.value !== "" && pageText.value !== "0");
            if (+pageText.value > lastPageNumber) {
                pageText.value = lastPageNumber;
            }
        });
    },
    addNavBackgroundInit() {
        const scrollTop = document.documentElement.scrollTop;
        (scrollTop !== 0) && document.getElementById("page-header").classList.add("nav-fixed", "nav-visible");
    },
    toPage() {
        const pageNumbers = document.querySelectorAll(".page-number");
        const maxPageNumber = parseInt(pageNumbers[pageNumbers.length - 1].innerHTML);
        const inputElement = document.getElementById("toPageText");
        const inputPageNumber = parseInt(inputElement.value);
        document.getElementById("toPageButton").href = (!isNaN(inputPageNumber) && inputPageNumber <= maxPageNumber && inputPageNumber > 1)
            ? window.location.href.replace(/\/page\/\d+\/$/, "/") + "page/" + inputPageNumber + "/"
            : '/';
    },
    owoBig(owoSelector) {
        let owoBig = document.getElementById('owo-big');
        if (!owoBig) {
            owoBig = document.createElement('div');
            owoBig.id = 'owo-big';
            document.body.appendChild(owoBig);
        }
        const showOwoBig = event => {
            const target = event.target;
            const owoItem = target.closest(owoSelector.item);
            if (owoItem && target.closest(owoSelector.body)) {
                const imgSrc = owoItem.querySelector('img')?.src;
                if (imgSrc) {
                    owoBig.innerHTML = `<img src="${imgSrc}" style="max-width: 100%; height: auto;">`;
                    owoBig.style.display = 'block';
                    positionOwoBig(owoItem);
                }
            }
        };
        const hideOwoBig = event => {
            if (event.target.closest(owoSelector.item) && event.target.closest(owoSelector.body)) {
                owoBig.style.display = 'none';
            }
        };
        const positionOwoBig = owoItem => {
            const itemRect = owoItem.getBoundingClientRect();
            owoBig.style.left = `${itemRect.left - (owoBig.offsetWidth / 4)}px`;
            owoBig.style.top = `${itemRect.top}px`;
        }
        document.addEventListener('mouseover', showOwoBig);
        document.addEventListener('mouseout', hideOwoBig);
    },
    changeTimeFormat(selector) {
        selector.forEach(item => {
            const timeVal = item.getAttribute('datetime')
            item.textContent = utils.diffDate(timeVal, true)
            item.style.display = 'inline'
        })
    },
    switchComments() {
        const switchBtn = document.getElementById('switch-btn')
        if (!switchBtn) return
        let switchDone = false
        const commentContainer = document.getElementById('post-comment')
        const handleSwitchBtn = () => {
            commentContainer.classList.toggle('move')
            if (!switchDone && typeof loadTwoComment === 'function') {
                switchDone = true
                loadTwoComment()
            }
        }
        utils.addEventListenerPjax(switchBtn, 'click', handleSwitchBtn)
    }
};
const addHighlight = () => {
    const highlight = GLOBAL_CONFIG.highlight;
    if (!highlight) return;
    const {copy, expand, limit, syntax} = highlight;
    const $isPrismjs = syntax === 'prismjs';
    const $isShowTool = highlight.enable || copy || expand || limit;
    const expandClass = !expand === true ? 'closed' : ''
    const $syntaxHighlight = syntax === 'highlight.js' ? document.querySelectorAll('figure.highlight') : document.querySelectorAll('pre[class*="language-"]')
    if (!(($isShowTool || limit) && $syntaxHighlight.length)) return
    const copyEle = copy ? `<i class="solitude fas fa-copy copy-button"></i>` : '<i></i>';
    const expandEle = `<i class="solitude fas fa-angle-down expand"></i>`;
    const limitEle = limit ? `<i class="solitude fas fa-angles-down"></i>` : '<i></i>';
    const alertInfo = (ele, text) => utils.snackbarShow(text, false, 2000)
    const copyFn = (e) => {
        const $buttonParent = e.parentNode
        $buttonParent.classList.add('copy-true')
        const selection = window.getSelection()
        const range = document.createRange()
        const preCodeSelector = $isPrismjs ? 'pre code' : 'table .code pre'
        range.selectNodeContents($buttonParent.querySelectorAll(`${preCodeSelector}`)[0])
        selection.removeAllRanges()
        selection.addRange(range)
        document.execCommand('copy')
        alertInfo(e.lastChild, GLOBAL_CONFIG.lang.copy.success)
        selection.removeAllRanges()
        $buttonParent.classList.remove('copy-true')
    }
    const expandClose = (e) => e.classList.toggle('closed')
    const shrinkEle = function () {
        this.classList.toggle('expand-done')
    }
    const ToolsFn = function (e) {
        const $target = e.target.classList
        if ($target.contains('expand')) expandClose(this)
        else if ($target.contains('copy-button')) copyFn(this)
    }
    const createEle = (lang, item, service) => {
        const fragment = document.createDocumentFragment()
        if ($isShowTool) {
            const hlTools = document.createElement('div')
            hlTools.className = `highlight-tools ${expandClass}`
            hlTools.innerHTML = expandEle + lang + copyEle
            utils.addEventListenerPjax(hlTools, 'click', ToolsFn)
            fragment.appendChild(hlTools)
        }
        if (limit && item.offsetHeight > limit + 30) {
            const ele = document.createElement('div')
            ele.className = 'code-expand-btn'
            ele.innerHTML = limitEle
            utils.addEventListenerPjax(ele, 'click', shrinkEle)
            fragment.appendChild(ele)
        }
        if (service === 'hl') {
            item.insertBefore(fragment, item.firstChild)
        } else {
            item.parentNode.insertBefore(fragment, item)
        }
    }
    if ($isPrismjs) {
        $syntaxHighlight.forEach(item => {
            const langName = item.getAttribute('data-language') || 'Code'
            const highlightLangEle = `<div class="code-lang">${langName}</div>`
            utils.wrap(item, 'figure', {
                class: 'highlight'
            })
            createEle(highlightLangEle, item)
        })
    } else {
        $syntaxHighlight.forEach(item => {
            let langName = item.getAttribute('class').split(' ')[1]
            if (langName === 'plain' || langName === undefined) langName = 'Code'
            const highlightLangEle = `<div class="code-lang">${langName}</div>`
            createEle(highlightLangEle, item, 'hl')
        })
    }
}

class toc {
    static init() {
        const tocContainer = document.getElementById('card-toc')
        if (!tocContainer || !tocContainer.querySelector('.toc a')) {
            tocContainer.style.display = 'none'
            return
        }
        const el = document.querySelectorAll('.toc a')
        el.forEach((e) => {
            e.addEventListener('click', (event) => {
                event.preventDefault()
                utils.scrollToDest(utils.getEleTop(document.getElementById(decodeURI((event.target.className === 'toc-text' ? event.target.parentNode.hash : event.target.hash).replace('#', '')))), 300)
            })
        })
        this.active(el)
    }

    static active(toc) {
        const $article = document.getElementById('article-container')
        const $tocContent = document.getElementById('toc-content')
        const list = $article.querySelectorAll('h1,h2,h3,h4,h5,h6')
        let detectItem = ''

        function autoScroll(el) {
            const activePosition = el.getBoundingClientRect().top
            const sidebarScrollTop = $tocContent.scrollTop
            if (activePosition > (document.documentElement.clientHeight - 100)) {
                $tocContent.scrollTop = sidebarScrollTop + 150
            }
            if (activePosition < 100) {
                $tocContent.scrollTop = sidebarScrollTop - 150
            }
        }

        function findHeadPosition(top) {
            if (top === 0) return false
            let currentIndex = ''
            list.forEach(function (ele, index) {
                if (top > utils.getEleTop(ele) - 80) {
                    currentIndex = index
                }
            })
            if (detectItem === currentIndex) return
            detectItem = currentIndex
            document.querySelectorAll('.toc .active').forEach((i) => {
                i.classList.remove('active')
            })
            const activeitem = toc[detectItem]
            if (activeitem) {
                let parent = toc[detectItem].parentNode
                activeitem.classList.add('active')
                autoScroll(activeitem)
                for (; !parent.matches('.toc'); parent = parent.parentNode) {
                    if (parent.matches('li')) parent.classList.add('active')
                }
            }
        }

        window.tocScrollFn = utils.throttle(function () {
            const currentTop = window.scrollY || document.documentElement.scrollTop
            findHeadPosition(currentTop)
        }, 100)
        window.addEventListener('scroll', tocScrollFn)
    }
}

class tabs {
    static init() {
        this.clickFnOfTabs();
        this.backToTop();
    }

    static clickFnOfTabs() {
        document.querySelectorAll('#article-container .tab > button').forEach((item) => {
            item.addEventListener('click', function (e) {
                const that = this;
                const $tabItem = that.parentNode;
                if (!$tabItem.classList.contains('active')) {
                    const $tabContent = $tabItem.parentNode.nextElementSibling;
                    const $siblings = utils.siblings($tabItem, '.active')[0];
                    $siblings && $siblings.classList.remove('active');
                    $tabItem.classList.add('active');
                    const tabId = that.getAttribute('data-href').replace('#', '');
                    const childList = [...$tabContent.children];
                    childList.forEach((item) => {
                        if (item.id === tabId) item.classList.add('active');
                        else item.classList.remove('active');
                    });
                }
            });
        });
    }

    static backToTop() {
        document.querySelectorAll('#article-container .tabs .tab-to-top').forEach((item) => {
            item.addEventListener('click', function () {
                utils.scrollToDest(utils.getEleTop(item.parentElement.parentElement.parentNode), 300);
            });
        });
    }

    static lureAddListener() {
        if (!GLOBAL_CONFIG.lure) return;
        let title = document.title;
        document.addEventListener('visibilitychange', () => {
            const {lure} = GLOBAL_CONFIG;
            if (document.visibilityState === 'hidden') {
                document.title = lure.jump;
            } else if (document.visibilityState === 'visible') {
                document.title = lure.back;
                setTimeout(() => {
                    document.title = title;
                }, 2000);
            }
        });
    }

    static expireAddListener() {
        const {expire} = GLOBAL_CONFIG;
        if (!expire) return;
        const post_date = document.querySelector('.post-meta-date time');
        if (!post_date) return;
        const ex = Math.ceil((new Date().getTime() - new Date(post_date.getAttribute('datetime')).getTime()) / 1000 / 60 / 60 / 24);
        if (expire.time > ex) return;
        const ele = document.createElement('div');
        ele.className = 'expire';
        ele.innerHTML = `<i class="solitude st-circle-exclamation-solid"></i>${expire.text_prev}${-(expire.time - ex)}${expire.text_next}`;
        const articleContainer = document.getElementById('article-container');
        articleContainer.insertAdjacentElement(expire.position === 'top' ? 'afterbegin' : 'beforeend', ele);
    }
}

window.refreshFn = () => {
    const {is_home, is_page, page, is_post} = PAGE_CONFIG;
    const {runtime, lazyload, lightbox, randomlink, covercolor, post_ai, lure, expire} = GLOBAL_CONFIG;
    const timeSelector = (is_home ? '.post-meta-date time' : is_post ? '.post-meta-date time' : '.datatime') + ', .webinfo-item time';
    document.body.setAttribute('data-type', page);
    sco.changeTimeFormat(document.querySelectorAll(timeSelector));
    runtime && sco.addRuntime();
    [scrollFn, sidebarFn, sco.hideCookie, sco.addPhotoFigcaption, sco.setTimeState, sco.tagPageActive, sco.categoriesBarActive, sco.listenToPageInputPress, sco.addNavBackgroundInit, sco.refreshWaterFall].forEach(fn => fn());
    lazyload.enable && utils.lazyloadImg();
    lightbox && utils.lightbox(document.querySelectorAll("#article-container img:not(.flink-avatar,.gallery-group img)"));
    randomlink && randomLinksList();
    post_ai && is_post && efu_ai.init();
    sco.switchComments();
    initObserver();
    if (is_home){
        showTodayCard();
        typeof updatePostsBasedOnComments === 'function' && updatePostsBasedOnComments()
    }
    if (is_post || is_page) {
        addHighlight();
        tabs.init();
    }
    if (is_post) {
        if (expire) tabs.expireAddListener();
    }
    if (covercolor.enable) coverColor();
    if (PAGE_CONFIG.toc) toc.init();
    if (lure) tabs.lureAddListener();
}
document.addEventListener('DOMContentLoaded', () => {
    [addCopyright, window.refreshFn, asideStatus, () => window.onscroll = percent, sco.initConsoleState].forEach(fn => fn());
});
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        sco.wasPageHidden = true;
    }
});
window.onkeydown = e => {
    const {keyCode, ctrlKey, shiftKey} = e;
    if (keyCode === 123 || (ctrlKey && shiftKey && keyCode === 67)) {
        utils.snackbarShow(GLOBAL_CONFIG.lang.f12, false, 3000);
    }
    if (keyCode === 27) {
        sco.hideConsole();
    }
};
document.addEventListener('copy', () => {
    utils.snackbarShow(GLOBAL_CONFIG.lang.copy.success, false, 3000);
});
