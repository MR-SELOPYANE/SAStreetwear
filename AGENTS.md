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

## Rules
- Order payment fields (payment_status, payment_reference, total, payment method/fulfillment) are changed only server-side: a DB trigger blocks shopper/vendor edits, and Paystack payments are marked paid only after `confirmPaystackPayment` verifies the transaction with Paystack. Why: the browser can't be trusted to say an order is paid.
- Paystack amounts are computed on the server from current product prices, never from the cart. Why: stops shoppers paying less than the real price.
