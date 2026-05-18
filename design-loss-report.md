# Design and Animation Loss Report

## Summary
The app likely did not lose its design because of a single bug. The more probable cause is a chain of changes that removed the Tailwind runtime setup, exposed missing utility support, and left several pages depending on class names that no longer had active styling rules.

## What likely happened

1. The root layout stopped using the inline Tailwind configuration script and CDN script that previously provided the project-specific utility system.
2. The app still relies on many Tailwind-style classes and arbitrary values, including custom tokens such as `bg-surface-container-highest`, `text-on-surface`, `grid-cols-[...]`, `max-h-[calc(...)]`, and `shadow-[...]`.
3. Once the runtime Tailwind path changed, a large part of the UI became dependent on fallback CSS. Any utility not covered by the fallback stylesheet would render as plain HTML styling or lose spacing, color, or motion.
4. Several components also depended on custom semantic tokens and font aliases. When those tokens were missing or mistyped, the affected pieces lost their intended appearance without producing a hard compile error.
5. Some popup dialogs were rendered instantly through portals without a separate mounted/visible transition state. That makes them appear static even if the layout is still correct.

## Most likely causes in this codebase

- The root layout now only imports a stylesheet-based Tailwind asset in [src/app/layout.tsx](src/app/layout.tsx), which is not the same as the previous runtime/configured setup.
- The global CSS layer in [src/app/globals.css](src/app/globals.css) had to be expanded with many manual fallbacks because the app uses utility classes that were not guaranteed to exist.
- Some pages and dialogs use highly specific class names and arbitrary values, so any missing fallback rule shows up as missing spacing, color, shape, or shadow.
- Modal animations were not standardized everywhere until the shared modal classes were added, so some dialogs appeared to have no animation at all.

## Why it looked like "design disappeared"

The UI was still rendering, but the styling system behind it was incomplete. In practice that means:

- Layout boxes still exist, but borders, shadows, and background colors fall back to plain defaults.
- Typography still renders, but font weight, font family, and heading hierarchy become inconsistent.
- Modals still open, but without transition state they feel abrupt and unpolished.
- Some pages look unfinished because the intended utility classes are not available without a proper Tailwind build or enough fallback CSS.

## Conclusion

The most likely root cause is a styling pipeline mismatch: the app depends on Tailwind-like utility classes, but the runtime/configuration path was changed during debugging. That exposed missing utility support and made the UI look like it had "lost" design and animation.

## Recommended fix direction

- Keep one consistent styling source of truth.
- Either restore a proper Tailwind build pipeline, or keep extending the fallback CSS until every used utility is covered.
- Standardize all modal shells on one shared overlay/card pattern with animation classes.
- Avoid mistyped token classes, because they fail silently and look like design regressions.