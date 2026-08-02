// Guide book database extracted from gbf.wiki/Evoking_Solomonis#Guidebooks
// (effect text + wiki tag taxonomy). rarity: 1=Normal, 2=Rare, 3=Unique,
// 99=Cursed. availability: global/event/character. type & effects are the
// wiki filter tags used for the codex filters. Owned status is matched at
// runtime against spacebook_status_list by normalized effect text.
export const GUIDEBOOK_DB = [
 {
  "rarity": 3,
  "availability": "global",
  "type": "misc",
  "effects": [
   "aura"
  ],
  "icon": "aura",
  "text": "Elemental skill enhancement +180%",
  "id": 1
 },
 {
  "rarity": 3,
  "availability": "global",
  "type": "ca",
  "effects": [
   "cap"
  ],
  "icon": "ca cap",
  "text": "100% boost to special C.A. DMG cap",
  "id": 2
 },
 {
  "rarity": 3,
  "availability": "global",
  "type": "na,ca,skill",
  "effects": [
   "amp",
   "progressive"
  ],
  "icon": "amp",
  "text": "Amplify all allies' DMG based on total HP lost after this guidebook effect was obtained (Max: 100%)",
  "id": 3
 },
 {
  "rarity": 3,
  "availability": "global",
  "type": "na,ca,skill",
  "effects": [
   "amp",
   "progressive",
   "map"
  ],
  "icon": "amp",
  "text": "Amplify all allies' DMG based on number of times an event space was reached after this guidebook effect was obtained (10% per space / Max: 100%)",
  "id": 4
 },
 {
  "rarity": 3,
  "availability": "global",
  "type": "ca",
  "effects": [],
  "icon": "uplift",
  "text": "All allies have a maximum charge bar limit of 200% (Can't be stacked)",
  "id": 5
 },
 {
  "rarity": 3,
  "availability": "global",
  "type": "def",
  "effects": [
   "enmity",
   "battlestart"
  ],
  "icon": "shield",
  "text": "At battle start: All allies' HP is reduced to 1 / Shield effect to each ally worth 500% of the HP they consumed (Can't be stacked)",
  "id": 6
 },
 {
  "rarity": 3,
  "availability": "global",
  "type": "def",
  "effects": [],
  "icon": "ele switch",
  "text": "Allies' DMG taken is converted to the element they have superiority against (Can't be stacked)",
  "id": 7
 },
 {
  "rarity": 3,
  "availability": "global",
  "type": "summon",
  "effects": [
   "cdcut"
  ],
  "icon": "special",
  "text": "Summon cooldowns become 1 turn (Can't be stacked)",
  "id": 8
 },
 {
  "rarity": 3,
  "availability": "global",
  "type": "summon,misc",
  "effects": [
   "cdcut",
   "battlestart"
  ],
  "icon": "special",
  "text": "\"Can't recast\" skills and 'Can't resummon\" summon calls become reusable again at the start of each battle (Can't be stacked)",
  "id": 9
 },
 {
  "rarity": 3,
  "availability": "global",
  "type": "misc",
  "effects": [
   "map",
   "coin",
   "guidebook"
  ],
  "icon": "special",
  "text": "Obtain a random number of Sephira coins and 1 random guidebook effect upon clearing a battle",
  "id": 10
 },
 {
  "rarity": 3,
  "availability": "global",
  "type": "na,skill,ca",
  "effects": [
   "amp",
   "echo"
  ],
  "icon": "special",
  "text": "Amplify DMG for allies with max HP above 24,999 +30% (Above 49,999: Bonus Elemental DMG effect [30%] / Above 99,999: Boost specs for the Bonus DMG and DMG amplify)",
  "id": 11
 },
 {
  "rarity": 3,
  "availability": "global",
  "type": "ca",
  "effects": [
   "echo",
   "weapon"
  ],
  "icon": "special",
  "text": "Bonus Elemental C.A. DMG effect to gun-, melee-, bow-, harp-, or katana-specialty allies (50%) / Bonus Superior Elemental C.A. DMG effect (50%)",
  "id": 12
 },
 {
  "rarity": 3,
  "availability": "global",
  "type": "na",
  "effects": [
   "echo",
   "weapon"
  ],
  "icon": "special",
  "text": "Bonus Elemental DMG effect to sabre-, dagger-, spear-, axe-, or staff-specialty allies (50%) / Bonus Superior Elemental DMG effect (50%)",
  "id": 13
 },
 {
  "rarity": 3,
  "availability": "global",
  "type": "na,ca",
  "effects": [
   "enmity",
   "multistrike"
  ],
  "icon": "special",
  "text": "Upon attacking when all allies are almost knocked out: Increase number of times all allies do an attack +1",
  "id": 14
 },
 {
  "rarity": 3,
  "availability": "global",
  "type": "ca",
  "effects": [
   "dispel"
  ],
  "icon": "special",
  "text": "Chain bursts of over 4 chains change to Ultimate Nova (Ultimate Nova: Destruction DMG / Remove all buffs from foes / Counts as all elemental chain bursts) (Can't be stacked)",
  "id": 15
 },
 {
  "rarity": 3,
  "availability": "global",
  "type": "ca",
  "effects": [
   "cdcut"
  ],
  "icon": "special",
  "text": "Upon an ally using a charge attack: 2-turn cut their skill cooldowns (Can't be stacked)",
  "id": 16
 },
 {
  "rarity": 3,
  "availability": "global",
  "type": "skill,misc",
  "effects": [],
  "icon": "special",
  "text": "At end of turn when all allies' charge bars are at least 100%: Consume 100% of all allies' charge bars / First-position ally deals 10-hit elemental DMG to all foes (1000% total) (Can't be stacked)",
  "id": 17
 },
 {
  "rarity": 3,
  "availability": "global",
  "type": "misc",
  "effects": [
   "cdcut"
  ],
  "icon": "special",
  "text": "At the end of each turn allies dealt 100 hits of DMG: 2-turn cut to all allies' skill cooldowns (Can't be stacked)",
  "id": 18
 },
 {
  "rarity": 3,
  "availability": "global",
  "type": "na",
  "effects": [
   "echo",
   "multistrike"
  ],
  "icon": "special",
  "text": "From an ally's 2nd or higher attack each turn: Sharp boost to ATK / From the 3rd or higher attack: Bonus Superior Elemental DMG effect (100%)",
  "id": 19
 },
 {
  "rarity": 3,
  "availability": "global",
  "type": "def",
  "effects": [
   "progressive"
  ],
  "icon": "special",
  "text": "Sharp hit to DEF / All allies gain Autorevived (with buffs) at battle start. / Amplify DMG for each time an ally was knocked out after obtaining this effect (10% per ally / Max: 100%) (Can't be stacked)",
  "id": 20
 },
 {
  "rarity": 3,
  "availability": "event",
  "type": "na,ca,skill",
  "effects": [
   "amp"
  ],
  "icon": "amp",
  "text": "Amplify DMG 50%",
  "id": 21
 },
 {
  "rarity": 3,
  "availability": "event",
  "type": "def",
  "effects": [],
  "icon": "def",
  "text": "20% DMG reduction",
  "id": 22
 },
 {
  "rarity": 3,
  "availability": "event",
  "type": "misc",
  "effects": [
   "cdcut"
  ],
  "icon": "special",
  "text": "2-turn reduction to skill cooldowns",
  "id": 23
 },
 {
  "rarity": 3,
  "availability": "event",
  "type": "na,ca",
  "effects": [
   "amp",
   "echo"
  ],
  "icon": "special",
  "text": "On Volcanic Area ruler spaces: Amplify DMG +30% / Bonus Water DMG effect [20%] / Bonus Water C.A. DMG effect [20%] / Lower requirements to cancel foe Omens",
  "id": 24
 },
 {
  "rarity": 3,
  "availability": "event",
  "type": "na,ca",
  "effects": [
   "amp",
   "echo"
  ],
  "icon": "special",
  "text": "On Lake Area ruler spaces: Amplify DMG +30% / Bonus Earth DMG effect [20%] / Bonus Earth C.A. DMG effect [20%] / Lower requirements to cancel foe Omens",
  "id": 25
 },
 {
  "rarity": 3,
  "availability": "event",
  "type": "na,ca",
  "effects": [
   "amp",
   "echo"
  ],
  "icon": "special",
  "text": "On Forest Area ruler spaces: Amplify DMG +30% / Bonus Wind DMG effect [20%] / Bonus Wind C.A. DMG effect [20%] / Lower requirements to cancel foe Omens",
  "id": 26
 },
 {
  "rarity": 3,
  "availability": "event",
  "type": "misc",
  "effects": [
   "map"
  ],
  "icon": "special",
  "text": "Lower foe's stats on battle, strong foe, and terrifying foe spaces (Can't be stacked)",
  "id": 27
 },
 {
  "rarity": 3,
  "availability": "event",
  "type": "na,ca,def",
  "effects": [
   "echo",
   "heal",
   "battlestart"
  ],
  "icon": "special",
  "text": "At battle start (1st ally): Earth/wind DMG to foes / Hit to ATK, DEF, and M.A. rate / Bonus Earth DMG to allies / End of turn: Restore HP / 10% boost to charge bars (Can't be stacked)",
  "id": 28
 },
 {
  "rarity": 3,
  "availability": "event",
  "type": "def",
  "effects": [
   "battlestart"
  ],
  "icon": "special",
  "text": "To all allies for 2 turns after battle start: DMG immunity, debuff immunity, and buffs can't be removed (Can't be stacked)",
  "id": 29
 },
 {
  "rarity": 3,
  "availability": "event",
  "type": "misc",
  "effects": [],
  "icon": "special",
  "text": "MC harbors the power of the Omnipotent (Can't be stacked)",
  "id": 30
 },
 {
  "rarity": 3,
  "availability": "event",
  "type": "misc,def",
  "effects": [
   "cdcut",
   "heal"
  ],
  "icon": "special",
  "text": "1-turn reduction to all allies' skill cooldowns / Heal all allies by 10% of max HP at battle start",
  "id": 31
 },
 {
  "rarity": 3,
  "availability": "character",
  "type": "na,def",
  "effects": [
   "heal",
   "battlestart"
  ],
  "icon": "special",
  "text": "At battle start: Maria Theresa activates The Empress Upright / If all allies' HP is full before attacking: Sharp boost to all allies' ATK (1 time) (Only if Maria Theresa is a main ally) (Can't be stacked)",
  "id": 32
 },
 {
  "rarity": 3,
  "availability": "character",
  "type": "na,def",
  "effects": [
   "cdcut",
   "heal",
   "battlestart"
  ],
  "icon": "special",
  "text": "At battle start: Caim activates The Fool Upright and gains Trick (Caim) (After 12 skill uses by allies: End cooldown for all allies' skills [1 time]) (Only if Caim is a main ally) (Can't be stacked)",
  "id": 33
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "na",
  "effects": [
   "flurry"
  ],
  "icon": "flurry",
  "text": "Normal attack hit count +1",
  "id": 34
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "na",
  "effects": [
   "flurry",
   "race"
  ],
  "icon": "flurry",
  "text": "Normal attack hit count for Erune and Levleath allies +1",
  "id": 35
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "na",
  "effects": [
   "flurry"
  ],
  "icon": "flurry",
  "text": "Increase all allies' normal attack hit count based on number of cursed guidebooks held (Max: +10)",
  "id": 36
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "na",
  "effects": [
   "echo"
  ],
  "icon": "echo",
  "text": "Bonus Elemental DMG effect (20%)",
  "id": 37
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "na",
  "effects": [
   "echo",
   "race"
  ],
  "icon": "echo",
  "text": "Bonus Elemental DMG effect to Harvin and Wolvir allies (30%)",
  "id": 38
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "skill",
  "effects": [
   "echo"
  ],
  "icon": "rigor",
  "text": "Elemental Rigor effect (20%)",
  "id": 39
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "ca",
  "effects": [
   "echo"
  ],
  "icon": "ca echo",
  "text": "Bonus Elemental C.A. DMG effect (20%)",
  "id": 40
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "ca",
  "effects": [
   "echo",
   "race"
  ],
  "icon": "ca echo",
  "text": "Bonus Elemental C.A. DMG effect to Draph and Grokkle allies (30%)",
  "id": 41
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "misc",
  "effects": [
   "aura"
  ],
  "icon": "aura",
  "text": "Elemental skill enhancement +60%",
  "id": 42
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "ca",
  "effects": [
   "battlestart"
  ],
  "icon": "ca dmg",
  "text": "At battle start: C.A. Reactivation effect to all allies (1 time) (Can't be stacked)",
  "id": 43
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "na,ca,skill",
  "effects": [
   "cap",
   "race"
  ],
  "icon": "cap",
  "text": "Primal and Other allies' DMG cap +50%",
  "id": 44
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "na",
  "effects": [
   "amp"
  ],
  "icon": "amp",
  "text": "Amplify normal attack DMG +30%",
  "id": 45
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "na,skill,ca",
  "effects": [
   "amp"
  ],
  "icon": "amp",
  "text": "Amplify MC's and SSR allies' DMG +10% / Amplify SR allies' DMG +100% / Amplify R allies' DMG +200%",
  "id": 46
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "na,skill,ca",
  "effects": [
   "amp",
   "race"
  ],
  "icon": "amp",
  "text": "Amplify Human and Geonoid allies' DMG +30%",
  "id": 47
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "skill",
  "effects": [
   "amp"
  ],
  "icon": "skill amp",
  "text": "Amplify skill DMG +30%",
  "id": 48
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "ca",
  "effects": [
   "amp"
  ],
  "icon": "ca amp",
  "text": "Amplify C.A. DMG +30%",
  "id": 49
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "ca",
  "effects": [
   "amp"
  ],
  "icon": "cb amp",
  "text": "Amplify chain DMG +100%",
  "id": 50
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "ca",
  "effects": [],
  "icon": "uplift",
  "text": "Uplift (10%)",
  "id": 51
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "ca",
  "effects": [],
  "icon": "uplift",
  "text": "Charge bar gain +20%",
  "id": 52
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "def",
  "effects": [],
  "icon": "def",
  "text": "Mitigate DMG taken (500)",
  "id": 53
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "def",
  "effects": [
   "battlestart"
  ],
  "icon": "guts",
  "text": "At battle start: Undying effect to all allies (1 time) (Can't be stacked)",
  "id": 54
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "def",
  "effects": [
   "battlestart"
  ],
  "icon": "veil",
  "text": "At battle start: Dispel Cancel effect (1 time) / Debuff immunity (1 time) (Can't be stacked)",
  "id": 55
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "def",
  "effects": [
   "heal"
  ],
  "icon": "regen",
  "text": "Regeneration (1000 HP)",
  "id": 56
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "misc",
  "effects": [
   "map"
  ],
  "icon": "special",
  "text": "Gain a random guidebook effect when resting at a healing space",
  "id": 57
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "misc",
  "effects": [
   "map",
   "coin"
  ],
  "icon": "special",
  "text": "Upon reaching an event space: Obtain a random amount of Sephira coins",
  "id": 58
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "misc",
  "effects": [
   "coin"
  ],
  "icon": "special",
  "text": "Sephira coin drop amount upon clearing battles +30%",
  "id": 59
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "na,skill,ca",
  "effects": [],
  "icon": "special",
  "text": "Allies' attacks won't miss regardless of accuracy, foe dodge rates, Mirror Image effects, or similar (Can't be stacked)",
  "id": 60
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "na,skill,ca",
  "effects": [
   "amp"
  ],
  "icon": "special",
  "text": "When an ally uses a skill: Amplify caster's DMG based on the skill's cooldown (Max: 50% / Can't be stacked)",
  "id": 61
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "na,skill",
  "effects": [
   "amp"
  ],
  "icon": "special",
  "text": "C.A. Sealed effect to allies upon using their C.A. / Amplify N.A. DMG and skill DMG +20% / Skills and charge attacks won't consume charge bar (Excludes skills with 0 cooldown)",
  "id": 62
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "misc",
  "effects": [
   "guidebook",
   "map"
  ],
  "icon": "special",
  "text": "Upon obtaining a guidebook effect from a treasure chest space: Gain 1 additional guidebook effect (Remaining uses: 2/2)",
  "id": 63
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "na,skill,ca",
  "effects": [
   "amp"
  ],
  "icon": "special",
  "text": "50% hit to all allies' DMG dealt until 3rd turn / From 4th turn or later: Amplify DMG dealt +100% / 20% DMG reduction",
  "id": 64
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "na,skill,ca",
  "effects": [
   "amp",
   "map"
  ],
  "icon": "special",
  "text": "50% hit to DMG dealt against foes appearing on battle spaces / Amplify DMG against foes appearing on strong foe, terrifying foe, ruler, and boss spaces +50%",
  "id": 65
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "na,skill,ca",
  "effects": [
   "cap"
  ],
  "icon": "special",
  "text": "Chance for all allies' normal attacks, skill DMG, and charge attacks to miss / 100% boost to ATK / 50% boost to DMG cap",
  "id": 66
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "na,skill,ca,def",
  "effects": [
   "amp",
   "map",
   "battlestart"
  ],
  "icon": "special",
  "text": "When not entering battle for 3 spaces or more: Amplify all allies' DMG at start of next battle +50% / DMG Mitigation effect (2000) (Can't be stacked)",
  "id": 67
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "summon",
  "effects": [],
  "icon": "special",
  "text": "Number of summon calls per turn +1",
  "id": 68
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "misc",
  "effects": [
   "debuff"
  ],
  "icon": "special",
  "text": "Upon an ally using a debuff skill: 2 random debuffs to a foe",
  "id": 69
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "misc",
  "effects": [
   "debuff"
  ],
  "icon": "special",
  "text": "20% miasma DMG reduction",
  "id": 70
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "misc",
  "effects": [],
  "icon": "special",
  "text": "Next obtained cursed guidebook effect is counteracted (Remaining uses: 1/1)",
  "id": 71
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "ca",
  "effects": [
   "battlestart"
  ],
  "icon": "special",
  "text": "At battle start: 40% boost to all allies' charge bars",
  "id": 72
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "skill",
  "effects": [],
  "icon": "special",
  "text": "When an ally uses a damage skill: Plain DMG to a foe based on its current HP",
  "id": 73
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "na,skill,ca",
  "effects": [],
  "icon": "special",
  "text": "Elemental DMG dealt will be treated as superior to the target's element (Can't be stacked)",
  "id": 74
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "misc",
  "effects": [
   "battlestart"
  ],
  "icon": "special",
  "text": "At battle start: Dodge/Tank-and-Counter effect to all allies (3 hits) (Can't be stacked)",
  "id": 75
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "misc",
  "effects": [
   "battlestart",
   "map"
  ],
  "icon": "special",
  "text": "1-turn cut to all allies' skill cooldowns after every 5 spaces moved (0/5 spaces)",
  "id": 76
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "misc",
  "effects": [
   "race"
  ],
  "icon": "special",
  "text": "Party members gain all character types (Can't be stacked)",
  "id": 77
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "misc",
  "effects": [
   "weapon"
  ],
  "icon": "special",
  "text": "Party members gain all weapons types as specialty weapons (Can't be stacked)",
  "id": 78
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "misc",
  "effects": [
   "battlestart"
  ],
  "icon": "special",
  "text": "At battle start: 5 Crests to all allies (Type of Crest depends on their element) (Can't be stacked)",
  "id": 79
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "misc",
  "effects": [
   "cdcut"
  ],
  "icon": "special",
  "text": "At end of turn: Chance to end cooldown for a random skill on each ally that didn't use a skill that turn (Can't be stacked)",
  "id": 80
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "skill",
  "effects": [],
  "icon": "special",
  "text": "At end of turn: Elemental DMG to a foe for each ally that didn't take DMG that turn (Hit number increases based on number of consecutive turns DMG wasn't taken [Max: 5])",
  "id": 81
 },
 {
  "rarity": 2,
  "availability": "event",
  "type": "def",
  "effects": [
   "heal"
  ],
  "icon": "revive",
  "text": "At battle start: Autorevive effect to all allies (1 time) / Death's Grace effect (Can't be stacked)",
  "id": 82
 },
 {
  "rarity": 2,
  "availability": "event",
  "type": "misc",
  "effects": [
   "guidebook"
  ],
  "icon": "special",
  "text": "Boost to chance of obtaining rare guidebook effects upon clearing a battle (Can't be stacked)",
  "id": 83
 },
 {
  "rarity": 2,
  "availability": "event",
  "type": "skill",
  "effects": [
   "debuff"
  ],
  "icon": "special",
  "text": "For every 3 skills used by allies: First-position ally deals 3-hit elemental DMG to all foes / Hit to ATK and DEF (Stackable) / Amplify DMG taken (6 hits)",
  "id": 84
 },
 {
  "rarity": 2,
  "availability": "event",
  "type": "misc",
  "effects": [
   "debuff",
   "dispel"
  ],
  "icon": "special",
  "text": "At end of turn: First-position ally deals elemental DMG to all foes / Blind effect / Supplement DMG taken / Remove 1 buff",
  "id": 85
 },
 {
  "rarity": 2,
  "availability": "event",
  "type": "misc",
  "effects": [
   "amp"
  ],
  "icon": "special",
  "text": "Upon an ally attacking: Random debuff to a foe",
  "id": 86
 },
 {
  "rarity": 2,
  "availability": "event",
  "type": "misc",
  "effects": [
   "amp"
  ],
  "icon": "special",
  "text": "At end of turn: 1 random buff to each ally",
  "id": 87
 },
 {
  "rarity": 2,
  "availability": "event",
  "type": "misc",
  "effects": [
   "map"
  ],
  "icon": "curse dmg",
  "text": "50% hit to DMG dealt (Changes to Amplify DMG +50% upon clearing 3 battles)",
  "id": 88
 },
 {
  "rarity": 2,
  "availability": "event",
  "type": "def",
  "effects": [],
  "icon": "curse def",
  "text": "Amplify DMG taken +20% (Changes to 20% DMG reduction upon clearing 3 battles)",
  "id": 89
 },
 {
  "rarity": 2,
  "availability": "event",
  "type": "misc",
  "effects": [
   "cdcut"
  ],
  "icon": "curse special",
  "text": "2-turn increase to skill cooldowns (Changes to 2-turn reduction to skill cooldowns upon clearing 3 battles)",
  "id": 90
 },
 {
  "rarity": 1,
  "availability": "global",
  "type": "na,ca,skill",
  "effects": [],
  "icon": "atk",
  "text": "ATK +20%",
  "id": 91
 },
 {
  "rarity": 1,
  "availability": "global",
  "type": "na,ca,skill",
  "effects": [],
  "icon": "atk",
  "text": "Elemental ATK + 20%",
  "id": 92
 },
 {
  "rarity": 1,
  "availability": "global",
  "type": "na",
  "effects": [],
  "icon": "ma",
  "text": "Multiattack rate +20%",
  "id": 93
 },
 {
  "rarity": 1,
  "availability": "global",
  "type": "na,ca,skill",
  "effects": [],
  "icon": "crit",
  "text": "Critical hit rate +30%",
  "id": 94
 },
 {
  "rarity": 1,
  "availability": "global",
  "type": "na,ca,skill",
  "effects": [],
  "icon": "stamina",
  "text": "Stamina",
  "id": 95
 },
 {
  "rarity": 1,
  "availability": "global",
  "type": "na,ca,skill",
  "effects": [],
  "icon": "enmity",
  "text": "Enmity",
  "id": 96
 },
 {
  "rarity": 1,
  "availability": "global",
  "type": "skill",
  "effects": [],
  "icon": "skill cap",
  "text": "Skill DMG +20% / Skill DMG cap +10%",
  "id": 97
 },
 {
  "rarity": 1,
  "availability": "global",
  "type": "ca",
  "effects": [
   "cap"
  ],
  "icon": "ca cap",
  "text": "C.A. DMG +20% / C.A. DMG cap +10%",
  "id": 98
 },
 {
  "rarity": 1,
  "availability": "global",
  "type": "ca",
  "effects": [
   "cap"
  ],
  "icon": "ca cap",
  "text": "Special C.A. DMG cap +10%",
  "id": 99
 },
 {
  "rarity": 1,
  "availability": "global",
  "type": "ca",
  "effects": [
   "cap"
  ],
  "icon": "cb cap",
  "text": "Chain burst DMG +50% / Chain burst DMG cap +30%",
  "id": 100
 },
 {
  "rarity": 1,
  "availability": "global",
  "type": "na,skill,ca",
  "effects": [
   "cap"
  ],
  "icon": "cap",
  "text": "DMG cap + 10%",
  "id": 101
 },
 {
  "rarity": 1,
  "availability": "global",
  "type": "def",
  "effects": [],
  "icon": "def",
  "text": "DEF +30%",
  "id": 102
 },
 {
  "rarity": 1,
  "availability": "global",
  "type": "def",
  "effects": [],
  "icon": "hp",
  "text": "Max HP +30%",
  "id": 103
 },
 {
  "rarity": 1,
  "availability": "global",
  "type": "def",
  "effects": [
   "heal"
  ],
  "icon": "heal spec",
  "text": "Healing specs +20%",
  "id": 104
 },
 {
  "rarity": 99,
  "availability": "global",
  "type": "def",
  "effects": [],
  "icon": "curse hp",
  "text": "20% hit to max HP",
  "id": 105
 },
 {
  "rarity": 99,
  "availability": "global",
  "type": "def",
  "effects": [],
  "icon": "curse hp",
  "text": "Take DMG each turn",
  "id": 106
 },
 {
  "rarity": 99,
  "availability": "global",
  "type": "na",
  "effects": [],
  "icon": "curse ma",
  "text": "100% hit to multiattack rate",
  "id": 107
 },
 {
  "rarity": 99,
  "availability": "global",
  "type": "misc",
  "effects": [
   "debuff"
  ],
  "icon": "curse special",
  "text": "At end of turn: Random debuffs to each ally",
  "id": 108
 },
 {
  "rarity": 99,
  "availability": "global",
  "type": "misc",
  "effects": [
   "debuff"
  ],
  "icon": "curse special",
  "text": "Foes' attacks and debuffs can't miss (Can't be stacked)",
  "id": 109
 },
 {
  "rarity": 99,
  "availability": "global",
  "type": "misc",
  "effects": [
   "battlestart"
  ],
  "icon": "curse special",
  "text": "At battle start: DMG immunity to foe (30 hits) (Can't be stacked)",
  "id": 110
 },
 {
  "rarity": 99,
  "availability": "global",
  "type": "misc",
  "effects": [
   "cdcut"
  ],
  "icon": "curse special",
  "text": "Chance of 1-turn extension to skill cooldowns for all allies at end of turn",
  "id": 111
 },
 {
  "rarity": 99,
  "availability": "global",
  "type": "misc",
  "effects": [
   "coin"
  ],
  "icon": "curse special",
  "text": "Sephira coin drop amount upon clearing battles -30%",
  "id": 112
 },
 {
  "rarity": 99,
  "availability": "global",
  "type": "misc",
  "effects": [],
  "icon": "curse special",
  "text": "Omen cancel requirements on ruler spaces and boss spaces are increased",
  "id": 113
 },
 {
  "rarity": 99,
  "availability": "global",
  "type": "misc",
  "effects": [],
  "icon": "curse special",
  "text": "Become weak to all elements (Can't be stacked)",
  "id": 114
 }
];
