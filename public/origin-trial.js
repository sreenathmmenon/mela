// This supplied token has isThirdParty=true. Chrome requires activation from
// an external script, even when that script shares the page's origin.
// The public token remains in index.html as the single source of truth.
if (location.origin === "https://mela-web-production.up.railway.app") {
  const source = document.querySelector('meta[http-equiv="origin-trial"]');
  if (source) document.head.appendChild(source.cloneNode(true));
}
