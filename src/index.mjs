// Inspired from https://github.com/sveltia/sveltia-cms-auth

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const ALLOWED_DOMAINS = process.env.ALLOWED_DOMAINS;

const PATH_PREFIX = "/lambda/sveltia-cms-auth";
const GITHUB_OAUTH_URL = "https://github.com/login/oauth";

/** @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions#escaping */
const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Create response
 * 
 * @param {number} statusCode Status code
 * @param {} [body] Response body
 * @param {} [header] Response header
 * @returns {object} Response object
 */
const res = (statusCode, body, headers) => {
  const response = { statusCode };
  if (body) { response.body = typeof body !== "string" ? JSON.stringify(body) : body; }
  if (headers) { response.headers = headers; }

  return response;
};

/**
 * Create 301 redirect
 * 
 * @param {string} url Url
 * @returns {object} Response object
 */
const redirectRes = (url) => res(301, undefined, { Location: url });

/**
 * OAuth - Auth
 * 
 * @param {string} provider OAuth Provider
 * @param {string} domain Requester domain name
 * @returns {object} Authentication request object
 */
const auth = (provider, domain) => {
  // Check if the domain is whitelisted
  //
  if (
    ALLOWED_DOMAINS &&
    !ALLOWED_DOMAINS.split(/,/).some((str) =>
      // Escape the input, then replace a wildcard for regex
      //
      domain.match(new RegExp(`^${escapeRegExp(str.trim()).replace('\\*', '.+')}$`)),
    )
  ) {
    return res(403, "");
  }

  if (provider === "github" && GITHUB_CLIENT_ID) {
    return redirectRes(`${GITHUB_OAUTH_URL}/authorize?client_id=${GITHUB_CLIENT_ID}&scope=repo,user`);
  }
};

/**
 * OAuth - Callback
 * 
 * @param {string} code OAuth code from provider
 * @returns {promise} Promise with authentication object
 */
const callback = async (code) => {
  if (GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET && code) {
    const provider = "github";

    let token, error;
    try {
      const response = await fetch(GITHUB_OAUTH_URL + "/access_token", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          client_secret: GITHUB_CLIENT_SECRET,
          code,
        })
      });

      ({ access_token: token, error } = await response.json());
    } catch ({ message }) {
      error = message;
    }

    if (!(token || error)) {
      return res(400, "");
    }

    const state = error ? "error" : "success";
    const content = error ? { error } : { provider, token };

    return res(200,
      `
        <!doctype html><html><body><script>
          (() => {
            window.onmessage = ({ data, origin }) => {
              if (data !== 'authorizing:${provider}') return;
              window.opener.postMessage(
                'authorization:${provider}:${state}:${JSON.stringify(content)}',
                origin
              );
            };
            window.opener.postMessage('authorizing:${provider}', '*');
          })();
        </script></body></html>
      `,
      { 'Content-Type': 'text/html;charset=UTF-8' },
    );
  }
};

/**
 * Lambda handler function
 * 
 * @param {} event Event object passed to Lambda
 * @returns {} Response object
 */
export const handler = async (event) => {
  const pathName = event.path?.replace(PATH_PREFIX, "");
  const searchParams = event.queryStringParameters;
  
  if (pathName === "/auth") {
    return auth(searchParams.provider, searchParams.site_id);
  }
  else if (pathName === "/callback") {
    return await callback(searchParams.code);
  }

  return res(200, "");
};
