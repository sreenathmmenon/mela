/**
 * GoatCounter page-view counting.
 *
 * Off unless VITE_GOATCOUNTER_CODE is set, so local development and any
 * deployment that has not opted in send nothing.
 *
 * GoatCounter's own docs are explicit that it does NOT track hash changes or
 * pushState navigation by itself: its script counts once, on load. Mela puts
 * the projector view on a hash route (#/screen), so the default snippet would
 * silently under-count every stage visit. We therefore set `no_onload` and
 * count each route ourselves.
 *
 * No cookies and no personal data are involved — GoatCounter stores aggregate
 * counts rather than the IP or User-Agent they were derived from — so this
 * adds no consent banner. Referrers are recorded by GoatCounter automatically.
 */

const CODE = import.meta.env.VITE_GOATCOUNTER_CODE as string | undefined;

declare global {
  interface Window {
    goatcounter?: {
      no_onload?: boolean;
      count?: (vars: { path: string; title?: string }) => void;
    };
  }
}

/** The path as GoatCounter should record it, hash route included. */
function currentPath(): string {
  return location.pathname + location.search + location.hash;
}

let lastCounted = "";

function count(): void {
  const path = currentPath();
  // Guard against double counting: a hashchange and a popstate can both fire
  // for one navigation.
  if (path === lastCounted) return;
  lastCounted = path;
  window.goatcounter?.count?.({ path });
}

export function initAnalytics(): void {
  if (!CODE || typeof window === "undefined") return;

  window.goatcounter = { ...window.goatcounter, no_onload: true };

  const script = document.createElement("script");
  script.async = true;
  script.dataset.goatcounter = `https://${CODE}.goatcounter.com/count`;
  script.src = "https://gc.zgo.at/count.js";
  // Count the first view only once the counter itself has loaded, otherwise
  // window.goatcounter.count does not exist yet and the landing view is lost.
  script.addEventListener("load", count);
  document.head.appendChild(script);

  window.addEventListener("hashchange", count);
  window.addEventListener("popstate", count);
}
