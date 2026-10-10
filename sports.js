/* ========================================================================== */
/* Sports feed                                                                */
/*                                                                            */
/* Keep sports-specific code here. To add another competition, follow the     */
/* examples in renderSportsFeed() near the bottom of this file.                */
/* ========================================================================== */

(() => {
  "use strict";

  const container = document.getElementById("sports-feed");
  const config = window.DASHBOARD_CONFIG;

  if (!container || !config) return;

  // Simulated fixtures for the public portfolio; intentionally not real results.
  if (config.mode === "demo") {
    const fixtureGroups = [
      { name: "Champions League", icon: "⚽", games: [
        [2, "Northbridge FC", "Coastal United"],
        [5, "Riverside Athletic", "Capital City FC"],
      ] },
      { name: "Europa League", icon: "⚽", games: [
        [3, "Harbor Town", "Mountain Rovers"],
      ] },
      { name: "EuroLeague", icon: "🏀", games: [
        [4, "Eastside Basketball", "Westport BC"],
      ] },
    ];
    const fragment = document.createDocumentFragment();
    fixtureGroups.forEach((group) => {
      const section = document.createElement("div");
      section.className = "sports-competition";
      const heading = document.createElement("h3");
      heading.className = "sports-title";
      heading.textContent = `${group.icon} ${group.name}`;
      section.append(heading);
      group.games.forEach(([offset, home, away]) => {
        const date = new Date();
        date.setDate(date.getDate() + offset);
        const row = document.createElement("div");
        row.className = "sports-game";
        const day = document.createElement("span");
        day.className = "game-date";
        day.textContent = date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
        const teams = document.createElement("span");
        teams.className = "game-teams";
        teams.textContent = `${home}  vs  ${away}`;
        const time = document.createElement("span");
        time.className = "game-time";
        time.textContent = "20:30";
        row.append(day, teams, time);
        section.append(row);
      });
      fragment.append(section);
    });
    container.replaceChildren(fragment);
    return;
  }

  /* ------------------------------------------------------------------------ */
  /* 1. Shared helpers                                                         */
  /* ------------------------------------------------------------------------ */

  function escapeHTML(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function googleSportsLink(query) {
    return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  }

  function formatEspnDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}${month}${day}`;
  }

  function formatLocalMatchTime(dateValue) {
    const date = new Date(dateValue);

    return {
      day: date.toLocaleDateString(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
      time: date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  }

  function renderCompetitionHeader(icon, name, scheduleQuery, standingsQuery) {
    return `
      <div class="sports-title">
        <span>${icon} ${escapeHTML(name)}</span>
        <div class="sports-links">
          <a href="${googleSportsLink(scheduleQuery)}" target="_blank" rel="noopener noreferrer">Schedule ↗</a>
          <a href="${googleSportsLink(standingsQuery)}" target="_blank" rel="noopener noreferrer">Standings ↗</a>
        </div>
      </div>
    `;
  }

  /* ------------------------------------------------------------------------ */
  /* 2. European football via ESPN                                             */
  /* ------------------------------------------------------------------------ */

  async function fetchFootballLeague(leagueSlug, dateRange) {
    const url =
      `https://site.api.espn.com/apis/site/v2/sports/soccer/` +
      `${leagueSlug}/scoreboard?dates=${dateRange}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`${leagueSlug} returned HTTP ${response.status}`);
      }

      const data = await response.json();
      return Array.isArray(data.events) ? data.events : [];
    } catch (error) {
      console.warn("Football feed error:", error);
      return [];
    }
  }

  function renderFootballGame(event) {
    const competition = event.competitions?.[0];
    const competitors = competition?.competitors || [];
    const home = competitors.find((team) => team.homeAway === "home");
    const away = competitors.find((team) => team.homeAway === "away");

    if (!home || !away) return "";

    const { day, time } = formatLocalMatchTime(event.date);
    const homeName = home.team?.displayName || home.team?.name || "Home";
    const awayName = away.team?.displayName || away.team?.name || "Away";

    return `
      <div class="sports-game">
        <div class="game-date">${escapeHTML(day)}</div>
        <div class="game-teams">
          ${escapeHTML(homeName)} <span>vs</span> ${escapeHTML(awayName)}
        </div>
        <div class="game-time">${escapeHTML(time)}</div>
      </div>
    `;
  }

  async function loadFootballCompetition({
    name,
    leagueSlugs,
    scheduleQuery,
    standingsQuery,
  }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 7);

    const dateRange = `${formatEspnDate(today)}-${formatEspnDate(endDate)}`;
    const leagueResults = await Promise.all(
      leagueSlugs.map((slug) => fetchFootballLeague(slug, dateRange)),
    );

    const uniqueEvents = new Map();

    leagueResults
      .flat()
      .filter((event) => {
        const eventDate = new Date(event.date);
        return eventDate >= today && eventDate <= endDate;
      })
      .forEach((event) => uniqueEvents.set(event.id, event));

    const events = [...uniqueEvents.values()].sort(
      (eventA, eventB) => new Date(eventA.date) - new Date(eventB.date),
    );

    const games = events.map(renderFootballGame).join("");

    return `
      <div class="sports-competition">
        ${renderCompetitionHeader("⚽", name, scheduleQuery, standingsQuery)}
        ${games || '<div class="no-games">No games in the next 7 days</div>'}
      </div>
    `;
  }

  /* ------------------------------------------------------------------------ */
  /* 3. EuroLeague basketball                                                  */
  /* ------------------------------------------------------------------------ */

  function getEuroleagueSeasonCode() {
    const now = new Date();
    const seasonStartYear = now.getMonth() >= 6
      ? now.getFullYear()
      : now.getFullYear() - 1;

    return `E${seasonStartYear}`;
  }

  function renderEuroleagueGame(game) {
    const { day, time } = formatLocalMatchTime(game.date);

    return `
      <div class="sports-game">
        <div class="game-date">${escapeHTML(day)}</div>
        <div class="game-teams">
          ${escapeHTML(game.home?.name || "Home")}
          <span>vs</span>
          ${escapeHTML(game.away?.name || "Away")}
        </div>
        <div class="game-time">${escapeHTML(time)}</div>
      </div>
    `;
  }

  async function loadEuroleague() {
    const seasonCode = getEuroleagueSeasonCode();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 7);

    try {
      const url =
        "https://feeds.incrowdsports.com/provider/euroleague-feeds/v2/" +
        `competitions/E/seasons/${seasonCode}/games?limit=500`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`EuroLeague returned HTTP ${response.status}`);
      }

      const data = await response.json();
      const games = (Array.isArray(data.data) ? data.data : [])
        .filter((game) => {
          const gameDate = new Date(game.date);
          return !Number.isNaN(gameDate.getTime()) && gameDate >= today && gameDate <= endDate;
        })
        .sort((gameA, gameB) => new Date(gameA.date) - new Date(gameB.date));

      return `
        <div class="sports-competition">
          ${renderCompetitionHeader(
            "🏀",
            "EuroLeague",
            "EuroLeague basketball schedule",
            "EuroLeague basketball standings",
          )}
          ${games.map(renderEuroleagueGame).join("") || '<div class="no-games">No games in the next 7 days</div>'}
        </div>
      `;
    } catch (error) {
      console.error("EuroLeague error:", error);

      return `
        <div class="sports-competition">
          <div class="sports-title">🏀 EuroLeague</div>
          <div class="sports-error">Could not load games.</div>
        </div>
      `;
    }
  }

  /* ------------------------------------------------------------------------ */
  /* 4. Major event shortcuts                                                  */
  /* Tip: add or remove event objects below; use null when the date is TBA.    */
  /* ------------------------------------------------------------------------ */

  const majorEvents = [
    {
      icon: "🏀",
      name: "FIBA Basketball World Cup 2027",
      date: "2027-08-27",
      search: "FIBA Basketball World Cup 2027 schedule",
    },
    {
      icon: "⚽",
      name: "FIFA World Cup 2030",
      date: "2030-06-13",
      search: "FIFA World Cup 2030 schedule",
    },
    {
      icon: "⚽",
      name: "UEFA EURO 2028",
      date: "2028-06-09",
      search: "UEFA Euro 2028 schedule",
    },
    {
      icon: "🏅",
      name: "Los Angeles Olympic Games 2028",
      date: "2028-07-14",
      search: "Los Angeles Olympics 2028 schedule",
    },
    {
      icon: "🏀",
      name: "EuroBasket 2029",
      date: null,
      search: "EuroBasket 2029 schedule",
    },
  ];

  function renderMajorEvents() {
    const eventLinks = majorEvents.map((event) => {
      const dateText = event.date
        ? new Date(`${event.date}T12:00:00`).toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "Date TBA";

      return `
        <a
          class="major-event"
          href="${googleSportsLink(event.search)}"
          target="_blank"
          rel="noopener noreferrer"
        >
          <div class="major-event-name">${event.icon} ${escapeHTML(event.name)}</div>
          <div class="major-event-date">${escapeHTML(dateText)}</div>
          <div class="major-event-link">Schedule ↗</div>
        </a>
      `;
    });

    return `
      <div class="major-events">
        <h3>📅 Major Sporting Events</h3>
        ${eventLinks.join("")}
      </div>
    `;
  }

  /* ------------------------------------------------------------------------ */
  /* 5. Main render                                                            */
  /* ------------------------------------------------------------------------ */

  async function renderSportsFeed() {
    container.textContent = "Loading upcoming sports...";

    const results = await Promise.all([
      loadFootballCompetition({
        name: "Champions League",
        leagueSlugs: ["uefa.champions", "uefa.champions_qual"],
        scheduleQuery: "UEFA Champions League schedule",
        standingsQuery: "UEFA Champions League standings",
      }),
      loadFootballCompetition({
        name: "Europa League",
        leagueSlugs: ["uefa.europa", "uefa.europa_qual"],
        scheduleQuery: "UEFA Europa League schedule",
        standingsQuery: "UEFA Europa League standings",
      }),
      loadEuroleague(),
    ]);

    container.innerHTML = `
      <div class="sports-week">
        <h3>🗓️ Next 7 Days</h3>
        ${results.join("")}
      </div>
      ${renderMajorEvents()}
    `;
  }

  renderSportsFeed();
  window.setInterval(renderSportsFeed, config.refreshMs.sports);
})();
