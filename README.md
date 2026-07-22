# 🟡 Pac-Man Contribution Graph

A single Pac-Man wanders your GitHub contribution graph like a maze, chomping
every square as it goes. One self-contained animated SVG that works in both
light and dark themes — no ghosts, no game, just the snake-eats-your-graph idea
([snk](https://github.com/Platane/snk)) reskinned as Pac-Man.

<p align="center">
  <img src="dist/pacman.svg" alt="Pac-Man eating a contribution graph" width="100%">
</p>

> The demo above runs on random data. On your profile it eats your real
> contributions, and the route is re-scrambled every time it regenerates.

## Add it to your GitHub profile

1. **Copy this project** into a repo you own. The easiest home is your
   [profile repo](https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-github-profile/customizing-your-profile/managing-your-profile-readme)
   — a repo named exactly the same as your username (e.g. `pencilrebel/pencilrebel`).
   You only need `src/` and `.github/workflows/pacman.yml`.

2. **Allow Actions to write to the repo.**
   Settings → Actions → General → *Workflow permissions* → **Read and write permissions** → Save.

3. **Run it once.** Actions tab → **Generate Pac-Man contribution graph** →
   *Run workflow*. It fetches your contributions and pushes the finished SVG to a
   new `output` branch. (After this it also re-runs automatically twice a day.)

4. **Embed it** in your profile `README.md`, replacing `USER/REPO`:

   ```md
   ![Pac-Man contribution graph](https://raw.githubusercontent.com/USER/REPO/output/pacman.svg)
   ```

That's it. The single SVG already adapts to the viewer's light/dark theme, so
you don't need a `<picture>` block.

## Run it locally

```bash
npm run demo          # dist/pacman.svg from random data — no token needed
open dist/pacman.svg  # or open dist/preview.html to see light + dark
```

Generate from real data (needs a token with `read:user`):

```bash
GITHUB_TOKEN=<token> node src/generate.mjs --user <your-username> --out dist
```

## How it works

1. A scheduled GitHub Action runs `src/generate.mjs`.
2. It pulls your contribution calendar from the GitHub GraphQL API and turns it
   into a `week × day` grid.
3. `src/svg.mjs` builds one animated SVG:
   - a **random Hamiltonian path** (Warnsdorff walk + backbite shuffle) gives
     Pac-Man a fresh maze-like route through every square each run;
   - `<animateMotion rotate="auto">` glides him along it, turning corners;
   - `<animate>` on the mouth wedge makes him chomp;
   - each square fades out exactly as he reaches it.
4. The Action commits the result to the `output` branch for embedding.

## Configuration

All the feel lives in a few constants at the top of
[`src/svg.mjs`](src/svg.mjs):

| Constant             | Default | Effect                                       |
| -------------------- | ------- | -------------------------------------------- |
| `SECONDS_PER_CELL`   | `0.12`  | travel speed — higher is slower              |
| `CHOMP`              | `0.45`  | seconds per mouth open/close cycle           |
| `MOUTH_OPEN` / `MOUTH_SHUT` | `45` / `2` | how wide the mouth swings (degrees)   |
| `R`                  | `0.85×` | Pac-Man size relative to a cell              |
| `fadeW`              | `0.28/N`| how quickly an eaten square disappears       |
| palette in `<style>` | —       | square colors for light and dark             |

## Credits

Inspired by [Platane/snk](https://github.com/Platane/snk). MIT licensed.
