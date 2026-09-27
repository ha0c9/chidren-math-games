# 趣味数学乐园 · chidren-math-games

A kids' math game website (UI in Simplified Chinese) built with plain HTML/CSS/JavaScript and no build step. It is designed for touch on iPhone and iPad and works in both portrait and landscape.

## Games

| 游戏 | 内容 |
| --- | --- |
| 🧮 乘法口诀 | 选 1–9 中的一个数字 n，练习 n×1 到 n×9；用数字圆盘填答案，提交后显示对错和口诀（如「三七二十一」）。 |
| 📏 线段比较 | 两条带刻度的线段，中括号 [ ] 标出多出的部分；选「长 / 短」并填上相差多少。可选 10 / 20 以内、是否显示格子。 |
| ➕ 加减计算 | 100 以内加减法，可选加法 / 减法 / 混合、10 / 20 / 100 以内、是否进退位、10 / 20 / 30 道题；🔄 换一套题。 |

Every game shares the same flow:

- Questions are laid out as cards. When they don't fit on one screen they are split into pages (use the page buttons, the dots, or swipe).
- Answers are entered with the colorful number wheel. ⌫ deletes a digit and 「下一题」 jumps to the next unanswered question.
- After 「提交」, each card is marked right or wrong, and a result screen awards 1–3 stars with confetti and sound effects:
  - ⭐⭐⭐ all correct and fast
  - ⭐⭐ all correct but slower, or at least 80% correct in reasonable time
  - ⭐ anything else
- Best stars per game are saved in `localStorage` and shown on the home menu.
- Sound effects are synthesized with the Web Audio API (no audio files). There is a mute toggle on the home screen.

## Project layout

```
site/                 ← everything that gets deployed
  index.html
  css/style.css
  js/main.js          ← router, home menu, settings screens
  js/engine.js        ← shared game engine (cards, pagination, number wheel, stars)
  js/sound.js         ← Web Audio sound effects
  js/games/*.js       ← one file per game (question generation + card rendering)
.github/workflows/deploy.yml  ← deploys site/ to GitHub Pages on push to main
```

## Run locally

Any static file server works, for example:

```bash
python3 -m http.server 8000 -d site
# open http://localhost:8000
```

(Opening `index.html` directly via `file://` won't work because the site uses ES modules.)

## Deploy to GitHub Pages

The workflow in `.github/workflows/deploy.yml` publishes the `site/` folder on every push to `main`. You can also run it manually from the Actions tab.

**One-time setup:** in the repository, go to **Settings → Pages → Build and deployment → Source** and choose **"GitHub Actions"**. Without this setting the deploy job fails.

The site will then be available at `https://<user>.github.io/chidren-math-games/`. On iPhone or iPad, use Safari's 「添加到主屏幕」 to launch it full-screen like an app.
