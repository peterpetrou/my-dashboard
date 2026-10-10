/* Demo mode: intentionally deterministic, locally generated example data. */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const lightInitial = { isOn: true, brightness: 128 };
  let light = { ...lightInitial };
  let rememberedBrightness = lightInitial.brightness;

  function updateLightUI() {
    const brightness = light.isOn ? light.brightness : 0;
    $("bedroom-brightness-slider").value = brightness;
    $("bedroom-brightness-percent").value = Math.round(brightness * 100 / 255);
    const toggle = $("bedroom-toggle");
    toggle.classList.toggle("on", light.isOn);
    toggle.classList.toggle("off", !light.isOn);
    toggle.setAttribute("aria-pressed", String(light.isOn));
    toggle.querySelector("span").textContent = light.isOn ? "Turn off" : "Turn on";
    $("light-indicator").classList.toggle("light-on", light.isOn);
    $("entity-light").textContent = light.isOn
      ? `On · ${Math.round(light.brightness * 100 / 255)}%` : "Off";
  }

  function setBrightness(brightness) {
    const clamped = Math.max(0, Math.min(255, Math.round(Number(brightness) || 0)));
    light = { isOn: clamped > 0, brightness: clamped };
    if (clamped > 0) rememberedBrightness = clamped;
    updateLightUI();
  }

  function setupLight() {
    $("bedroom-toggle").addEventListener("click", () => {
      light = light.isOn
        ? { isOn: false, brightness: 0 }
        : { isOn: true, brightness: rememberedBrightness || 128 };
      updateLightUI();
    });
    $("bedroom-brightness-slider").addEventListener("input", (event) => {
      setBrightness(event.target.value);
    });
    $("bedroom-brightness-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const value = Number($("bedroom-brightness-percent").value);
      if (!Number.isFinite(value)) return;
      setBrightness(Math.max(0, Math.min(100, value)) * 255 / 100);
    });
    updateLightUI();
  }

  function addElement(parent, tag, className, value) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (value !== undefined) el.textContent = value;
    parent.append(el);
    return el;
  }

  function setupStats() {
    const parent = $("qbittorrent-stats");
    parent.replaceChildren();
    const status = addElement(parent, "div", "connection-row");
    addElement(status, "span", "connection-dot");
    addElement(status, "strong", "", "Offline snapshot");
    const grid = addElement(parent, "div", "stat-grid");
    [["Download", "6.82 MB/s", "↓"], ["Upload", "1.24 MB/s", "↑"],
      ["DHT nodes", "286", "◉"], ["Speed limits", "Unlimited", "∞"]]
      .forEach(([label, value, symbol]) => {
        const tile = addElement(grid, "div", "stat-tile");
        addElement(tile, "span", "stat-label", `${symbol} ${label}`);
        addElement(tile, "strong", "", value);
      });
  }

  function setupMedia() {
    const parent = $("now-playing");
    parent.replaceChildren();
    const sessions = [
      { initials: "A", user: "Viewer 1", title: "Movie preview", type: "Movie", method: "Direct Play", progress: 62 },
      { initials: "B", user: "Viewer 2", title: "TV episode preview", type: "Episode", method: "Direct Stream", progress: 31 },
    ];
    sessions.forEach((session) => {
      const row = addElement(parent, "div", "media-row");
      addElement(row, "div", "media-avatar", session.initials);
      const body = addElement(row, "div", "media-body");
      addElement(body, "span", "media-user", session.user);
      addElement(body, "strong", "media-title", session.title);
      addElement(body, "span", "media-meta", `${session.type} · ${session.method}`);
      const progress = addElement(body, "div", "meter media-progress");
      const bar = addElement(progress, "i");
      bar.style.width = `${session.progress}%`;
    });
  }

  function setupFeeds() {
    const groups = [
      ["cinema-feed", "Movie previews", [
        ["Upcoming movie A", "Coming soon"],
        ["Upcoming movie B", "Coming soon"],
      ]],
      ["games-feed", "Game previews", [
        ["Upcoming game A", "Date TBA"],
        ["Upcoming game B", "Date TBA"],
      ]],
    ];
    groups.forEach(([id, heading, entries]) => {
      const parent = $(id);
      parent.replaceChildren();
      addElement(parent, "h3", "feed-subheading", heading);
      entries.forEach(([title, description]) => {
        const row = addElement(parent, "div", "feed-item");
        addElement(row, "strong", "", title);
        addElement(row, "span", "", description);
      });
    });
  }

  function start() {
    setupStats();
    setupLight();
    setupMedia();
    setupFeeds();
    $("reset-demo").addEventListener("click", () => {
      light = { ...lightInitial };
      rememberedBrightness = lightInitial.brightness;
      updateLightUI();
      document.querySelectorAll("[data-collapsible-target]").forEach((button) => {
        button.setAttribute("aria-expanded", "false");
        $(button.dataset.collapsibleTarget)?.classList.remove("is-open");
      });
      const search = $("bookmarkSearch");
      search.value = "";
      $("suggestions").replaceChildren();
      $("suggestions").classList.remove("is-visible");
      search.setAttribute("aria-expanded", "false");
    });
  }

  window.DASHBOARD_DEMO = Object.freeze({ start });
})();
