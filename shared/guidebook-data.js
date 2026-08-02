// Guide book database extracted from gbf.wiki/Evoking_Solomonis#Guidebooks
// (effect text + wiki tag taxonomy). rarity: 1=Normal, 2=Rare, 3=Unique,
// 99=Cursed. availability: global/event/character. type & effects are the
// wiki filter tags used for the codex filters. Owned status is matched at
// runtime against spacebook_status_list by status_id (preferred, language
// independent) or by normalized effect text in en/ja/zh.
// ja/zh fields are filled as translations are collected (framework for the
// future localization / auto-update when new guidebooks ship).
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
  "id": 1,
  "ja": "自属性スキルエンハンス(180%)",
  "zh": null
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
  "id": 2,
  "ja": null,
  "zh": null
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
  "id": 3,
  "ja": null,
  "zh": null
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
  "id": 4,
  "ja": "この導本効果を入手して以降にイベントマスに到 達した回数に応じて味方全体の与ダメージ UP(50%/最大100%)",
  "zh": null
 },
 {
  "rarity": 3,
  "availability": "global",
  "type": "ca",
  "effects": [],
  "icon": "uplift",
  "text": "All allies have a maximum charge bar limit of 200% (Can't be stacked)",
  "id": 5,
  "ja": null,
  "zh": null
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
  "id": 6,
  "ja": null,
  "zh": null
 },
 {
  "rarity": 3,
  "availability": "global",
  "type": "def",
  "effects": [],
  "icon": "ele switch",
  "text": "Allies' DMG taken is converted to the element they have superiority against (Can't be stacked)",
  "id": 7,
  "ja": "被ダメージを有利属性に変換する(重複不可)",
  "zh": null
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
  "id": 8,
  "ja": null,
  "zh": null
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
  "id": 9,
  "ja": null,
  "zh": null
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
  "id": 10,
  "ja": null,
  "zh": null
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
  "id": 11,
  "ja": null,
  "zh": null
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
  "id": 12,
  "ja": "得意武器に「銃」「格闘」「弓」「楽器」「刀」 のいずれかが含まれるキャラに自属性奥義追撃効 果(50%)/弱点属性奥義追撃効果(50%)",
  "zh": null
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
  "id": 13,
  "ja": "得意武器に「剣」「短剣」「槍」「斧」「杖」の いずれかが含まれるキャラに自属性追撃効果 (50%)/弱点属性追撃効果(50%)",
  "zh": null
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
  "id": 14,
  "ja": "攻撃開始時に味方全体が瀕死状態の時、味方全体 の攻撃行動回数増加(＋1)",
  "zh": null
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
  "id": 15,
  "ja": "オーバーチェイン時のチェインバーストが「アル ティメット・ノヴァ」に変化　◆アルティメッ ト・ノヴァ：破壊属性ダメージ/敵の強化効果を 全て無効化/全属性のオーバーチェインとして扱 う(重複不可)",
  "zh": null
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
  "id": 16,
  "ja": null,
  "zh": null
 },
 {
  "rarity": 3,
  "availability": "global",
  "type": "skill,misc",
  "effects": [],
  "icon": "special",
  "text": "At end of turn when all allies' charge bars are at least 100%: Consume 100% of all allies' charge bars / First-position ally deals 10-hit elemental DMG to all foes (1000% total) (Can't be stacked)",
  "id": 17,
  "ja": null,
  "zh": null
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
  "id": 18,
  "ja": null,
  "zh": null
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
  "id": 19,
  "ja": "ターン進行時に2回目以降の攻撃行動を行うと き、攻撃大幅UP/3回目以降の攻撃行動を行うと き弱点属性追撃効果(100%)",
  "zh": null
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
  "id": 20,
  "ja": null,
  "zh": null
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
  "id": 21,
  "ja": null,
  "zh": null
 },
 {
  "rarity": 3,
  "availability": "event",
  "type": "def",
  "effects": [],
  "icon": "def",
  "text": "20% DMG reduction",
  "id": 22,
  "ja": null,
  "zh": null
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
  "id": 23,
  "ja": null,
  "zh": null
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
  "id": 24,
  "ja": null,
  "zh": null
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
  "id": 25,
  "ja": null,
  "zh": null
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
  "id": 26,
  "ja": null,
  "zh": null
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
  "id": 27,
  "ja": null,
  "zh": null
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
  "id": 28,
  "ja": null,
  "zh": null
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
  "id": 29,
  "ja": null,
  "zh": null
 },
 {
  "rarity": 3,
  "availability": "event",
  "type": "misc",
  "effects": [],
  "icon": "special",
  "text": "MC harbors the power of the Omnipotent (Can't be stacked)",
  "id": 30,
  "ja": null,
  "zh": null
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
  "id": 31,
  "ja": null,
  "zh": null
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
  "id": 32,
  "ja": null,
  "zh": null
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
  "id": 33,
  "ja": null,
  "zh": null
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
  "id": 34,
  "ja": null,
  "zh": null
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
  "id": 35,
  "ja": null,
  "zh": null
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
  "id": 36,
  "ja": null,
  "zh": null
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
  "id": 37,
  "ja": null,
  "zh": null
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
  "id": 38,
  "ja": "ハーヴィン族とヴォルヴィル族に自属性追撃効果 (30%)",
  "zh": null
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
  "id": 39,
  "ja": null,
  "zh": null
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
  "id": 40,
  "ja": null,
  "zh": null
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
  "id": 41,
  "ja": "ドラフ族とグラックル族に自属性奥義追撃効果 (30%)",
  "zh": null
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
  "id": 42,
  "ja": "自属性スキルエンハンス(60%)",
  "zh": null
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
  "id": 43,
  "ja": "バトル開始時、味方全体に奥義再発動効果(1回) (重複不可)",
  "zh": null
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
  "id": 44,
  "ja": null,
  "zh": null
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
  "id": 45,
  "ja": "通常攻撃の与ダメージUP(30%)",
  "zh": null
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
  "id": 46,
  "ja": "主人公とSSレアキャラの与ダメージUP(10%)/S レアキャラの与ダメージUP(100%)/レアキャラの 与ダメージUP(200%)",
  "zh": null
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
  "id": 47,
  "ja": null,
  "zh": null
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
  "id": 48,
  "ja": null,
  "zh": null
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
  "id": 49,
  "ja": "奥義与ダメージUP(30%)",
  "zh": null
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
  "id": 50,
  "ja": null,
  "zh": null
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "ca",
  "effects": [],
  "icon": "uplift",
  "text": "Uplift (10%)",
  "id": 51,
  "ja": "高揚(10%)",
  "zh": null
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "ca",
  "effects": [],
  "icon": "uplift",
  "text": "Charge bar gain +20%",
  "id": 52,
  "ja": null,
  "zh": null
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "def",
  "effects": [],
  "icon": "def",
  "text": "Mitigate DMG taken (500)",
  "id": 53,
  "ja": null,
  "zh": null
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
  "id": 54,
  "ja": null,
  "zh": null
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
  "id": 55,
  "ja": null,
  "zh": null
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
  "id": 56,
  "ja": "再生(1000回復)",
  "zh": null
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
  "id": 57,
  "ja": null,
  "zh": null
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
  "id": 58,
  "ja": "イベントマスに到達した時、ランダムな数のセフ ィラコインを獲得する",
  "zh": null
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
  "id": 59,
  "ja": null,
  "zh": null
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "na,skill,ca",
  "effects": [],
  "icon": "special",
  "text": "Allies' attacks won't miss regardless of accuracy, foe dodge rates, Mirror Image effects, or similar (Can't be stacked)",
  "id": 60,
  "ja": null,
  "zh": null
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
  "id": 61,
  "ja": null,
  "zh": null
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
  "id": 62,
  "ja": "味方全体が奥義発動時、自分に奥義封印効果/通 常攻撃とアビリティの与ダメージUP(20%)/奥義 ゲージDOWN効果無効/奥義やアビリティの発動 に奥義ゲージを消費しない　◆使用間隔0ターン のアビリティを除く",
  "zh": null
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
  "id": 63,
  "ja": null,
  "zh": null
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
  "id": 64,
  "ja": null,
  "zh": null
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
  "id": 65,
  "ja": null,
  "zh": null
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
  "id": 66,
  "ja": null,
  "zh": null
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
  "id": 67,
  "ja": "3マス以上連続で戦闘を行わなかった場合、次の バトル開始時に味方全体に与ダメージUP(50%)/ 被ダメージ減少効果(2000)(1/3マス)(重複不可)",
  "zh": null
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "summon",
  "effects": [],
  "icon": "special",
  "text": "Number of summon calls per turn +1",
  "id": 68,
  "ja": null,
  "zh": null
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
  "id": 69,
  "ja": null,
  "zh": null
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
  "id": 70,
  "ja": "瘴気ダメージ軽減(20%)",
  "zh": null
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "misc",
  "effects": [],
  "icon": "special",
  "text": "Next obtained cursed guidebook effect is counteracted (Remaining uses: 1/1)",
  "id": 71,
  "ja": null,
  "zh": null
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
  "id": 72,
  "ja": null,
  "zh": null
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "skill",
  "effects": [],
  "icon": "special",
  "text": "When an ally uses a damage skill: Plain DMG to a foe based on its current HP",
  "id": 73,
  "ja": null,
  "zh": null
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "na,skill,ca",
  "effects": [],
  "icon": "special",
  "text": "Elemental DMG dealt will be treated as superior to the target's element (Can't be stacked)",
  "id": 74,
  "ja": null,
  "zh": null
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
  "id": 75,
  "ja": null,
  "zh": null
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
  "id": 76,
  "ja": null,
  "zh": null
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
  "id": 77,
  "ja": "パーティメンバーの種族に全ての種族を追加する (重複不可)",
  "zh": null
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
  "id": 78,
  "ja": null,
  "zh": null
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
  "id": 79,
  "ja": "バトル開始時、味方全体に刻印を5つ付与　◆付 与する刻印の種類は自属性によって変化(重複不 可)",
  "zh": null
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
  "id": 80,
  "ja": "アビリティを使用しなかった味方がターン終了 時、確率で自分のランダムなアビリティが1つ即 時使用可能になる(重複不可)",
  "zh": null
 },
 {
  "rarity": 2,
  "availability": "global",
  "type": "skill",
  "effects": [],
  "icon": "special",
  "text": "At end of turn: Elemental DMG to a foe for each ally that didn't take DMG that turn (Hit number increases based on number of consecutive turns DMG wasn't taken [Max: 5])",
  "id": 81,
  "ja": "ダメージを受けなかった味方がターン終了時、敵 に自属性ダメージ　◆継続してダメージを受けな かったターン数に応じて攻撃回数UP(最大5回)",
  "zh": null
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
  "id": 82,
  "ja": null,
  "zh": null
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
  "id": 83,
  "ja": null,
  "zh": null
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
  "id": 84,
  "ja": "味方全体が累計で3回アビリティを使用する度に 先頭のキャラが敵全体に3回自属性ダメージ/攻防 DOWN(累積)/被ダメージUP(6回)",
  "zh": null
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
  "id": 85,
  "ja": null,
  "zh": null
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
  "id": 86,
  "ja": null,
  "zh": null
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
  "id": 87,
  "ja": null,
  "zh": null
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
  "id": 88,
  "ja": null,
  "zh": null
 },
 {
  "rarity": 2,
  "availability": "event",
  "type": "def",
  "effects": [],
  "icon": "curse def",
  "text": "Amplify DMG taken +20% (Changes to 20% DMG reduction upon clearing 3 battles)",
  "id": 89,
  "ja": null,
  "zh": null
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
  "id": 90,
  "ja": null,
  "zh": null
 },
 {
  "rarity": 1,
  "availability": "global",
  "type": "na,ca,skill",
  "effects": [],
  "icon": "atk",
  "text": "ATK +20%",
  "id": 91,
  "ja": null,
  "zh": null
 },
 {
  "rarity": 1,
  "availability": "global",
  "type": "na,ca,skill",
  "effects": [],
  "icon": "atk",
  "text": "Elemental ATK + 20%",
  "id": 92,
  "ja": null,
  "zh": null
 },
 {
  "rarity": 1,
  "availability": "global",
  "type": "na",
  "effects": [],
  "icon": "ma",
  "text": "Multiattack rate +20%",
  "id": 93,
  "ja": "連続攻撃確率UP(20%)",
  "zh": null
 },
 {
  "rarity": 1,
  "availability": "global",
  "type": "na,ca,skill",
  "effects": [],
  "icon": "crit",
  "text": "Critical hit rate +30%",
  "id": 94,
  "ja": "クリティカル確率UP(30%)",
  "zh": null
 },
 {
  "rarity": 1,
  "availability": "global",
  "type": "na,ca,skill",
  "effects": [],
  "icon": "stamina",
  "text": "Stamina",
  "id": 95,
  "ja": "渾身",
  "zh": null
 },
 {
  "rarity": 1,
  "availability": "global",
  "type": "na,ca,skill",
  "effects": [],
  "icon": "enmity",
  "text": "Enmity",
  "id": 96,
  "ja": "背水",
  "zh": null
 },
 {
  "rarity": 1,
  "availability": "global",
  "type": "skill",
  "effects": [],
  "icon": "skill cap",
  "text": "Skill DMG +20% / Skill DMG cap +10%",
  "id": 97,
  "ja": "アビリティダメージUP(20%)/アビリティダメー ジ上限UP(10%)",
  "zh": null
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
  "id": 98,
  "ja": null,
  "zh": null
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
  "id": 99,
  "ja": "奥義ダメージ特殊上限UP(10%)",
  "zh": null
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
  "id": 100,
  "ja": null,
  "zh": null
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
  "id": 101,
  "ja": "ダメージ上限UP(10%)",
  "zh": null
 },
 {
  "rarity": 1,
  "availability": "global",
  "type": "def",
  "effects": [],
  "icon": "def",
  "text": "DEF +30%",
  "id": 102,
  "ja": "防御力UP(30%)",
  "zh": null
 },
 {
  "rarity": 1,
  "availability": "global",
  "type": "def",
  "effects": [],
  "icon": "hp",
  "text": "Max HP +30%",
  "id": 103,
  "ja": "最大HPUP(30%)",
  "zh": null
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
  "id": 104,
  "ja": "回復性能UP(20%)",
  "zh": null
 },
 {
  "rarity": 99,
  "availability": "global",
  "type": "def",
  "effects": [],
  "icon": "curse hp",
  "text": "20% hit to max HP",
  "id": 105,
  "ja": null,
  "zh": null
 },
 {
  "rarity": 99,
  "availability": "global",
  "type": "def",
  "effects": [],
  "icon": "curse hp",
  "text": "Take DMG each turn",
  "id": 106,
  "ja": null,
  "zh": null
 },
 {
  "rarity": 99,
  "availability": "global",
  "type": "na",
  "effects": [],
  "icon": "curse ma",
  "text": "100% hit to multiattack rate",
  "id": 107,
  "ja": null,
  "zh": null
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
  "id": 108,
  "ja": null,
  "zh": null
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
  "id": 109,
  "ja": null,
  "zh": null
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
  "id": 110,
  "ja": null,
  "zh": null
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
  "id": 111,
  "ja": null,
  "zh": null
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
  "id": 112,
  "ja": null,
  "zh": null
 },
 {
  "rarity": 99,
  "availability": "global",
  "type": "misc",
  "effects": [],
  "icon": "curse special",
  "text": "Omen cancel requirements on ruler spaces and boss spaces are increased",
  "id": 113,
  "ja": null,
  "zh": null
 },
 {
  "rarity": 99,
  "availability": "global",
  "type": "misc",
  "effects": [],
  "icon": "curse special",
  "text": "Become weak to all elements (Can't be stacked)",
  "id": 114,
  "ja": null,
  "zh": null
 }
];

// status_id (game-side guidebook effect id, identical across en/ja clients)
// → GUIDEBOOK_DB entry id. Extended at runtime when new books are observed.
export const GUIDEBOOK_STATUS_ID = {
 "1": 91,
 "2": 93,
 "3": 97,
 "4": 98,
 "5": 100,
 "6": 99,
 "7": 101,
 "8": 92,
 "9": 95,
 "10": 96,
 "11": 94,
 "13": 103,
 "14": 102,
 "15": 104,
 "17": 37,
 "18": 40,
 "19": 39,
 "20": 45,
 "21": 48,
 "22": 49,
 "23": 50,
 "24": 42,
 "25": 53,
 "27": 56,
 "28": 52,
 "29": 51,
 "30": 68,
 "31": 74,
 "32": 60,
 "33": 34,
 "34": 47,
 "35": 35,
 "36": 41,
 "37": 38,
 "38": 44,
 "39": 75,
 "40": 72,
 "41": 79,
 "42": 54,
 "43": 43,
 "44": 55,
 "46": 80,
 "47": 61,
 "48": 81,
 "49": 46,
 "50": 73,
 "51": 59,
 "52": 70,
 "53": 76,
 "54": 67,
 "55": 71,
 "56": 57,
 "57": 63,
 "58": 58,
 "59": 78,
 "60": 77,
 "61": 69,
 "62": 66,
 "63": 64,
 "64": 62,
 "65": 65,
 "66": 83,
 "67": 84,
 "68": 85,
 "72": 21,
 "73": 22,
 "74": 23,
 "75": 16,
 "76": 2,
 "77": 5,
 "79": 1,
 "80": 7,
 "81": 9,
 "83": 8,
 "84": 15,
 "85": 3,
 "86": 4,
 "87": 10,
 "88": 13,
 "89": 12,
 "90": 11,
 "91": 19,
 "92": 18,
 "93": 17,
 "95": 14,
 "97": 6,
 "102": 28,
 "103": 27,
 "104": 31,
 "105": 29,
 "108": 32,
 "117": 107,
 "118": 106,
 "119": 113,
 "120": 111,
 "124": 114,
 "126": 88,
 "128": 90,
 "129": 105
};
