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

# Architecture rules

- Support chatbot streams from `src/routes/api/chat.ts` (logic in `src/lib/chat.server.ts`) using the user's bearer token so database security rules apply — the AI can only see the signed-in customer's orders.
- Chatbot tools (orders, tracking, refunds, password reset) live server-side in `chat.server.ts`; add new support abilities there as tools.
- Support chats are threads (one per issue) saved in `support_threads` / `support_messages`, with each thread at `/support/$threadId`.
- The shopping bag is stored in the browser (`src/lib/cart.tsx`); orders are written to the database at checkout.
