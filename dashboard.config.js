/*
 * Public GitHub Pages configuration.
 * Demo mode intentionally makes NO requests to self-hosted services or paid APIs.
 * Real integration code is retained for educational/local testing only.
 * Never commit actual tokens or API keys: browser JavaScript is public.
 */
window.DASHBOARD_CONFIG = Object.freeze({
  mode: "demo",
  searchEngineUrl: "https://duckduckgo.com/?q=",
  services: {
    homeAssistant: { baseUrl: "", entityId: "light.demo", token: "" },
    qbittorrentStatsUrl: "",
    tautulli: { baseUrl: "", apiKey: "" },
  },
  feeds: { tmdbApiKey: "", rawgApiKey: "" },
  refreshMs: { clock: 1000, qbittorrent: 15000, nowPlaying: 15000, sports: 21600000 },
});
