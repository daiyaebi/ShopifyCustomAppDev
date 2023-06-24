const nonce = require("nonce");
const createNonce = nonce();

const oAuthQueryString = (ctx, options, callbackPath) => {
  const { host } = ctx;
  const { scopes = [], apiKey, accessMode } = options;

  const requestNonce = createNonce();

  const redirectParams = {
    state: requestNonce,
    scope: scopes.join(", "),
    client_id: apiKey,
    redirect_uri: `https://${host}${callbackPath}`,
  };

  if (accessMode === "online") {
    redirectParams["grant_options[]"] = "per-user";
  }

  return new URLSearchParams(redirectParams).toString();
}

module.exports = oAuthQueryString;
