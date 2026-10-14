// The ONLY setting in the website. This is your Cloudflare Worker address, not your Apps Script URL.
// It is fine for this to be public: the Worker accepts only two locked-down requests from this site.
window.PORTAL_CONFIG = {
  api: 'https://attendant-portal.seamiragu.workers.dev/'
};
