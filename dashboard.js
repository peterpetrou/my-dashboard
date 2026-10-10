/* ========================================================================== */
/* Dashboard features                                                         */
/*                                                                            */
/* Configuration lives in dashboard.config.js. Each feature below has its own */
/* clearly marked section so it can be edited or removed independently.       */
/* ========================================================================== */

(() => {
  "use strict";

  const config = window.DASHBOARD_CONFIG;

  if (!config) {
    console.error("Dashboard configuration was not loaded.");
    return;
  }

  const getElement = (id) => document.getElementById(id);

  function isConfigured(value) {
    return typeof value === "string" && value.trim() !== "" && !/^(PASTE_|YOUR_|YOUR |\(YOUR|HTTP:\/\/YOUR|HTTPS:\/\/YOUR)/i.test(value.trim());
  }

  function showStatus(element, message, isError = false) {
    element.replaceChildren();

    const status = document.createElement("p");
    status.className = `status-message${isError ? " status-message--error" : ""}`;
    status.textContent = message;
    element.append(status);
  }

  function openInNewTab(url) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  /* ------------------------------------------------------------------------ */
  /* 1. Clock                                                                  */
  /* ------------------------------------------------------------------------ */

  function initializeClock() {
    const clock = getElement("clock");
    if (!clock) return;

    const dateOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };

    function updateClock() {
      const now = new Date();
      const date = now.toLocaleDateString(undefined, dateOptions);
      const time = now.toLocaleTimeString();

      clock.replaceChildren(
        document.createTextNode(date),
        document.createElement("br"),
        document.createTextNode(time),
      );
    }

    updateClock();
    window.setInterval(updateClock, config.refreshMs.clock);
  }

  /* ------------------------------------------------------------------------ */
  /* 2. Collapsible panels                                                     */
  /* Tip: add data-collapsible-target="elementId" to any matching button.     */
  /* ------------------------------------------------------------------------ */

  function initializeCollapsiblePanels() {
    document.querySelectorAll("[data-collapsible-target]").forEach((button) => {
      const targetId = button.dataset.collapsibleTarget;
      const target = getElement(targetId);
      if (!target) return;

      button.addEventListener("click", () => {
        const isOpen = target.classList.toggle("is-open");
        button.setAttribute("aria-expanded", String(isOpen));
      });
    });
  }

  /* ------------------------------------------------------------------------ */
  /* 3. Weather widget loader                                                  */
  /* ------------------------------------------------------------------------ */

  function loadWeatherWidget() {
    if (getElement("weatherwidget-io-js")) return;

    const script = document.createElement("script");
    script.id = "weatherwidget-io-js";
    script.src = "https://weatherwidget.io/js/widget.min.js";
    script.async = true;
    document.head.append(script);
  }

  /* ------------------------------------------------------------------------ */
  /* 4. Home Assistant light                                                   */
  /* ------------------------------------------------------------------------ */

  function initializeHomeAssistant() {
    const settings = config.services.homeAssistant;
    const slider = getElement("bedroom-brightness-slider");
    const percent = getElement("bedroom-brightness-percent");
    const percentForm = getElement("bedroom-brightness-form");
    const toggleButton = getElement("bedroom-toggle");
    const widget = getElement("bedroom-light");

    if (!slider || !percent || !percentForm || !toggleButton || !widget) return;

    let expectedState = null;

    function brightnessToPercent(value) {
      return Math.round((Number(value) / 255) * 100);
    }

    function renderLightState(isOn, brightness) {
      const safeBrightness = Math.max(0, Math.min(255, Number(brightness) || 0));
      const displayedBrightness = isOn ? safeBrightness : 0;

      slider.value = displayedBrightness;
      percent.value = brightnessToPercent(displayedBrightness);
      toggleButton.classList.toggle("on", isOn);
      toggleButton.classList.toggle("off", !isOn);
      toggleButton.setAttribute("aria-pressed", String(isOn));
    }

    function updateBrightnessLabel(value) {
      percent.value = brightnessToPercent(value);
    }

    function markExpectedState(isOn, brightness) {
      expectedState = {
        isOn,
        brightness,
        expiresAt: Date.now() + 3000,
      };
      widget.classList.add("is-updating");
    }

    function stateMatchesExpected(isOn, brightness) {
      if (!expectedState || expectedState.isOn !== isOn) return false;
      return !isOn || Math.abs(brightness - expectedState.brightness) <= 1;
    }

    function scheduleStateConfirmation() {
      window.setTimeout(refreshLightState, 500);
      window.setTimeout(refreshLightState, 1500);
    }

    function disableControls(message) {
      slider.disabled = true;
      percent.disabled = true;
      percentForm.querySelector("button").disabled = true;
      toggleButton.disabled = true;

      const existingStatus = getElement("home-assistant-status");
      const status = existingStatus || document.createElement("p");
      status.id = "home-assistant-status";
      status.className = "status-message status-message--error";
      status.textContent = message;

      if (!existingStatus) widget.append(status);
    }

    function enableControls() {
      slider.disabled = false;
      percent.disabled = false;
      percentForm.querySelector("button").disabled = false;
      toggleButton.disabled = false;
      getElement("home-assistant-status")?.remove();
    }

    if (!isConfigured(settings.token)) {
      disableControls("Add a new Home Assistant token in dashboard.config.js.");
      return;
    }

    async function setBrightnessFromPercent(value) {
      let percentage = Math.round(Number(value));

      if (!Number.isFinite(percentage)) {
        percent.value = brightnessToPercent(slider.value);
        return;
      }

      percentage = Math.max(0, Math.min(100, percentage));
      const brightness = Math.round((percentage / 100) * 255);
      const isOn = percentage > 0;

      renderLightState(isOn, brightness);
      markExpectedState(isOn, brightness);

      try {
        if (!isOn) {
          await request("/api/services/light/turn_off", {
            method: "POST",
            body: JSON.stringify({
              entity_id: settings.entityId,
            }),
          });
        } else {
          await request("/api/services/light/turn_on", {
            method: "POST",
            body: JSON.stringify({
              entity_id: settings.entityId,
              brightness: brightness,
            }),
          });
        }

        scheduleStateConfirmation();
      } catch (error) {
        expectedState = null;
        widget.classList.remove("is-updating");
        await refreshLightState({ force: true });
        console.error("Home Assistant brightness error:", error);
      }
    }

    async function request(path, options = {}) {
      const response = await fetch(`${settings.baseUrl}${path}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${settings.token}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`Home Assistant returned HTTP ${response.status}`);
      }

      return response;
    }

    async function refreshLightState({ force = false } = {}) {
      try {
        const response = await request(`/api/states/${settings.entityId}`);
        const state = await response.json();
        const isOn = state.state === "on";
        const reportedBrightness = Number(state.attributes?.brightness);
        const brightness = Number.isFinite(reportedBrightness) && reportedBrightness > 0
          ? reportedBrightness
          : (isOn ? 255 : 0);

        if (!force && document.activeElement === percent) {
          return;
        }

        if (
          !force
          && expectedState
          && Date.now() < expectedState.expiresAt
          && !stateMatchesExpected(isOn, brightness)
        ) {
          return;
        }

        expectedState = null;
        widget.classList.remove("is-updating");
        enableControls();
        renderLightState(isOn, brightness);
      } catch (error) {
        disableControls("Could not connect to Home Assistant.");
        console.error("Home Assistant error:", error);
      }
    }

    percentForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      await setBrightnessFromPercent(percent.value);
      percent.blur();
    });

    percent.addEventListener("input", (event) => {
      const percentage = Number(event.currentTarget.value);
      if (!Number.isFinite(percentage)) return;

      slider.value = Math.round((Math.max(0, Math.min(100, percentage)) / 100) * 255);
    });

    slider.addEventListener("input", (event) => {
      updateBrightnessLabel(event.target.value);
    });

    slider.addEventListener("change", async (event) => {
      const brightness = Number(event.currentTarget.value);
      renderLightState(brightness > 0, brightness);
      markExpectedState(brightness > 0, brightness);

      try {
        const action = brightness > 0 ? "turn_on" : "turn_off";
        const body = brightness > 0
          ? { entity_id: settings.entityId, brightness }
          : { entity_id: settings.entityId };

        await request(`/api/services/light/${action}`, {
          method: "POST",
          body: JSON.stringify(body),
        });
        scheduleStateConfirmation();
      } catch (error) {
        expectedState = null;
        widget.classList.remove("is-updating");
        await refreshLightState({ force: true });
        console.error("Home Assistant brightness error:", error);
      }
    });

    toggleButton.addEventListener("click", async () => {
      const action = toggleButton.classList.contains("off") ? "turn_on" : "turn_off";
      const isTurningOn = action === "turn_on";
      const brightness = Number(slider.value) || 128;

      renderLightState(isTurningOn, brightness);
      markExpectedState(isTurningOn, brightness);

      try {
        await request(`/api/services/light/${action}`, {
          method: "POST",
          body: JSON.stringify({ entity_id: settings.entityId }),
        });
        scheduleStateConfirmation();
      } catch (error) {
        expectedState = null;
        widget.classList.remove("is-updating");
        await refreshLightState({ force: true });
        console.error("Home Assistant toggle error:", error);
      }
    });

    updateBrightnessLabel(slider.value);
    refreshLightState();
    window.setInterval(refreshLightState, 2000);
  }

  /* ------------------------------------------------------------------------ */
  /* 5. qBittorrent statistics                                                 */
  /* ------------------------------------------------------------------------ */

  function formatSpeed(bytesPerSecond) {
    const bytes = Number(bytesPerSecond) || 0;

    if (bytes >= 1024 * 1024) {
      return `${(bytes / 1024 / 1024).toFixed(2)} MB/s`;
    }

    return `${(bytes / 1024).toFixed(1)} KB/s`;
  }

  function formatLimit(bytesPerSecond) {
    return Number(bytesPerSecond) > 0 ? formatSpeed(bytesPerSecond) : "Unlimited";
  }

  function renderStatsList(container, rows) {
    const list = document.createElement("ul");
    list.className = "stats-list";

    rows.forEach(([label, value]) => {
      const item = document.createElement("li");
      const title = document.createElement("strong");
      title.textContent = `${label}: `;
      item.append(title, document.createTextNode(String(value)));
      list.append(item);
    });

    container.replaceChildren(list);
  }

  function initializeQbittorrentStats() {
    const container = getElement("qbittorrent-stats");
    const statsUrl = config.services.qbittorrentStatsUrl;
    if (!container || !statsUrl) return;

    async function refreshStats() {
      try {
        const response = await fetch(statsUrl);

        if (!response.ok) {
          throw new Error(`qBittorrent returned HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
          throw new Error("The qBittorrent proxy returned an error.");
        }

        const connected = data.connection_status === "connected";
        renderStatsList(container, [
          ["Status", connected ? "🟢 Connected" : "🔴 Disconnected"],
          ["Download", formatSpeed(data.dl_info_speed)],
          ["Upload", formatSpeed(data.up_info_speed)],
          ["DHT Nodes", data.dht_nodes ?? "N/A"],
          ["Download Limit", formatLimit(data.dl_rate_limit)],
          ["Upload Limit", formatLimit(data.up_rate_limit)],
          ["External IP", data.last_external_address_v4 || "N/A"],
        ]);
      } catch (error) {
        showStatus(container, "Could not connect to qBittorrent.", true);
        console.error("qBittorrent stats error:", error);
      }
    }

    refreshStats();
    window.setInterval(refreshStats, config.refreshMs.qbittorrent);
  }

  /* ------------------------------------------------------------------------ */
  /* 6. Plex / Tautulli now playing                                            */
  /* ------------------------------------------------------------------------ */

  function getPlaybackFlag(transcodeDecision) {
    switch (transcodeDecision?.toLowerCase()) {
      case "transcode":
        return "🔴 Transcode";
      case "copy":
      case "direct stream":
        return "🔵 Direct Stream";
      case "direct play":
        return "🟢 Direct Play";
      default:
        return "⚪ Unknown";
    }
  }

  function formatPlaybackPosition(totalSeconds) {
    const seconds = Math.max(0, Number(totalSeconds) || 0);
    const hoursPart = Math.floor(seconds / 3600);
    const minutesPart = Math.floor((seconds % 3600) / 60);
    const secondsPart = Math.floor(seconds % 60);

    return [hoursPart, minutesPart, secondsPart]
      .map((part) => String(part).padStart(2, "0"))
      .join(":");
  }

  function initializeNowPlaying() {
    const container = getElement("now-playing");
    const settings = config.services.tautulli;
    if (!container) return;

    if (!isConfigured(settings.apiKey)) {
      showStatus(container, "Add your Tautulli API key in dashboard.config.js.");
      return;
    }

    function renderSessions(sessions) {
      if (sessions.length === 0) {
        showStatus(container, "No one is watching anything right now.");
        return;
      }

      const list = document.createElement("ul");

      sessions.forEach((session) => {
        const item = document.createElement("li");
        item.className = "session";

        const logo = document.createElement("img");
        logo.src = "https://tautulli.com/images/logo-circle.png";
        logo.alt = "";

        const details = document.createElement("div");
        details.className = "session-details";

        const title = document.createElement("h3");
        const activity = session.media_type?.toLowerCase() === "track"
          ? "is listening to"
          : "is watching";
        title.textContent = `${session.username || session.user || "Someone"} ${activity} `;

        const mediaTitle = document.createElement("em");
        mediaTitle.textContent = session.full_title || "Unknown title";
        title.append(mediaTitle);

        const playback = document.createElement("small");
        playback.textContent = `Playback position: ${formatPlaybackPosition(session.view_offset)}`;

        const playbackType = document.createElement("small");
        playbackType.className = "flag";
        playbackType.textContent = getPlaybackFlag(session.transcode_decision);

        const quality = document.createElement("small");
        quality.textContent = `Quality: ${session.video_resolution || "Unknown"}`;

        details.append(
          title,
          playback,
          document.createElement("br"),
          playbackType,
          document.createElement("br"),
          quality,
        );
        item.append(logo, details);
        list.append(item);
      });

      container.replaceChildren(list);
    }

    async function refreshNowPlaying() {
      try {
        const url = new URL("/api/v2", settings.baseUrl);
        url.searchParams.set("apikey", settings.apiKey);
        url.searchParams.set("cmd", "get_activity");

        const response = await fetch(url);
        if (!response.ok) throw new Error(`Tautulli returned HTTP ${response.status}`);

        const data = await response.json();
        renderSessions(data.response?.data?.sessions || []);
      } catch (error) {
        showStatus(container, "Could not load Plex activity.", true);
        console.error("Tautulli API error:", error);
      }
    }

    refreshNowPlaying();
    window.setInterval(refreshNowPlaying, config.refreshMs.nowPlaying);
  }

  /* ------------------------------------------------------------------------ */
  /* 7. Upcoming movies and games                                              */
  /* ------------------------------------------------------------------------ */

  function renderLinkFeed(container, headingText, entries) {
    const heading = document.createElement("h3");
    heading.textContent = headingText;

    const list = document.createElement("ul");

    entries.forEach(({ label, url }) => {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = label;
      item.append(link);
      list.append(item);
    });

    container.replaceChildren(heading, list);
  }

  async function loadCinemaFeed() {
    const container = getElement("cinema-feed");
    const apiKey = config.feeds.tmdbApiKey;
    if (!container) return;

    if (!isConfigured(apiKey)) {
      showStatus(container, "Add your TMDB API key in dashboard.config.js.");
      return;
    }

    try {
      const url = new URL("https://api.themoviedb.org/3/movie/upcoming");
      url.searchParams.set("api_key", apiKey);
      url.searchParams.set("language", "en-US");

      const response = await fetch(url);
      if (!response.ok) throw new Error(`TMDB returned HTTP ${response.status}`);

      const data = await response.json();
      const movies = Array.isArray(data.results) ? data.results.slice(0, 5) : [];

      renderLinkFeed(
        container,
        "Upcoming Movies",
        movies.map((movie) => ({
          label: `${movie.title} – Release: ${movie.release_date || "TBA"}`,
          url: `https://www.themoviedb.org/movie/${movie.id}`,
        })),
      );
    } catch (error) {
      showStatus(container, "Could not load upcoming movies.", true);
      console.error("TMDB feed error:", error);
    }
  }

  async function loadGamesFeed() {
    const container = getElement("games-feed");
    const apiKey = config.feeds.rawgApiKey;
    if (!container) return;

    if (!isConfigured(apiKey)) {
      showStatus(container, "Add your RAWG API key in dashboard.config.js.");
      return;
    }

    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    try {
      const url = new URL("https://api.rawg.io/api/games");
      url.searchParams.set("key", apiKey);
      url.searchParams.set(
        "dates",
        `${today.toISOString().slice(0, 10)},${nextMonth.toISOString().slice(0, 10)}`,
      );
      url.searchParams.set("ordering", "-added");
      url.searchParams.set("page_size", "5");

      const response = await fetch(url);
      if (!response.ok) throw new Error(`RAWG returned HTTP ${response.status}`);

      const data = await response.json();
      const games = Array.isArray(data.results) ? data.results : [];

      renderLinkFeed(
        container,
        "Upcoming Major Game Titles",
        games.map((game) => ({
          label: `${game.name} – Release: ${game.released || "TBA"}`,
          url: `https://rawg.io/games/${game.slug}`,
        })),
      );
    } catch (error) {
      showStatus(container, "Could not load upcoming games.", true);
      console.error("RAWG feed error:", error);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* 8. Bookmark and web search                                                */
  /* ------------------------------------------------------------------------ */

  function initializeSearch() {
    const input = getElement("bookmarkSearch");
    const suggestions = getElement("suggestions");
    if (!input || !suggestions) return;

    let currentIndex = -1;

    function getItems() {
      return [...suggestions.querySelectorAll(".suggestion")];
    }

    function setSuggestionsVisible(isVisible) {
      suggestions.classList.toggle("is-visible", isVisible);
      input.setAttribute("aria-expanded", String(isVisible));
    }

    function clearHighlight() {
      getItems().forEach((item) => item.classList.remove("is-highlighted"));
    }

    function highlight(index) {
      const items = getItems();
      clearHighlight();

      if (items[index]) {
        items[index].classList.add("is-highlighted");
        items[index].scrollIntoView({ block: "nearest" });
      }
    }

    function searchWeb(term) {
      openInNewTab(config.searchEngineUrl + encodeURIComponent(term));
      input.value = "";
      setSuggestionsVisible(false);
    }

    function createSuggestion(label, modifierClass, onSelect) {
      const item = document.createElement("li");
      item.className = `suggestion${modifierClass ? ` ${modifierClass}` : ""}`;
      item.role = "option";
      item.tabIndex = -1;
      item.textContent = label;
      item.addEventListener("click", (event) => {
        event.stopPropagation();
        onSelect();
      });
      return item;
    }

    input.addEventListener("input", () => {
      const term = input.value.trim();
      const lowerTerm = term.toLowerCase();
      suggestions.replaceChildren();
      currentIndex = -1;

      if (!term) {
        setSuggestionsVisible(false);
        return;
      }

      document.querySelectorAll(".bookmark").forEach((bookmark) => {
        const name = bookmark.querySelector("span")?.textContent?.trim() || "";
        const href = bookmark.getAttribute("href");

        if (href && name.toLowerCase().includes(lowerTerm)) {
          suggestions.append(
            createSuggestion(`🔖 ${name}`, "", () => {
              openInNewTab(href);
              input.value = "";
              setSuggestionsVisible(false);
            }),
          );
        }
      });

      suggestions.append(
        createSuggestion(
          `🔍 Search DuckDuckGo for “${term}”`,
          "suggestion--search",
          () => searchWeb(term),
        ),
      );
      setSuggestionsVisible(true);
    });

    input.addEventListener("keydown", (event) => {
      const items = getItems();

      if (event.key === "ArrowDown" && items.length) {
        event.preventDefault();
        currentIndex = (currentIndex + 1) % items.length;
        highlight(currentIndex);
      } else if (event.key === "ArrowUp" && items.length) {
        event.preventDefault();
        currentIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
        highlight(currentIndex);
      } else if (event.key === "Enter") {
        const term = input.value.trim();
        if (!term) return;

        event.preventDefault();
        if (currentIndex >= 0 && items[currentIndex]) {
          items[currentIndex].click();
        } else {
          searchWeb(term);
        }
      } else if (event.key === "Escape") {
        setSuggestionsVisible(false);
      }
    });

    document.addEventListener("click", (event) => {
      if (!event.target.closest(".search-section")) {
        setSuggestionsVisible(false);
      }
    });
    document.addEventListener("keydown", (event) => {
      const tag = document.activeElement?.tagName;
      if (event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey
          && !["INPUT", "TEXTAREA", "SELECT"].includes(tag)) {
        event.preventDefault();
        input.focus();
      }
    });
  }

  /* ------------------------------------------------------------------------ */
  /* 9. Start the dashboard                                                    */
  /* ------------------------------------------------------------------------ */

  initializeClock();
  initializeCollapsiblePanels();
  initializeSearch();
  if (config.mode === "demo") {
    window.DASHBOARD_DEMO?.start();
  } else {
    // Original adapters preserved for local development/reference.
    // WARNING: never use real API keys in a public browser deployment.
    initializeHomeAssistant();
    initializeQbittorrentStats();
    initializeNowPlaying();
    loadCinemaFeed();
    loadGamesFeed();
  }
})();
