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

- Keep conflict schemas and approval/rejection helpers browser-safe and shared by AI validation, deterministic analysis, and review; one contract prevents drift and blocks rejected items from execution.
- Keep webhook summary, governing-brief selection, and export formatting in browser-safe shared helpers; review exports and execution use the same approved-item filtering to prevent rejected work from leaking downstream.
- Execute demo reset through a service-role-only transactional database function; locking and literal historical rows prevent partial or concurrent duplicate seeds.
- Centralize autonomy filtering in browser-safe agent helpers and route every webhook through the shared sandbox-aware sender; confirmation and exports must use identical permitted items.
- Keep pipeline timing as an orchestration visualization and derive displayed counts from actual input/results; never present canned trace text as private model reasoning.
- Keep memory retrieval and lineage browser-safe and grounded in loaded records; use the shared governing selector for supersession and browser-local confirmed rejection receipts without changing existing CRUD or webhook contracts.
- Keep new AI providers request-scoped in server-only helpers and stream Responses calls through the gateway with its issued run ID.
