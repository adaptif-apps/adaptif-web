# Visual QA Gate Before Commit & Deployment

Before running `git commit`, `git push`, or deploying to Vercel (`npx vercel --prod`) for any UI or styling change:

1. **Preview Locally First:**
   - Start or reuse the local dev/preview server (`npm run dev` or `npm run preview`) so changes are verified before touching production.
2. **Capture & Inspect Screenshot (Focused ~30–60s Runs, Max 5-Min Cap):**
   - Use the `browser` subagent in short, focused runs (1–2 views/flows per call, aiming for ~30–60s) to open the affected page/route, interact with the changed UI (scroll, hover, click, or open modals/panels as needed), and capture a `.jpg` screenshot (or browser screenshot).
   - Always pair the `browser` subagent with a `schedule` timer (`DurationSeconds: 300`, `TimerCondition` = subagent ID). If 5 minutes pass without completion, stop it (`manage_subagents` `kill`), reason about what remains, and re-run only what is needed with a fresh 5-minute cap.
   - Inspect the screenshot visually with `read_file` to verify layout, alignment, spacing, contrast, clipping, glows/shadows, z-index/overlays, and responsiveness—never rely solely on code or build success.
3. **Iterate Until Visually Clean:**
   - If any visual defect is found, fix it in code, take a new screenshot, and inspect it again. Repeat until the UI looks right.
4. **Commit & Deploy Only After Visual Sign-Off:**
   - Only after the visual inspection passes, run `npm run build`, `git commit`, `git push origin main`, and `npx vercel --prod --yes`.
