---
title: A Field Guide to Coffee Brewing
description: How grind size, water, and time shape a cup across common brewing methods.
author: Jane Researcher
logo: mashay-logo.svg
date: 2026-07-13
status: Draft
version: "1.1"
reviewers:
  - Jane Doe
  - John Smith
classification: Public
changelog:
  - version: "1.1"
    date: 2026-07-13
    description: Added the extraction timing script and immersion notes.
  - version: "1.0"
    date: 2026-06-01
    description: Initial release.
---

## Introduction

Brewing coffee is the controlled extraction of soluble compounds from ground beans using hot water. Three variables dominate the result: grind size, water temperature, and contact time. This guide surveys the common methods and how each balances those variables.

## The Variables

Every method is a different way of trading the same three levers against one another.

- **Grind size** — finer grinds extract faster but resist water flow.
- **Water temperature** — hotter water extracts more, up to the point of bitterness.
- **Contact time** — longer steeping pulls more solubles into the cup.

### How the levers interact

A coarse grind with a long steep can match the strength of a fine grind with a short one. The method you choose largely fixes two of the levers and leaves you to tune the third.

## Brewing Methods

The families below cover most of what you will encounter at home.

### Percolation methods

Water passes through a bed of grounds once, driven by gravity or pressure. Pour-over and drip machines live here.

```mermaid
flowchart LR
    A[Hot water] --> B[Grounds bed]
    B --> C[Filter]
    C --> D[Cup]
```

Extraction can be modelled as a simple function of the three levers. A small script makes the trade-offs concrete:

```ts extraction.ts
const strength = (grind: number, tempC: number, seconds: number) =>
  (tempC / 100) * (seconds / 240) * (10 / grind);
```

### Immersion methods

Grounds steep in a fixed volume of water, then the two are separated. French press and cupping bowls work this way.

| Method        | Grind   | Time     |
| ------------- | ------- | -------- |
| Pour-over     | Medium  | 3 min    |
| French press  | Coarse  | 4 min    |
| Espresso      | Fine    | 30 sec   |

> A good cup is repeatable — write down what you did, or you are only guessing.

> [!NOTE]
> Times above are starting points; adjust to taste rather than treating them as fixed.

> [!TIP]
> Weigh your beans and water. A 1:16 ratio of coffee to water is a reliable place to begin.

> [!IMPORTANT]
> Water is most of the cup. Filtered water with moderate mineral content extracts far better than distilled.

> [!WARNING]
> Water above roughly 96 degrees Celsius scalds the grounds and pulls harsh, bitter notes.

> [!CAUTION]
> A sealed brewer under pressure can release scalding water suddenly — vent it before opening.

## Conclusion

No single method is best; each fixes a different pair of levers. Start from the [Brewing Methods](#brewing-methods) that suits your equipment, then tune the remaining variable. See the [Glossary](#glossary) for the terms used throughout.

## Appendix

### Methodology

Timings and ratios were compiled from repeated home brews across a single roast, holding the roast date and water source constant so that only the method varied.

### Glossary

- **Extraction** — the dissolving of soluble compounds from ground coffee into water.
- **Immersion** — a brewing style in which grounds steep in a fixed volume of water before separation.
- **Percolation** — a brewing style in which water passes once through a bed of grounds.
