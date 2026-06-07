const MODULE_ID = "reaction-tracker";
const FLAGS = {
  STATES: "states"
};

const SETTINGS = {
  RESET_MODE: "resetMode",
  SHOW_TO_PLAYERS: "showToPlayers",
  ALLOW_PLAYER_TOGGLE: "allowPlayerToggle"
};

const RESET_MODES = {
  TURN: "turn",
  ROUND: "round",
  MANUAL: "manual"
};

Hooks.once("init", () => {
  registerSettings();
});

Hooks.on("renderCombatTracker", (app, html) => {
  injectReactionButtons(app, html);
});

Hooks.on("updateCombat", async (combat, changed) => {
  if (!combat?.started) return;
  await handleCombatAdvance(combat, changed);
});

Hooks.on("deleteCombat", (combat) => {
  if (combat?.id === game.combat?.id) ui.combat?.render?.();
});

function registerSettings() {
  game.settings.register(MODULE_ID, SETTINGS.RESET_MODE, {
    name: "Reaction Reset Timing",
    hint: "Choose when reaction toggles should become available again.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      [RESET_MODES.TURN]: "At the start of each combatant's turn",
      [RESET_MODES.ROUND]: "At the start of each round",
      [RESET_MODES.MANUAL]: "Only when manually reset"
    },
    default: RESET_MODES.TURN
  });

  game.settings.register(MODULE_ID, SETTINGS.SHOW_TO_PLAYERS, {
    name: "Show Reaction Status to Players",
    hint: "Show the Encounter Tracker reaction icon to players for combatants they own.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, SETTINGS.ALLOW_PLAYER_TOGGLE, {
    name: "Allow Player Toggle",
    hint: "Allow players to mark reactions used or available for combatants they own.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });
}

async function handleCombatAdvance(combat, changed) {
  const resetMode = game.settings.get(MODULE_ID, SETTINGS.RESET_MODE);
  if (resetMode === RESET_MODES.MANUAL) return;

  const roundChanged = Object.hasOwn(changed, "round");
  const turnChanged = Object.hasOwn(changed, "turn");
  if (!roundChanged && !turnChanged) return;

  if (resetMode === RESET_MODES.ROUND && roundChanged) {
    await resetAllReactions(combat);
    return;
  }

  if (resetMode === RESET_MODES.TURN && (roundChanged || turnChanged)) {
    const combatant = combat.combatant;
    if (combatant) await setReactionUsed(combat, combatant.id, false, "auto");
  }
}

function injectReactionButtons(app, html) {
  const combat = app?.viewed ?? game.combat;
  if (!combat?.combatants?.size) return;
  if (!game.user.isGM && !game.settings.get(MODULE_ID, SETTINGS.SHOW_TO_PLAYERS)) return;

  const root = getHtmlElement(html);
  if (!root) return;

  if (game.user.isGM) injectResetAllButton(root, combat);

  for (const combatant of combat.combatants) {
    if (!canSeeCombatantReaction(combatant)) continue;

    const row = findCombatantRow(root, combatant.id);
    if (!row || row.querySelector(".reaction-tracker-toggle")) continue;

    const button = createReactionButton(combat, combatant);
    const anchor = findButtonAnchor(row);
    anchor.append(button);
  }
}

function injectResetAllButton(root, combat) {
  if (root.querySelector(".reaction-tracker-reset-all")) return;

  const button = document.createElement("button");
  button.type = "button";
  button.classList.add("reaction-tracker-reset-all");
  button.title = "Reset All Reactions";
  button.setAttribute("aria-label", "Reset all reactions");

  const icon = document.createElement("i");
  icon.classList.add("fa-solid", "fa-rotate-left");
  button.append(icon);

  button.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    await resetAllReactions(combat);
    ui.combat?.render?.();
  });

  const container = document.createElement("div");
  container.classList.add("reaction-tracker-toolbar");
  container.append(button);

  const tracker = root.querySelector(".combat-tracker")
    ?? root.querySelector(".directory-list")
    ?? root.querySelector("ol")
    ?? root.querySelector("ul");

  if (tracker?.parentElement) tracker.parentElement.insertBefore(container, tracker);
  else root.prepend(container);
}

function getHtmlElement(html) {
  if (html instanceof HTMLElement) return html;
  if (Array.isArray(html)) return html[0] ?? null;
  if (html?.jquery) return html[0] ?? null;
  return html ?? null;
}

function findCombatantRow(root, combatantId) {
  const escapedId = CSS.escape(combatantId);
  return root.querySelector(`[data-combatant-id="${escapedId}"]`)
    ?? root.querySelector(`[data-combatantid="${escapedId}"]`)
    ?? root.querySelector(`#combatant-${escapedId}`);
}

function findButtonAnchor(row) {
  const controls = row.querySelector(".combatant-controls")
    ?? row.querySelector(".combatant-control")?.parentElement;
  if (controls) return controls;

  const anchor = document.createElement("div");
  anchor.classList.add("reaction-tracker-controls");
  row.append(anchor);

  return anchor;
}

function createReactionButton(combat, combatant) {
  const used = isReactionUsed(combat, combatant.id);
  const canToggle = canToggleCombatantReaction(combatant);

  const button = document.createElement("button");
  button.type = "button";
  button.classList.add("reaction-tracker-toggle");
  button.classList.toggle("reaction-tracker-toggle--used", used);
  button.classList.toggle("reaction-tracker-toggle--readonly", !canToggle);
  button.dataset.combatantId = combatant.id;
  button.title = used ? "Reaction Used" : "Reaction Available";
  button.setAttribute("aria-label", `${combatant.name}: ${button.title}`);
  button.disabled = !canToggle;

  const icon = document.createElement("i");
  icon.classList.add("fa-solid", "fa-bolt");
  button.append(icon);

  if (canToggle) {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await setReactionUsed(combat, combatant.id, !isReactionUsed(combat, combatant.id), "manual");
      ui.combat?.render?.();
    });
  }

  return button;
}

function canSeeCombatantReaction(combatant) {
  if (game.user.isGM) return true;
  return Boolean(game.settings.get(MODULE_ID, SETTINGS.SHOW_TO_PLAYERS) && isOwnedCombatant(combatant));
}

function canToggleCombatantReaction(combatant) {
  if (game.user.isGM) return true;
  return Boolean(game.settings.get(MODULE_ID, SETTINGS.ALLOW_PLAYER_TOGGLE) && isOwnedCombatant(combatant));
}

function isOwnedCombatant(combatant) {
  return Boolean(combatant?.actor?.isOwner || combatant?.token?.isOwner);
}

function isReactionUsed(combat, combatantId) {
  return Boolean(getReactionStates(combat)[combatantId]?.used);
}

async function setReactionUsed(combat, combatantId, used, source) {
  if (!combat) return;

  const states = getReactionStates(combat);
  states[combatantId] = {
    used,
    round: combat.round ?? null,
    turn: combat.turn ?? null,
    source
  };

  await combat.setFlag(MODULE_ID, FLAGS.STATES, states);
}

async function resetAllReactions(combat) {
  if (!combat) return;

  const states = {};
  for (const combatant of combat.combatants) {
    states[combatant.id] = {
      used: false,
      round: combat.round ?? null,
      turn: combat.turn ?? null,
      source: "auto"
    };
  }

  await combat.setFlag(MODULE_ID, FLAGS.STATES, states);
}

function getReactionStates(combat) {
  const states = combat?.getFlag(MODULE_ID, FLAGS.STATES) ?? {};
  return foundry.utils.deepClone(states);
}
