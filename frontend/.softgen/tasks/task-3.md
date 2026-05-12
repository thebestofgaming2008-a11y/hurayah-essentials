---
title: Header polish — remove Kufi/Women, fix alignment, refine icons and buttons
status: todo
priority: high
type: feature
tags:
  - header
  - ui
  - layout
created_by: agent
created_at: 2026-05-02
position: 3
---

## Notes

User has explicitly requested: remove Kufi and Women nav buttons, fix alignment issues, improve icon and button styling on the header. Source: `src/components/layout/SiteHeader.tsx:1-283`.

Current issues spotted:
- Top row uses `grid-cols-[auto_1fr_auto]` but the right cluster has 3 icon buttons of varying size (`h-10 w-10` for Heart/User, `h-10 w-10 md:h-11 md:w-11` for Cart) which makes the grouping look uneven — unify to a single sizing scale
- Notice bar uses `hidden sm:block w-[80px]` spacer to balance the currency selector; this breaks at small breakpoints causing the headline to drift
- Wishlist/cart badges use slightly different positioning (`-top-0.5 -right-0.5`) and overflow the rounded button on focus
- Nav `<ul>` overflow-x scrolls horizontally on small screens but the active underline indicator does not anchor — `text-hero-foreground font-semibold` only changes color
- Books dropdown opens on the same row as the nav and is cramped on narrow viewports
- Mobile drawer still lists "Kufi" and "Women" links

Categories that remain visible after removal: Shop all, Books (with subjects dropdown), Clothes, Essentials, Track order. Category routes `/category/kufi` and `/category/women` should also be removed from the menu (the routes themselves can stay until task 6 cleanup decides whether to redirect).

## Checklist

- [ ] Remove "Kufi" and "Women" from the desktop nav and the mobile drawer
- [ ] Unify header icon button sizing to a single `h-10 w-10` scale with consistent padding, hover ring, and 1px focus-visible outline
- [ ] Wishlist, account and cart icons use the same stroke weight, badge style and badge offset; badges hide when count is zero
- [ ] Top notice bar centers the message symmetrically without an empty-spacer hack on small screens; currency button right-aligned with a stable hit target
- [ ] Logo block constrained to its grid cell, never pushes when icon counts change, with a max-height that doesn't jump between breakpoints
- [ ] Search input height matches the icon button height for visual rhythm; clear-button (X) appears once query has text
- [ ] Active nav link gets a subtle 2px underline indicator rather than only a color shift
- [ ] Books dropdown anchors to the trigger with a small bridge so cursor travel does not close it; subjects render from live categories (delivered by task 2)
- [ ] Account icon shows a small dropdown for signed-in users (My account, Orders, Wishlist, Sign out) instead of always navigating to `/account`
- [ ] Mobile drawer keeps focus trapped, restores focus to the menu trigger on close, and dismisses on route change

## Acceptance

The header looks aligned across xs, sm, md, lg, xl breakpoints with no jumping logo or unbalanced spacing. Kufi and Women are gone from every menu surface. Icons share a single visual rhythm and the cart/wishlist badges never overflow their button.