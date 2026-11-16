# Visual QA Gate Before Commit & Deployment

Before running `git commit`, `git push`, or deploying to Vercel (`npx vercel --prod`) for any UI or styling change:

1. **Preview Locally First:**
   - Start or reuse the local dev/preview server (`npm run dev` or `npm run preview`) so changes are verified before touching production.
2. **Capture & Inspect Screenshot:**
   - Use the `browser` subagent to open the affected page/route, interact with the changed UI (scroll, hover, click, or open modals/panels as needed), and capture a `.jpg` screenshot (or browser screenshot).
   - Inspect the screenshot visually with `read_file` to verify layout, alignment, spacing, contrast, clipping, glows/shadows, z-index/overlays, and responsiveness—never rely solely on code or build success.
3. **Iterate Until Visually Clean:**
   - If any visual defect is found, fix it in code, take a new screenshot, and inspect it again. Repeat until the UI looks right.
4. **Commit & Deploy Only After Visual Sign-Off:**
   - Only after the visual inspection passes, run `npm run build`, `git commit`, `git push origin main`, and `npx vercel --prod --yes`.
