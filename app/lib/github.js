const GITHUB_API = 'https://api.github.com';

function parseGitHubError(status, body) {
  try {
    const json = JSON.parse(body);
    const msg = json.message || body;
    if (status === 401) return `Bad credentials — your GitHub token is invalid or expired. Regenerate it at github.com/settings/tokens.`;
    if (status === 404) return `Repo not found (404) — check your username and repo name, and ensure your token has the "repo" scope.`;
    return `GitHub error ${status}: ${msg}`;
  } catch {
    return `GitHub error ${status}: ${body}`;
  }
}

// Creates a GitHub Contents API client scoped to one repo.
// Pass { token, owner, repo } — works for both Work and Personal repos.
export function createGitHubClient({ token, owner, repo }) {
  token = token?.trim();
  owner = owner?.trim();
  repo = repo?.trim();

  if (!token || !owner || !repo) {
    throw new Error('GitHub client requires token, owner, and repo.');
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };

  // Decode base64 content returned by the GitHub API
  function decodeContent(encoded) {
    const clean = encoded.replace(/\n/g, '');
    if (typeof atob !== 'undefined') return atob(clean);
    return Buffer.from(clean, 'base64').toString('utf8');
  }

  // Encode content to base64 for PUT requests
  function encodeContent(str) {
    if (typeof btoa !== 'undefined') {
      return btoa(unescape(encodeURIComponent(str)));
    }
    return Buffer.from(str, 'utf8').toString('base64');
  }

  // Get a file from the repo. Returns { content, sha } or null if 404.
  async function getFile(path) {
    const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`;
    const res = await fetch(url, { headers });
    if (res.status === 404) return null;
    if (!res.ok) {
      const body = await res.text();
      throw new Error(parseGitHubError(res.status, body));
    }
    const data = await res.json();
    return {
      content: decodeContent(data.content),
      sha: data.sha,
      htmlUrl: data.html_url,
    };
  }

  // Create or update a file. sha is required for updates, omit for creates.
  async function putFile(path, content, sha, commitMessage) {
    const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`;
    const body = {
      message: commitMessage || `Update ${path} via Aria`,
      content: encodeContent(content),
    };
    if (sha) body.sha = sha;

    const res = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(parseGitHubError(res.status, errBody));
    }
    return res.json();
  }

  // Return a direct URL to a file in the repo for "Open in GitHub" buttons
  function fileUrl(path) {
    return `https://github.com/${owner}/${repo}/blob/HEAD/${path}`;
  }

  // Verify the token works by fetching repo metadata
  async function testConnection() {
    // First check the token itself is valid
    const userRes = await fetch(`${GITHUB_API}/user`, { headers });
    if (userRes.status === 401) throw new Error('Invalid token — check your PAT and make sure it hasn\'t expired.');

    const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, { headers });
    if (res.status === 404) {
      throw new Error(
        `Repo "${owner}/${repo}" not found.\n\nEither:\n• The repo doesn't exist yet — create it at github.com/new\n• The owner/username is wrong\n• Your PAT is missing the "repo" scope (private repos return 404, not 403)`
      );
    }
    if (!res.ok) throw new Error(`GitHub error ${res.status}`);
    const data = await res.json();
    return { name: data.full_name, private: data.private };
  }

  return { getFile, putFile, fileUrl, testConnection };
}
