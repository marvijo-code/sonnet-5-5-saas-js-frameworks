# Claude Sonnet 5.5 builds 5 SaaS apps in 5 JavaScript frameworks

Claude Sonnet 5.5 (Claude Code, effort high) built five SaaS apps in React, Vue, Svelte, Angular and SolidJS from one shared prompt.

The model's code is published unedited; only node_modules and build output are left out.

Video: https://www.youtube.com/watch?v=ORUyWNgvboo

## Projects

| Folder | Framework | Product | Round score | Build time |
| --- | --- | --- | --- | --- |
| `pumpmark-ledger` | React 19.3 | Fuel and fill-up tracking for small EU delivery and trade fleets | 49/50 | 4.2 min |
| `touchpad-tempo` | Vue 3.5 | Race-time and split tracking for club swim coaches | 49/50 | 4.5 min |
| `shortlist-salon` | Svelte 5 | Reading pace and countdown tracker for book clubs working through a prize shortlist | 48/50 | 4.3 min |
| `delay-dossier` | Angular 22 | Flight disruption claim case files for frequent flyers and small travel agents | 49/50 | 5.9 min |
| `rowguard-almanac` | SolidJS 1.9 | Spotted lanternfly watch for vineyard and orchard managers | 49/50 | 4.6 min |

Final total: Claude Sonnet 5.5 244/250.

For comparison: Claude Sonnet 5.5 scored 244/250 and GPT-6 Sol scored 206/250.

## Prompts

The shared contract and the five site briefs the model received are in `prompts/`.

## How to run

- `pumpmark-ledger`: `cd pumpmark-ledger`, `npm install`, then `npm run dev`
- `touchpad-tempo`: `cd touchpad-tempo`, `npm install`, then `npm run dev`
- `shortlist-salon`: `cd shortlist-salon`, `npm install`, then `npm run dev`
- `delay-dossier`: `cd delay-dossier`, `npm install`, then `npm start`
- `rowguard-almanac`: `cd rowguard-almanac`, `npm install`, then `npm run dev`

## The other model

GPT-6 Sol built the same five apps: https://github.com/marvijo-code/gpt-6-sol-saas-js-frameworks
