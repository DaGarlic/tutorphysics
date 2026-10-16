// Where the portal server lives. Set once after the server is deployed.
window.PORTAL_API = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? (window.PORTAL_API_LOCAL || "http://localhost:8787") : "https://portal-production-c3d3.up.railway.app";
