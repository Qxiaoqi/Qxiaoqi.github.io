(() => {
  const STORAGE_KEY = "theme-preset";
  const DEFAULT_PRESET = "phantom";
  const PRESETS = {
    light: {
      theme: "light",
      uiPreset: "default",
      label: "默认主题",
      hint: "保留现有浅色样式"
    },
    dark: {
      theme: "dark",
      uiPreset: "default",
      label: "深色主题",
      hint: "保留现有深色样式"
    },
    phantom: {
      theme: "dark",
      uiPreset: "phantom",
      label: "Phantom",
      hint: "P5 风格红黑白预设"
    }
  };

  const root = document.documentElement;

  const getCurrentPreset = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && PRESETS[stored]) return stored;
    const currentUiPreset = root.getAttribute("data-ui-preset");
    if (currentUiPreset === "phantom") return "phantom";
    const currentTheme = root.getAttribute("data-theme");
    if (currentTheme === "dark") return "dark";
    if (currentTheme === "light") return "light";
    return DEFAULT_PRESET;
  };

  const writeThemeCache = theme => {
    if (window.utils?.saveToLocal?.set) {
      window.utils.saveToLocal.set("theme", theme, 365);
      return;
    }
    localStorage.setItem(
      "theme",
      JSON.stringify({ value: theme, expiry: Date.now() + 31536000000 })
    );
  };

  const setThemeMeta = () => {
    const styles = getComputedStyle(root);
    const color =
      styles.getPropertyValue("--efu-card-bg").trim() ||
      styles.getPropertyValue("--efu-background").trim();
    if (!color) return;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", color);
    document
      .querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
      ?.setAttribute("content", color);
  };

  const notifyThemeChange = theme => {
    const themeChange = window.globalFn?.themeChange || {};
    Object.keys(themeChange).forEach(key => {
      try {
        themeChange[key](theme);
      } catch (error) {
        console.error("themeChange hook failed:", key, error);
      }
    });
  };

  const syncSwitcher = preset => {
    const switcher = document.getElementById("theme-preset-switcher");
    if (!switcher) return;
    switcher
      .querySelectorAll(".theme-switcher-option")
      .forEach(option =>
        option.classList.toggle("is-active", option.dataset.preset === preset)
      );
    const current = switcher.querySelector("[data-current-theme]");
    if (current) current.textContent = PRESETS[preset].label;
  };

  const applyPreset = (preset, options = {}) => {
    const config = PRESETS[preset] || PRESETS.light;
    const { persist = true, announce = true } = options;
    const prevTheme = root.getAttribute("data-theme");
    root.setAttribute("data-theme", config.theme);
    root.setAttribute("data-ui-preset", config.uiPreset);

    if (persist) {
      localStorage.setItem(STORAGE_KEY, preset);
      writeThemeCache(config.theme);
    }

    syncSwitcher(preset);
    if (typeof rm === "object") rm.mode(config.theme === "dark");
    if (prevTheme !== config.theme) {
      notifyThemeChange(config.theme);
    }
    setThemeMeta();

    if (announce && window.utils?.snackbarShow) {
      window.utils.snackbarShow(config.label, false, 1800);
    }
  };

  const ensureSwitcher = () => {
    let switcher = document.getElementById("theme-preset-switcher");
    if (!switcher) {
      switcher = document.createElement("section");
      switcher.id = "theme-preset-switcher";
      switcher.setAttribute("aria-label", "主题切换");
      switcher.innerHTML = `
        <button class="theme-switcher-toggle" type="button" aria-expanded="false" aria-controls="theme-switcher-panel">
          <span class="theme-switcher-label">Theme</span>
          <strong data-current-theme></strong>
        </button>
        <div class="theme-switcher-panel" id="theme-switcher-panel">
          <button class="theme-switcher-option" type="button" data-preset="light">
            默认主题
            <small>当前浅色风格</small>
          </button>
          <button class="theme-switcher-option" type="button" data-preset="dark">
            深色主题
            <small>保留现有深色模式</small>
          </button>
          <button class="theme-switcher-option" type="button" data-preset="phantom">
            Phantom
            <small>P5 风格红黑白预设</small>
          </button>
        </div>
      `;

      const toggle = switcher.querySelector(".theme-switcher-toggle");
      toggle.addEventListener("click", () => {
        const open = switcher.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });

      switcher.querySelectorAll(".theme-switcher-option").forEach(option => {
        option.addEventListener("click", () => {
          applyPreset(option.dataset.preset);
          switcher.classList.remove("is-open");
          toggle.setAttribute("aria-expanded", "false");
        });
      });

      document.addEventListener("click", event => {
        if (!switcher.contains(event.target)) {
          switcher.classList.remove("is-open");
          toggle.setAttribute("aria-expanded", "false");
        }
      });
    }

    const target = document.getElementById("blog_name");
    if (target) {
      switcher.classList.add("is-in-nav");
      if (switcher.parentNode !== target) {
        target.appendChild(switcher);
      }
    } else {
      switcher.classList.remove("is-in-nav");
      if (switcher.parentNode !== document.body) {
        document.body.appendChild(switcher);
      }
    }
  };

  const patchDarkModeToggle = () => {
    if (!window.sco || window.sco.__phantomPatched) return;
    window.sco.__phantomPatched = true;
    window.sco.switchDarkMode = () => {
      const current = getCurrentPreset();
      const next = current === "light" ? "dark" : "light";
      applyPreset(next);
      if (typeof rm === "object") rm.hideRightMenu();
    };
  };

  const boot = () => {
    ensureSwitcher();
    patchDarkModeToggle();
    applyPreset(getCurrentPreset(), { announce: false });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }

  document.addEventListener("pjax:complete", () => {
    ensureSwitcher();
    patchDarkModeToggle();
    syncSwitcher(getCurrentPreset());
    setThemeMeta();
  });
})();
