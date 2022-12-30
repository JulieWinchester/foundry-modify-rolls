// This logic is taken from DAE's applyDaeEffects() method
export function evalExpression(value, rollData) {  
  console.log("DEBUG: enhanced-roll-dialog | evalExpression: Doing eval of ", value);
  
  value = value.replace("@item.level", "@itemLevel");

  // Replace @ attributes
  value = Roll.replaceFormulaData(value, rollData, { missing: 0, warn: false });
  
  try { // Roll parser no longer accepts some expressions it used to so we will try and avoid using it  
    value = Roll.safeEval(value);
  }
  catch (err) { // safeEval failed try a roll
    try {
        console.log("enhanced-roll-dialog | encountered dice expression, will try to parse");
        console.log(`Value is ${value}`);
        value = `${new Roll(value).evaluate({ async: false }).formula}`;
    }
    catch (err) {
        console.log("enhanced-roll-dialog | value calculation failed for", this, value);
        console.log(err);
    }
  }

  return value;
}

export function isFallbackChangeNeeded(attr, parts, rollData, changes) {
  return parts.includes(attr) && rollData[attr.substring(1)] && !changes.some(c => c.attr == attr);
}

export function fallbackChange(attr, rollData) {
  let change = {
    effect: { label: game.i18n.localize("ERD.unknown") },
    originTag: "?",
    value: rollData[attr.substring(1)],
    attr: attr
  };

  change.valueText = evalExpression(change, rollData);

  return change; 
}