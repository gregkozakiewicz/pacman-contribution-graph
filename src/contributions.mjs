// Fetch a user's contribution calendar from the GitHub GraphQL API and turn it
// into a simple grid: grid[week][day] = { count, level } where level is 0..4.

const QUERY = `
query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        weeks {
          contributionDays {
            contributionCount
            weekday
          }
        }
      }
    }
  }
}`;

// GitHub's own buckets are quartile-based. We reproduce a close-enough version:
// anything > 0 is at least level 1, then split the rest across the observed max.
function toLevel(count, max) {
  if (count <= 0) return 0;
  if (max <= 0) return 1;
  const q = count / max;
  if (q > 0.66) return 4;
  if (q > 0.33) return 3;
  if (q > 0.15) return 2;
  return 1;
}

export async function fetchCalendar({ username, token }) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "pacman-contribution-graph",
    },
    body: JSON.stringify({ query: QUERY, variables: { login: username } }),
  });

  if (!res.ok) {
    throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  if (json.errors) {
    throw new Error(`GraphQL error: ${JSON.stringify(json.errors)}`);
  }

  const weeks =
    json.data?.user?.contributionsCollection?.contributionCalendar?.weeks;
  if (!weeks) throw new Error(`No calendar for user "${username}"`);

  const max = Math.max(
    1,
    ...weeks.flatMap((w) => w.contributionDays.map((d) => d.contributionCount))
  );

  // Place each day at its weekday index (0=Sun..6=Sat) so rows stay aligned;
  // partial first/last weeks leave holes (undefined) rather than shifting rows.
  return weeks.map((w) => {
    const col = new Array(7);
    for (const d of w.contributionDays) {
      col[d.weekday] = {
        count: d.contributionCount,
        level: toLevel(d.contributionCount, max),
      };
    }
    return col;
  });
}

// A deterministic-ish fake grid so you can render locally without a token.
export function demoCalendar() {
  const grid = [];
  let seed = 7;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let w = 0; w < 53; w++) {
    const week = new Array(7);
    const days = w === 52 ? 4 : 7; // last (current) week is partial
    for (let d = 0; d < days; d++) {
      const r = rnd();
      const level = r < 0.45 ? 0 : r < 0.6 ? 1 : r < 0.78 ? 2 : r < 0.92 ? 3 : 4;
      week[d] = { count: level * 3, level };
    }
    grid.push(week);
  }
  return grid;
}
