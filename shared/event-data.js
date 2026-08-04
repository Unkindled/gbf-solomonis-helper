// Event database — static seed (imported from arcarum3-ext community data).
// Key: selectionId as string (normal events, 6-digit family id from choice_id/100)
// or "special:N" (special incidents). Runtime learning extends this at use.
export const EVENT_DB = {
 "100101": {
  "key": "100101",
  "specialIncidentId": null,
  "nodeType": 5,
  "eventKind": "normal",
  "name": {},
  "enumKey": "",
  "tips": [],
  "description": {
   "ja": "不気味な洞窟を進むと、そこには怪しく脈動する<br><span style=\"color:#6FC4FF;\">巨大な結晶</span>が聳え立っていた。<br>{{PLAYER}}は、抗い難い蠱惑的な光に誘われ、<br>結晶に近づいていく……",
   "zh-CN": "穿过阴森的洞窟后，一块诡异脉动的<br><span style=\"color:#6FC4FF;\">巨大结晶</span>耸立在眼前。<br>{{PLAYER}}受到那难以抗拒的蛊惑光芒吸引，<br>逐渐向结晶靠近……"
  },
  "options": {
   "10010101": {
    "choiceId": 10010101,
    "title": {
     "ja": "全員の<br>血を捧げる",
     "zh-CN": "献上所有人的<br>鲜血"
    },
    "text": {
     "ja": "味方全体のHP-30%<br>ランダムな導本効果を2つ獲得",
     "zh-CN": "全体HP-30%<br>获得2个随机导本效果"
    },
    "turn": 1,
    "disabled": false,
    "questCheck": false
   },
   "10010102": {
    "choiceId": 10010102,
    "title": {
     "ja": "ひとり分の<br>血を捧げる",
     "zh-CN": "献上一人的<br>鲜血"
    },
    "text": {
     "ja": "ランダムな味方1人のHPが1になる<br>ランダムな導本効果から1つを選んで入手",
     "zh-CN": "随机一名成员的HP变为1<br>从随机导本效果中选择1个获得"
    },
    "turn": 1,
    "disabled": false,
    "questCheck": false
   },
   "10010103": {
    "choiceId": 10010103,
    "title": {
     "ja": "立ち去る",
     "zh-CN": "离开"
    },
    "text": {
     "ja": "誘惑を振り切って立ち去る",
     "zh-CN": "摆脱诱惑后离开"
    },
    "turn": null,
    "disabled": false,
    "questCheck": false
   }
  }
 },
 "100201": {
  "key": "100201",
  "specialIncidentId": null,
  "nodeType": 5,
  "eventKind": "normal",
  "name": {},
  "enumKey": "",
  "tips": [],
  "description": {
   "ja": "探索の最中、{{PLAYER}}は<br><span style=\"color:#6FC4FF;\">美しく輝く鉱石に満ちた鉱脈</span>を発見した。<br>採掘して持ち帰れば高く売れそうだが、<br>不用意に大きな音を出すと<br>魔物に気づかれるかもしれない……",
   "zh-CN": "探索途中，{{PLAYER}}发现了充满<span style=\"color:#6FC4FF;\">美丽发光矿石的矿脉</span>。<br>采掘带回应该能卖个好价钱，但<br>发出太大声音可能会被魔物发现……"
  },
  "options": {
   "10020101": {
    "choiceId": 10020101,
    "title": {
     "ja": "採掘する",
     "zh-CN": "采掘"
    },
    "text": {
     "ja": "90%：セフィラコイン+30<br>10%：魔物に気づかれその場を去る",
     "zh-CN": "90%：塞菲拉币+30<br>10%：被魔物发现并离开"
    },
    "turn": 1,
    "disabled": false,
    "questCheck": false
   },
   "10020102": {
    "choiceId": 10020102,
    "title": {
     "ja": "続ける",
     "zh-CN": "继续"
    },
    "text": {
     "ja": "75%：セフィラコイン+60\r<br>25%：セフィラコイン-30",
     "zh-CN": "75%：塞菲拉币+60<br>25%：塞菲拉币-30"
    },
    "turn": null,
    "disabled": false,
    "questCheck": false
   },
   "10020103": {
    "choiceId": 10020103,
    "title": {
     "ja": "続ける",
     "zh-CN": "继续"
    },
    "text": {
     "ja": "40%：セフィラコイン+150\r<br>60%：セフィラコイン-90",
     "zh-CN": "40%：塞菲拉币+150<br>60%：塞菲拉币-90"
    },
    "turn": null,
    "disabled": false,
    "questCheck": false
   },
   "10020105": {
    "choiceId": 10020105,
    "title": {
     "ja": "止める",
     "zh-CN": "停止"
    },
    "text": {
     "ja": "採掘を中止して立ち去る",
     "zh-CN": "停止采掘并离开"
    },
    "turn": null,
    "disabled": false,
    "questCheck": false
   },
   "10020106": {
    "choiceId": 10020106,
    "title": {
     "ja": "止める",
     "zh-CN": "停止"
    },
    "text": {
     "ja": "残りの鉱石を諦めて立ち去る",
     "zh-CN": "放弃剩余矿石并离开"
    },
    "turn": null,
    "disabled": false,
    "questCheck": false
   }
  }
 },
 "100301": {
  "key": "100301",
  "specialIncidentId": null,
  "nodeType": 5,
  "eventKind": "normal",
  "name": {},
  "enumKey": "",
  "tips": [],
  "description": {
   "ja": "予兆もなく{{PLAYER}}の前に姿を現したのは、<br>理外の禍々しい瘴気を身に纏う死神だった。<br>次の瞬間、魂を凍らせるような声が響く。<br><span style=\"color:#B5A598;\">「選べ。契約を結び力を得るか──<br>あるいは抗い、ここで果てるか」</span>",
   "zh-CN": "毫无征兆地出现在{{PLAYER}}面前的，<br>是一名身缠悖理而不祥瘴气的死神。<br>下一刻，冻结灵魂般的声音响起。<br><span style=\"color:#B5A598;\">「选择吧。缔结契约获取力量──<br>抑或反抗，并葬身于此」</span>"
  },
  "options": {
   "10030101": {
    "choiceId": 10030101,
    "title": {
     "ja": "契約を結ぶ",
     "zh-CN": "缔结契约"
    },
    "text": {
     "ja": "ランダムな味方1人が戦闘不能になる<br>特別な導本効果を獲得",
     "zh-CN": "随机一名成员陷入战斗不能<br>获得特殊导本效果"
    },
    "turn": 1,
    "disabled": false,
    "questCheck": false
   },
   "10030102": {
    "choiceId": 10030102,
    "title": {
     "ja": "抗う",
     "zh-CN": "反抗"
    },
    "text": {
     "ja": "死神に勝利すると<br>ランダムな導本効果を獲得",
     "zh-CN": "战胜死神后<br>获得随机导本效果"
    },
    "turn": null,
    "disabled": false,
    "questCheck": true
   }
  }
 },
 "100401": {
  "key": "100401",
  "specialIncidentId": null,
  "nodeType": 5,
  "eventKind": "normal",
  "name": {},
  "enumKey": "",
  "tips": [],
  "description": {
   "ja": "<span style=\"color:#FFCE4A;\">「ヤァ！　ヤァ！　よく来てくれたね！<br>モル……じゃない、お客さんなんて久しぶりだ！<br>最近完成した素晴らしい薬を買わないかい！？<br>こっちの試作品ならお代はいらないよ！？」</span>",
   "zh-CN": "<span style=\"color:#FFCE4A;\">「呀！呀！欢迎光临！<br>好久没有小白鼠……不，是客人来了！<br>要不要买我最近完成的绝妙药剂！？<br>这边的试作品可以免费送你哦！？」</span>"
  },
  "options": {
   "10040101": {
    "choiceId": 10040101,
    "title": {
     "ja": "試作品を試す",
     "zh-CN": "试用试作品"
    },
    "text": {
     "ja": "ランダムな導本効果を<br>別の効果に変化させる",
     "zh-CN": "将一个随机导本效果<br>变为其他效果"
    },
    "turn": 1,
    "disabled": false,
    "questCheck": false
   },
   "10040102": {
    "choiceId": 10040102,
    "title": {
     "ja": "完成品を買う",
     "zh-CN": "购买成品"
    },
    "text": {
     "ja": "セフィラコイン-150<br>導本効果を1つ別の効果に変化させる",
     "zh-CN": "塞菲拉币-150<br>将1个导本效果变为其他效果"
    },
    "turn": 1,
    "disabled": false,
    "questCheck": false
   },
   "10040103": {
    "choiceId": 10040103,
    "title": {
     "ja": "逃げる",
     "zh-CN": "逃走"
    },
    "text": {
     "ja": "研究員を振り切って逃走する",
     "zh-CN": "甩开研究员逃走"
    },
    "turn": null,
    "disabled": false,
    "questCheck": false
   },
   "10040104": {
    "choiceId": 10040104,
    "title": {
     "ja": "逃走する",
     "zh-CN": "逃离"
    },
    "text": {
     "ja": "流石に付き合ってられない",
     "zh-CN": "实在没法再奉陪了"
    },
    "turn": null,
    "disabled": false,
    "questCheck": false
   }
  }
 },
 "100501": {
  "key": "100501",
  "specialIncidentId": null,
  "nodeType": 5,
  "eventKind": "normal",
  "name": {},
  "enumKey": "",
  "tips": [],
  "description": {
   "ja": "{{PLAYER}}は透明な水を湛える泉を発見した。<br>澄み渡る空気に、満ち溢れる魔力を感じる。<br>魔物の気配はなく、静寂に満ちている。<br>ここなら身体を休めるには最適だろう。<br>魔力を取り込めば、力を得ることもできそうだ。",
   "zh-CN": "{{PLAYER}}发现了一处盛满清澈泉水的泉眼。<br>清新的空气中充满魔力，周围没有魔物气息。<br>这里非常适合休息，吸收魔力似乎也能获得力量。"
  },
  "options": {
   "10050101": {
    "choiceId": 10050101,
    "title": {
     "ja": "休憩する",
     "zh-CN": "休息"
    },
    "text": {
     "ja": "味方全体が復活し、HPを全回復する",
     "zh-CN": "全体复活并完全回复HP"
    },
    "turn": 1,
    "disabled": false,
    "questCheck": false
   },
   "10050102": {
    "choiceId": 10050102,
    "title": {
     "ja": "魔力を<br>取り込む",
     "zh-CN": "吸收<br>魔力"
    },
    "text": {
     "ja": "導本効果「再生(1000回復)」を獲得",
     "zh-CN": "获得导本效果「再生(回复1000)」"
    },
    "turn": 1,
    "disabled": false,
    "questCheck": false
   }
  }
 },
 "100601": {
  "key": "100601",
  "specialIncidentId": null,
  "nodeType": 5,
  "eventKind": "normal",
  "name": {},
  "enumKey": "",
  "tips": [],
  "description": {
   "ja": "{{PLAYER}}はふと、足に触れた感触に気づく。<br>同時に、肩にも僅かなくすぐったさを覚えた。<br>……犬と鳥だ。どちらと遊ぼうか。",
   "zh-CN": "{{PLAYER}}忽然察觉脚边的触感，同时肩膀也传来轻微的痒感。<br>……是狗和鸟。要和哪一个玩呢？"
  },
  "options": {
   "10060101": {
    "choiceId": 10060101,
    "title": {
     "ja": "犬と触れ合う",
     "zh-CN": "和狗互动"
    },
    "text": {
     "ja": "特別な導本効果を獲得",
     "zh-CN": "获得特殊导本效果"
    },
    "turn": 1,
    "disabled": false,
    "questCheck": false
   },
   "10060102": {
    "choiceId": 10060102,
    "title": {
     "ja": "鳥と触れ合う",
     "zh-CN": "和鸟互动"
    },
    "text": {
     "ja": "特別な導本効果を獲得",
     "zh-CN": "获得特殊导本效果"
    },
    "turn": 1,
    "disabled": false,
    "questCheck": false
   }
  }
 },
 "100801": {
  "key": "100801",
  "specialIncidentId": null,
  "nodeType": 5,
  "eventKind": "normal",
  "name": {},
  "enumKey": "",
  "tips": [],
  "description": {
   "ja": "近づくと、不意に装置が起動する。<br>直後、空間が音もなく歪み始め、<br>眼前に広がった裂け目の向こう側には、<br>何かがきらきらと輝いて見えた……",
   "zh-CN": "靠近后，装置突然启动。<br>紧接着空间无声地开始扭曲，<br>眼前裂隙的另一侧，<br>似乎有什么正在闪闪发光……"
  },
  "options": {
   "1": {
    "choiceId": 1,
    "title": {
     "ja": "立ち去る",
     "zh-CN": "离开"
    },
    "text": {
     "ja": "探索に戻る",
     "zh-CN": "返回探索"
    },
    "turn": null,
    "disabled": false,
    "questCheck": false
   },
   "10080101": {
    "choiceId": 10080101,
    "title": {
     "ja": "入る",
     "zh-CN": "进入"
    },
    "text": {
     "ja": "一番近い宝箱マスへ転移する<br>※転移先はマップから確認可能",
     "zh-CN": "传送至最近的宝箱格<br>※可在地图上确认传送目的地"
    },
    "turn": 1,
    "disabled": false,
    "questCheck": false
   }
  }
 },
 "100901": {
  "key": "100901",
  "specialIncidentId": null,
  "nodeType": 5,
  "eventKind": "normal",
  "name": {},
  "enumKey": "",
  "tips": [],
  "description": {
   "ja": "<span style=\"color:#B5A598;\">「占ってやろう……」</span>",
   "zh-CN": "<span style=\"color:#B5A598;\">「让我为你占卜……」</span>"
  },
  "options": {
   "10090101": {
    "choiceId": 10090101,
    "title": {
     "ja": "占ってもらう",
     "zh-CN": "请对方占卜"
    },
    "text": {
     "ja": "山札からカードを1枚引く",
     "zh-CN": "从牌堆抽取1张牌"
    },
    "turn": 1,
    "disabled": false,
    "questCheck": false
   }
  }
 },
 "101001": {
  "key": "101001",
  "specialIncidentId": null,
  "nodeType": 5,
  "eventKind": "normal",
  "name": {},
  "enumKey": "",
  "tips": [],
  "description": {
   "ja": "探索の最中、足を踏み入れた建物は<br>荒くれ者がひしめく闘技場だった。<br>逃げられる雰囲気ではない。",
   "zh-CN": "探索途中踏入的建筑，<br>竟是一座聚集着粗暴之徒的竞技场。<br>看来无法从这里逃走。"
  },
  "options": {
   "10100101": {
    "choiceId": 10100101,
    "title": {
     "ja": "戦う",
     "zh-CN": "战斗"
    },
    "text": {
     "ja": "敵と戦闘",
     "zh-CN": "与敌人战斗"
    },
    "turn": null,
    "disabled": false,
    "questCheck": true
   },
   "10100102": {
    "choiceId": 10100102,
    "title": {
     "ja": "チャンピオン<br>に挑戦",
     "zh-CN": "??<br>??"
    },
    "text": {
     "ja": "<span style=\"color:#ff4d00;\">チャンピオン</span>に勝利すると<br>セフィラコイン+300",
     "zh-CN": "??<span style=\"color:#ff4d00;\">??</span>?<br>????+300"
    },
    "turn": null,
    "disabled": false,
    "questCheck": true
   },
   "10100103": {
    "choiceId": 10100103,
    "title": {
     "ja": "逃げる",
     "zh-CN": "??"
    },
    "text": {
     "ja": "隙を見て逃走する",
     "zh-CN": "????"
    },
    "turn": null,
    "disabled": false,
    "questCheck": false
   }
  }
 },
 "101101": {
  "key": "101101",
  "specialIncidentId": null,
  "nodeType": 5,
  "eventKind": "normal",
  "name": {},
  "enumKey": "",
  "tips": [],
  "description": {
   "ja": "{{PLAYER}}は淡い光を放つ空間に辿り着いた。<br>壁面には<span style=\"color:#6FC4FF;\">煌びやかな鉱脈</span>が幾筋も走っている。<br>力をこめて掘り出せば得られるものは多いが、<br>その場に転がる欠片を拾い集めるだけでも、<br>多少の価値が見込めそうだ。",
   "zh-CN": "{{PLAYER}}来到一处散发淡淡光芒的空间。<br>墙面上有数道<span style=\"color:#6FC4FF;\">璀璨矿脉</span>纵横延伸。<br>用力挖掘固然能获得更多，<br>但仅仅捡起散落在地的碎块，<br>似乎也能得到一些收获。"
  },
  "options": {
   "10110101": {
    "choiceId": 10110101,
    "title": {
     "ja": "鉱石を掘る",
     "zh-CN": "挖掘矿石"
    },
    "text": {
     "ja": "味方全体HP-25%、セフィラコイン+250<br>「ルボルライト」を獲得",
     "zh-CN": "全体HP-25%、塞菲拉币+250<br>获得「卢博尔石」"
    },
    "turn": 1,
    "disabled": false,
    "questCheck": false
   },
   "10110102": {
    "choiceId": 10110102,
    "title": {
     "ja": "落ちている<br>鉱石を拾う",
     "zh-CN": "捡起地上的<br>矿石"
    },
    "text": {
     "ja": "セフィラコイン+100",
     "zh-CN": "塞菲拉币+100"
    },
    "turn": 1,
    "disabled": false,
    "questCheck": false
   }
  }
 },
 "101201": {
  "key": "101201",
  "specialIncidentId": null,
  "nodeType": 5,
  "eventKind": "normal",
  "name": {},
  "enumKey": "",
  "tips": [],
  "description": {
   "ja": "<span style=\"color:#FFCE4A;\">「……仕事か？」</span>",
   "zh-CN": "<span style=\"color:#FFCE4A;\">「……有工作？」</span>"
  },
  "options": {
   "1": {
    "choiceId": 1,
    "title": {
     "ja": "立ち去る",
     "zh-CN": "离开"
    },
    "text": {
     "ja": "探索に戻る",
     "zh-CN": "返回探索"
    },
    "turn": null,
    "disabled": false,
    "questCheck": false
   },
   "10120101": {
    "choiceId": 10120101,
    "title": {
     "ja": "コインを渡す",
     "zh-CN": "交出塞菲拉币"
    },
    "text": {
     "ja": "セフィラコインを全て失う<br>武器を1つ解放",
     "zh-CN": "失去全部塞菲拉币<br>解放1件武器"
    },
    "turn": 1,
    "disabled": false,
    "questCheck": false
   },
   "10120102": {
    "choiceId": 10120102,
    "title": {
     "ja": "ルボルライト<br>を渡す",
     "zh-CN": "交出<br>卢博尔石"
    },
    "text": {
     "ja": "「ルボルライト」を渡す<br>武器を2つ解放",
     "zh-CN": "交出「卢博尔石」<br>解放2件武器"
    },
    "turn": 1,
    "disabled": false,
    "questCheck": false
   }
  }
 },
 "101301": {
  "key": "101301",
  "specialIncidentId": null,
  "nodeType": 5,
  "eventKind": "normal",
  "name": {},
  "enumKey": "",
  "tips": [],
  "description": {
   "ja": "岩間より湧き出る清水が、水面を揺らしている。<br>底まで見通せるほどに澄みきった水からは、<br>穢れを拒むような清廉さが感じられる。<br>この泉ならば、導本に宿る穢れも祓えそうだ。",
   "zh-CN": "从岩缝涌出的清泉泛起涟漪。<br>清澈见底的泉水中，<br>透出一种拒绝污秽的清净气息。<br>这处泉水似乎能祓除寄宿于导本中的污秽。"
  },
  "options": {
   "10130101": {
    "choiceId": 10130101,
    "title": {
     "ja": "泉に触れる",
     "zh-CN": "触碰泉水"
    },
    "text": {
     "ja": "選択した導本効果を1つ消失させる",
     "zh-CN": "使选中的1个导本效果消失"
    },
    "turn": 1,
    "disabled": false,
    "questCheck": false
   }
  }
 },
 "101401": {
  "key": "101401",
  "specialIncidentId": null,
  "nodeType": 5,
  "eventKind": "normal",
  "name": {},
  "enumKey": "",
  "tips": [],
  "description": {
   "ja": "薄暗い室内に薬品の匂い。<br><span style=\"color:#FFCE4A;\">「おや、客人とは珍しい。実に良い機会だ」</span><br>ここで開発中の薬を試飲すれば、<br>その効能によって力を得られるかもしれない。<br>しかし副作用が出ることもあると告げられる。",
   "zh-CN": "昏暗室内弥漫着药品气味。<br><span style=\"color:#FFCE4A;\">「哎呀，客人可真少见。真是个好机会。」</span><br>试饮开发中的药剂，或许能根据药效获得力量，<br>但也被告知可能出现副作用。"
  },
  "options": {
   "10140101": {
    "choiceId": 10140101,
    "title": {
     "ja": "赤色の薬を<br>飲む",
     "zh-CN": "饮用红色药剂"
    },
    "text": {
     "ja": "80%：ランダムな導本効果を獲得<br>20%：副作用が発生する",
     "zh-CN": "80%：获得随机导本效果<br>20%：发生副作用"
    },
    "turn": 1,
    "disabled": false,
    "questCheck": false
   },
   "10140102": {
    "choiceId": 10140102,
    "title": {
     "ja": "青色の薬を<br>飲む",
     "zh-CN": "饮用蓝色药剂"
    },
    "text": {
     "ja": "80%：ランダムな導本効果を獲得<br>20%：副作用が発生する",
     "zh-CN": "80%：获得随机导本效果<br>20%：发生副作用"
    },
    "turn": 1,
    "disabled": false,
    "questCheck": false
   },
   "10140103": {
    "choiceId": 10140103,
    "title": {
     "ja": "緑色の薬を<br>飲む",
     "zh-CN": "饮用绿色药剂"
    },
    "text": {
     "ja": "80%：ランダムな導本効果を獲得<br>20%：副作用が発生する",
     "zh-CN": "80%：获得随机导本效果<br>20%：发生副作用"
    },
    "turn": 1,
    "disabled": false,
    "questCheck": false
   },
   "10140104": {
    "choiceId": 10140104,
    "title": {
     "ja": "立ち去る",
     "zh-CN": "离开"
    },
    "text": {
     "ja": "探索に戻る",
     "zh-CN": "返回探索"
    },
    "turn": null,
    "disabled": false,
    "questCheck": false
   },
   "10140106": {
    "choiceId": 10140106,
    "title": {
     "ja": "青色の薬を<br>飲む",
     "zh-CN": "饮用蓝色药剂"
    },
    "text": {
     "ja": "70%：ランダムな導本効果を獲得<br>30%：副作用が発生する",
     "zh-CN": "70%：获得随机导本效果<br>30%：发生副作用"
    },
    "turn": null,
    "disabled": false,
    "questCheck": false
   },
   "10140107": {
    "choiceId": 10140107,
    "title": {
     "ja": "緑色の薬を<br>飲む",
     "zh-CN": "饮用绿色药剂"
    },
    "text": {
     "ja": "70%：ランダムな導本効果を獲得<br>30%：副作用が発生する",
     "zh-CN": "70%：获得随机导本效果<br>30%：发生副作用"
    },
    "turn": null,
    "disabled": false,
    "questCheck": false
   },
   "10140110": {
    "choiceId": 10140110,
    "title": {
     "ja": "緑色の薬を<br>飲む",
     "zh-CN": "饮用绿色药剂"
    },
    "text": {
     "ja": "50%：ランダムな導本効果を獲得<br>50%：副作用が発生する",
     "zh-CN": "50%：获得随机导本效果<br>50%：发生副作用"
    },
    "turn": null,
    "disabled": false,
    "questCheck": false
   }
  }
 },
 "101501": {
  "key": "101501",
  "specialIncidentId": null,
  "nodeType": 5,
  "eventKind": "normal",
  "name": {},
  "enumKey": "",
  "tips": [],
  "description": {
   "ja": "古く重厚な建築様式。ここは宝物庫だろうか。<br>封じられていた扉の先に、奥への道が開かれた。<br><span style=\"color:#FFCE4A;\">財宝の気配</span>を感じるが、罠も潜んでいるだろう。<br>堅実に退くべきか、危険を承知で踏み込むか……<br>{{PLAYER}}の好奇心と自制心が揺れ動く。",
   "zh-CN": "古老厚重的建筑或许是一座宝物库。感受到<span style=\"color:#FFCE4A;\">财宝气息</span>，但其中也可能有陷阱。{{PLAYER}}在稳妥撤退与冒险深入之间摇摆。"
  },
  "options": {
   "10150101": {
    "choiceId": 10150101,
    "title": {
     "ja": "入口付近を<br>探索する",
     "zh-CN": "探索入口附近"
    },
    "text": {
     "ja": "セフィラコイン+100",
     "zh-CN": "塞菲拉币+100"
    },
    "turn": 1,
    "disabled": false,
    "questCheck": false
   },
   "10150102": {
    "choiceId": 10150102,
    "title": {
     "ja": "奥まで<br>探索する",
     "zh-CN": "探索深处"
    },
    "text": {
     "ja": "味方全体のHP-10%<br>武器を1つ解放、セフィラコイン+100",
     "zh-CN": "全体HP-10%<br>解放1件武器，塞菲拉币+100"
    },
    "turn": 2,
    "disabled": false,
    "questCheck": false
   }
  }
 },
 "101601": {
  "key": "101601",
  "specialIncidentId": null,
  "nodeType": 5,
  "eventKind": "normal",
  "name": {},
  "enumKey": "",
  "tips": [],
  "description": {
   "ja": "不気味な静寂の中、<span style=\"color:#FF4D00;\">禍々しい祭壇</span>が姿を現す。<br>台座からにじみ出る得体の知れない気配に、<br>{{PLAYER}}は思わず触れるのを躊躇った。<br>その力は強大だが、代償もまた小さくはない。<br>手を伸ばすか否かは、自らの覚悟に委ねられた。",
   "zh-CN": "诡异寂静中，<span style=\"color:#FF4D00;\">不祥祭坛</span>显现。台座渗出的未知气息令人犹豫，强大力量的代价也同样不小。"
  },
  "options": {
   "10160101": {
    "choiceId": 10160101,
    "title": {
     "ja": "祭壇に<br>手を伸ばす",
     "zh-CN": "伸手触碰祭坛"
    },
    "text": {
     "ja": "闇の力を受け入れる",
     "zh-CN": "接受黑暗之力"
    },
    "turn": 1,
    "disabled": false,
    "questCheck": false
   },
   "10160102": {
    "choiceId": 10160102,
    "title": {
     "ja": "立ち去る",
     "zh-CN": "离开"
    },
    "text": {
     "ja": "その場から立ち去る",
     "zh-CN": "离开此处"
    },
    "turn": null,
    "disabled": false,
    "questCheck": false
   }
  }
 },
 "101701": {
  "key": "101701",
  "specialIncidentId": null,
  "nodeType": 5,
  "eventKind": "normal",
  "name": {},
  "enumKey": "",
  "tips": [],
  "description": {
   "ja": "<span style=\"color:#FFCE4A;\">「ふぇふぇふぇ……それなら簡単なことじゃ。<br>力を引き出すものは、己の意志と覚悟の強さ。<br>それを鍛えたいのならば、<br>手っ取り早い方法があってのう……」</span><br>どうやら、修行をつけてくれるらしい。",
   "zh-CN": "<span style=\"color:#FFCE4A;\">「嘿嘿嘿……力量来自自己的意志与觉悟。若想锻炼它，有个简单快捷的方法……」</span><br>看来老妇人愿意指导修行。"
  },
  "options": {
   "10170101": {
    "choiceId": 10170101,
    "title": {
     "ja": "修行を受ける",
     "zh-CN": "接受修行"
    },
    "text": {
     "ja": "老婆に勝利すると導本効果を獲得",
     "zh-CN": "战胜老妇人后获得导本效果"
    },
    "turn": null,
    "disabled": false,
    "questCheck": true
   },
   "10170102": {
    "choiceId": 10170102,
    "title": {
     "ja": "立ち去る",
     "zh-CN": "离开"
    },
    "text": {
     "ja": "時間が無いため、申し出を断る",
     "zh-CN": "因为没有时间而拒绝提议"
    },
    "turn": null,
    "disabled": false,
    "questCheck": false
   }
  }
 },
 "101801": {
  "key": "101801",
  "specialIncidentId": null,
  "nodeType": 5,
  "eventKind": "normal",
  "name": {},
  "enumKey": "",
  "tips": [],
  "description": {
   "ja": "低く抑えた声には、不自然な自信が滲んでいる。<br><span style=\"color:#FFCE4A;\">「村の連中を脅して無理やり聞き出してやった。<br>ヘッヘッヘ……損はさせないぜ」</span><br>穏やかではない情報の出どころに、<br>{{PLAYER}}は思わず言葉を失った。",
   "zh-CN": "压低的声音中透着不自然的自信。<br><span style=\"color:#FFCE4A;\">「我威胁村里那些家伙，硬是让他们说了出来。<br>嘿嘿嘿……保证不会让你吃亏」</span><br>听到这不太平和的情报来源，<br>{{PLAYER}}一时无言以对。"
  },
  "options": {
   "10180101": {
    "choiceId": 10180101,
    "title": {
     "ja": "情報料を払う",
     "zh-CN": "支付情报费"
    },
    "text": {
     "ja": "セフィラコイン-100",
     "zh-CN": "塞菲拉币-100"
    },
    "turn": 1,
    "disabled": false,
    "questCheck": false
   },
   "10180102": {
    "choiceId": 10180102,
    "title": {
     "ja": "懲らしめる",
     "zh-CN": "教训他"
    },
    "text": {
     "ja": "情報屋と戦闘",
     "zh-CN": "与情报贩子战斗"
    },
    "turn": null,
    "disabled": false,
    "questCheck": true
   }
  }
 },
 "101901": {
  "key": "101901",
  "specialIncidentId": null,
  "nodeType": 5,
  "eventKind": "normal",
  "name": {},
  "enumKey": "",
  "tips": [],
  "description": {
   "ja": "台座の前で祈りを捧げると、<br>それに応えるように光が集ってくる。<br>やがてひとつの巻物が現れ、<br>そっと{{PLAYER}}の手の中へ収まった。",
   "zh-CN": "在台座前献上祈祷后，<br>光芒仿佛回应一般汇聚而来。<br>不久，一卷卷轴随之显现，<br>轻轻落入{{PLAYER}}手中。"
  },
  "options": {
   "10190101": {
    "choiceId": 10190101,
    "title": {
     "ja": "スクロールを<br>使用する",
     "zh-CN": "使用<br>卷轴"
    },
    "text": {
     "ja": "仲間キャラを1人選んで加入",
     "zh-CN": "选择1名伙伴角色加入队伍"
    },
    "turn": 1,
    "disabled": false,
    "questCheck": false
   }
  }
 },
 "102001": {
  "key": "102001",
  "specialIncidentId": null,
  "nodeType": 5,
  "eventKind": "normal",
  "name": {},
  "enumKey": "",
  "tips": [],
  "description": {
   "ja": "{{PLAYER}}が魔法学院を訪れると、<br>その一角で魔道具が販売されていた。<br>棚には学生たちが作成したスクロールが並び、<br>どれも手頃な価格で、気軽に手に取れそうだ。<br>掘り出し物も多く、探索の備えには丁度よい。",
   "zh-CN": "{{PLAYER}}来到魔法学院，发现一角正在出售魔法道具。架上摆满学生制作的卷轴，价格亲民，适合为探索做准备。"
  },
  "options": {
   "1": {
    "choiceId": 1,
    "title": {
     "ja": "立ち去る",
     "zh-CN": "离开"
    },
    "text": {
     "ja": "探索に戻る",
     "zh-CN": "返回探索"
    },
    "turn": null,
    "disabled": false,
    "questCheck": false
   },
   "10200101": {
    "choiceId": 10200101,
    "title": {
     "ja": "スクロールを<br>購入する",
     "zh-CN": "购买卷轴"
    },
    "text": {
     "ja": "セフィラコイン-100<br>武器を1つ解放",
     "zh-CN": "塞菲拉币-100<br>解放1件武器"
    },
    "turn": 1,
    "disabled": false,
    "questCheck": false
   },
   "10200102": {
    "choiceId": 10200102,
    "title": {
     "ja": "スクロールを<br>購入する",
     "zh-CN": "购买卷轴"
    },
    "text": {
     "ja": "セフィラコイン-150<br>仲間キャラを1人選んで加入",
     "zh-CN": "塞菲拉币-150<br>选择1名伙伴角色加入"
    },
    "turn": 1,
    "disabled": false,
    "questCheck": false
   }
  }
 },
 "102101": {
  "key": "102101",
  "specialIncidentId": null,
  "nodeType": 5,
  "eventKind": "normal",
  "name": {},
  "enumKey": "",
  "tips": [],
  "description": {
   "ja": "不穏な気配を放つ門に行き当たった。<br>通じる先の判然としない異様な造形は、<br>見るだけで{{PLAYER}}を不安にさせた。<br>くぐろうとした瞬間、門は強く発光し始め──<br>次の瞬間、その姿は<span style=\"color:#FF4D00;\">異形の魔物</span>へと変じていた。",
   "zh-CN": "{{PLAYER}}遇到一扇散发不祥气息的门。正要穿过时，门强烈发光，转眼变成<span style=\"color:#FF4D00;\">异形魔物</span>。"
  },
  "options": {
   "1": {
    "choiceId": 1,
    "title": {
     "ja": "立ち去る",
     "zh-CN": "离开"
    },
    "text": {
     "ja": "探索に戻る",
     "zh-CN": "返回探索"
    },
    "turn": null,
    "disabled": false,
    "questCheck": false
   },
   "10210101": {
    "choiceId": 10210101,
    "title": {
     "ja": "戦う",
     "zh-CN": "战斗"
    },
    "text": {
     "ja": "異形の門に勝利すると<br>仲間キャラを1人選んで加入",
     "zh-CN": "战胜异形之门后选择1名伙伴角色加入"
    },
    "turn": null,
    "disabled": false,
    "questCheck": true
   }
  }
 },
 "102201": {
  "key": "102201",
  "specialIncidentId": null,
  "nodeType": 5,
  "eventKind": "normal",
  "name": {},
  "enumKey": "",
  "tips": [],
  "description": {
   "ja": "陽気な笑みを浮かべるヴァンパイアと出会った。<br>{{PLAYER}}の血を分け与えることで、<br>その力を媒介に外への道を開き、<br>絆で結ばれた仲間を呼び寄せられるという。",
   "zh-CN": "{{PLAYER}}遇到一名面带开朗笑容的吸血鬼。只要分享血液，就能借此开启通往外界的道路，召来被羁绊连接的伙伴。"
  },
  "options": {
   "10220101": {
    "choiceId": 10220101,
    "title": {
     "ja": "仲間を<br>呼び出す",
     "zh-CN": "召唤伙伴"
    },
    "text": {
     "ja": "味方全体のHP-30%<br>仲間キャラを1人選んで加入",
     "zh-CN": "全体HP-30%<br>选择1名伙伴角色加入"
    },
    "turn": 1,
    "disabled": false,
    "questCheck": false
   },
   "10220102": {
    "choiceId": 10220102,
    "title": {
     "ja": "立ち去る",
     "zh-CN": "离开"
    },
    "text": {
     "ja": "提案を断り、その場を離れる",
     "zh-CN": "拒绝提议并离开"
    },
    "turn": null,
    "disabled": false,
    "questCheck": false
   }
  }
 },
 "102301": {
  "key": "102301",
  "specialIncidentId": null,
  "nodeType": 5,
  "eventKind": "normal",
  "name": {},
  "enumKey": "",
  "tips": [],
  "description": {
   "ja": "船を進めていると、水面下に<span style=\"color:#B5A598;\">巨大な影</span>が揺れた。<br>このまま進めば、何かと対峙することになる。<br>ただものではない、特異な力を宿している気配。<br>迎え撃つか、それとも引き返すか……<br>{{PLAYER}}は判断を迫られる。",
   "zh-CN": "乘船前进时，水面下掠过一道<span style=\"color:#B5A598;\">巨大黑影</span>。<br>继续前进，势必会与某种存在对峙。<br>那股气息蕴藏着非同寻常的奇异力量。<br>迎击，还是折返……<br>{{PLAYER}}必须作出决定。"
  },
  "options": {
   "10230101": {
    "choiceId": 10230101,
    "title": {
     "ja": "迎え撃つ",
     "zh-CN": "迎击"
    },
    "text": {
     "ja": "水中に潜む敵に勝利すると<br>導本効果を獲得",
     "zh-CN": "战胜潜伏于水中的敌人后<br>获得导本效果"
    },
    "turn": null,
    "disabled": false,
    "questCheck": true
   },
   "10230102": {
    "choiceId": 10230102,
    "title": {
     "ja": "引き返す",
     "zh-CN": "返回"
    },
    "text": {
     "ja": "安全に岸まで戻る",
     "zh-CN": "安全返回岸边"
    },
    "turn": null,
    "disabled": false,
    "questCheck": false
   }
  }
 },
 "102401": {
  "key": "102401",
  "specialIncidentId": null,
  "nodeType": 5,
  "eventKind": "normal",
  "name": {},
  "enumKey": "",
  "tips": [],
  "description": {
   "ja": "生臭い血のにおいが漂う、不気味な一帯。<br>ここはさながら<span style=\"color:#FF4D00;\">武器の墓場</span>のようにも見えた。<br>地面に突き刺さる無数の武器からは、<br>強力な力と交じって、不吉な残滓も感じられる。<br>手にするのならば、相応の代償を覚悟すべきだ。",
   "zh-CN": "一片弥漫着腥臭血味的诡异区域。<br>这里看起来宛如一座<span style=\"color:#FF4D00;\">武器坟场</span>。<br>无数刺入地面的武器中，<br>既蕴含强大力量，也残留着不祥气息。<br>若要将其拿起，必须做好付出相应代价的觉悟。"
  },
  "options": {
   "1": {
    "choiceId": 1,
    "title": {
     "ja": "立ち去る",
     "zh-CN": "离开"
    },
    "text": {
     "ja": "探索に戻る",
     "zh-CN": "返回探索"
    },
    "turn": null,
    "disabled": false,
    "questCheck": false
   },
   "10240101": {
    "choiceId": 10240101,
    "title": {
     "ja": "武器に<br>手を伸ばす",
     "zh-CN": "伸手拿取<br>武器"
    },
    "text": {
     "ja": "武器を1つ解放<br>呪われた導本効果を獲得",
     "zh-CN": "解放1件武器<br>获得诅咒导本效果"
    },
    "turn": 1,
    "disabled": false,
    "questCheck": false
   }
  }
 },
 "102501": {
  "key": "102501",
  "specialIncidentId": null,
  "nodeType": 5,
  "eventKind": "normal",
  "name": {},
  "enumKey": "",
  "tips": [],
  "description": {
   "ja": "視界を覆う鮮やかな褐色。<span style=\"color:#FFCE4A;\">キノコの群生地</span>だ。<br>鼻孔をくすぐる香りはどこか懐かしい気がした。<br>ここで一休みしていくのも悪くない。<br>そう考えていた{{PLAYER}}の目線の先で、<br>ひときわ大きなキノコと目が合った……",
   "zh-CN": "视野被鲜艳的褐色覆盖，这是一片<span style=\"color:#FFCE4A;\">蘑菇群落</span>。香气令人怀念，{{PLAYER}}正想着休息时，与一朵格外巨大的蘑菇对上了视线……"
  },
  "options": {
   "10250101": {
    "choiceId": 10250101,
    "title": {
     "ja": "討伐する",
     "zh-CN": "讨伐"
    },
    "text": {
     "ja": "キノコの魔物に勝利すると<br>導本効果を獲得",
     "zh-CN": "战胜蘑菇魔物后获得导本效果"
    },
    "turn": null,
    "disabled": false,
    "questCheck": true
   },
   "10250102": {
    "choiceId": 10250102,
    "title": {
     "ja": "会釈する",
     "zh-CN": "点头致意"
    },
    "text": {
     "ja": "味方全体が復活し、HPを全回復する<br>呪われた導本効果を獲得",
     "zh-CN": "全体复活并完全回复HP<br>获得诅咒导本效果"
    },
    "turn": 1,
    "disabled": false,
    "questCheck": false
   }
  }
 },
 "102601": {
  "key": "102601",
  "specialIncidentId": null,
  "nodeType": 5,
  "eventKind": "normal",
  "name": {},
  "enumKey": "",
  "tips": [],
  "description": {
   "ja": "所狭しと並ぶ背の高い書架、そして収められた<br>大量の魔道書に、{{PLAYER}}は圧倒された。<br>この世界の知識を一所に蒐集したかのようだ。<br>ふと何かに惹かれるように目を向けた先には、<br><span style=\"color:#9DFF67;\">異質な存在感を放つ本</span>があった。",
   "zh-CN": "高大的书架密集排列，其中收藏的<br>大量魔导书令{{PLAYER}}为之震撼。<br>这里仿佛汇集了整个世界的知识。<br>视线像被什么吸引般望去，<br>那里有一本散发着<span style=\"color:#9DFF67;\">异质存在感的书</span>。"
  },
  "options": {
   "1": {
    "choiceId": 1,
    "title": {
     "ja": "立ち去る",
     "zh-CN": "离开"
    },
    "text": {
     "ja": "探索に戻る",
     "zh-CN": "返回探索"
    },
    "turn": null,
    "disabled": false,
    "questCheck": false
   },
   "10260101": {
    "choiceId": 10260101,
    "title": {
     "ja": "ページを<br>めくる",
     "zh-CN": "翻开<br>书页"
    },
    "text": {
     "ja": "魔導書を読み進める",
     "zh-CN": "继续阅读魔导书"
    },
    "turn": 1,
    "disabled": false,
    "questCheck": false
   }
  }
 },
 "102701": {
  "key": "102701",
  "specialIncidentId": null,
  "nodeType": 5,
  "eventKind": "normal",
  "name": {},
  "enumKey": "",
  "tips": [],
  "description": {
   "ja": "<span style=\"color:#FFCE4A;\">「オイオイ、これっぽっちかァ？」</span><br>盗賊は袋の軽さを確かめ、不満をあらわにする。<br><span style=\"color:#FFCE4A;\">「賭けに負けちまってな、金が必要なんだ。<br>その懐の中に、まだ隠してるんだろォ？<br>ありったけ出してもらおうか」</span>",
   "zh-CN": "<span style=\"color:#FFCE4A;\">「喂喂，就这么一点吗？」</span><br>盗贼掂量着轻飘飘的钱袋，显得十分不满。<br><span style=\"color:#FFCE4A;\">「我赌博输光了，现在正缺钱。<br>你怀里还藏着吧？<br>全都给我交出来。」</span>"
  },
  "options": {
   "10270101": {
    "choiceId": 10270101,
    "title": {
     "ja": "盗賊と戦う",
     "zh-CN": "与盗贼战斗"
    },
    "text": {
     "ja": "盗賊に勝利するとセフィラコイン+200",
     "zh-CN": "战胜盗贼后塞菲拉币+200"
    },
    "turn": null,
    "disabled": false,
    "questCheck": true
   },
   "10270102": {
    "choiceId": 10270102,
    "title": {
     "ja": "従う",
     "zh-CN": "服从"
    },
    "text": {
     "ja": "セフィラコインを全て失う",
     "zh-CN": "失去全部塞菲拉币"
    },
    "turn": 1,
    "disabled": false,
    "questCheck": false
   }
  }
 },
 "102801": {
  "key": "102801",
  "specialIncidentId": null,
  "nodeType": 5,
  "eventKind": "normal",
  "name": {},
  "enumKey": "",
  "tips": [],
  "description": {
   "ja": "揺らめく淡い光に導かれ、<br>{{PLAYER}}は霊廟の奥へと足を踏み入れる。<br>そこには石棺が息を潜めるように佇んでいた。<br>時の流れから切り離されたかのように神秘的で、<br>なぜかその棺を開けたい衝動に駆られた。",
   "zh-CN": "被摇曳的淡光引导，{{PLAYER}}进入陵墓深处。石棺仿佛屏住呼吸般静置，神秘得像被时间隔绝，不知为何让人产生打开它的冲动。"
  },
  "options": {
   "10280101": {
    "choiceId": 10280101,
    "title": {
     "ja": "棺を開ける",
     "zh-CN": "打开棺材"
    },
    "text": {
     "ja": "武器を1つ解放<br>50%：呪われた導本効果を獲得",
     "zh-CN": "解放1件武器<br>50%：获得诅咒导本效果"
    },
    "turn": 1,
    "disabled": false,
    "questCheck": false
   },
   "10280102": {
    "choiceId": 10280102,
    "title": {
     "ja": "引き返す",
     "zh-CN": "返回"
    },
    "text": {
     "ja": "誘惑に負けず立ち去る",
     "zh-CN": "不受诱惑影响并离开"
    },
    "turn": null,
    "disabled": false,
    "questCheck": false
   }
  }
 },
 "102901": {
  "key": "102901",
  "specialIncidentId": null,
  "nodeType": 5,
  "eventKind": "normal",
  "name": {},
  "enumKey": "",
  "tips": [],
  "description": {
   "ja": "彼は{{PLAYER}}の手元にある導本を指差し、<br>何かを求めるように見つめている。<br><span style=\"color:#FFCE4A;\">「汝ガチカラト、我ガチカラ……<br>ココニ交ワシ、ヒトシク分カツコトヲ、求ム」</span>",
   "zh-CN": "他指着{{PLAYER}}手中的导本，<br>仿佛有所求般凝视着。<br><span style=\"color:#FFCE4A;\">「汝之力，与吾之力……<br>于此交换，等分共享，吾有所求。」</span>"
  },
  "options": {
   "10290101": {
    "choiceId": 10290101,
    "title": {
     "ja": "導本を渡す",
     "zh-CN": "交出导本"
    },
    "text": {
     "ja": "ランダムな導本効果を<br>別の効果に変化させる",
     "zh-CN": "将一个随机导本效果<br>变为其他效果"
    },
    "turn": 1,
    "disabled": false,
    "questCheck": false
   },
   "10290102": {
    "choiceId": 10290102,
    "title": {
     "ja": "断る",
     "zh-CN": "拒绝"
    },
    "text": {
     "ja": "その場から離れる",
     "zh-CN": "离开此处"
    },
    "turn": null,
    "disabled": false,
    "questCheck": false
   }
  }
 },
 "103001": {
  "key": "103001",
  "specialIncidentId": null,
  "nodeType": 5,
  "eventKind": "normal",
  "name": {},
  "enumKey": "",
  "tips": [],
  "description": {
   "ja": "天蓋を割るように、一筋の光が降り注ぐ。<br>その輝きはすべてを浄化するかのようで、<br>触れれば何かを得られると、本能が告げる。<br>しかし清廉さも、過ぎればその負荷は大きい。<br>この身を割きかねない危うさをも孕んでいる。",
   "zh-CN": "一道光如劈开天幕般落下，仿佛能净化一切。直觉告诉人触碰它便能获得力量，但过度的清净也会带来负担。"
  },
  "options": {
   "1": {
    "choiceId": 1,
    "title": {
     "ja": "立ち去る",
     "zh-CN": "离开"
    },
    "text": {
     "ja": "探索に戻る",
     "zh-CN": "返回探索"
    },
    "turn": null,
    "disabled": false,
    "questCheck": false
   },
   "10300101": {
    "choiceId": 10300101,
    "title": {
     "ja": "導本を<br>光に当てる",
     "zh-CN": "让导本<br>照射光芒"
    },
    "text": {
     "ja": "導本効果を1つ複製<br>味方全体のHP-20%",
     "zh-CN": "复制1个导本效果<br>全体HP-20%"
    },
    "turn": 1,
    "disabled": false,
    "questCheck": false
   }
  }
 },
 "103101": {
  "key": "103101",
  "specialIncidentId": null,
  "nodeType": 5,
  "eventKind": "normal",
  "name": {},
  "enumKey": "",
  "tips": [],
  "description": {
   "ja": "奇妙な形状の花が、その場で脈動している。<br>漂う魔力は導本へと呼びかけるようで、<br>{{PLAYER}}が近くに寄るほどに、<br>まるで包み込まんとするように揺らめいていた。<br>触れれば、導本に<span style=\"color:#9DFF67;\">何らかの変化</span>が起こりそうだ。",
   "zh-CN": "奇异形状的花在原地脉动。漂浮的魔力仿佛在呼唤导本，{{PLAYER}}靠近时花朵如要将其包裹，触碰或许会让导本发生<span style=\"color:#9DFF67;\">某种变化</span>。"
  },
  "options": {
   "1": {
    "choiceId": 1,
    "title": {
     "ja": "立ち去る",
     "zh-CN": "离开"
    },
    "text": {
     "ja": "探索に戻る",
     "zh-CN": "返回探索"
    },
    "turn": null,
    "disabled": false,
    "questCheck": false
   },
   "10310101": {
    "choiceId": 10310101,
    "title": {
     "ja": "謎の花に<br>触れる",
     "zh-CN": "触碰神秘之花"
    },
    "text": {
     "ja": "導本効果を1つ別の効果に変化させる",
     "zh-CN": "将1个导本效果变为其他效果"
    },
    "turn": 1,
    "disabled": false,
    "questCheck": false
   }
  }
 },
 "103201": {
  "key": "103201",
  "specialIncidentId": null,
  "nodeType": 5,
  "eventKind": "normal",
  "name": {},
  "enumKey": "",
  "tips": [],
  "description": {
   "ja": "空はすでに暗く、夜の帳が下り始めていた。<br>この辺りで休息を取るべきかどうか、<br>{{PLAYER}}は判断を迫られる。<br>周囲には何が潜んでいるのか判然とせず、<br>匂いの強いものは、魔物を呼び寄せかねない。",
   "zh-CN": "天色已暗，夜幕开始降临。<br>是否应该在此处休息，<br>{{PLAYER}}必须作出判断。<br>四周潜伏着什么仍不明朗，<br>气味浓烈的东西或许会引来魔物。"
  },
  "options": {
   "10320101": {
    "choiceId": 10320101,
    "title": {
     "ja": "豪華な食事を<br>作る",
     "zh-CN": "制作<br>豪华餐点"
    },
    "text": {
     "ja": "味方全体が復活し、HPを全回復する<br>50%：敵と遭遇",
     "zh-CN": "全体复活并完全回复HP<br>50%：遭遇敌人"
    },
    "turn": 1,
    "disabled": false,
    "questCheck": true
   },
   "10320102": {
    "choiceId": 10320102,
    "title": {
     "ja": "携帯食で<br>一夜を明かす",
     "zh-CN": "用便携食品<br>度过一夜"
    },
    "text": {
     "ja": "味方全体のHPを20%回復",
     "zh-CN": "回复全体20%HP"
    },
    "turn": 1,
    "disabled": false,
    "questCheck": false
   },
   "10320103": {
    "choiceId": 10320103,
    "title": {
     "ja": "探索を続ける",
     "zh-CN": "继续探索"
    },
    "text": {
     "ja": "休憩せず探索を進める",
     "zh-CN": "不休息并继续探索"
    },
    "turn": null,
    "disabled": false,
    "questCheck": false
   }
  }
 },
 "103301": {
  "key": "103301",
  "specialIncidentId": null,
  "nodeType": 5,
  "eventKind": "normal",
  "name": {},
  "enumKey": "",
  "tips": [],
  "description": {
   "ja": "{{PLAYER}}の前に、古びた遺跡が姿を現す。<br>内部からは、どこか不穏な気配が滲み出ていた。<br>未知の財宝を求め、奥へ進む価値は充分にある。<br>だがその道のりは、決して平坦ではなさそうだ。",
   "zh-CN": "一座古老遗迹出现在{{PLAYER}}面前。<br>内部隐约散发着不祥气息。<br>为了未知财宝而继续深入，确实值得一试。<br>但前方的道路似乎绝不会平坦。"
  },
  "options": {
   "10330101": {
    "choiceId": 10330101,
    "title": {
     "ja": "遺跡を進む",
     "zh-CN": "深入遗迹"
    },
    "text": {
     "ja": "奥へと進む<br>30%：味方全体のHP-10%",
     "zh-CN": "向深处前进<br>30%：全体HP-10%"
    },
    "turn": 1,
    "disabled": false,
    "questCheck": false
   },
   "10330102": {
    "choiceId": 10330102,
    "title": {
     "ja": "遺跡を進む",
     "zh-CN": "深入遗迹"
    },
    "text": {
     "ja": "奥へ進み武器を1つ解放<br>50%：味方全体のHP-20%",
     "zh-CN": "深入并解放1件武器<br>50%：全体HP-20%"
    },
    "turn": null,
    "disabled": false,
    "questCheck": false
   },
   "10330104": {
    "choiceId": 10330104,
    "title": {
     "ja": "諦める",
     "zh-CN": "放弃"
    },
    "text": {
     "ja": "遺跡への挑戦を諦める",
     "zh-CN": "放弃挑战遗迹"
    },
    "turn": null,
    "disabled": false,
    "questCheck": false
   },
   "10330105": {
    "choiceId": 10330105,
    "title": {
     "ja": "諦める",
     "zh-CN": "放弃"
    },
    "text": {
     "ja": "挑戦を諦めて引き返す",
     "zh-CN": "放弃挑战并返回"
    },
    "turn": null,
    "disabled": false,
    "questCheck": false
   }
  }
 },
 "103401": {
  "key": "103401",
  "specialIncidentId": null,
  "nodeType": 5,
  "eventKind": "normal",
  "name": {},
  "enumKey": "",
  "tips": [],
  "description": {
   "ja": "やがて、それを放ったと思わしき男が現れた。<br><span style=\"color:#FFCE4A;\">「どうだい、俺の自信作は。かわいいだろう。<br>……おっと、そんなに怖い目をしなさんな。<br>金さえ払えば、抗体を譲ってやってもいい。<br>お前さんにその気があればだが、どうする？」</span>",
   "zh-CN": "男人终于出现了。<br><span style=\"color:#FFCE4A;\">「怎么样，这是我的得意之作。很可爱吧。别露出那么可怕的眼神，只要付钱我就把抗体给你。」</span>"
  },
  "options": {
   "10340101": {
    "choiceId": 10340101,
    "title": {
     "ja": "代金を支払う",
     "zh-CN": "支付费用"
    },
    "text": {
     "ja": "セフィラコイン-200、導本効果と<br>「得体の知れない調合薬」を獲得",
     "zh-CN": "塞菲拉币-200，获得导本效果和「来历不明的调制药」"
    },
    "turn": 1,
    "disabled": false,
    "questCheck": false
   },
   "10340102": {
    "choiceId": 10340102,
    "title": {
     "ja": "懲らしめる",
     "zh-CN": "教训他"
    },
    "text": {
     "ja": "戦闘に勝利すると導本効果と<br>「得体の知れない調合薬」を獲得",
     "zh-CN": "战斗胜利后获得导本效果和「来历不明的调制药」"
    },
    "turn": null,
    "disabled": false,
    "questCheck": true
   }
  }
 },
 "103501": {
  "key": "103501",
  "specialIncidentId": null,
  "nodeType": 5,
  "eventKind": "normal",
  "name": {},
  "enumKey": "",
  "tips": [],
  "description": {
   "ja": "幸い動きは鈍く、避けて通ることは難しくない。<br>だが彼を助けたいと望んで対峙するのであれば、<br>方法さえ誤らなければ可能性はありそうだ。<br>どう対処するかが、その生死を分けるだろう。",
   "zh-CN": "幸好他的动作迟缓，想绕开并不困难。<br>但如果希望与之对峙并救下他，<br>只要方法无误，似乎仍有可能。<br>如何应对，将决定他的生死。"
  },
  "options": {
   "10350101": {
    "choiceId": 10350101,
    "title": {
     "ja": "薬を使う",
     "zh-CN": "使用药剂"
    },
    "text": {
     "ja": "「得体の知れない調合薬」を使用する<br>特別な導本効果を獲得",
     "zh-CN": "使用「来历不明的调制药」<br>获得特殊导本效果"
    },
    "turn": 1,
    "disabled": false,
    "questCheck": false
   },
   "10350102": {
    "choiceId": 10350102,
    "title": {
     "ja": "植物を<br>排除する",
     "zh-CN": "清除<br>植物"
    },
    "text": {
     "ja": "呪われた導本効果を獲得<br>特別な導本効果を獲得",
     "zh-CN": "获得诅咒导本效果<br>获得特殊导本效果"
    },
    "turn": 1,
    "disabled": false,
    "questCheck": false
   },
   "10350103": {
    "choiceId": 10350103,
    "title": {
     "ja": "立ち去る",
     "zh-CN": "离开"
    },
    "text": {
     "ja": "植物の寄生を警戒して立ち去る",
     "zh-CN": "警惕植物寄生并离开"
    },
    "turn": null,
    "disabled": false,
    "questCheck": false
   }
  }
 },
 "103601": {
  "key": "103601",
  "specialIncidentId": null,
  "nodeType": 5,
  "eventKind": "normal",
  "name": {},
  "enumKey": "",
  "tips": [],
  "description": {
   "ja": "太古の森の奥、開けた場所に出たかと思うと、<br>そこは張り詰めた気配に満ちていた。<br>中心には、武器が深く大地に突き刺さっている。<br>ただならぬ力を宿し、近づくだけで圧を感じた。<br>まるで使い手となる器を試しているようだ。",
   "zh-CN": "来到太古森林深处的一片开阔地后，<br>周围充满紧绷的气息。<br>中央有一件武器深深刺入大地。<br>其中蕴藏非凡力量，仅仅靠近便能感到压迫。<br>仿佛正在考验谁有资格成为它的使用者。"
  },
  "options": {
   "10360101": {
    "choiceId": 10360101,
    "title": {
     "ja": "武器を<br>引き抜く",
     "zh-CN": "拔出<br>武器"
    },
    "text": {
     "ja": "味方全体のHP-10％<br>30%：武器を2つ解放",
     "zh-CN": "全体HP-10%<br>30%：解放2件武器"
    },
    "turn": 1,
    "disabled": false,
    "questCheck": false
   },
   "10360102": {
    "choiceId": 10360102,
    "title": {
     "ja": "もう一度<br>引き抜く",
     "zh-CN": "再次<br>拔出"
    },
    "text": {
     "ja": "味方全体のHP-20%<br>75%：武器を2つ解放",
     "zh-CN": "全体HP-20%<br>75%：解放2件武器"
    },
    "turn": null,
    "disabled": false,
    "questCheck": false
   },
   "10360103": {
    "choiceId": 10360103,
    "title": {
     "ja": "もう一度<br>引き抜く",
     "zh-CN": "再次<br>拔出"
    },
    "text": {
     "ja": "味方全体のHP-20%<br>武器を2つ解放",
     "zh-CN": "全体HP-20%<br>解放2件武器"
    },
    "turn": null,
    "disabled": false,
    "questCheck": false
   },
   "10360104": {
    "choiceId": 10360104,
    "title": {
     "ja": "立ち去る",
     "zh-CN": "离开"
    },
    "text": {
     "ja": "武器を諦める",
     "zh-CN": "放弃武器"
    },
    "turn": null,
    "disabled": false,
    "questCheck": false
   }
  }
 },
 "103701": {
  "key": "103701",
  "specialIncidentId": null,
  "nodeType": 5,
  "eventKind": "normal",
  "name": {},
  "enumKey": "",
  "tips": [],
  "description": {
   "ja": "森の中を、白い影が慌ただしく駆け抜けていく。<br>ホワイトラビットが魔物に追われているようだ。<br>小さな身体で逃げる姿は、いかにも危うい。<br>助けに入るか、このまま様子を窺うか。<br>{{PLAYER}}は判断を迫られる。",
   "zh-CN": "白色身影慌忙穿过森林，白兔似乎正被魔物追赶。是否出手相助，还是继续观察，{{PLAYER}}必须作出判断。"
  },
  "options": {
   "10370101": {
    "choiceId": 10370101,
    "title": {
     "ja": "助けに入る",
     "zh-CN": "出手相助"
    },
    "text": {
     "ja": "ホワイトラビットを助けるため<br><span style=\"color:#ff4d00;\">強敵</span>と戦闘する",
     "zh-CN": "为帮助白兔，与<span style=\"color:#ff4d00;\">强敌</span>战斗"
    },
    "turn": null,
    "disabled": false,
    "questCheck": true
   },
   "10370102": {
    "choiceId": 10370102,
    "title": {
     "ja": "様子を見る",
     "zh-CN": "观察情况"
    },
    "text": {
     "ja": "何かが近づく気配を感じたため<br>一度様子を見る",
     "zh-CN": "感觉有什么正在靠近，先观察情况"
    },
    "turn": null,
    "disabled": false,
    "questCheck": false
   }
  }
 },
 "104001": {
  "key": "104001",
  "specialIncidentId": null,
  "nodeType": 5,
  "eventKind": "normal",
  "name": {},
  "enumKey": "",
  "tips": [],
  "description": {
   "ja": "探索の最中、小柄な影がこちらに手を振る。<br>長い耳を揺らしながら、<br>ミハニコスがこちらに歩み寄ってきた。<br><span style=\"color:#FFCE4A;\">「ちょっと導本を貸して～！<br>さっき見つけた力を、お裾分けしちゃうよ～！」</span>",
   "zh-CN": "探索途中，一个矮小身影挥手示意。米哈尼科斯摇着长耳走近。<br><span style=\"color:#FFCE4A;\">「借我一个导本嘛～！把刚发现的力量分给你一点～！」</span>"
  },
  "options": {
   "10400101": {
    "choiceId": 10400101,
    "title": {
     "ja": "導本を渡す",
     "zh-CN": "交出导本"
    },
    "text": {
     "ja": "いずれかの導本効果を獲得",
     "zh-CN": "获得任意一个导本效果"
    },
    "turn": null,
    "disabled": false,
    "questCheck": false
   }
  }
 },
 "104101": {
  "key": "104101",
  "specialIncidentId": null,
  "nodeType": 5,
  "eventKind": "normal",
  "name": {},
  "enumKey": "",
  "tips": [],
  "description": {
   "ja": "探索の最中、小柄な影がこちらに手を振る。<br>ミハニコスが、またも姿を現した。<br><span style=\"color:#FFCE4A;\">「えへへ、あの時の力、役に立ってる～？」</span><br>どうやら今回も力を貸してくれるつもりらしい。",
   "zh-CN": "探索途中，矮小身影再次挥手。米哈尼科斯又出现了。<br><span style=\"color:#FFCE4A;\">「嘿嘿，那时的力量派上用场了吗～？」</span><br>看来这次也打算提供帮助。"
  },
  "options": {
   "10410101": {
    "choiceId": 10410101,
    "title": {
     "ja": "導本を渡す",
     "zh-CN": "交出导本"
    },
    "text": {
     "ja": "いずれかの導本効果を獲得",
     "zh-CN": "获得任意一个导本效果"
    },
    "turn": null,
    "disabled": false,
    "questCheck": false
   }
  }
 },
 "104201": {
  "key": "104201",
  "specialIncidentId": null,
  "nodeType": 5,
  "eventKind": "normal",
  "name": {},
  "enumKey": "",
  "tips": [],
  "description": {
   "ja": "洞窟を進む中、金属を擦るような音が耳に届く。<br>奥ではゴブリンが、硬貨を丁寧に磨いていた。<br>こちらの姿に気づき、口元を下品に歪ませると、<br><span style=\"color:#9DFF67;\">歪んだ鍵</span>をちらちらと揺らしながら、<br>指をすり合わせて代価を求める仕草を見せた。",
   "zh-CN": "在洞窟中前进时，传来金属摩擦声。洞穴深处，哥布林正仔细擦拭硬币，看到众人后露出下流笑容，挥舞着<span style=\"color:#9DFF67;\">扭曲的钥匙</span>索要代价。"
  },
  "options": {
   "10420101": {
    "choiceId": 10420101,
    "title": {
     "ja": "購入する",
     "zh-CN": "购买"
    },
    "text": {
     "ja": "セフィラコイン-200<br>「監獄の鍵」を獲得",
     "zh-CN": "塞菲拉币-200<br>获得「监狱的钥匙」"
    },
    "turn": 1,
    "disabled": false,
    "questCheck": false
   },
   "10420102": {
    "choiceId": 10420102,
    "title": {
     "ja": "討伐する",
     "zh-CN": "讨伐"
    },
    "text": {
     "ja": "魔物に勝利すると<br>「監獄の鍵」を獲得",
     "zh-CN": "战胜魔物后获得「监狱的钥匙」"
    },
    "turn": null,
    "disabled": false,
    "questCheck": false
   }
  }
 },
 "104301": {
  "key": "104301",
  "specialIncidentId": null,
  "nodeType": 5,
  "eventKind": "normal",
  "name": {},
  "enumKey": "",
  "tips": [],
  "description": {
   "ja": "宝石のような甲羅がいくつも煌めいている。<br>そこには<span style=\"color:#FFCE4A;\">巨大なルビガメの群れ</span>が集まっていた。<br>倒せば価値のある宝石を得られるが、<br>この種は仲間を呼ぶという、厄介な習性がある。<br>同時に倒せなければきりがないだろう。",
   "zh-CN": "数个宝石般的甲壳闪闪发光，<span style=\"color:#FFCE4A;\">巨大红玉龟群</span>聚集于此。击败它们能得到有价值的宝石，但这种生物会呼唤同伴，若不能同时击倒便没完没了。"
  },
  "options": {
   "1": {
    "choiceId": 1,
    "title": {
     "ja": "立ち去る",
     "zh-CN": "离开"
    },
    "text": {
     "ja": "探索に戻る",
     "zh-CN": "返回探索"
    },
    "turn": null,
    "disabled": false,
    "questCheck": false
   },
   "10430101": {
    "choiceId": 10430101,
    "title": {
     "ja": "戦う",
     "zh-CN": "战斗"
    },
    "text": {
     "ja": "ルビガメを倒す",
     "zh-CN": "击败红玉龟"
    },
    "turn": null,
    "disabled": false,
    "questCheck": true
   }
  }
 },
 "104401": {
  "key": "104401",
  "specialIncidentId": null,
  "nodeType": 5,
  "eventKind": "normal",
  "name": {},
  "enumKey": "",
  "tips": [],
  "description": {
   "ja": "荒れ果てた書斎の奥、埃を被った机が目に入る。<br>その上には<span style=\"color:#FF4D00;\">不穏な気配を放つ一本の筆</span>があった。<br>触れる者を拒むような重い力を感じるが、<br>使いこなせれば、その真価を引き出せそうだ。",
   "zh-CN": "在荒废书房深处，看见一张积灰的桌子。桌上有一支散发<span style=\"color:#FF4D00;\">不祥气息的笔</span>，虽然力量沉重得像在拒绝触碰，但若能驾驭或许能发挥真正价值。"
  },
  "options": {
   "1": {
    "choiceId": 1,
    "title": {
     "ja": "立ち去る",
     "zh-CN": "离开"
    },
    "text": {
     "ja": "探索に戻る",
     "zh-CN": "返回探索"
    },
    "turn": null,
    "disabled": false,
    "questCheck": false
   },
   "10440101": {
    "choiceId": 10440101,
    "title": {
     "ja": "筆を手に取る",
     "zh-CN": "拿起笔"
    },
    "text": {
     "ja": "特別な導本効果を獲得",
     "zh-CN": "获得特殊导本效果"
    },
    "turn": 1,
    "disabled": false,
    "questCheck": false
   }
  }
 },
 "104501": {
  "key": "104501",
  "specialIncidentId": null,
  "nodeType": 5,
  "eventKind": "normal",
  "name": {},
  "enumKey": "",
  "tips": [],
  "description": {
   "ja": "街道を進む中、助けを求める声が響き渡る。<br>見ると女性が荷を抱えたまま、<br><span style=\"color:#FF4D00;\">後に迫る魔物</span>から必死に逃げ惑っている。<br>一刻も早く助けなければ！",
   "zh-CN": "沿街道前进时，听见求救声。一名女子抱着货物，正拼命逃离<span style=\"color:#FF4D00;\">身后的魔物</span>。必须马上救她！"
  },
  "options": {
   "10450101": {
    "choiceId": 10450101,
    "title": {
     "ja": "魔物を倒す",
     "zh-CN": "击败魔物"
    },
    "text": {
     "ja": "襲われている女性を助ける<br>魔物に勝利すると導本効果を獲得",
     "zh-CN": "帮助被袭击的女子<br>战胜魔物后获得导本效果"
    },
    "turn": null,
    "disabled": false,
    "questCheck": true
   }
  }
 },
 "104601": {
  "key": "104601",
  "specialIncidentId": null,
  "nodeType": 5,
  "eventKind": "normal",
  "name": {},
  "enumKey": "",
  "tips": [],
  "description": {
   "ja": "森の中を探索中、対向から男がやってくる。<br>男はこちらを見るなり、歩み寄ってきた。<br><span style=\"color:#FFCE4A;\">「アンタら、この先の洞窟に向かってるのか？<br>あそこは魔物がうじゃうじゃ出やがるからな……<br>役立つ物を譲ってやる。勿論、タダじゃねぇが」</span>",
   "zh-CN": "在森林中探索时，一名男子从对面走来。<br>男子一看到众人，便主动靠近。<br><span style=\"color:#FFCE4A;\">「你们要去前面的洞窟吗？<br>那里到处都是魔物……<br>我可以把有用的东西让给你们。当然，不是免费的。」</span>"
  },
  "options": {
   "10460101": {
    "choiceId": 10460101,
    "title": {
     "ja": "購入する",
     "zh-CN": "购买"
    },
    "text": {
     "ja": "セフィラコイン-100<br>「異臭漂う生血」を獲得",
     "zh-CN": "塞菲拉币-100<br>获得「散发异臭的生血」"
    },
    "turn": 1,
    "disabled": true,
    "questCheck": false
   },
   "10460102": {
    "choiceId": 10460102,
    "title": {
     "ja": "立ち去る",
     "zh-CN": "离开"
    },
    "text": {
     "ja": "その場から離れる",
     "zh-CN": "离开此处"
    },
    "turn": null,
    "disabled": false,
    "questCheck": false
   }
  }
 },
 "104701": {
  "key": "104701",
  "specialIncidentId": null,
  "nodeType": 5,
  "eventKind": "normal",
  "name": {},
  "enumKey": "",
  "tips": [],
  "description": {
   "ja": "街道で荷車を引くミハニコスと遭遇する。<br>その様子は慌ただしく、明らかに尋常ではない。<br>背後からは、魔物の気配が迫ってきている。<br><span style=\"color:#FFCE4A;\">「あわわ！　追われてるんだ！<br>お願い、助けて～！」</span>",
   "zh-CN": "在街道上遇到拉着货车的米哈尼科斯。它显得慌慌张张，身后传来魔物逼近的气息。<br><span style=\"color:#FFCE4A;\">「哇！被追上了！拜托，帮帮我～！」</span>"
  },
  "options": {
   "10470101": {
    "choiceId": 10470101,
    "title": {
     "ja": "助ける",
     "zh-CN": "帮助"
    },
    "text": {
     "ja": "<span style=\"color:#ff4d00;\">強敵</span>に勝利すると<br>「スーパーセール・チケット」を獲得",
     "zh-CN": "战胜<span style=\"color:#ff4d00;\">强敌</span>后获得「超级特卖券」"
    },
    "turn": null,
    "disabled": false,
    "questCheck": true
   },
   "10470102": {
    "choiceId": 10470102,
    "title": {
     "ja": "逃げる",
     "zh-CN": "逃跑"
    },
    "text": {
     "ja": "ミハニコスと一緒に逃げる",
     "zh-CN": "与米哈尼科斯一起逃跑"
    },
    "turn": null,
    "disabled": false,
    "questCheck": false
   }
  }
 },
 "special:1": {
  "key": "special:1",
  "specialIncidentId": 1,
  "nodeType": 10,
  "eventKind": "special",
  "name": {
   "zh-CN": "邪教祖",
   "ja": "邪教祖",
   "en": "Cult Founder"
  },
  "enumKey": "GURU",
  "tips": [
   "狂信者数量会影响强度",
   "地图图标为邪教祖"
  ],
  "description": {
   "zh-CN": "邪教祖。场上狂信者越多，邪教祖越强；属于特殊战斗。"
  },
  "options": {}
 },
 "special:2": {
  "key": "special:2",
  "specialIncidentId": 2,
  "nodeType": 10,
  "eventKind": "special",
  "name": {
   "zh-CN": "狂信者",
   "ja": "狂信者",
   "en": "Cultist"
  },
  "enumKey": "FANATIC_1",
  "tips": [
   "击败后可削弱邪教祖相关威胁"
  ],
  "description": {
   "zh-CN": "崇拜邪教祖的狂信者之一，属于特殊战斗。"
  },
  "options": {}
 },
 "special:3": {
  "key": "special:3",
  "specialIncidentId": 3,
  "nodeType": 10,
  "eventKind": "special",
  "name": {
   "zh-CN": "狂信者",
   "ja": "狂信者",
   "en": "Cultist"
  },
  "enumKey": "FANATIC_2",
  "tips": [
   "与 special:2 同属狂信者分组"
  ],
  "description": {
   "zh-CN": "崇拜邪教祖的另一种狂信者，属于特殊战斗。"
  },
  "options": {}
 },
 "special:4": {
  "key": "special:4",
  "specialIncidentId": 4,
  "nodeType": 10,
  "eventKind": "special",
  "name": {
   "zh-CN": "真浮空城",
   "ja": "浮遊城",
   "en": "Floating Castle"
  },
  "enumKey": "FLOATING_CASTLE",
  "tips": [
   "需先由研究者确定正确传送口",
   "具有金色地点底图"
  ],
  "description": {
   "zh-CN": "与浮空城研究者互动后，可经正确传送口到达真浮空城，并获得随机金色导本三选一。"
  },
  "options": {}
 },
 "special:5": {
  "key": "special:5",
  "specialIncidentId": 5,
  "nodeType": 10,
  "eventKind": "special",
  "name": {
   "zh-CN": "浮空城传送口",
   "ja": "浮遊城への転移",
   "en": "Floating Castle Portal"
  },
  "enumKey": "FLOATING_CASTLE_TELEPORT_1",
  "tips": [
   "正确入口确定后会高亮"
  ],
  "description": {
   "zh-CN": "浮空城候选传送口之一；确定真入口前可能与另外两个传送口同时存在。"
  },
  "options": {}
 },
 "special:6": {
  "key": "special:6",
  "specialIncidentId": 6,
  "nodeType": 10,
  "eventKind": "special",
  "name": {
   "zh-CN": "浮空城传送口",
   "ja": "浮遊城への転移",
   "en": "Floating Castle Portal"
  },
  "enumKey": "FLOATING_CASTLE_TELEPORT_2",
  "tips": [
   "需配合浮空城研究者辨认真入口"
  ],
  "description": {
   "zh-CN": "浮空城候选传送口之一。"
  },
  "options": {}
 },
 "special:7": {
  "key": "special:7",
  "specialIncidentId": 7,
  "nodeType": 10,
  "eventKind": "special",
  "name": {
   "zh-CN": "浮空城传送口",
   "ja": "浮遊城への転移",
   "en": "Floating Castle Portal"
  },
  "enumKey": "FLOATING_CASTLE_TELEPORT_3",
  "tips": [
   "需配合浮空城研究者辨认真入口"
  ],
  "description": {
   "zh-CN": "浮空城候选传送口之一。"
  },
  "options": {}
 },
 "special:8": {
  "key": "special:8",
  "specialIncidentId": 8,
  "nodeType": 10,
  "eventKind": "special",
  "name": {
   "zh-CN": "浮空城研究者",
   "ja": "浮遊城の研究者",
   "en": "Floating Castle Researcher"
  },
  "enumKey": "FLOATING_CASTLE_RESEARCHER",
  "tips": [
   "用于确定真浮空城入口"
  ],
  "description": {
   "zh-CN": "与研究者互动并选择导本后，假传送口会消失，真传送口得到标记。"
  },
  "options": {}
 },
 "special:9": {
  "key": "special:9",
  "specialIncidentId": 9,
  "nodeType": 10,
  "eventKind": "special",
  "name": {
   "zh-CN": "时停塔",
   "ja": "時計塔",
   "en": "Clock Tower"
  },
  "enumKey": "CLOCK_TOWER",
  "tips": [
   "四场战斗期间停止计算缩圈时间",
   "具有金色地点底图"
  ],
  "description": {
   "zh-CN": "进入不计入缩圈时间的四连战，全部完成后可获得丰厚奖励。",
   "ja": "戦闘を重ね、{{PLAYER}}は違和感に気づく。<br>魔術師たちの瞳には意思の光がなく、<br>ただ命令に従うかのように襲いかかってくる。<br>それを指揮する者の正体とは。<br>最上階は近い──いずれ対峙するはずだ。"
  },
  "options": {
   "10500701": {
    "choiceId": 10500701,
    "title": {
     "ja": "塔を上る",
     "zh-CN": "??"
    },
    "text": {
     "ja": "時の止まった空間で敵と戦闘",
     "zh-CN": "??????????????"
    },
    "turn": null,
    "disabled": false,
    "questCheck": true
   },
   "10500702": {
    "choiceId": 10500702,
    "title": {
     "ja": "引き返す",
     "zh-CN": "??"
    },
    "text": {
     "ja": "塔を離れる",
     "zh-CN": "???"
    },
    "turn": null,
    "disabled": false,
    "questCheck": false
   },
   "10500703": {
    "choiceId": 10500703,
    "title": {
     "ja": "塔を上る",
     "zh-CN": "??"
    },
    "text": {
     "ja": "時の止まった空間で<span style=\"color:#ff4d00;\">強敵</span>と戦闘",
     "zh-CN": "??????????<span style=\"color:#ff4d00;\">??</span>??"
    },
    "turn": null,
    "disabled": false,
    "questCheck": true
   },
   "10500704": {
    "choiceId": 10500704,
    "title": {
     "ja": "諦める",
     "zh-CN": "??"
    },
    "text": {
     "ja": "塔を上らずに探索へ戻る<br>※次に訪れたときに再挑戦が可能",
     "zh-CN": "????????<br>????????????"
    },
    "turn": null,
    "disabled": false,
    "questCheck": false
   }
  }
 },
 "special:10": {
  "key": "special:10",
  "specialIncidentId": 10,
  "nodeType": 10,
  "eventKind": "special",
  "name": {
   "zh-CN": "花畑",
   "ja": "花畑",
   "en": "Flower Garden"
  },
  "enumKey": "FLOWER_GARDEN",
  "tips": [
   "两种选择都会完整恢复队伍",
   "具有金色地点底图"
  ],
  "description": {
   "zh-CN": "恢复全队生命、技能冷却和召唤冷却，并从转化两个导本或获得一个导本中选择。"
  },
  "options": {}
 },
 "special:11": {
  "key": "special:11",
  "specialIncidentId": 11,
  "nodeType": 10,
  "eventKind": "special",
  "name": {
   "zh-CN": "监狱",
   "ja": "監獄",
   "en": "Prison"
  },
  "enumKey": "PRISON",
  "tips": [
   "潜入成功率约20%",
   "监狱钥匙可绕过战斗直接取得奖励"
  ],
  "description": {
   "zh-CN": "可与守卫战斗、尝试潜入、使用监狱钥匙，或暂时离开以后再来。奖励可能为召唤石或金色导本。"
  },
  "options": {}
 },
 "special:12": {
  "key": "special:12",
  "specialIncidentId": 12,
  "nodeType": 10,
  "eventKind": "special",
  "name": {
   "zh-CN": "温泉",
   "ja": "温泉",
   "en": "Hot Spring"
  },
  "enumKey": "HOT_SPRING",
  "tips": [
   "特殊导本可缩短技能冷却并在回合开始回复HP"
  ],
  "description": {
   "zh-CN": "恢复全队所有生命、技能冷却和召唤冷却，并获得一个特殊导本。"
  },
  "options": {}
 },
 "special:13": {
  "key": "special:13",
  "specialIncidentId": 13,
  "nodeType": 10,
  "eventKind": "special",
  "name": {
   "zh-CN": "铁匠台",
   "ja": "鍛冶台",
   "en": "Blacksmith Table"
  },
  "enumKey": "BLACKSMITH_TABLE",
  "tips": [
   "结果具有随机性",
   "具有金色地点底图"
  ],
  "description": {
   "zh-CN": "随机触发获得600塞菲拉币、损失全体20%HP并解锁召唤石或武器、或交换导本等结果。"
  },
  "options": {}
 },
 "special:14": {
  "key": "special:14",
  "specialIncidentId": 14,
  "nodeType": 10,
  "eventKind": "special",
  "name": {
   "zh-CN": "要塞",
   "ja": "砦",
   "en": "Fort"
  },
  "enumKey": "FORT",
  "tips": [
   "属于高收益战斗事件",
   "具有金色地点底图"
  ],
  "description": {
   "zh-CN": "与强敌战斗，奖励必定包含一个角色或一件武器。",
   "ja": "砦の前に立つ影は、ただの魔物ではなかった。<br>統率された気配が、この場を支配している。<br>周辺の魔物を束ねる、小隊長格の存在のようだ。<br>{{PLAYER}}は慎重に出方を窺う。<br>挑むのであれば、相応の覚悟が必要だろう。"
  },
  "options": {
   "10501201": {
    "choiceId": 10501201,
    "title": {
     "ja": "砦の門番に<br>挑む",
     "zh-CN": "??<br>????"
    },
    "text": {
     "ja": "<span style=\"color:#ff4d00;\">強敵</span>に勝利すると強力な導本効果を獲得<br>仲間キャラか装備を解放",
     "zh-CN": "??<span style=\"color:#ff4d00;\">??</span>?????????<br>?????????"
    },
    "turn": null,
    "disabled": false,
    "questCheck": true
   },
   "10501202": {
    "choiceId": 10501202,
    "title": {
     "ja": "撤退する",
     "zh-CN": "??"
    },
    "text": {
     "ja": "戦力を整える<br>※次に訪れたときに再挑戦が可能",
     "zh-CN": "????<br>????????????"
    },
    "turn": null,
    "disabled": false,
    "questCheck": false
   }
  }
 },
 "special:15": {
  "key": "special:15",
  "specialIncidentId": 15,
  "nodeType": 10,
  "eventKind": "special",
  "name": {
   "zh-CN": "大教堂",
   "ja": "大聖堂",
   "en": "Cathedral"
  },
  "enumKey": "CATHEDRAL",
  "tips": [
   "重组导本费用约150",
   "购买特殊导本费用约300"
  ],
  "description": {
   "zh-CN": "可花费塞菲拉币重组导本，或购买一个提供前两回合防护的特殊导本。"
  },
  "options": {}
 },
 "special:16": {
  "key": "special:16",
  "specialIncidentId": 16,
  "nodeType": 10,
  "eventKind": "special",
  "name": {
   "zh-CN": "洞窟",
   "ja": "洞窟",
   "en": "Cave"
  },
  "enumKey": "CAVE",
  "tips": [
   "多阶段探索事件",
   "具有金色地点底图"
  ],
  "description": {
   "zh-CN": "最多探索5次，每次可能遇到奖励或战斗；持有特定血液道具时可引出特定魔物。",
   "ja": "山を貫く長い洞窟が、目の前に口を開けている。<br>かつては人々の行き交う往来の要所であったが、<br>魔物が棲み着き、踏み入る者は絶えたという。<br>探索すれば放棄された品が見つかりそうだが、<br>当然、危険も伴うだろう。"
  },
  "options": {
   "10501601": {
    "choiceId": 10501601,
    "title": {
     "ja": "洞窟に入る",
     "zh-CN": "????"
    },
    "text": {
     "ja": "危険を顧みず洞窟を探索する<br>10%：味方全体のHP-10％",
     "zh-CN": "????????<br>10%???HP-10?"
    },
    "turn": 1,
    "disabled": false,
    "questCheck": false
   },
   "10501602": {
    "choiceId": 10501602,
    "title": {
     "ja": "アイテムを<br>使用する",
     "zh-CN": "??<br>??"
    },
    "text": {
     "ja": "一部の魔物が嫌う「異臭漂う生血」を<br>使いながら探索する",
     "zh-CN": "????????????????????<br>????"
    },
    "turn": 1,
    "disabled": true,
    "questCheck": false
   },
   "10501603": {
    "choiceId": 10501603,
    "title": {
     "ja": "引き返す",
     "zh-CN": "??"
    },
    "text": {
     "ja": "洞窟を出る",
     "zh-CN": "????"
    },
    "turn": null,
    "disabled": false,
    "questCheck": false
   },
   "10501604": {
    "choiceId": 10501604,
    "title": {
     "ja": "洞窟を<br>進み続ける",
     "zh-CN": "??<br>????"
    },
    "text": {
     "ja": "危険を顧みず洞窟内を探索する<br>30%：魔物と遭遇",
     "zh-CN": "????????????<br>30%?????"
    },
    "turn": null,
    "disabled": false,
    "questCheck": true
   },
   "10501605": {
    "choiceId": 10501605,
    "title": {
     "ja": "洞窟を<br>進み続ける",
     "zh-CN": "??<br>????"
    },
    "text": {
     "ja": "危険を顧みず洞窟内を探索する<br>40%：味方全体のHP-20％",
     "zh-CN": "????????????<br>40%???HP-20?"
    },
    "turn": null,
    "disabled": false,
    "questCheck": false
   }
  }
 },
 "special:17": {
  "key": "special:17",
  "specialIncidentId": 17,
  "nodeType": 10,
  "eventKind": "special",
  "name": {
   "zh-CN": "石像",
   "ja": "石像",
   "en": "Stone Face"
  },
  "enumKey": "STONE_FACE",
  "tips": [
   "需要连续完成三场精英战斗"
  ],
  "description": {
   "zh-CN": "完成精英怪三连战后获得一个特殊导本，该导本提供土风伤害、弱化、土属性追击、回复和奥义槽提升。",
   "ja": "遺跡の奥に、ひとりの老人が静かに佇んでいた。<br><span style=\"color:#FFCE4A;\">「戦を恐れぬ者よ、武を守護者に示すがよい。<br>三の試練を越えし者に、神器はその真意を示す。<br>その覚悟、時を越えし我が眼にて見届けん……」</span>"
  },
  "options": {
   "10501501": {
    "choiceId": 10501501,
    "title": {
     "ja": "試練に<br>挑戦する",
     "zh-CN": "??<br>??"
    },
    "text": {
     "ja": "<span style=\"color:#ff4d00;\">強敵</span>との3連戦を制することで<br>特別な導本効果を獲得",
     "zh-CN": "???<span style=\"color:#ff4d00;\">??</span>?3???<br>????????"
    },
    "turn": null,
    "disabled": false,
    "questCheck": true
   },
   "10501502": {
    "choiceId": 10501502,
    "title": {
     "ja": "撤退する",
     "zh-CN": "??"
    },
    "text": {
     "ja": "戦力を整える<br>※次に訪れたときに再挑戦が可能",
     "zh-CN": "????<br>????????????"
    },
    "turn": null,
    "disabled": false,
    "questCheck": false
   }
  }
 },
 "special:18": {
  "key": "special:18",
  "specialIncidentId": 18,
  "nodeType": 10,
  "eventKind": "special",
  "name": {
   "zh-CN": "村庄",
   "ja": "村",
   "en": "Village"
  },
  "enumKey": "VILLAGE",
  "tips": [
   "战斗后转为折扣商店"
  ],
  "description": {
   "zh-CN": "与怪物战斗后获得300塞菲拉币；此处随后变为商店，并提供25%折扣。"
  },
  "options": {}
 }
};
