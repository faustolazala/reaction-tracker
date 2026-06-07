# Reaction Tracker

Reaction Tracker adds a reaction-use toggle directly to Foundry VTT's built-in Encounter Tracker for D&D 5e combat.

## Features

- Adds a reaction icon to each combatant row in the Encounter Tracker.
- Lets GMs mark reactions as used or available.
- Stores reaction state on the active Combat document.
- Can reset reactions automatically at each combatant's turn, at each new round, or only manually.
- Optionally shows owned combatant reaction status to players.
- Optionally allows players to toggle reactions for combatants they own.

## Installation

Copy this folder into your Foundry VTT `Data/modules` directory as:

```text
reaction-tracker
```

Then enable **Reaction Tracker** in your world's Manage Modules screen.

## Settings

Open **Configure Settings > Module Settings > Reaction Tracker**.

- **Reaction Reset Timing** controls automatic reset behavior.
- **Show Reaction Status to Players** lets players see reaction icons for combatants they own.
- **Allow Player Toggle** lets players toggle reactions for combatants they own.

## Compatibility

This module is intended for Foundry VTT v12-v14 and the D&D 5e system. The tracker injection is intentionally small and defensive, but Foundry's Encounter Tracker markup may change between major versions.
