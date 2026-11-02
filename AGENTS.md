<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- App shell (header, sidebar, AI drawer) lives in src/components/AppShell.tsx and wraps <Outlet /> in __root; each module is its own route. Why: shared desktop-app chrome across pages.
- System data (CPU/GPU/RAM/processes) is simulated client-side in src/lib/live-charts.tsx; a browser cannot read real Windows telemetry.
