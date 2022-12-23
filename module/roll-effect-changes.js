/* 
This is the start of a function that will determine which effect changes apply to a particular roll
It's likely that each general category of flag will need to be handled separately
AKA, each category of flag needs to be checked to see if/how it affects the roll
Maybe there is an easier way to do this, but I'm not aware of it so far!
*/

/**
 * Gets relevant effect changes for a particular roll.
 * @param {Actor5e} actor                 Actor associated with the role.
 * @param {Array}   parts                 Array of roll formula parts.
 * @param {String}  rollType              One of "attack", "check", "save", or "skill".
 * @param {string}  rollSubType           Skill ID, ability ID, or attack type (e.g., mwak). Optional.
 * @param {boolean} isCheckForSkillOrTool If rollType = "check" but changes apply to skill or tool roll, use unique attr names. Optional
 */
export default class RollEffectChanges {
  attackRollTypes = ["attack"];
  nonAttackRollTypes = ["check", "save", "skill"];

  constructor(actor, parts, rollType, rollSubType=null, isCheckForSkillOrTool=false) {
    this.actor = actor;
    this.parts = parts;
    this.rollType = rollType;
    this.rollSubType = rollSubType;
    this.isCheckForSkillOrTool = isCheckForSkillOrTool;
  }

  /**
   * Static method to get just the relevant effect changes for roll.
   * @param {Actor5e} actor        Actor associated with the role.
   * @param {Array}   parts        Array of roll formula parts.
   * @param {String}  rollType     One of "attack", "check", "save", or "skill".
   * @param {string}  rollSubType  Skill ID, ability ID, or attack type (e.g., mwak). Optional.
   * @returns {Array<Object>}     Array of effect change objects with original effect included.
   */
  static getChanges(actor, parts, rollType, rollSubType=null, isCheckForSkillOrTool=false) {
    return new this(actor, parts, rollType, rollSubType, isCheckForSkillOrTool).changes;
  }

  /**
   * Array of relevant effect change objects with original effect included.
   * @type {Array<Object>} 
   */
  get changes() {
    let c = this.actor.effects.map(effect => {
      const changes = effect.changes
        .filter(change => this.changeKeys.includes(change.key))
        .map(change => foundry.utils.mergeObject(change, 
          { 
            effect: effect, 
            attr: this.attributeForChange(change.key)
          }
        ));

      return ( !(effect.isSuppressed) && changes.length ) ? changes : null;
    }).filter(effect => effect).flat();

    // Skill rolls are also ability checks, have to watch out for that
    if (this.rollType == "skill") {
      return c.concat(this.constructor.getChanges(
        this.actor, this.parts, "check", CONFIG.DND5E.skills[this.rollSubType].ability, true
      ));
    } else {
      return c;
    }
  }

  /**
   * Array of effect change keys.
   * @type {Array<String>} 
   */
  get changeKeys() {
    const keys = [];
  
    // If present, get specific skill or ability bonus
    if (this.isNonAttack() && this.rollSubType) {
      if (this.rollType == 'skill') {
        keys.push(`system.skills.${this.rollSubType}.bonuses.check`);
      } else {
        keys.push(`system.abilities.${this.rollSubType}.bonuses.${this.rollType}`);
      }
    }

    // Get global bonus key
    keys.push(this.globalBonusKeyFormula);

    return keys;
  }

  /**
   * Change key for relevant global bonus.
   * @type {String} 
   */
  get globalBonusKeyFormula() {
    if (this.isAttack()) {
      return `system.bonuses.${this.rollSubType}.${this.rollType}`
    } else {

      return `system.bonuses.abilities.${this.rollType}`
    }
  }
  
  /**
   * Is this roll an attack?
   * @returns {boolean} 
   */
  isAttack() {
    return this.attackRollTypes.includes(this.rollType);
  }
  
  /**
   * Is this roll not an attack?
   * @returns {boolean} 
   */
  isNonAttack() {
    return this.nonAttackRollTypes.includes(this.rollType)
  }

  attributeForChange(key) {
    if (this.isAttack()) {
      return "@actorAttackBonus";
    } else if (this.isNonAttack()) {
      let attr = "";

      if (this.rollSubType && key.includes(this.rollSubType)) {
        // specific bonus
        if (this.isCheckForSkillOrTool && this.rollType == "check") {
          // If checking for ability bonuses on skill rolls, need to pay special attention
          attr = "@abilityCheckBonus";
        } else {
          // Normal case
          attr = "@".concat(
            this.rollSubType,
            (this.rollType == "save") ? "Save" : "Check",
            "Bonus"
          );
        }
      } else {
        // global bonus
        attr = "@".concat(this.rollType, "Bonus");
      }

      return attr[0] + attr.charAt(1).toLowerCase() + attr.slice(2);
    } else {
      return null;
    }
  }
}