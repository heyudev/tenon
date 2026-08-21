// 创作管线的声明式定义 —— 系统的脊柱。
//
// 这是一张**给作者用的地图**，不是一份表单目录。每个环节回答五件事：
//   why      不做会死在哪里
//   how      具体怎么做（动作，不是原则）
//   enough   做到什么程度算够（＝门禁）
//   pitfalls 这一步最容易怎么做砸
//   output   能拿走的东西
//
// 路线：地图是全的（46 环节），但没有哪本书要走完全部。
// 平台 × 频道 × 类型 决定哪些必经、哪些增强、哪些跟这本书无关（见 route 与 lib/genre.ts）。
//
// 纯数据，客户端服务端共用。提示词构造在 lib/ai/prompts.ts。

import type { Archetype, ChannelId, VenueId } from './genre'

export type FieldKind = 'text' | 'area' | 'list' | 'select' | 'table' | 'score' | 'flags'

export type Field =
  | { k: 'text'; id: string; label: string; hint?: string; placeholder?: string }
  | { k: 'area'; id: string; label: string; hint?: string; rows?: number; placeholder?: string }
  | { k: 'list'; id: string; label: string; hint?: string; placeholder?: string }
  | { k: 'select'; id: string; label: string; options: string[]; hint?: string }
  | { k: 'table'; id: string; label: string; hint?: string; cols: { id: string; label: string; grow?: number }[] }
  | {
      k: 'score'
      id: string
      label: string
      hint?: string
      items: { id: string; label: string; zero: string; two: string }[]
    }
  | { k: 'flags'; id: string; label: string; hint?: string; items: { id: string; label: string; hint?: string }[] }

export interface GateItem {
  id: string
  text: string
  /** 一票否决项：没勾就不能放行 */
  hard?: boolean
  /** 可判定项：由系统从数据里算，人勾不了也不用勾（checkId 见 lib/checks.ts） */
  auto?: string
}

export type StageView =
  | 'generic' | 'rules' | 'graph' | 'scorecard' | 'resources' | 'power'
  | 'cast' | 'volumes' | 'threads' | 'beats' | 'write' | 'metrics'

export type LayerId =
  | 'author' | 'launch' | 'world' | 'cast' | 'narrative'
  | 'structure' | 'produce' | 'operate' | 'close' | 'protocol'

/** 环节在这本书里的地位 */
export type Weight = '必经' | '增强' | '不适用'

export interface Route {
  /** 所有书都必经 */
  always?: boolean
  /** 命中这些路线原型时必经 */
  archetypes?: Archetype[]
  /** 只对这些频道必经 */
  channels?: ChannelId[]
  /** 只对这些阵地必经 */
  venues?: VenueId[]
  /** 命中这些原型时不适用 */
  notFor?: Archetype[]
}

export interface Stage {
  id: string
  no: number
  layer: LayerId
  title: string
  purpose: string
  why: string
  how: string[]
  pitfalls: string[]
  output: string
  route: Route
  /** 属于「最小可动笔集合」——这些齐了就能写第一章，不必等全部填完 */
  minViable?: boolean
  /** 跨书常驻资产，永不挡路 */
  crossBook?: boolean
  needs: string[]
  view: StageView
  fields: Field[]
  gate: GateItem[]
  craft: string[]
  ai?: { id: string; label: string; role: string; hint?: string }[]
}

export interface Layer {
  id: LayerId
  title: string
  desc: string
  hue: number
}

export const LAYERS: Layer[] = [
  { id: 'author', title: '作者', desc: '跨书常驻的资产池：定位 · 素材 · 拆书 · 复用 · 产能。永不挡路', hue: 265 },
  { id: 'launch', title: '立项', desc: '市场 → 类型契约 → 核心创意成型 → 卖点 → 投放物料', hue: 8 },
  { id: 'world', title: '世界', desc: '资源 · 力量 · 金手指 · 地理势力 · 历史 · 圣经汇编', hue: 34 },
  { id: 'cast', title: '人物', desc: '主角 · 反派体系 · 群像 · 关系与情感线 · 声音与对话', hue: 330 },
  { id: 'narrative', title: '叙事', desc: '视角 · 文风 · 多线 · 开篇——决定"怎么讲"，动笔前必须定死', hue: 200 },
  { id: 'structure', title: '结构', desc: '总纲 → 卷纲 → 悬念账本 → 事件线 → 高潮 → 场景', hue: 168 },
  { id: 'produce', title: '生产', desc: 'brief → 初稿 → 润色 → 门禁 → 回写 → 存稿（日更主循环）', hue: 220 },
  { id: 'operate', title: '运营', desc: '发布 → 数据 → 诊断 → 读者 → 卷末复盘', hue: 288 },
  { id: 'close', title: '收尾', desc: '完结收束 → 完本复盘与 IP 派生', hue: 130 },
  { id: 'protocol', title: '协议', desc: '横切机制，任何时候可触发', hue: 40 },
]

const OPERATORS = ['反转', '量化', '交易化', '垄断化', '隐藏化']

export const STAGES: Stage[] = [
  // ══════════════════════════ A 作者层（跨书常驻） ══════════════════════════
  {
    id: 'a1-profile',
    no: 1,
    layer: 'author',
    title: '作者定位与能力盘',
    purpose: '赛道选择是四元交集：需求存量 × 供给缺口 × 作者适配 × 差异空间。第四元一直没人算。',
    why: '写不了权谋的人接下权谋赛道，前面所有推演都白做。市场再好，你写不出来就等于零。能力盘决定了哪些赛道对你是真机会、哪些是幻觉。',
    how: [
      '列出你读过 ≥20 本的类型——熟悉度是最硬的适配指标，比"我想写"可靠得多',
      '写出你的三个手感强项（对白？氛围？结构？信息密度？情绪？）和三个明确短板',
      '记录你的真实产能：不是理想值，是过去一个月的实际日均字数',
      '标出你的知识存量：干过的行业、待过的地方、懂的手艺——这些是别人抄不走的细节来源',
      '写下你的禁区：写不动也不想写的题材，明确排除掉',
    ],
    pitfalls: [
      '按"想成为的作者"填，不按"现在的作者"填 —— 这张表的价值全在诚实',
      '产能填理想值，导致后面的排期全部失真',
      '把短板写成"文笔一般"这种没法用的话，应该具体到"写不了群像""对白容易同质"',
    ],
    output: '《作者能力盘》——立项时用来给赛道打适配分',
    route: { always: true },
    crossBook: true,
    needs: [],
    view: 'generic',
    craft: ['c-market'],
    fields: [
      { k: 'list', id: 'read', label: '读过 ≥20 本的类型', hint: '熟悉度比意愿可靠' },
      { k: 'list', id: 'strong', label: '手感强项', hint: '具体到能力，不要写"文笔好"' },
      { k: 'list', id: 'weak', label: '明确短板' },
      { k: 'text', id: 'output', label: '真实日均产能', hint: '过去一个月的实际值，不是理想值' },
      { k: 'list', id: 'knowledge', label: '知识存量', hint: '干过的行业 / 待过的地方 / 懂的手艺' },
      { k: 'list', id: 'forbidden', label: '禁区', hint: '写不动也不想写的题材' },
    ],
    gate: [
      { id: 'g1', text: '强项与短板都写到"具体能力"粒度' },
      { id: 'g2', text: '产能填的是实测值不是理想值', hard: true },
      { id: 'g3', text: '知识存量至少 3 条（这是你的细节护城河）' },
    ],
  },
  {
    id: 'a2-material',
    no: 2,
    layer: 'author',
    title: '素材库',
    purpose: '设定给的是世界的骨架，素材库给的是血肉——行业细节、地域风物、职业黑话、器物与饮食。',
    why: '「最小可写场景」能不能写具体，靠的不是想象力是素材量。设定再炸，落到"一个人在一个下午做的一件事"时，没有细节就只能写空气。读者对假的细节零容忍。',
    how: [
      '按"能进场景的最小单位"收：一个动作、一件器物、一句行话、一个气味、一条规矩',
      '每条素材记来源和可信度——道听途说和亲历要分开标',
      '写作时遇到"这里我编不出来"，立刻记成一条待补素材，别硬编',
      '定期把素材挂到概念或类型上，方便按需检索',
    ],
    pitfalls: [
      '收成大段资料而不是可直接落进场景的细节 —— 一段维基百科不是素材',
      '只收自己已经熟悉的领域，素材库变成回音室',
      '编造细节冒充素材，一处穿帮会连累整本书的可信度',
    ],
    output: '可检索的素材条目，写场景时随手取用',
    route: { always: true },
    crossBook: true,
    needs: [],
    view: 'generic',
    craft: ['c-chapter'],
    fields: [
      {
        k: 'table',
        id: 'items',
        label: '素材条目',
        cols: [
          { id: 'tag', label: '归类', grow: 1 },
          { id: 'item', label: '细节', grow: 4 },
          { id: 'src', label: '来源与可信度', grow: 2 },
        ],
      },
      { k: 'list', id: 'todo', label: '待补素材', hint: '写作时"这里我编不出来"的地方' },
    ],
    gate: [{ id: 'g1', text: '每条素材都能直接落进一个场景（不是资料段落）' }],
  },
  {
    id: 'a3-teardown',
    no: 3,
    layer: 'author',
    title: '拆书库',
    purpose: '拆解爆款是基本功。立项时的"对标 3 本"是一次性动作，拆书库是持续资产。',
    why: '同类调研只解决"我跟它差在哪"，拆书库解决"这个类型的读者到底吃什么"。不拆书，你对类型契约的理解永远停在感觉层面。',
    how: [
      '拆结构：它的黄金三章各做了什么动作？第一个爽点在第几章？金手指怎么激活的？',
      '拆节奏：数它前 20 章的爽点分布与钩子型号，画出实际排期',
      '拆差评：翻它的低分评论，归类出这个品类的雷区',
      '拆好评：高频好评词就是该品类的刚需，你必须给足',
      '每本拆完只留一句可复用的结论，不要留读后感',
    ],
    pitfalls: [
      '拆成读后感，没有可复用的结构结论',
      '只拆自己喜欢的书，不拆数据好但自己不喜欢的书——后者信息量更大',
      '只看好评不看差评，错过整个品类的雷区地图',
    ],
    output: '爆款结构库 / 开篇库 / 桥段库，回流到复用资产',
    route: { always: true },
    crossBook: true,
    needs: [],
    view: 'generic',
    craft: ['c-scorecard', 'c-golden3'],
    ai: [{ id: 'frame', label: '生成拆书框架', role: '总策划', hint: '按结构/节奏/差评/好评四路拆' }],
    fields: [
      {
        k: 'table',
        id: 'books',
        label: '拆解记录',
        cols: [
          { id: 'name', label: '书名', grow: 2 },
          { id: 'genre', label: '类型', grow: 1 },
          { id: 'open', label: '黄金三章各做了什么', grow: 3 },
          { id: 'beat', label: '前 20 章爽点分布', grow: 2 },
          { id: 'bad', label: '差评 Top3', grow: 2 },
          { id: 'good', label: '好评 Top3（＝品类刚需）', grow: 2 },
          { id: 'take', label: '一句可复用结论', grow: 2 },
        ],
      },
    ],
    gate: [{ id: 'g1', text: '每本都留下了一句可复用结论，不是读后感' }],
  },
  {
    id: 'a4-assets',
    no: 4,
    layer: 'author',
    title: '复用资产库',
    purpose: '爽点变奏、桥段、金句、人名、开篇型号——写过的东西要能被下一本用上。',
    why: '这是第 7 条回路（完本 → 资产 → 下一本）的终点。没有这一层，每本书都从零开始，"引擎越用越强"就只是口号。',
    how: [
      '每卷复盘时把数据最好的爽点抽象成变奏模式（对手级别 × 见证场合 × 兑现资源）存进来',
      '写到得意的桥段与金句当场存，别指望以后翻正文找',
      '人名按阵营/风格分组存，开新书直接取',
      '存的时候写清"什么情境下能复用"，否则等于没存',
    ],
    pitfalls: [
      '存原文不存模式 —— 原文不能复用，模式才能',
      '只存成功的，不存失败的。踩过的坑同样是资产',
    ],
    output: '跨书可取用的爽点/桥段/金句/人名库',
    route: { always: true },
    crossBook: true,
    needs: [],
    view: 'generic',
    craft: ['c-climax', 'gate-4'],
    fields: [
      {
        k: 'table',
        id: 'beats',
        label: '爽点变奏模式',
        cols: [
          { id: 'pattern', label: '模式', grow: 3 },
          { id: 'axis', label: '三轴取值', grow: 2 },
          { id: 'when', label: '什么情境下可复用', grow: 3 },
          { id: 'from', label: '出处', grow: 1 },
        ],
      },
      { k: 'list', id: 'lines', label: '金句 / 桥段' },
      { k: 'list', id: 'names', label: '人名池' },
      { k: 'list', id: 'traps', label: '踩过的坑' },
    ],
    gate: [{ id: 'g1', text: '存的是模式与复用条件，不是原文片段' }],
  },
  {
    id: 'a5-capacity',
    no: 5,
    layer: 'author',
    title: '产能与多书排期',
    purpose: '日更是马拉松。配速错了，断更是必然而不是意外。',
    why: '断更是长篇的头号死因之一，而它几乎总是可预测的：存稿见底 + 配速超出实测产能。这一层把它变成可管理的量。',
    how: [
      '用能力盘里的实测产能定配速，留 20% 余量，不要按峰值排',
      '定存稿缓冲下限（建议 ≥7 天量），跌破就降速而不是硬撑',
      '多书并行时明确每本的时间配额，一次只专注一本，切书要换上下文',
      '排里程碑：卷末、入 V、完结，每个里程碑前留缓冲期',
    ],
    pitfalls: [
      '按最好状态的一天定日更量',
      '存稿见底还维持原速，一次生病就断更',
      '同时推进多本，结果每本都慢且串味',
    ],
    output: '配速表 + 存稿下限 + 多书时间配额',
    route: { always: true },
    crossBook: true,
    needs: ['a1-profile'],
    view: 'generic',
    craft: ['c-longform'],
    fields: [
      { k: 'text', id: 'pace', label: '日更配速', hint: '实测产能 × 0.8' },
      { k: 'text', id: 'buffer', label: '存稿缓冲下限', hint: '建议 ≥7 天量，跌破就降速' },
      {
        k: 'table',
        id: 'books',
        label: '多书配额',
        cols: [
          { id: 'book', label: '书', grow: 2 },
          { id: 'quota', label: '时间配额', grow: 1 },
          { id: 'phase', label: '当前阶段', grow: 2 },
        ],
      },
      { k: 'list', id: 'milestones', label: '里程碑与缓冲期' },
    ],
    gate: [
      { id: 'g1', text: '配速基于实测产能并留了余量', hard: true },
      { id: 'g2', text: '存稿下限已定，且有跌破后的降速方案' },
    ],
  },

  // ══════════════════════════ B 立项层 ══════════════════════════
  {
    id: 'b1-market',
    no: 6,
    layer: 'launch',
    title: '市场与赛道',
    purpose: '赛道 = 需求存量 × 供给缺口 × 作者适配 × 差异空间，四元交集。',
    why: '选错赛道，后面每一步都在给一个没人要的东西做优化。而赛道判断如果不算作者适配，选出来的往往是"看起来很好但我写不了"的路。',
    how: [
      '看目标平台分类榜：头部书的更新状态、在读人数、评论时效 —— 判断需求还在不在',
      '找供给缺口：头部完结或断更、模仿者质量断层、新标签供给稀薄',
      '拿作者能力盘对候选赛道逐个打适配分，低分的直接排除',
      '锁定 3 本对标书，记录各自的核心差异、差评 Top3、好评 Top3',
    ],
    pitfalls: [
      '只看热度不看窗口期 —— 正当红的赛道往往已经挤满',
      '跳过作者适配，选中一条自己写不动的路',
      '对标书只找同题材，不找同结构的跨题材作品',
    ],
    output: '《立项市场判断》一页',
    route: { always: true },
    needs: ['a1-profile'],
    view: 'generic',
    craft: ['c-market'],
    ai: [{ id: 'scan', label: '生成赛道分析', role: '运营模型', hint: '按四元交集给候选赛道与理由' }],
    fields: [
      { k: 'text', id: 'track', label: '目标赛道' },
      { k: 'area', id: 'demand', label: '需求存量判断', rows: 2 },
      { k: 'area', id: 'gap', label: '供给缺口', hint: '头部完结/断更、质量断层、新标签', rows: 2 },
      { k: 'area', id: 'fit', label: '作者适配打分', hint: '对照能力盘：熟悉度 / 强项匹配 / 知识存量', rows: 2 },
      {
        k: 'table',
        id: 'rivals',
        label: '对标书（≥3 本）',
        cols: [
          { id: 'name', label: '书名', grow: 2 },
          { id: 'diff', label: '它的核心差异', grow: 3 },
          { id: 'mine', label: '我强在哪（一句话）', grow: 3 },
          { id: 'bad', label: '差评 Top3', grow: 2 },
          { id: 'good', label: '好评 Top3', grow: 2 },
        ],
      },
    ],
    gate: [
      { id: 'g1', text: '对标书 ≥3 本，差异一句话说得清', hard: true },
      { id: 'g2', text: '作者适配已打分，低分赛道已排除', hard: true },
      { id: 'g3', text: '供给缺口写清了是哪一类窗口' },
    ],
  },
  {
    id: 'b2-genre',
    no: 7,
    layer: 'launch',
    title: '类型与读者契约',
    purpose: '定平台 × 频道 × 类型。这三个参数决定后面走哪条路线、按什么阈值判定。',
    why: '读者是按类型找书的，也是按类型预期的。类型没定就去找规则、定人物、排节奏，等于在没有收货人的情况下发货。这是整张地图的分岔点——类型一变，后面哪些环节必经、哪些无关，全都变。',
    how: [
      '先定平台：这是两种商业模型的选择，不是发行渠道的选择',
      '再定频道：男频女频是两套创作学，读者契约、爽点类型、雷区完全不同',
      '选类型，然后逐条抄下它的必备元素与雷区，这就是你和读者的合同',
      '写下一句话读者契约：读者打开这本书，是想要什么',
      '确认路线：系统会按类型算出必经/增强/不适用环节，逐个过一遍有没有异议',
    ],
    pitfalls: [
      '混类型：想同时吃两个类型的读者，结果两边都不认',
      '选了类型却不认它的必备元素，写出"这不是我要的那类书"',
      '把频道当性别标签而不是读者契约——男频女频的差别在"什么算爽"，不在主角性别',
    ],
    output: '平台 / 频道 / 类型三参数 + 读者契约一句话 + 本书路线',
    route: { always: true },
    minViable: true,
    // 不依赖市场与赛道：那一步值得做，但不该挡着人开书。
    // 最小可动笔集合的依赖闭包必须留在集合内部，否则「7 项齐了就能写第一章」是句假话，
    // 引导模式也会被迫把人推去集合外的环节。
    needs: [],
    view: 'generic',
    craft: ['c-market', 'c-channel', 'plat-fanqie', 'plat-qidian'],
    ai: [{ id: 'contract', label: '推演读者契约', role: '读者模型', hint: '这个类型的读者在期待什么、最不能忍什么' }],
    fields: [
      { k: 'text', id: 'contract', label: '一句话读者契约', hint: '读者打开这本书，是想要什么' },
      { k: 'list', id: 'musts', label: '本书认下的必备元素', hint: '从类型契约里抄，缺一项读者就会觉得不对味' },
      { k: 'list', id: 'mines', label: '本书要避的雷区', hint: '频道雷区 + 类型雷区' },
      { k: 'area', id: 'diff', label: '我在这个类型里的差异化', hint: '同类型里，凭什么读者选我这本', rows: 3 },
    ],
    gate: [
      { id: 'g1', text: '平台 / 频道 / 类型三个参数都已选定', auto: 'genre-set', hard: true },
      { id: 'g2', text: '读者契约能一句话说清', hard: true },
      { id: 'g3', text: '类型必备元素逐条认下，没有装看不见的', hard: true },
      { id: 'g4', text: '雷区清单已抄进本书，写作时随时可查' },
      { id: 'g5', text: '本书路线已确认（必经/增强/不适用逐个过目）' },
    ],
  },
  {
    id: 'b9-core',
    no: 8,
    layer: 'launch',
    title: '核心创意成型',
    purpose: '把你手上那点东西——不管是一个画面、一个人、一条设定还是一个类型——推到能被验证的程度。',
    why: '这一步不负责给你创意，负责把创意推到"能判断它值不值得写几百万字"。 跳过它直接开写，最常见的死法是：开头很好，五十万字处崩掉——因为那个想法从来没被检验过能不能推动，也没人问过它靠什么撑长篇。',
    how: [
      '先写开场画面四件套：谁 ｜ 在哪 ｜ 握着什么 ｜ 正在做什么。写动作，不要写氛围',
      '指认里面那个人：他想要什么（具体到能数出来的东西），什么挡着他，退了会失去什么',
      '做推动力测试：这一场结束之后，必然会发生什么？说不出"必然"，说明这是个静止的点子不是故事的开头',
      '做长篇支撑测试：什么东西能让它写几百章而不重复自己——是这个人还没解决的欲望、还是这个处境本身在不断升级',
      '来源不限：设定、画面、人物、类型都能从这里进。系统不替你选路，只检查你手上的东西站不站得住',
    ],
    pitfalls: [
      '画面写成了氛围描写而不是具体动作 —— 没有动作就没有下一场',
      '有世界没有人：说得出这个世界怎么运转，说不出谁站在里面想要什么',
      '推动力测试用"然后他继续变强"糊过去 —— 那不是必然发生的事，是没想清楚',
      '把"我觉得这个点子很酷"当成通过了验证',
    ],
    output: '开场切口 + 核心人物的欲望与阻碍 + 推动力与长篇支撑结论',
    route: { always: true },
    minViable: true,
    needs: ['b2-genre'],
    view: 'generic',
    craft: ['c-two-rulers'],
    ai: [
      { id: 'push', label: '做推动力体检', role: '总策划', hint: '这一场之后必然发生什么，能不能生出下一场' },
    ],
    fields: [
      { k: 'text', id: 'scene', label: '开场画面', placeholder: '谁 ｜ 在哪 ｜ 握着什么 ｜ 正在做什么' },
      { k: 'text', id: 'want', label: '他想要什么', hint: '具体到能数出来：还剩 3 天 / 欠 47 万 / 找到那个人' },
      { k: 'area', id: 'block', label: '什么挡着他', hint: '人、处境、还是他自己的某个东西', rows: 2 },
      { k: 'area', id: 'push', label: '这一场之后必然发生什么', hint: '说不出"必然"就是静止的点子', rows: 3 },
      { k: 'area', id: 'longform', label: '它靠什么撑几百章', hint: '未解决的欲望？不断升级的处境？', rows: 3 },
    ],
    gate: [
      { id: 'g1', text: '开场画面写成了四件套（谁/在哪/握着什么/做什么）', hard: true },
      { id: 'g2', text: '画面里站着一个人，且他想要的东西是具体的', hard: true },
      { id: 'g3', text: '说得出这一场之后必然发生什么', hard: true },
      { id: 'g4', text: '说得出它靠什么撑长篇，不是"继续变强"' },
    ],
  },
  {
    id: 'b7-concept',
    no: 9,
    layer: 'launch',
    title: '卖点与立项',
    purpose: '把核心差异压成一句话，再验证它值不值得投入几百万字。',
    why: '卖点是这本书唯一的对外接口——书名、简介、封面、推荐语全从它派生。卖点立不住，后面写得再好也没人点开。评分卡是防止"自己觉得很好"的唯一手段。',
    how: [
      '按模板写：当〔现实规则〕变成〔改写后规则〕，一个〔特殊主角〕必须／可以〔核心动作〕',
      '做电梯测试：给没看过设定的人讲，观察他是转述、追问，还是礼貌点头',
      '过十项评分卡，≥14 分才立项',
      '过排雷清单，命中任一即回炉',
    ],
    pitfalls: [
      '卖点里只有世界没有人 —— 那是设定集不是小说',
      '自己给自己打高分，评分卡失去意义',
      '排雷时对撞车雷装看不见',
    ],
    output: '《立项书》= 卖点 + 评分卡 + 排雷结果',
    route: { always: true },
    minViable: true,
    needs: ['b2-genre'],
    view: 'scorecard',
    craft: ['c-hc', 'c-scorecard'],
    ai: [
      { id: 'logline', label: '生成卖点变体', role: '总导演' },
      { id: 'elevator', label: '电梯测试模拟', role: '读者模型' },
    ],
    fields: [
      { k: 'text', id: 'logline', label: '一句话卖点', placeholder: '当〔现实规则〕变成〔改写后规则〕，一个〔特殊主角〕必须〔核心动作〕。' },
      { k: 'area', id: 'elevator', label: '电梯测试记录', hint: '对方是转述、追问，还是礼貌点头？', rows: 3 },
      {
        k: 'score',
        id: 'score',
        label: '立项评分卡',
        hint: '每项 0-2 分。≥14 立项，10-13 修改后重测，<10 弃',
        items: [
          { id: 'novel', label: '差异新颖度', zero: '榜单已有同款头部书', two: '全平台无同类' },
          { id: 'entry', label: '理解门槛', zero: '需 3 句以上解释', two: '一句话就懂' },
          { id: 'unfold', label: '自展开性', zero: '听者无追问', two: '连续追问 2 个以上场景' },
          { id: 'density', label: '爽点密度潜力', zero: '只能兑现 1-2 次', two: '可在不同层级反复兑现' },
          { id: 'longform', label: '长篇支撑力', zero: '50 万字讲完', two: '有四层揭露空间' },
          { id: 'conflict', label: '冲突内生性', zero: '冲突要靠外加反派', two: '设定自动制造阵营对立' },
          { id: 'relate', label: '代入感', zero: '远离日常经验', two: '贴着衣食住行/身份钱权' },
          { id: 'platform', label: '平台适配', zero: '与目标平台调性相反', two: '明确契合' },
          { id: 'visual', label: '视觉奇观', zero: '无标志性画面', two: '有一个可做封面的画面' },
          { id: 'hero', label: '主角位强度', zero: '主角可替换成任何人', two: '身份与核心差异结构性绑定' },
        ],
      },
      {
        k: 'flags',
        id: 'mines',
        label: 'IP 排雷清单',
        items: [
          { id: 'clash', label: '撞车雷', hint: '同款正在榜单头部连载' },
          { id: 'reg', label: '监管雷', hint: '核心展开必然触红线' },
          { id: 'cash', label: '兑现雷', hint: '爽点需要专业知识才能感知' },
          { id: 'ladder', label: '递进雷', hint: '没有升级空间，第一卷即巅峰' },
          { id: 'moral', label: '道德雷', hint: '主角的做法令多数读者生理不适' },
          { id: 'adapt', label: '改编雷', hint: '核心爽点纯内心戏，无法可视化' },
        ],
      },
    ],
    gate: [
      { id: 'g1', text: '评分卡 ≥14 分', auto: 'score-14', hard: true },
      { id: 'g2', text: '排雷清单六项全过', auto: 'mines-clear', hard: true },
      { id: 'g3', text: '卖点通过电梯测试' },
      { id: 'g4', text: '卖点里站着一个人，不只是一个世界', hard: true },
    ],
  },
  {
    id: 'b8-package',
    no: 10,
    layer: 'launch',
    title: '书名简介与投放物料',
    purpose: '书名、简介、标签、封面 brief —— 转化率上的分量等同于黄金三章。',
    why: '这是投放素材，不是文学创作。 读者在点开之前只看得到这四样东西。黄金三章决定他看不看第二章，这四样决定他看不看第一章。绝大多数作者在这里投入不足百分之一的精力。',
    how: [
      '书名：走流量的直接把核心差异说出来；走订阅的可留一层势，但简介第一行必须给出差异',
      '简介三段式：第一行给差异（钩子）→ 中段给处境与主角位 → 末行给悬念或宣言',
      '标签按平台的实际分类体系选，别自创',
      '封面 brief：写清核心画面、色调、主体、必须避免什么（不是让你画，是让你说清）',
      '每样准备 3-5 个候选，这几样是可以也应该 AB 测的',
    ],
    pitfalls: [
      '书名求雅致，读者搜不到也看不懂',
      '简介写成故事梗概，把悬念全交代了',
      '只做一版，失去了新书期最有效的实验手段',
      '标签乱选，被算法分发到错误的读者群',
    ],
    output: '书名候选 + 简介 3 版 + 标签 + 封面 brief',
    route: { always: true },
    needs: ['b7-concept'],
    view: 'generic',
    craft: ['c-hc', 'c-package'],
    ai: [
      { id: 'title', label: '生成书名候选', role: '运营模型' },
      { id: 'blurb', label: '生成简介三版', role: '运营模型', hint: '三段式：差异→处境→悬念' },
    ],
    fields: [
      { k: 'list', id: 'titles', label: '书名候选（3-5 个）' },
      { k: 'area', id: 'blurb_a', label: '简介 · A 版', rows: 5 },
      { k: 'area', id: 'blurb_b', label: '简介 · B 版', rows: 5 },
      { k: 'list', id: 'tags', label: '标签', hint: '按平台实际分类体系选，别自创' },
      { k: 'area', id: 'cover', label: '封面 brief', hint: '核心画面 / 色调 / 主体 / 必须避免什么', rows: 3 },
    ],
    gate: [
      { id: 'g1', text: '书名候选 ≥3 个，且至少一个把核心差异说出来了', auto: 'title-count', hard: true },
      { id: 'g2', text: '简介第一行就给出差异，没有写成梗概', hard: true },
      { id: 'g3', text: '标签用的是平台实际分类' },
      { id: 'g4', text: '封面 brief 说得清核心画面' },
    ],
  },

  // ══════════════════════════ C 世界构建层 ══════════════════════════
  {
    id: 'c1-resource',
    no: 11,
    layer: 'world',
    title: '资源系统',
    purpose: '不要设计能力，设计资源流。能力是表现层，资源是本体层。',
    why: '有资源流，冲突/经济/成长三条线全部自动长出来；没有资源流，你得为每一场争夺现编理由。判据：把能力全部换皮，只要资源流不变，故事结构完全成立。',
    how: [
      '定 1-2 种核心资源做深，不要贪多',
      '每种按五要素展开：产生源头 / 流动路径 / 沉淀形态 / 黑市形态 / 世界观类比',
      '给出总量与再生速率——这是防数值膨胀的锚',
      '写清主角的获取路径差：他拿这种资源的方式与常人有何结构性不同（这就是金手指的资源学定义）',
    ],
    pitfalls: [
      '设计了五六种资源，每种都很浅',
      '黑市形态想不出来 —— 说明稀缺性或代价设计有问题',
      '有形资源不给总量，读者一审计就崩',
    ],
    output: '《核心资源设计表》',
    route: { archetypes: ['world', 'power'] },
    needs: ['b7-concept'],
    view: 'resources',
    craft: ['c-resource'],
    ai: [{ id: 'flow', label: '推演资源五要素', role: '总策划' }],
    fields: [
      {
        k: 'table',
        id: 'core',
        label: '核心资源（1-2 种做深）',
        cols: [
          { id: 'name', label: '资源', grow: 1 },
          { id: 'origin', label: '产生源头', grow: 2 },
          { id: 'path', label: '流动路径', grow: 2 },
          { id: 'sink', label: '沉淀形态', grow: 2 },
          { id: 'black', label: '黑市形态', grow: 2 },
          { id: 'analogy', label: '世界观类比', grow: 1 },
        ],
      },
      { k: 'area', id: 'total', label: '总量与再生', hint: '防数值膨胀的锚', rows: 2 },
      { k: 'area', id: 'hero_path', label: '主角的获取路径差', hint: '金手指的资源学定义', rows: 3 },
    ],
    gate: [
      { id: 'g1', text: '五要素表完成，黑市形态写得出来', auto: 'resource-black', hard: true },
      { id: 'g2', text: '总量与再生速率有明确的锚' },
      { id: 'g3', text: '主角获取路径差写清', hard: true },
    ],
  },
  {
    id: 'c2-power',
    no: 12,
    layer: 'world',
    title: '力量体系',
    purpose: '主角与资源之间的汇率制度：投入什么、兑换多大力量、付出什么代价。',
    why: '读者追的是可预期的跃迁 + 不可预期的方式。等级表就是那个"可预期"——它是读者的进度条，也是数值不崩的会计制度。',
    how: [
      '排等级表，四列必须对齐：境界名称 / 资源门槛 / 规则权限 / 社会身份',
      '门槛要精确到资源的状态（持有？固化？流通？收益？）——写不清，主角一进等级审计就出漏洞',
      '每个大境界解锁一种新的规则权限：低级只能用规则 → 中级能钻空子 → 高级能局部改写规则',
      '定代价机制与至少两种刹车',
      '预埋三次换轨：爬等级 → 争权限 → 改写"什么算强"',
    ],
    pitfalls: [
      '等级挂在"感悟"这类不可审计的东西上',
      '级差只有量变没有质变，升级变成复读',
      '前期把牌打光，后期无级可升',
      '总级数太少（廉价）或太多（窒息），参考卷数 × 1.5',
    ],
    output: '《力量体系设计表》',
    // 重人物／轻设定的类型（现代言情、娱乐圈、年代文…）没有等级体系可排
    route: { archetypes: ['power'], notFor: ['people', 'slice'] },
    needs: ['c1-resource'],
    view: 'power',
    craft: ['c-power'],
    ai: [{ id: 'ladder', label: '生成等级表', role: '总策划' }],
    fields: [
      {
        k: 'table',
        id: 'levels',
        label: '等级表（四列必须对齐）',
        hint: '总级数 ≈ 卷数 × 1.5',
        cols: [
          { id: 'name', label: '境界名称', grow: 2 },
          { id: 'cost', label: '资源门槛', grow: 3 },
          { id: 'perm', label: '规则权限', grow: 3 },
          { id: 'social', label: '社会身份', grow: 3 },
        ],
      },
      { k: 'area', id: 'price', label: '代价机制', hint: '同币种 / 可转嫁但制造敌人 / 延迟支付＝悬念存款', rows: 3 },
      {
        k: 'flags',
        id: 'limits',
        label: '刹车（至少两种）',
        items: [
          { id: 'freq', label: '频次限制', hint: '冷却、次数 → 用不用的决策张力' },
          { id: 'cond', label: '条件限制', hint: '特定场景才发动 → 创造条件的过程剧情' },
          { id: 'know', label: '知情限制', hint: '被知晓即失效 → 隐藏身份线' },
          { id: 'tier', label: '层级限制', hint: '对高一级权限者无效 → boss 战不能白嫖' },
        ],
      },
      { k: 'text', id: 'track1', label: '第一轨', hint: '在表层规则内按等级表爬楼' },
      { k: 'text', id: 'track2', label: '第二轨', hint: '发现等级表是被设计的，与管理员博弈' },
      { k: 'text', id: 'track3', label: '第三轨', hint: '触及元规则——终局是改写"什么算强"' },
    ],
    gate: [
      { id: 'g1', text: '四列对齐，门槛是资源的函数不是"感悟"', auto: 'power-columns', hard: true },
      { id: 'g2', text: '通过 30 秒数值锚测试', hard: true },
      { id: 'g3', text: '每个大境界解锁新的规则权限' },
      { id: 'g4', text: '至少两种刹车，代价与收益同币种或强关联' },
      { id: 'g5', text: '三次换轨各有一句话预埋' },
    ],
  },
  {
    id: 'c3-cheat',
    no: 13,
    layer: 'world',
    title: '金手指专项',
    purpose: '金手指是这本书的发动机。它值得一个独立环节，而不是散在力量体系和人物里。',
    why: '金手指没设计好会同时毁掉三件事：爽点（不够爽或太爽）、张力（无限制则剧情提前结束）、代入（与主角性格割裂）。它是读者对这本书的第一记忆点，也是简介里最该出现的东西。',
    how: [
      '定来源：为什么是他？来源本身应该是一个可回收的悬念',
      '定同源关系：金手指必须与主角的核心欲望同源——它正好能帮他拿到他要的东西，又逼他付代价。不能是外挂式的另一套系统',
      '定成长：它自己会不会变强？怎么变？',
      '定至少两种刹车（频次/条件/知情/层级），并说明每种刹车带来的剧情红利',
      '定代价：用它要付出什么。没有代价的力量没有重量',
      '定被发现的风险：知情限制往往是都市类最好用的张力来源',
      '与主角性格对表：这个能力放在这个人手里，会不会产生独特的用法',
    ],
    pitfalls: [
      '万能金手指 —— 主角不需要做决策，剧情提前结束',
      '与主角想要的东西无关，变成两套设定各转各的',
      '第一章就把上限展示完，后面无处升级',
      '刹车只写在设定里，剧情中从不真正生效',
    ],
    output: '《金手指设计卡》：来源 / 同源关系 / 成长 / 刹车 / 代价 / 风险',
    route: { always: true },
    minViable: true,
    needs: ['b7-concept'],
    view: 'generic',
    craft: ['c-cheat', 'c-power'],
    ai: [{ id: 'design', label: '设计金手指', role: '总策划', hint: '含来源、刹车、代价与剧情红利' }],
    fields: [
      { k: 'text', id: 'oneline', label: '一句话金手指', hint: '简介里会出现的那句' },
      { k: 'area', id: 'source', label: '来源', hint: '为什么是他？来源本身应是可回收的悬念', rows: 2 },
      { k: 'area', id: 'same', label: '与核心差异的同源关系', hint: '不能是另起炉灶的第二套设定', rows: 2 },
      { k: 'area', id: 'grow', label: '它自己怎么成长', rows: 2 },
      {
        k: 'table',
        id: 'brakes',
        label: '刹车与剧情红利',
        cols: [
          { id: 'brake', label: '刹车', grow: 2 },
          { id: 'benefit', label: '它带来什么剧情', grow: 4 },
        ],
      },
      { k: 'area', id: 'price', label: '代价', rows: 2 },
      { k: 'area', id: 'risk', label: '被发现的风险', hint: '知情限制是都市类最好用的张力来源', rows: 2 },
      { k: 'text', id: 'fit', label: '与主角性格的化学反应', hint: '这个能力在这个人手里的独特用法' },
    ],
    gate: [
      { id: 'g1', text: '与核心差异同源，不是外挂式的第二套系统', hard: true },
      { id: 'g2', text: '至少两种刹车，且每种都写清了带来什么剧情', auto: 'cheat-brakes', hard: true },
      { id: 'g3', text: '有代价，且代价与收益强关联', auto: 'cheat-price', hard: true },
      { id: 'g4', text: '第一章不会把上限展示完' },
      { id: 'g5', text: '一句话金手指能直接放进简介' },
    ],
  },
  {
    id: 'c4-geo',
    no: 14,
    layer: 'world',
    title: '地理与势力',
    purpose: '主角的活动半径逐卷扩张，每一层地图对应一层阶层与一组势力。',
    why: '地图不是背景板，是结构工具：新地图＝新阶层＝新对手＝新爽点级别。卷与卷之间的递进感，一大半来自地图的推进。势力则是冲突的自动生成器——两个组织的欲望与恐惧一交叉，冲突就有了。',
    how: [
      '按卷排出地图推进：主角每卷活动在哪一层，这一层的阶层特征是什么',
      '每个势力填四件事：它想要的 / 它怕失去的 / 它手里的资源 / 它与主角的关系',
      '画出势力之间的敌友与依存，标出哪两组的欲望是直接冲突的',
      '给每个势力一张脸（具体人物），势力才能被打、被救、被背叛',
    ],
    pitfalls: [
      '地图铺得太大太早，主角的活动半径与实力不匹配',
      '势力只有名字没有欲望，成了纯背景',
      '势力关系静态不变，写到中期没有新的组合可用',
    ],
    output: '地图分层表 + 势力卡 + 势力关系图',
    route: { archetypes: ['world', 'plot', 'power'] },
    needs: ['b7-concept'],
    view: 'generic',
    craft: ['c-five-questions', 'c-faction'],
    ai: [{ id: 'faction', label: '推演势力格局', role: '总策划' }],
    fields: [
      {
        k: 'table',
        id: 'maps',
        label: '地图分层（按卷推进）',
        cols: [
          { id: 'vol', label: '卷', grow: 1 },
          { id: 'place', label: '地图/舞台', grow: 2 },
          { id: 'class', label: '这一层的阶层特征', grow: 3 },
          { id: 'foe', label: '这一层的对手级别', grow: 2 },
        ],
      },
      {
        k: 'table',
        id: 'factions',
        label: '势力',
        cols: [
          { id: 'id', label: 'ID', grow: 1 },
          { id: 'name', label: '名称', grow: 2 },
          { id: 'want', label: '它想要的', grow: 3 },
          { id: 'fear', label: '它怕失去的', grow: 3 },
          { id: 'res', label: '手里的资源', grow: 2 },
          { id: 'face', label: '它的那张脸', grow: 2 },
        ],
      },
      { k: 'area', id: 'relation', label: '势力关系与直接冲突点', rows: 3 },
    ],
    gate: [
      { id: 'g1', text: '地图按卷分层，每层有对应的阶层与对手级别' },
      { id: 'g2', text: '每个势力都有"想要的"和"怕失去的"', auto: 'faction-want', hard: true },
      { id: 'g3', text: '每个势力有一张具体的脸' },
      { id: 'g4', text: '至少一组势力的欲望是直接冲突的' },
    ],
  },
  {
    id: 'c5-history',
    no: 15,
    layer: 'world',
    title: '历史与时间线',
    purpose: '当代格局是怎么来的。大伏笔与终局反转，多半挂在历史上。',
    why: '没有历史的世界只有现在，而只有现在的世界撑不起反转。 身世之谜、旧账、宿仇、被掩盖的真相——这些长线悬念全部需要一段可查的过去。同时，时间线是防"昨天重伤今天生龙活虎"的唯一工具。',
    how: [
      '写世界大事年表：三到五个塑造了当代格局的历史事件',
      '标出哪些事件是"官方说法"，哪些是真相——两者的差就是终局反转的空间',
      '写主角与反派的个人史，标出交汇点',
      '建当前时间轴：故事从哪天开始，每卷跨多长时间',
      '标出锁定项：哪些历史一旦写出就不能改',
    ],
    pitfalls: [
      '历史写成设定集，与主线毫无接口',
      '官方说法与真相完全一致，浪费了最大的反转资源',
      '不建当前时间轴，写到中期出现时序矛盾',
    ],
    output: '大事年表 + 官方说法/真相对照 + 当前时间轴',
    route: { archetypes: ['world', 'plot'] },
    needs: ['b7-concept'],
    view: 'generic',
    craft: ['c-suspense', 'c-writeback'],
    ai: [{ id: 'history', label: '推演世界史', role: '总策划', hint: '含官方说法与真相的差' }],
    fields: [
      {
        k: 'table',
        id: 'events',
        label: '大事年表',
        cols: [
          { id: 'when', label: '时间', grow: 1 },
          { id: 'what', label: '事件', grow: 3 },
          { id: 'official', label: '官方说法', grow: 3 },
          { id: 'truth', label: '真相', grow: 3 },
        ],
      },
      { k: 'area', id: 'hero_past', label: '主角个人史', rows: 3 },
      { k: 'area', id: 'villain_past', label: '反派个人史与交汇点', rows: 3 },
      { k: 'area', id: 'timeline', label: '当前时间轴', hint: '故事从哪天开始，每卷跨多久', rows: 2 },
    ],
    gate: [
      { id: 'g1', text: '至少一个历史事件的"官方说法"与"真相"不同', auto: 'history-gap', hard: true },
      { id: 'g2', text: '主角与反派的个人史有明确交汇点' },
      { id: 'g3', text: '当前时间轴已建立' },
      { id: 'g4', text: '不可改的历史已进锁定项' },
    ],
  },
  {
    id: 'c6-bible',
    no: 16,
    layer: 'world',
    title: '世界观圣经汇编',
    purpose: '把前面所有构建结果固化成写作时唯一可信的真相源，并用一个 NPC 的 24 小时验收。',
    why: '圣经是分层记忆的常驻层——它会进每一次生成。它写错一次，错误会在后面几百章里自我复制。"普通人的一天"是最便宜也最狠的验收：设定落不了地，一写就露馅。',
    how: [
      '汇总六件套、地图势力、资源、力量、金手指，去掉互相矛盾的地方',
      '拟术语表：≤7 个进前十章，一律"熟词+新义"构词',
      '写"普通人的一天"：一个具体 NPC 的 24 小时，全程不解释设定，只让设定从动作里渗出来',
      '写 200 字文风样例（这条会进常驻记忆，比十个形容词有用）',
      '列禁用词表',
    ],
    pitfalls: [
      '圣经写成百科全书，实际写作时没人查',
      '术语超过 7 个，读者在前十章就被术语淹没',
      '生造音译词，读者第一次见猜不出含义',
      '"普通人的一天"写成设定说明而不是场景',
    ],
    output: '《世界观圣经 v1》',
    route: { archetypes: ['world', 'power', 'plot'] },
    needs: ['c1-resource', 'c3-cheat', 'c4-geo'],
    view: 'generic',
    craft: ['c-five-questions', 'c-writeback'],
    ai: [
      { id: 'day', label: '写"普通人的一天"', role: '主笔作者' },
      { id: 'terms', label: '拟术语表', role: '总策划' },
    ],
    fields: [
      {
        k: 'table',
        id: 'terms',
        label: '术语表（≤7 个进前十章）',
        hint: '熟词+新义构词，第一次见能猜出七成含义',
        cols: [
          { id: 'term', label: '术语', grow: 1 },
          { id: 'mean', label: '含义', grow: 3 },
          { id: 'later', label: '哪一卷会翻出第二层含义', grow: 2 },
        ],
      },
      { k: 'area', id: 'day', label: '文明快照 · 普通人的一天', hint: '全程不解释设定，只让设定从动作里渗出来', rows: 6 },
      { k: 'area', id: 'style', label: '文风样例（200 字，进常驻记忆）', rows: 6 },
      { k: 'list', id: 'banned', label: '禁用词表' },
      { k: 'area', id: 'conflicts', label: '发现的设定冲突与裁决', rows: 2 },
    ],
    gate: [
      { id: 'g1', text: '"普通人的一天"写完且无违和', hard: true },
      { id: 'g2', text: '术语 ≤7 个，全部熟词+新义', auto: 'terms-limit' },
      { id: 'g3', text: '文风样例 200 字已写' },
      { id: 'g4', text: '各构建环节之间的冲突已裁决', hard: true },
    ],
  },

  // ══════════════════════════ D 人物与情感层 ══════════════════════════
  {
    id: 'd1-hero',
    no: 17,
    layer: 'cast',
    title: '主角设计',
    purpose: '主角必须与主线冲突结构性绑定。站位只有三种：局外人、内行人、执行者。',
    why: '主角可替换成任何人，这本书就没有存在的必要。站位决定了天然剧情、爽点形态和读者代入方式——它是人物设计里唯一不能含糊的决策。',
    how: [
      '选站位：那套压着他的结构管不住他（局外人）／他比所有人更早看懂它怎么运转（内行人）／他本身就是它的一部分、替它办事（执行者）',
      '写开局困境：必须由核心差异直接造成，且要数字化（还剩 3 天／欠 47 万／信用分 11）',
      '写双层动机：表层具体而小（救人、还债、活过这个月），深层中期觉醒。开局只给表层',
      '定对规则的态度（敬畏／戏耍／憎恨／利用）——这是人物弧光的坐标轴',
      '按频道校验：男频看果决与不吃亏，女频看主动权与独立目标',
      '写一句话人设——改编时不失真的那种',
    ],
    pitfalls: [
      '主角的惨与核心差异无关，反抗就指不向主线',
      '开局就给深层动机，读者代入不进去',
      '性格写得复杂纠结 —— 立体不等于纠结，主角要果决',
      '女频写成被动等待被拯救，男频写成圣母',
    ],
    output: '主角卡：站位 / 开局困境 / 双层动机 / 规则态度 / 一句话人设',
    route: { always: true },
    minViable: true,
    needs: ['b7-concept'],
    view: 'cast',
    craft: ['c-protagonist', 'c-channel'],
    ai: [{ id: 'hero', label: '生成主角卡', role: '人物导演' }],
    fields: [],
    gate: [
      { id: 'g1', text: '站位明确（局外人/内行人/执行者三选一）', auto: 'hero-stance', hard: true },
      { id: 'g2', text: '开局困境由核心差异造成，且数字化', hard: true },
      { id: 'g3', text: '双层动机：表层具体而小，深层中期觉醒', auto: 'hero-motive' },
      { id: 'g4', text: '对规则的态度已定' },
      { id: 'g5', text: '通过频道校验（男频果决不吃亏 / 女频主动权与独立目标）', hard: true },
      { id: 'g6', text: '一句话人设立得住' },
    ],
  },
  {
    id: 'd2-villain',
    no: 18,
    layer: 'cast',
    title: '反派体系',
    purpose: '反派的强度决定爽点的高度。 这不是一句修辞，是设计约束。',
    why: '主角打赢一个纸片人不会爽。反派体系是长篇最容易塌的地方：终极反派动机不成立、中层反派全是脸谱、反派从头输到尾。而反派也需要阶段性胜利——不然读者不信这个世界有威胁。',
    how: [
      '先定终极反派：他要什么？他的做法在他自己的逻辑里是不是成立的？他与主角是不是镜像（同样的处境走了另一条路）？',
      '排反派梯队：级别递增，每级对应主角的一个成长阶段',
      '给每个反派一次胜利：他赢过主角一次，读者才会怕他',
      '写清代价转嫁链：谁把代价转给了谁，链的终点就是终极反派的罪证',
      '避免降智：每个反派的每次行动都要符合他自己的利益逻辑',
    ],
    pitfalls: [
      '终极反派动机是"他就是坏"',
      '反派全程失败，威胁感为零',
      '为了推进剧情让反派降智——这是读者最恨的单点故障',
      '反派梯队级别不递增，打完城主打恶霸',
    ],
    output: '终极反派卡 + 反派梯队 + 代价转嫁链',
    route: { always: true },
    needs: ['d1-hero'],
    view: 'cast',
    craft: ['c-villain', 'c-protagonist'],
    ai: [{ id: 'villain', label: '设计反派体系', role: '人物导演', hint: '含终极反派动机、梯队与各自的胜利' }],
    fields: [],
    gate: [
      { id: 'g1', text: '终极反派的动机在他自己的逻辑里成立', hard: true },
      { id: 'g2', text: '反派梯队级别递增，与主角成长阶段对应' },
      // 只统计人数：系统能判"有没有真的建档"，判不了"赢得够不够漂亮"，后者留给 g3
      { id: 'g6', text: '反派梯队已经建档进人物表', auto: 'villain-win' },
      { id: 'g3', text: '每个主要反派都有一次赢过主角的时刻', hard: true },
      { id: 'g4', text: '代价转嫁链画出来了，终点是终极反派的罪证' },
      { id: 'g5', text: '没有任何一处需要反派降智才能推进', hard: true },
    ],
  },
  {
    id: 'd3-cast',
    no: 19,
    layer: 'cast',
    title: '配角与群像',
    purpose: '配角是爽点工程的基础设施（见证者密度）与阵营的人格化。',
    why: '打脸必须有观众——配角的震惊、对手的崩溃、公众的哗然是爽感的放大器。没有见证者，再大的兑现也是空转。而三件套填完之后，配角在任何场景的反应都可推导，这是防 OOC 的本体。',
    how: [
      '每个阵营至少一张脸：可被打的脸、可被救的人，各要具体人物',
      '每个配角填三件套：一个欲望、一个软肋、一个与主角的资源关系',
      '排打脸链前 10 张脸，级别递增，每 20-30 章消耗一张',
      '标出功能位：见证者／助力者／绊脚石／镜像／情报源',
      '女频额外排群像关系：闺蜜／对手／长辈／旧人各自的功能',
    ],
    pitfalls: [
      '打脸对象是无名路人，读者没有情绪投射',
      '配角三件套不填，写到中期人物行为开始飘',
      '配角太多，读者记不住谁是谁',
      '功能位重复，几个配角干同一件事',
    ],
    output: '配角档案 + 前 10 张脸 + 功能位分配',
    route: { always: true },
    needs: ['d1-hero'],
    view: 'cast',
    craft: ['c-protagonist'],
    ai: [{ id: 'faces', label: '排前 10 张脸', role: '总策划' }],
    fields: [],
    gate: [
      { id: 'g1', text: '每个阵营至少一张脸', hard: true },
      { id: 'g2', text: '配角三件套填齐（欲望/软肋/资源关系）', auto: 'cast-triple', hard: true },
      { id: 'g3', text: '前 10 张脸排好，级别递增', auto: 'faces-ten' },
      { id: 'g4', text: '功能位无重复' },
    ],
  },
  {
    id: 'd4-relation',
    no: 20,
    layer: 'cast',
    title: '关系网与情感线',
    purpose: '女频这是主轴，男频这是留存抓手。两种情况下它都不该是想到哪写到哪。',
    why: '女频的情感线长期停滞＝掉追读，这是硬指标不是感觉。男频的情感线一旦挤压主线也会掉数据。两边都需要排期，只是权重不同。 而关系网决定了每个场景里"谁在场会让这一幕更有张力"。',
    how: [
      '画关系网：每条关系标出性质（同盟/敌对/亏欠/暧昧/血缘）与当前强度',
      '排情感节拍：试探 → 靠近 → 误解或危机 → 确认 → 共同对外，标到章',
      '女频：每 5-8 章必须有一次关系状态的变化（靠近／退后／确认／裂痕）',
      '男频：单章感情戏占比不超过三成，且必须同时推进主线或人物',
      '定关系的不可逆节点：哪一步走了就回不去（表白/背叛/生死）',
      '按频道雷区自查：误会流不超 3 章、越界行为不美化、女主不为爱放弃目标',
    ],
    pitfalls: [
      '误会流拖太久 —— 女频头号弃书点',
      '情感进展全靠外部事件推动，两个人自己不做选择',
      '男频把感情线当奖励发放，人物变成道具',
      '关系网只有主角与他人的连线，配角之间毫无关系',
    ],
    output: '关系网 + 情感节拍排期表',
    route: { channels: ['女频'], archetypes: ['people'] },
    needs: ['d3-cast'],
    view: 'generic',
    craft: ['c-romance', 'c-channel'],
    ai: [{ id: 'arc', label: '排情感节拍', role: '人物导演', hint: '按频道模板排到章' }],
    fields: [
      {
        k: 'table',
        id: 'net',
        label: '关系网',
        cols: [
          { id: 'a', label: '甲', grow: 1 },
          { id: 'b', label: '乙', grow: 1 },
          { id: 'kind', label: '性质', grow: 1 },
          { id: 'now', label: '当前强度/状态', grow: 2 },
          { id: 'arc', label: '会怎么变', grow: 3 },
        ],
      },
      {
        k: 'table',
        id: 'beats',
        label: '情感节拍排期',
        hint: '女频：每 5-8 章必须有一次关系状态变化',
        cols: [
          { id: 'ch', label: '章', grow: 1 },
          { id: 'beat', label: '节拍', grow: 2 },
          { id: 'what', label: '发生什么', grow: 4 },
          { id: 'main', label: '同时推进了主线的什么', grow: 3 },
        ],
      },
      { k: 'area', id: 'irreversible', label: '不可逆节点', hint: '走了就回不去的那几步', rows: 2 },
      {
        k: 'flags',
        id: 'check',
        label: '频道雷区自查',
        items: [
          { id: 'misunderstand', label: '误会不超过 3 章' },
          { id: 'boundary', label: '越界行为没有被美化' },
          { id: 'agency', label: '女主保有主动权，有独立于感情的目标' },
          { id: 'squeeze', label: '（男频）感情戏未挤压主线' },
        ],
      },
    ],
    gate: [
      { id: 'g1', text: '情感节拍已排到章，不是"到时候再说"', auto: 'romance-beats', hard: true },
      { id: 'g2', text: '每个情感节拍都同时推进了主线或人物' },
      { id: 'g3', text: '频道雷区自查四项全过', hard: true },
      { id: 'g4', text: '关系网里配角之间也有连线，不是全部辐射向主角' },
    ],
  },
  {
    id: 'd5-voice',
    no: 21,
    layer: 'cast',
    title: '人物声音与对话',
    purpose: '把人名遮住，读者还能认出这句话是谁说的——这是人物写成立了的判据。',
    why: '网文对话占比极高，而 AI 生成最容易犯的错就是所有人一个腔调。声音区分度是防 OOC 的第一道防线，也是"人物立不立得住"最可操作的检验标准。',
    how: [
      '每个主要人物定三件事：句长习惯、口头禅或语气词、拒绝时的说法',
      '写声音样例：同一个情境下，让三个人各说一句，看能不能区分',
      '定信息密度：谁说话直给，谁说话绕，谁不说只做',
      '标出对白禁区：这个人绝不会说的话',
      '定期做遮名测试：抽一段对白遮掉人名，自己能不能认出',
    ],
    pitfalls: [
      '所有人都说标准书面语',
      '口癖设计成一个词反复出现，变成标签而不是声音',
      '人物在不同场合的语气完全不变——真实的人对不同对象说话方式不同',
    ],
    output: '人物声音卡 + 对白样例 + 遮名测试记录',
    route: { archetypes: ['people'], channels: ['女频'] },
    needs: ['d3-cast'],
    view: 'generic',
    craft: ['c-voice'],
    ai: [{ id: 'voice', label: '生成声音样例', role: '人物导演', hint: '同一情境下让几个人各说一句' }],
    fields: [
      {
        k: 'table',
        id: 'voices',
        label: '声音卡',
        cols: [
          { id: 'who', label: '人物', grow: 1 },
          { id: 'len', label: '句长习惯', grow: 1 },
          { id: 'tic', label: '语气/口头禅', grow: 2 },
          { id: 'refuse', label: '拒绝时怎么说', grow: 2 },
          { id: 'never', label: '绝不会说的话', grow: 2 },
        ],
      },
      { k: 'area', id: 'sample', label: '同情境对白样例', hint: '同一句话，三个人分别怎么说', rows: 5 },
      { k: 'area', id: 'blind', label: '遮名测试记录', rows: 2 },
    ],
    gate: [
      { id: 'g1', text: '主要人物都有声音卡', hard: true },
      { id: 'g2', text: '遮名测试通过：遮掉人名能认出是谁在说', hard: true },
      { id: 'g3', text: '每个人都有"绝不会说的话"' },
    ],
  },

  // ══════════════════════════ E 叙事设计层 ══════════════════════════
  {
    id: 'e1-pov',
    no: 22,
    layer: 'narrative',
    title: '视角与人称',
    purpose: '动笔前必须定死，定错要推倒重写。 这是全书最贵的一个决策。',
    why: '视角决定读者能知道什么、什么时候知道——它直接决定了悬念怎么埋、反转怎么揭、信息差怎么用。写到三十万字才发现视角选错，没有别的办法，只能重写。',
    how: [
      '定人称：第三人称是网文默认；第一人称代入强但信息受限，悬疑与女频用得多',
      '定视角数：单视角（信息控制最强，悬念最好埋）／双视角（男女频情感线常用）／多视角（群像与权谋需要）',
      '定叙事距离：贴着主角写内心，还是拉开一点只写行为——这决定了读者是"成为他"还是"看着他"',
      '定视角切换纪律：什么时候可以切、以什么为单位切（章／幕／绝不切）',
      '定信息权限：读者能不能知道主角不知道的事？这一条决定了你能不能用戏剧性反讽',
    ],
    pitfalls: [
      '视角随手切，读者不知道现在站在谁的肩膀上',
      '单视角却需要写主角不在场的关键事件，只能靠转述，张力全失',
      '第一人称却要写群像，写到中期无法继续',
      '没定信息权限，写着写着读者比主角知道得多，悬念全废',
    ],
    output: '视角决策卡 + 切换纪律',
    route: { always: true },
    minViable: true,
    needs: ['d1-hero'],
    view: 'generic',
    craft: ['c-pov'],
    ai: [{ id: 'pov', label: '视角方案对比', role: '总策划', hint: '给 2-3 个方案与各自的代价' }],
    fields: [
      { k: 'select', id: 'person', label: '人称', options: ['第三人称', '第一人称', '第三人称为主+第一人称插叙'] },
      { k: 'select', id: 'count', label: '视角数', options: ['单视角', '双视角', '多视角（≤4）', '群像多视角'] },
      { k: 'select', id: 'distance', label: '叙事距离', options: ['贴身（写内心）', '中距（写行为+少量内心）', '远距（只写行为）'] },
      { k: 'area', id: 'switch', label: '切换纪律', hint: '什么时候可以切、以什么为单位切', rows: 2 },
      { k: 'area', id: 'info', label: '信息权限', hint: '读者能不能知道主角不知道的事', rows: 2 },
      { k: 'area', id: 'cost', label: '这个选择的代价', hint: '每个视角方案都有它写不了的东西，提前认下', rows: 2 },
    ],
    gate: [
      { id: 'g1', text: '人称、视角数、叙事距离三项都已定死', auto: 'pov-locked', hard: true },
      { id: 'g2', text: '切换纪律写清，不是"看情况"', hard: true },
      { id: 'g3', text: '信息权限已定（决定能不能用戏剧性反讽）', hard: true },
      { id: 'g4', text: '这个方案的代价已认下：确认主线的关键事件都在视角能覆盖的范围内', hard: true },
    ],
  },
  {
    id: 'e2-style',
    no: 23,
    layer: 'narrative',
    title: '文风与语感',
    purpose: '样例优于形容。给 200 字样例，胜过十个形容词。',
    why: '文风是唯一能被 AI 学走也最容易被 AI 抹平的东西。不给样例，生成出来的就是训练分布的均值——那正是"AI 味"的定义。样例是常驻记忆里最重要的一项。',
    how: [
      '写 200 字样例，写你这本书最典型的一段（不是最好的一段，是最典型的）',
      '定句长节奏：短句为主还是长短交错；对白与叙述的比例',
      '定描写密度：环境给几笔、内心给几笔、动作给几笔',
      '定情绪表达方式：直接写情绪，还是只写动作让读者自己感受',
      '列禁用词：把你自己容易滑向的套话写进去',
    ],
    pitfalls: [
      '用形容词描述文风（"爽快利落"）而不给样例',
      '样例写成了最用力的一段，导致全书被迫维持高热度',
      '禁用词表只抄通用的，没有针对自己的坏习惯',
    ],
    output: '200 字文风样例 + 语感参数 + 禁用词表',
    route: { always: true },
    minViable: true,
    needs: ['e1-pov'],
    view: 'generic',
    craft: ['p-prompt', 'c-poison'],
    ai: [{ id: 'style', label: '按样例扩写一段', role: '主笔作者', hint: '验证样例够不够定住语感' }],
    fields: [
      { k: 'area', id: 'sample', label: '文风样例（200 字，最典型的一段）', rows: 8 },
      { k: 'select', id: 'rhythm', label: '句长节奏', options: ['短句为主', '长短交错', '长句为主'] },
      { k: 'text', id: 'ratio', label: '对白 : 叙述 比例' },
      { k: 'area', id: 'density', label: '描写密度', hint: '环境/内心/动作各给几笔', rows: 2 },
      { k: 'select', id: 'emotion', label: '情绪表达', options: ['直接写情绪', '写动作让读者自己感受', '两者交替'] },
      { k: 'list', id: 'banned', label: '禁用词（含你自己的坏习惯）' },
    ],
    gate: [
      { id: 'g1', text: '200 字样例已写，且是最典型而非最用力的一段', auto: 'style-sample', hard: true },
      { id: 'g2', text: '语感参数已定（句长/比例/密度/情绪）' },
      { id: 'g3', text: '禁用词表包含针对自己坏习惯的条目' },
    ],
  },
  {
    id: 'e3-lines',
    no: 24,
    layer: 'narrative',
    title: '叙事结构与多线',
    purpose: '主线之外还有几条线？它们在哪里交汇？',
    why: '长篇不可能单线到底——读者会累，主角也不可能一直在同一件事上。但线一多就容易失焦。多线设计的本质是排布交汇点：两条线交汇的地方就是高潮。',
    how: [
      '列出所有线：主线 + 副线（感情／事业／复仇／群像／解谜）',
      '每条线写清：它的目标是什么、谁在推动、什么时候起什么时候收',
      '排交汇点：哪两条线在第几卷交汇，交汇产生什么',
      '定权重：每条线占多少篇幅，主线不得低于六成',
      '定切换节奏：多久切一次线，切线时用什么方式过渡',
    ],
    pitfalls: [
      '副线自己走自己的，从不与主线交汇 —— 那不是副线，是另一本书',
      '副线权重失控，读者忘了主线是什么',
      '线太多（>3 条），每条都推不动',
      '切线过于频繁，每条线都断在半路',
    ],
    output: '线路表 + 交汇点排期 + 权重分配',
    route: { archetypes: ['plot', 'people'], venues: ['qidian', 'qdmm', 'hongxiu', 'yunqi', 'jjwxc', 'zongheng'] },
    needs: ['e1-pov'],
    view: 'generic',
    craft: ['c-lines', 'c-reveal'],
    ai: [{ id: 'lines', label: '设计多线与交汇点', role: '总策划' }],
    fields: [
      {
        k: 'table',
        id: 'lines',
        label: '线路表',
        cols: [
          { id: 'name', label: '线', grow: 2 },
          { id: 'goal', label: '目标', grow: 3 },
          { id: 'driver', label: '谁在推动', grow: 2 },
          { id: 'span', label: '起于/收于', grow: 2 },
          { id: 'weight', label: '篇幅权重', grow: 1 },
        ],
      },
      {
        k: 'table',
        id: 'cross',
        label: '交汇点',
        hint: '两条线交汇的地方就是高潮',
        cols: [
          { id: 'where', label: '卷/章', grow: 1 },
          { id: 'which', label: '哪两条线', grow: 2 },
          { id: 'what', label: '交汇产生什么', grow: 4 },
        ],
      },
      { k: 'area', id: 'switch', label: '切线节奏与过渡方式', rows: 2 },
    ],
    gate: [
      { id: 'g1', text: '每条副线都有与主线的交汇点', hard: true },
      { id: 'g2', text: '主线权重 ≥60%', hard: true },
      { id: 'g3', text: '线数 ≤3 条（主线+2）', auto: 'lines-weight' },
      { id: 'g4', text: '每条线都写清了起点与终点' },
    ],
  },
  {
    id: 'e4-opening',
    no: 25,
    layer: 'narrative',
    title: '开篇方案竞选',
    purpose: '开篇要写 3-5 个版本挑，不是一次写成。这是全书投入产出比最高的地方。',
    why: '前三章（走订阅的前 5-8 章）决定这本书的天花板，而它同时是唯一可以低成本反复重写的部分——正文才三章，改起来便宜；等写到五十万字再回头改，代价高一个数量级。黄金三章是投放素材，不是文物。',
    how: [
      '按黄金三章清单，为每章列出必须完成的动作',
      '写 3-5 个不同切入方式的第一章开头（各 500 字即可）：从危机切／从悬念切／从能力切／从信息差切／从身份切',
      '让没看过设定的人读，问三件事：想不想看下去、记住了什么、有没有看不懂的地方',
      '选定后把完整三章写出来，再过一次门禁',
      '发布后按数据继续改——这三章是可以反复重写的',
    ],
    pitfalls: [
      '只写一版就定稿',
      '开篇塞设定：第一章讲世界观是最经典的死法',
      '第一章的钩子来自作者知道的信息而不是读者能感受到的张力',
      '主角在第一章不出场，或配角先于主角出场',
    ],
    output: '开篇 3-5 版候选 + 定稿的黄金三章',
    route: { always: true },
    needs: ['e2-style', 'f1-outline'],
    view: 'generic',
    craft: ['c-golden3', 'c-hooks', 'c-opening'],
    ai: [{ id: 'variants', label: '生成开篇候选', role: '主笔作者', hint: '五种切入方式各写 500 字' }],
    fields: [
      { k: 'text', id: 'cut', label: '开场切口', hint: '谁 ｜ 在哪 ｜ 握着什么 ｜ 做什么' },
      {
        k: 'table',
        id: 'variants',
        label: '开篇候选',
        cols: [
          { id: 'way', label: '切入方式', grow: 1 },
          { id: 'text', label: '开头 500 字', grow: 5 },
          { id: 'test', label: '试读反馈', grow: 2 },
        ],
      },
      { k: 'select', id: 'chosen', label: '选定方案', options: ['危机切入', '悬念切入', '能力切入', '信息差切入', '身份切入'] },
      { k: 'area', id: 'ch1', label: '第 1 章动作清单核对', hint: '主角困境亮相 / 数字化困境 / 章尾钩子 / 无禁忌项', rows: 3 },
      { k: 'area', id: 'ch2', label: '第 2 章动作清单核对', hint: '金手指同源激活 / 代价暗示 / 微小但具体的翻盘', rows: 3 },
      { k: 'area', id: 'ch3', label: '第 3 章动作清单核对', hint: '完整爽点闭环 / 卷级悬念 / 指向更大舞台', rows: 3 },
    ],
    gate: [
      { id: 'g1', text: '写了 ≥3 个不同切入方式的候选', auto: 'opening-variants', hard: true },
      { id: 'g2', text: '有真实试读反馈（不是自我评估）', hard: true },
      { id: 'g3', text: '第 1 章：核心差异在前 300 字以具体场景亮相', hard: true },
      { id: 'g4', text: '第 1 章：主角出场即处于数字化的具体困境', hard: true },
      { id: 'g5', text: '第 2 章：金手指与核心差异同源，且完成一次微小具体的翻盘' },
      { id: 'g6', text: '第 3 章：一个完整的爽点闭环（蓄能→兑现→见证）' },
      { id: 'g7', text: '三章内无禁忌项（大段设定/回忆童年/配角先出场/章末平淡）', hard: true },
    ],
  },

  // ══════════════════════════ F 结构层 ══════════════════════════
  {
    id: 'f1-outline',
    no: 26,
    layer: 'structure',
    title: '总纲 · 四层揭露',
    purpose: '全书主轴 = 核心差异的逐层揭露。规则守恒：终卷的一切在第一卷已有种子。',
    why: '烂尾的本质是规则超发——后期不断加新设定救场，读者手里的"旧理解"贬值。四层揭露是防超发的结构：不加新东西，只是把已有的东西揭开更深一层。',
    how: [
      '排四层：表层规则 → 隐藏结构 → 规则的管理员 → 元规则，各分配卷数',
      '每层写清：揭露什么、主角在哪一轨、本层最大的爽点、读者的新认知',
      '与力量三轨对齐：爬等级 / 争权限 / 立法权',
      '指出第一卷里哪几个细节是终局的种子——这是规则守恒的检验',
      '写主线一句话，任何时候都要能说清主角现在要干嘛',
    ],
    pitfalls: [
      '四层之间没有递进，只是换了对手',
      '终局要素在第一卷没有任何种子，读者觉得是硬加的',
      '主线一句话说不清 —— 那读者更说不清',
    ],
    output: '《全书大纲 v1》骨架',
    route: { always: true },
    needs: ['d2-villain', 'c3-cheat'],
    view: 'generic',
    craft: ['c-reveal', 'c-longform'],
    ai: [{ id: 'arc', label: '生成四层揭露分配', role: '总策划' }],
    fields: [
      { k: 'text', id: 'mainline', label: '主线一句话' },
      { k: 'area', id: 'ending', label: '结局方向', rows: 2 },
      { k: 'area', id: 'l1', label: 'L1 表层规则', hint: '学会在新规则下生存并初次套利｜读者："这设定真爽"', rows: 2 },
      { k: 'area', id: 'l2', label: 'L2 隐藏结构', hint: '发现例外、漏洞、维护成本｜读者："原来还有内幕"', rows: 2 },
      { k: 'area', id: 'l3', label: 'L3 规则的管理员', hint: '与发牌照者博弈｜读者："格局打开了"', rows: 2 },
      { k: 'area', id: 'l4', label: 'L4 元规则', hint: '改写规则本身｜读者："居然能圆回来"', rows: 2 },
      { k: 'area', id: 'seeds', label: '第一卷里的终局种子', hint: '规则守恒的检验：指得出来才算过', rows: 3 },
    ],
    gate: [
      { id: 'g1', text: '主线一句话说得清', hard: true },
      { id: 'g2', text: '四层各有卷级分配，且与力量三轨对齐' },
      { id: 'g3', text: '指得出第一卷里的终局种子', auto: 'seeds-bloom', hard: true },
      { id: 'g4', text: '每一层都是"揭开更深一层"，不是"换个对手"' },
    ],
  },
  {
    id: 'f2-volume',
    no: 27,
    layer: 'structure',
    title: '卷纲',
    purpose: '每卷是一个完整闭环，同时也是一个可独立改编的单元。',
    why: '卷是读者感知"这本书在往前走"的最小单位。卷与卷之间没有递进，读者就会觉得原地打转——这是中期弃书的主因。',
    how: [
      '每卷按模板走：卷首新地图或新阶层 → 本卷核心差异展示 → 主角建立局部优势 → 中段危机（代价清算或身份暴露）→ 卷尾大爽点 + 下一层钩子',
      '写清单卷目标、核心冲突、卷末大高潮',
      '标出这一卷属于四层揭露的哪一层、力量的哪一轨',
      '指出这一卷里可独立成篇的那个闭环（改编接口）',
    ],
    pitfalls: [
      '卷目标写成"主角继续变强"，没有具体的得与失',
      '卷末草草收尾，没有大高潮',
      '每卷结构雷同，读者产生疲劳',
    ],
    output: '各卷卷纲',
    route: { always: true },
    needs: ['f1-outline'],
    view: 'volumes',
    craft: ['c-reveal'],
    ai: [{ id: 'vol', label: '细化本卷卷纲', role: '总策划' }],
    fields: [],
    gate: [
      { id: 'g1', text: '每卷有明确目标与升级，卷间递进不原地打转', auto: 'volume-goal', hard: true },
      { id: 'g2', text: '卷末有足够大的高潮' },
      { id: 'g3', text: '卷模板五段齐全' },
      { id: 'g4', text: '每卷指出了可独立成篇的闭环' },
      // 这条判据要同时有等级表和卷数才算得出来，所以挂在卷纲这一步，不挂在更早的 c2-power
      { id: 'g5', text: '力量等级密度与卷数匹配（≈ 卷数 × 1.5）', auto: 'power-count' },
    ],
  },
  {
    id: 'f3-threads',
    no: 28,
    layer: 'structure',
    title: '悬念与伏笔账本',
    purpose: '长篇悬念用记账法管理，防"挖坑不填"。',
    why: '挖坑不填是老读者的头号差评来源。而伏笔是长篇的复利——好的回收让读者"原来如此"，这是追读黏性最强的来源。不记账就必然忘。',
    how: [
      '开户 10-15 条，三层配比：章级 70% / 卷级 25% / 书级 1-3 条',
      '每条必填：内容 / 读者可见线索 / 真相 / 埋设章 / 计划回收章',
      '书级悬念标注每卷的露头方式（不露头，回收时读者已无记忆）',
      '每卷末对账：逾期未收要上报',
    ],
    pitfalls: [
      '埋了但没记计划回收章',
      '书级悬念超过 3 条，读者记不住',
      '回收生硬，靠"其实我没告诉你"制造反转 —— 这是欺骗读者',
      '长线伏笔从不强化，回收时读者已经忘了',
    ],
    output: '悬念/伏笔账本（初始 10-15 条）',
    route: { always: true },
    needs: ['f1-outline'],
    view: 'threads',
    craft: ['c-suspense'],
    ai: [{ id: 'seed', label: '生成初始账本', role: '总策划' }],
    fields: [],
    gate: [
      { id: 'g1', text: '账本开户 10-15 条，书级悬念 1-3 个', auto: 'threads-open', hard: true },
      { id: 'g2', text: '三层配比大致 70/25/5' },
      { id: 'g3', text: '每条都有计划回收章', auto: 'threads-plan', hard: true },
      { id: 'g4', text: '书级悬念标注了每卷的露头方式' },
    ],
  },
  {
    id: 'f4-beats',
    no: 29,
    layer: 'structure',
    title: '事件线与爽点排期',
    purpose: '大纲只写到"事件"粒度。排期自检看总量会漏，必须看最大间隔。',
    why: '爽点总量达标不等于分布达标——低谷藏在两个中爽之间，而读者是在低谷处弃书的。间隔自检是唯一能提前发现它的方法。',
    how: [
      '每章一行：事件（谁做了什么、导致什么）｜节拍｜钩子型号｜埋收伏笔',
      '按平台×频道的节奏模板排爽点密度',
      '扫最大间隔：两个中爽及以上之间空了几章，超红线就插微型兑现或前移后续爽点',
      '扫钩子型号：连续 3 章同型要调开',
      '扫打脸链：超过 30 章没有新的脸就提前引入',
      '女频额外扫情感节拍：每 5-8 章有没有关系状态变化',
    ],
    pitfalls: [
      '写成场景细节，事件线失去调整的灵活性',
      '只数总量不看间隔',
      '钩子型号全填危机钩，读者对威胁脱敏',
    ],
    output: '逐章事件线 + 爽点排期',
    route: { always: true },
    needs: ['f2-volume', 'f3-threads'],
    view: 'beats',
    craft: ['c-climax', 'c-hooks'],
    ai: [{ id: 'line', label: '生成本卷事件线', role: '架构师' }],
    fields: [],
    gate: [
      { id: 'g1', text: '事件线到"谁做了什么、导致什么"粒度' },
      { id: 'g2', text: '爽点排期达标（按平台×频道模板）' },
      { id: 'g3', text: '最大间隔自检通过', auto: 'beat-gap', hard: true },
      { id: 'g4', text: '钩子无连续 3 章同型', auto: 'hook-variety' },
      { id: 'g5', text: '打脸链无断档（>30 章没有新的脸即红线）', auto: 'face-streak' },
      { id: 'g6', text: '（女频）情感节拍无长期停滞' },
      { id: 'g7', text: '悬念埋揭点已标注到章' },
    ],
  },
  {
    id: 'f5-climax',
    no: 30,
    layer: 'structure',
    title: '高潮与卷末设计',
    purpose: '卷末大高潮是拉数据的节点，也是读者决定要不要追下一卷的地方。',
    why: '高潮不是"打一场更大的架"。真正的高潮是多条线在同一时刻汇聚 + 赌注升到最高 + 主角必须付出真实代价。设计不好，卷末就是虎头蛇尾，追读断在这里。',
    how: [
      '定汇聚：哪几条线在这里交汇（至少两条）',
      '定赌注：这一战输了会失去什么——必须是读者在意的东西',
      '定代价：主角赢了要付出什么，赢得毫无损失就没有重量',
      '定反转层数：一层反转是标配，两层是好，三层容易失控',
      '定见证者：谁在场看着这一切',
      '定钩子：高潮结束后立刻给出下一层的钩子，不给读者喘息期离开',
    ],
    pitfalls: [
      '高潮只有战力对比，没有情感或格局的赌注',
      '主角赢得毫发无伤',
      '高潮写完就收卷，没有给下一卷的钩子',
      '反转叠太多，读者跟不上',
    ],
    output: '各卷高潮设计卡',
    route: { always: true },
    needs: ['f4-beats'],
    view: 'generic',
    craft: ['c-climax', 'c-reveal'],
    ai: [{ id: 'climax', label: '设计卷末高潮', role: '总策划' }],
    fields: [
      {
        k: 'table',
        id: 'climaxes',
        label: '高潮设计',
        cols: [
          { id: 'vol', label: '卷', grow: 1 },
          { id: 'converge', label: '哪几条线汇聚', grow: 2 },
          { id: 'stake', label: '赌注（输了失去什么）', grow: 3 },
          { id: 'price', label: '赢的代价', grow: 2 },
          { id: 'twist', label: '反转层', grow: 2 },
          { id: 'witness', label: '见证者', grow: 1 },
          { id: 'hook', label: '卷末钩子', grow: 2 },
        ],
      },
    ],
    gate: [
      { id: 'g1', text: '每个高潮至少两条线汇聚', auto: 'climax-converge', hard: true },
      { id: 'g2', text: '赌注是读者在意的东西，不只是战力对比', hard: true },
      { id: 'g3', text: '主角赢得有代价' },
      { id: 'g4', text: '高潮后立刻给出下一层钩子', hard: true },
    ],
  },
  {
    id: 'f6-scene',
    no: 31,
    layer: 'structure',
    title: '场景设计',
    purpose: '事件线与正文之间还缺一层：场景。场景是叙事的最小单元。',
    why: '从"事件"直接跳到"正文"，是写作时最常卡住的地方——你知道要发生什么，但不知道从哪一句开始写。场景层解决的就是这个：一个事件拆成 2-3 个场景，每个场景有明确的进入点、转折点和退出点。',
    how: [
      '把一章的核心事件拆成 2-3 个场景',
      '每个场景定五件事：谁在场 / 在哪 / 各自想要什么 / 什么发生了变化 / 从哪句进、到哪句出',
      '标出场景的功能：推进／揭露／蓄能／兑现／过渡',
      '检查每个场景的进入点：能不能在两句话内进入冲突',
      '检查退出点：这个场景结束时，局势与进来时相比变了什么',
    ],
    pitfalls: [
      '场景没有变化 —— 进来和出去时局势一样，这个场景就该删',
      '进入点太远，铺垫半页才进冲突',
      '一章塞四五个场景，每个都没展开',
      '场景里所有人都只想要同一件事，没有张力',
    ],
    output: '章级场景表',
    route: { archetypes: ['people', 'plot', 'slice'] },
    needs: ['f4-beats'],
    view: 'generic',
    craft: ['c-scene', 'c-chapter'],
    ai: [{ id: 'scene', label: '拆场景', role: '总策划', hint: '把本章事件拆成 2-3 个场景' }],
    fields: [
      {
        k: 'table',
        id: 'scenes',
        label: '场景表',
        cols: [
          { id: 'ch', label: '章', grow: 1 },
          { id: 'who', label: '谁在场', grow: 2 },
          { id: 'where', label: '在哪', grow: 1 },
          { id: 'want', label: '各自想要什么', grow: 3 },
          { id: 'change', label: '什么变了', grow: 3 },
          { id: 'inout', label: '进入点 / 退出点', grow: 2 },
          { id: 'fn', label: '功能', grow: 1 },
        ],
      },
    ],
    gate: [
      { id: 'g1', text: '每个场景都有明确的"什么变了"', auto: 'scene-change', hard: true },
      { id: 'g2', text: '进入点能在两句话内进入冲突' },
      { id: 'g3', text: '单章场景数 ≤3' },
      { id: 'g4', text: '场景里至少两个人想要的东西不同' },
    ],
  },

  // ══════════════════════════ G 生产层 ══════════════════════════
  {
    id: 'g1-brief',
    no: 32,
    layer: 'produce',
    title: '章节规划',
    purpose: '章级 brief 五行：场景 / 人物 / 核心事件 / 反转 / 钩子型号。人写，不外包。',
    why: 'brief 是人对这一章的唯一控制点。brief 含糊，后面无论谁来写都会跑偏；brief 精确，即使是 AI 初稿也八九不离十。约束优于指令。',
    how: [
      '从事件线取本章事件，补上场景与出场人物',
      '定本章的一次小反转（信息／立场／局势三选一）',
      '定钩子型号，核对与前两章不同型',
      '标出本章要埋/收的伏笔',
      '一句话写清"读者这一章会知道什么新的"',
    ],
    pitfalls: [
      'brief 写成"主角与 A 对峙"这种没有信息量的话',
      '不定钩子型号，写到最后随手收尾',
      '一章塞两件事',
    ],
    output: '章 brief（进本章生成的一次性记忆）',
    route: { always: true },
    needs: ['f4-beats'],
    view: 'write',
    craft: ['c-chapter', 'c-hooks'],
    fields: [],
    gate: [
      { id: 'g1', text: '本章有推进、有冲突、有爽点、有钩子' },
      { id: 'g2', text: '钩子型号与前 2 章不同型', hard: true },
      { id: 'g3', text: '一章一事' },
      { id: 'g4', text: '信息增量能一句话说清', hard: true },
    ],
  },
  {
    id: 'g2-draft',
    no: 33,
    layer: 'produce',
    title: '正文生成',
    purpose: '分层记忆 + brief → 初稿。一次只写一章。关键章多写几版。',
    why: '生成是采样，质量有方差。同一个 brief 跑三次，一次惊艳一次平庸一次跑偏——这不是 bug 是本性。用方差，而不是忍受方差：黄金三章和卷尾大爽点应该多路采样取优。',
    how: [
      '确认注入的记忆层完整：圣经、世界状态、出场人物、近三章摘要、本章 brief',
      '普通章一次生成；关键章生成 2-3 版，选骨架最好的一版再精修',
      '生成后先不读细节，先核对：核心事件对不对、反转在不在、钩子型号对不对',
      '字数不在区间的，按"只补信息密度"扩写，绝不加纯气氛',
    ],
    pitfalls: [
      '一次生成多章 —— 又超长又难审校难回写',
      '关键章也只跑一版，把运气当质量',
      '字数不够时加环境描写凑数',
    ],
    output: '正文初稿',
    route: { always: true },
    needs: ['g1-brief'],
    view: 'write',
    craft: ['c-memory', 'c-pipeline', 'c-chapter'],
    fields: [],
    gate: [
      { id: 'g1', text: '字数在平台区间内', auto: 'chapter-words', hard: true },
      { id: 'g2', text: '三幕比例大致 10/70/20，开头两句内回到冲突' },
      { id: 'g3', text: '核心事件、反转、钩子型号与 brief 一致', hard: true },
      { id: 'g4', text: '（关键章）生成了 ≥2 版并择优' },
    ],
  },
  {
    id: 'g3-polish',
    no: 34,
    layer: 'produce',
    title: '人工润色',
    purpose: '关键 20% 必须人工过手。这是整本书的灵魂税，不可豁免。',
    why: 'AI 会把输出拉回训练分布的均值：情绪趋中、用词趋同、冲突趋缓。而爆款活在分布的尾部。AI 负责"对"，人负责"过分"——不够狠的打脸台词、不够钩的章尾，只有人能拉出来。',
    how: [
      '打脸/兑现台词逐句过：够不够狠？有没有更狠的说法？',
      '章尾钩子重写：读完最后一句，你自己想不想点下一章',
      '情绪最高点那一段重写：AI 写的高点通常是平的',
      '金句留一到两处：读者会截图的那种',
      '删：所有不推动剧情的形容词与铺垫',
    ],
    pitfalls: [
      '通篇顺一遍而不是集中改关键 20%，时间花了效果没有',
      '润色时把语感改得比文风样例更"文学"，全书语感开始漂移',
      '舍不得删',
    ],
    output: '过手后的终稿候选',
    route: { always: true },
    needs: ['g2-draft'],
    view: 'write',
    craft: ['p-division', 'c-poison'],
    fields: [],
    gate: [
      { id: 'g1', text: '打脸/兑现台词已人工过手', hard: true },
      { id: 'g2', text: '章尾钩子已人工重写，自己愿意点下一章', hard: true },
      { id: 'g3', text: '情绪最高点那一段已重写' },
      { id: 'g4', text: '无禁用词、无总结式结尾、无说教超过 3 句' },
    ],
  },
  {
    id: 'g4-gate',
    no: 35,
    layer: 'produce',
    title: '审校门禁',
    purpose: '三道闸：结构闸（可自动化）、一致性闸（全量比对）、风味闸（纯人工）。',
    why: '审稿与修订必须分开——同一个人（或模型）在"找错"和"改错"合并时，会倾向于宣称自己写得没问题。拆开来批判才有效。',
    how: [
      '结构闸：字数 / 一章一事 / 钩子型号 / 爽点节拍',
      '一致性闸：出场人物言行对照状态表，重点核对谁知道什么秘密；新设定与圣经无冲突；时间线合理',
      '风味闸：读打脸段落和章尾，不够狠不够钩就退回',
      '毒点扫描：不可逆损失／主角降智／蓄能超窗／题材背刺',
      '频道雷区扫描：按男频/女频各自的雷区清单过一遍',
    ],
    pitfalls: [
      '审校时顺手就改了，失去批判的独立性',
      '一致性只看情节不看"谁知道什么"——这是最高发的崩点',
      '毒点扫描流于形式',
    ],
    output: '问题列表 + 放行结论',
    route: { always: true },
    needs: ['g3-polish'],
    view: 'write',
    craft: ['gate-3', 'c-poison', 'c-pipeline', 'c-channel'],
    fields: [],
    gate: [
      { id: 'g1', text: '高严重度问题 = 0', hard: true },
      { id: 'g2', text: '出场人物言行对照状态表，尤其"谁知道什么秘密"', hard: true },
      { id: 'g3', text: '毒点红线全过', hard: true },
      { id: 'g4', text: '频道雷区全过', hard: true },
      { id: 'g5', text: '读者模型判定不弃书；运营模型判定钩子与爽点到位' },
    ],
  },
  {
    id: 'g5-writeback',
    no: 36,
    layer: 'produce',
    title: '状态回写',
    purpose: '不回写 = 这一章没完成。哪一章漏回写，那一章之后的连续性就开始腐烂。',
    why: '写第 200 章时你不会也不该回读前 199 章，你读的是状态文件。所以状态文件必须始终等于"截至上一章的全部事实"。这是长篇不崩的唯一机制。',
    how: [
      '写章节记录：给未来的摘要（不是复制正文）+ 信息增量 + 爽点 + 钩子 + 埋收伏笔',
      '同步人物状态：状态、新增能力关系经历、新知道的秘密',
      '登伏笔账：新埋的记计划回收章，回收的记实际章号',
      '推时间线：防"昨天重伤今天生龙活虎"',
      '新设定配 ID 入库',
      '锁定项检查：本章若确立了"以后不能改"的设定，写进锁定项',
    ],
    pitfalls: [
      '摘要写成正文缩写，未来查的时候没用',
      '人物"新知道的秘密"漏记 —— 这是一致性崩坏的头号来源',
      '发现与既有真相源矛盾时自己圆过去，而不是上报',
    ],
    output: '真相源增量',
    route: { always: true },
    needs: ['g4-gate'],
    view: 'write',
    craft: ['c-writeback'],
    fields: [],
    gate: [
      { id: 'g1', text: '章节记录已加（给未来的摘要，不是复制正文）', auto: 'chapter-summary', hard: true },
      { id: 'g2', text: '人物状态变化已同步，含"新知道的秘密"', hard: true },
      { id: 'g3', text: '埋/收伏笔已登账', hard: true },
      { id: 'g4', text: '新设定已配 ID 入库' },
      { id: 'g5', text: '与既有真相源无矛盾（发现矛盾要上报，不擅自圆）', hard: true },
      { id: 'g6', text: '锁定项已检查' },
    ],
  },
  {
    id: 'g6-stock',
    no: 37,
    layer: 'produce',
    title: '存稿与更新排期',
    purpose: '断更是长篇头号死因之一，而它几乎总是可预测的。',
    why: '存稿见底 + 配速超出实测产能 = 断更。这两个量都是可以监控的。把它变成一个有预警线的仪表，断更就从"意外"变成"没看仪表"。',
    how: [
      '定存稿下限（建议 ≥7 天量），跌破就降速而不是硬撑',
      '定发布节奏：日更几章、什么时间发（平台有流量时段）',
      '关键节点前囤稿：卷末高潮、入 V、上架',
      '排休息：连续写作的疲劳是真实的，提前排比被迫停更好',
      '每周核一次存稿曲线',
    ],
    pitfalls: [
      '写完就发，零存稿裸奔',
      '状态好的时候多发而不是存起来',
      '关键节点前没有囤稿，导致高潮期被迫降质',
    ],
    output: '存稿曲线 + 发布排期',
    route: { always: true },
    needs: ['g5-writeback'],
    view: 'generic',
    craft: ['c-longform', 'c-stock'],
    fields: [
      { k: 'text', id: 'floor', label: '存稿下限', hint: '建议 ≥7 天量' },
      { k: 'text', id: 'current', label: '当前存稿' },
      { k: 'text', id: 'cadence', label: '发布节奏', hint: '日更几章、什么时间发' },
      {
        k: 'table',
        id: 'milestones',
        label: '关键节点囤稿计划',
        cols: [
          { id: 'when', label: '节点', grow: 2 },
          { id: 'need', label: '需要存多少', grow: 1 },
          { id: 'status', label: '进度', grow: 1 },
        ],
      },
      { k: 'list', id: 'rest', label: '已排的休息' },
    ],
    gate: [
      { id: 'g1', text: '存稿下限已定，且有跌破后的降速方案', hard: true },
      { id: 'g2', text: '当前存稿 ≥ 下限', auto: 'stock-floor', hard: true },
      { id: 'g3', text: '关键节点前的囤稿计划已排' },
    ],
  },

  // ══════════════════════════ H 运营层 ══════════════════════════
  {
    id: 'h1-launch',
    no: 38,
    layer: 'operate',
    title: '发布准备',
    purpose: '上架前的最后一次检查：物料、章标题、分卷、节点。',
    why: '发布是一次性的机会——冷启动的数据决定流量池等级。物料没准备好就发，等于把最贵的一次曝光浪费掉。',
    how: [
      '确认书名、简介、标签、封面都是选定版本',
      '章标题优化：走流量的平台标题即钩子，一个个过',
      '定分卷发布策略与入 V／上架节点',
      '核对前三章是否已过开篇门禁',
      '确认存稿达标，能撑过冷启动期的高频更新',
    ],
    pitfalls: [
      '简介写好了但没做第二版，失去 AB 测机会',
      '章标题随手写，浪费了免费的钩子位',
      '存稿不足就上架，冷启动期断更',
    ],
    output: '发布清单 + 章标题表',
    route: { always: true },
    needs: ['b8-package', 'e4-opening', 'g6-stock'],
    view: 'generic',
    craft: ['c-package', 'plat-fanqie', 'plat-qidian'],
    fields: [
      { k: 'text', id: 'title', label: '最终书名' },
      { k: 'area', id: 'blurb', label: '最终简介', rows: 5 },
      { k: 'list', id: 'tags', label: '最终标签' },
      { k: 'area', id: 'plan', label: '分卷与节点计划', hint: '入 V / 上架 / 冲榜节点', rows: 3 },
      {
        k: 'table',
        id: 'chapterTitles',
        label: '章标题优化',
        cols: [
          { id: 'no', label: '章', grow: 1 },
          { id: 'title', label: '标题', grow: 4 },
          { id: 'hook', label: '钩在哪', grow: 3 },
        ],
      },
    ],
    gate: [
      { id: 'g1', text: '物料四件（书名/简介/标签/封面）全部定版', hard: true },
      { id: 'g2', text: '前三章已过开篇门禁', hard: true },
      { id: 'g3', text: '存稿达标，能撑过冷启动期', hard: true },
      { id: 'g4', text: '章标题逐个过手' },
    ],
  },
  {
    id: 'h2-metrics',
    no: 39,
    layer: 'operate',
    title: '数据看板',
    purpose: '发布不是终点，是校准的开始。',
    why: '算法平台上，会读数据的作者与不会读的是两个物种。数据不是评价，是定位工具：它告诉你哪一章出了事，而不是你写得好不好。',
    how: [
      '按平台录核心指标：完读／追读／流失／书架，或收藏／首订／追订',
      '找流失尖峰：明显高于相邻章的那一章就是事故章',
      '对照该章的设计（节拍/钩子/事件），看是设计问题还是执行问题',
      '样本量意识：章级诊断至少等该章 1000+ 展示',
    ],
    pitfalls: [
      '拿前 100 个读者的数据下结论',
      '只看均值不看单章尖峰',
      '把数据当评价，情绪化地改书',
    ],
    output: '章级指标曲线 + 事故章定位',
    route: { always: true },
    needs: ['h1-launch'],
    view: 'metrics',
    craft: ['c-diagnose', 'plat-fanqie', 'plat-qidian'],
    fields: [],
    gate: [
      { id: 'g1', text: '章级数据至少 1000+ 展示才做诊断', hard: true },
      { id: 'g2', text: '核心指标已录入', auto: 'metrics-entered' },
      { id: 'g3', text: '流失尖峰已定位到具体章' },
    ],
  },
  {
    id: 'h3-diagnose',
    no: 40,
    layer: 'operate',
    title: '诊断与调整',
    purpose: '数据异常 → 创作动作。三个杠杆按成本排序。',
    why: '数据只说"哪里出事了"，不说"为什么"。诊断决策树把现象映射到原因，再映射到动作。没有这一步，看到数据也只会焦虑。',
    how: [
      '按决策树走：前三章低 → 开篇问题；流失尖峰 → 看该章是蓄能/爽点/过渡；追读阴跌 → 钩子同型化/打脸链断档/红利耗尽',
      '选杠杆：回改已发章节（最便宜）→ 调未发章节（48h 生效）→ 调卷计划（最贵）',
      '标注证据等级，仅凭推测不得回改已发布正文',
      '不可实验项不许动：核心差异、主角站位、力量体系',
    ],
    pitfalls: [
      '一有波动就大改，把书改成四不像',
      '凭感觉判断原因，不走决策树',
      '动了不可实验项 —— 换核心差异等于换书',
    ],
    output: '诊断结论 + 调整动作',
    route: { always: true },
    needs: ['h2-metrics'],
    view: 'metrics',
    craft: ['c-diagnose', 'p-decision'],
    ai: [{ id: 'diag', label: '跑诊断决策树', role: '运营模型' }],
    fields: [
      { k: 'area', id: 'finding', label: '诊断结论', rows: 4 },
      {
        k: 'select',
        id: 'lever',
        label: '选用杠杆',
        options: ['回改已发章节（成本最低）', '调整未发章节（48h 生效）', '调整卷计划（最贵）'],
      },
      { k: 'area', id: 'action', label: '具体动作', rows: 3 },
      {
        k: 'select',
        id: 'evidence',
        label: '证据等级',
        options: ['作者裁决', '真实平台数据', '既有仲裁先例', '门禁清单命中', '模拟角色观察'],
      },
    ],
    gate: [
      { id: 'g1', text: '动议附了证据等级', hard: true },
      { id: 'g2', text: '回改已发布正文的已走高风险流程并留痕', hard: true },
      { id: 'g3', text: '不可实验项未被动摇', hard: true },
    ],
  },
  {
    id: 'h4-community',
    no: 41,
    layer: 'operate',
    title: '读者反馈与社区',
    purpose: '数字告诉你哪里出事，评论告诉你为什么。',
    why: '数据是滞后且粗粒度的，评论是即时且带原因的。老读者的差评往往是一份免费的结构诊断。而社区经营本身也影响留存——被回应过的读者更可能追下去。',
    how: [
      '定期归类评论高频词：水／降智／看不懂／崩人设，各自对应不同的模块问题',
      '区分噪音与信号：单条情绪化评论是噪音，同一说法反复出现才是信号',
      '记录读者的"猜测"：他们猜到了什么，用来检查有没有过早泄底',
      '回应策略：哪些回、哪些不回，提前定好',
      '把有效反馈接进诊断流程，不要只存不用',
    ],
    pitfalls: [
      '被单条差评带节奏，为一个人改书',
      '只看夸奖，屏蔽批评',
      '读者猜中了终局却没被注意到，反转报废',
    ],
    output: '评论归类 + 读者猜测记录 + 反馈→动作映射',
    route: { always: true },
    needs: ['h2-metrics'],
    view: 'generic',
    craft: ['c-diagnose', 'c-community'],
    ai: [{ id: 'classify', label: '归类评论反馈', role: '读者模型', hint: '分离噪音与信号，映射到模块' }],
    fields: [
      {
        k: 'table',
        id: 'feedback',
        label: '评论归类',
        cols: [
          { id: 'word', label: '高频说法', grow: 2 },
          { id: 'count', label: '出现频次', grow: 1 },
          { id: 'module', label: '对应模块问题', grow: 3 },
          { id: 'action', label: '动作', grow: 3 },
        ],
      },
      { k: 'list', id: 'guesses', label: '读者猜到了什么', hint: '用来检查有没有过早泄底' },
      { k: 'area', id: 'policy', label: '回应策略', rows: 2 },
    ],
    gate: [
      { id: 'g1', text: '区分了噪音与信号（单条 vs 反复出现）', hard: true },
      { id: 'g2', text: '读者猜测已记录并核对是否泄底', hard: true },
      { id: 'g3', text: '有效反馈已接进诊断流程' },
    ],
  },
  {
    id: 'h5-retro',
    no: 42,
    layer: 'operate',
    title: '卷末复盘与资产回流',
    purpose: '引擎"越用越强"的机制本体。跳过复盘，这套框架就只是一堆静态文档。',
    why: '每一卷都是一次实验，不复盘就等于做了实验不看结果。回流是第 7 条回路的中段——没有它，下一本书还是从零开始。',
    how: [
      '卷级数据四查：完读曲线尖峰 / 追读趋势 / 书架或首订 / 评论高频词',
      '回答资产回流四问，每问都要产出一条可复用的东西',
      '伏笔对账：逾期未收的、书级悬念这一卷没露头的，全部列出',
      '按数据修订下一卷事件线',
      '归档快照：圣经与状态库打版本号',
    ],
    pitfalls: [
      '复盘写成情绪总结',
      '四问答了但不回流，下次还是想不起来',
      '伏笔对账跳过 —— 逾期会越滚越多',
    ],
    output: '复盘记录 + 回流到资产层的具体内容',
    route: { always: true },
    needs: ['h3-diagnose'],
    view: 'generic',
    craft: ['gate-4', 'c-longform'],
    ai: [{ id: 'retro', label: '生成复盘草稿', role: '总导演' }],
    fields: [
      { k: 'area', id: 'best', label: '本卷哪个爽点数据最好', hint: '→ 抽象成变奏模式入资产库', rows: 2 },
      { k: 'area', id: 'setting', label: '哪个设定读者反应超预期', hint: '→ 写回对应规则的实战记录', rows: 2 },
      { k: 'area', id: 'calls', label: '哪次诊断判对了/判错了', hint: '→ 修订健康线经验值', rows: 2 },
      { k: 'area', id: 'rework', label: '哪个环节返工最多', hint: '→ 修订对应角色的提示词', rows: 2 },
      { k: 'area', id: 'next', label: '下一卷的修订方向', rows: 3 },
    ],
    gate: [
      { id: 'g1', text: '资产回流四问全部回答且各产出一条可复用内容', hard: true },
      { id: 'g2', text: '伏笔对账完成，无逾期未处理', auto: 'threads-overdue', hard: true },
      { id: 'g3', text: '下一卷事件线已按数据修订' },
      { id: 'g4', text: '快照已归档（版本号+日期）' },
    ],
  },

  // ══════════════════════════ I 收尾层 ══════════════════════════
  {
    id: 'i1-finish',
    no: 43,
    layer: 'close',
    title: '完结收束',
    purpose: '主线闭环 + 伏笔全收 + 番外。长篇的最后一公里。',
    why: '烂尾是长篇最贵的失败：它会同时毁掉这本书的口碑和你下一本的读者基础。而烂尾大多不是能力问题，是没有收束流程——伏笔忘了收、主线没闭环、结局仓促。',
    how: [
      '伏笔全账对账：每一条都要有归宿（回收／明确废弃并说明）',
      '主线闭环核对：开篇提出的问题，结局回答了吗？',
      '四层揭露收口：元规则那一层揭开了吗？第一卷的种子都开花了吗？',
      '人物归宿：主要人物各自的结局，尤其是那些读者投入了感情的',
      '结局节奏：终卷不要赶，大高潮之后要留缓冲让读者落地',
      '番外规划：哪些人物/线值得番外，番外不承担主线职责',
    ],
    pitfalls: [
      '为了完结而完结，最后十章飞速收线',
      '大伏笔忘了收，或者草草一句话带过',
      '结局停在高潮上，没有给读者情绪落地的空间',
      '番外用来补主线的坑 —— 读者会更生气',
    ],
    output: '完结清单 + 伏笔全账对账表 + 番外规划',
    route: { always: true },
    needs: ['h5-retro'],
    view: 'generic',
    craft: ['c-finish', 'c-suspense', 'c-longform'],
    ai: [{ id: 'audit', label: '完结前全账审计', role: '总导演', hint: '伏笔/主线/人物归宿三路核对' }],
    fields: [
      { k: 'area', id: 'mainline', label: '主线闭环核对', hint: '开篇提出的问题，结局回答了吗', rows: 3 },
      { k: 'area', id: 'reveal', label: '四层揭露收口', hint: '元规则揭开了吗？第一卷的种子都开花了吗', rows: 3 },
      {
        k: 'table',
        id: 'chars',
        label: '人物归宿',
        cols: [
          { id: 'who', label: '人物', grow: 1 },
          { id: 'end', label: '结局', grow: 3 },
          { id: 'why', label: '为什么是这个结局', grow: 3 },
        ],
      },
      { k: 'area', id: 'pace', label: '终卷节奏', hint: '大高潮后留多少缓冲让读者落地', rows: 2 },
      { k: 'list', id: 'extra', label: '番外规划', hint: '番外不承担主线职责' },
    ],
    gate: [
      { id: 'g1', text: '伏笔全账对账：每条都有归宿', auto: 'threads-closed', hard: true },
      { id: 'g2', text: '主线闭环：开篇的问题结局回答了', hard: true },
      { id: 'g3', text: '第一卷的种子全部开花', hard: true },
      { id: 'g4', text: '主要人物各有归宿' },
      { id: 'g5', text: '大高潮后留了情绪落地的缓冲' },
      { id: 'g6', text: '番外不承担主线职责' },
    ],
  },
  {
    id: 'i2-derive',
    no: 44,
    layer: 'close',
    title: '完本复盘与 IP 派生',
    purpose: '世界观是固定资产，剧情是消耗品。一本写完，资产要能开下一本。',
    why: '这是第 7 条回路的闭合点。结构性原创的设定天生是 IP，缝合的设定永远不是——你花几百万字建起来的世界，只用一次是巨大的浪费。',
    how: [
      '完本复盘：从立项到完结，哪些判断对了、哪些错了，各自的代价是多少',
      '资产盘点：这本书产出的爽点模式、桥段、人名、失败教训，全部回流资产库',
      '规则实战记录回写：这本书用过的规则，读者反应如何',
      '世界观复用评估：同一稳态下能不能开第二本（换主角位／换阶层／换时代）',
      '改编接口整理：哪一卷是天然的独立闭环，哪个画面是封面级奇观',
    ],
    pitfalls: [
      '完本就扔，什么都不回流',
      '第二本直接换皮重写，读者一眼看穿',
      '复用世界观却用同一个主角位，写成同一本书',
    ],
    output: '完本复盘 + 资产回流 + 派生方案',
    route: { always: true },
    needs: ['i1-finish'],
    view: 'generic',
    craft: ['gate-4', 'c-market'],
    ai: [{ id: 'derive', label: '生成派生方案', role: '总导演', hint: '同一稳态下的第二本书可能性' }],
    fields: [
      { k: 'area', id: 'review', label: '完本复盘', hint: '哪些判断对了、哪些错了、代价多少', rows: 4 },
      { k: 'list', id: 'assets', label: '回流到资产库的内容' },
      { k: 'area', id: 'rules', label: '规则实战记录', hint: '用过的规则，读者反应如何', rows: 2 },
      { k: 'area', id: 'derive', label: '世界观复用方案', hint: '换主角位／换阶层／换时代', rows: 3 },
      { k: 'area', id: 'adapt', label: '改编接口', hint: '哪一卷是独立闭环，哪个画面是封面级奇观', rows: 2 },
    ],
    gate: [
      { id: 'g1', text: '完本复盘完成，判断对错都有记录', hard: true },
      { id: 'g2', text: '资产已回流（爽点模式/桥段/人名/教训）', hard: true },
      { id: 'g3', text: '规则实战记录已回写' },
      { id: 'g4', text: '派生方案的主角位与本书不同' },
    ],
  },

  // ══════════════════════════ X 横切协议（随时可触发） ══════════════════════════
  {
    id: 'x-rescue',
    no: 45,
    layer: 'protocol',
    title: '卡文救火',
    purpose: '写不下去了怎么办。这是真实创作里最高频的需求，不该没有流程。',
    why: '卡文不是意志力问题，是结构信号：它几乎总是说明某个上游环节出了问题。硬写只会写出水章；正确的做法是定位卡点在哪一层，回去补。',
    how: [
      '先分类卡点：不知道接下来发生什么（结构问题）／知道但写不出（场景问题）／写出来自己都不信（动机问题）／写得下去但没意思（爽点问题）',
      '结构问题 → 回事件线：是不是这一卷的目标本身就不清楚',
      '场景问题 → 回场景设计：谁在场、各自想要什么、什么会变',
      '动机问题 → 回人物：这个人此刻真正想要的是什么，是不是被剧情需要绑架了',
      '爽点问题 → 回排期：是不是连续几章没有兑现，自己都写腻了',
      '素材问题 → 回素材库：是不是这个场景的细节你根本不熟',
      '实在卡住就跳写：先写你最想写的那一章，回头补中间',
    ],
    pitfalls: [
      '硬写 —— 产出的一定是水章，还会打击信心',
      '把卡文归因为"没灵感"，于是等灵感',
      '推倒重来 —— 大多数时候只需要补一个上游环节',
    ],
    output: '卡点诊断 + 回补动作',
    route: { always: true },
    needs: [],
    view: 'generic',
    craft: ['c-rescue', 'c-longform'],
    ai: [{ id: 'diagnose', label: '诊断卡点', role: '总导演', hint: '定位卡在哪一层并给回补动作' }],
    fields: [
      {
        k: 'select',
        id: 'kind',
        label: '卡点类型',
        options: [
          '不知道接下来发生什么（结构）',
          '知道但写不出（场景）',
          '写出来自己都不信（动机）',
          '写得下去但没意思（爽点）',
          '细节编不出来（素材）',
        ],
      },
      { k: 'area', id: 'symptom', label: '具体症状', rows: 3 },
      { k: 'area', id: 'action', label: '回补动作', hint: '回哪个环节补什么', rows: 3 },
      { k: 'text', id: 'jump', label: '跳写哪一章', hint: '实在卡住就先写最想写的那一章' },
    ],
    gate: [
      { id: 'g1', text: '卡点已归类到具体类型，不是"没灵感"', hard: true },
      { id: 'g2', text: '定位到了要回补的上游环节', hard: true },
      { id: 'g3', text: '没有采取"硬写"或"推倒重来"' },
    ],
  },
  {
    id: 'x-risk',
    no: 46,
    layer: 'protocol',
    title: '风险合规扫描',
    purpose: '题材红线、影射风险、平台审核。写完才发现过不了审是最贵的返工。',
    why: '合规不是写完再说的事——核心设定如果本身踩线，改的就是整本书的地基。立项时扫一次、每卷扫一次，成本几乎为零；上架前才发现，代价是整本书。',
    how: [
      '立项时扫核心设定：这个设定的核心展开会不会必然触碰红线',
      '每卷扫内容：暴力尺度、情色边界、政治敏感、宗教民族、犯罪细节的教学性',
      '扫影射：现实人物、机构、事件的可辨识度',
      '扫平台特定规则：各平台的审核口径不同，按目标平台的规则来',
      '发现风险时优先"换壳不换核"：保留结构，替换敏感的表层设定',
    ],
    pitfalls: [
      '把合规当成写完之后的润色',
      '核心设定踩线却抱侥幸心理',
      '为了规避风险把内容改得没有张力 —— 换壳不换核才是正解',
    ],
    output: '风险扫描记录 + 处理方案',
    route: { always: true },
    needs: [],
    view: 'generic',
    craft: ['c-risk', 'c-scorecard'],
    ai: [{ id: 'scan', label: '扫描合规风险', role: '编辑系统', hint: '按红线类别逐条核' }],
    fields: [
      {
        k: 'flags',
        id: 'checks',
        label: '红线类别',
        items: [
          { id: 'core', label: '核心设定不必然触线' },
          { id: 'violence', label: '暴力尺度在平台口径内' },
          { id: 'sex', label: '情色边界在平台口径内' },
          { id: 'politics', label: '无政治敏感影射' },
          { id: 'religion', label: '无宗教民族冒犯' },
          { id: 'crime', label: '犯罪细节无教学性' },
          { id: 'real', label: '现实人物机构无可辨识影射' },
        ],
      },
      {
        k: 'table',
        id: 'risks',
        label: '发现的风险与处理',
        cols: [
          { id: 'where', label: '位置', grow: 1 },
          { id: 'risk', label: '风险', grow: 3 },
          { id: 'fix', label: '处理（优先换壳不换核）', grow: 3 },
        ],
      },
    ],
    gate: [
      { id: 'g1', text: '核心设定不必然触碰红线', hard: true },
      { id: 'g2', text: '七类红线逐条扫过', hard: true },
      { id: 'g3', text: '发现的风险都有处理方案' },
    ],
  },
]

export const STAGE_MAP: Record<string, Stage> = Object.fromEntries(STAGES.map((s) => [s.id, s]))
export const LAYER_MAP: Record<LayerId, Layer> = Object.fromEntries(
  LAYERS.map((l) => [l.id, l]),
) as Record<LayerId, Layer>

export function stagesOf(layer: LayerId): Stage[] {
  return STAGES.filter((s) => s.layer === layer)
}

/** 最小可动笔集合：这些齐了就能写第一章，不必等全部填完 */
export const MIN_VIABLE = STAGES.filter((s) => s.minViable)

/**
 * 是否属于「顺序主干」。
 * 作者层是跨书资产池（永不挡路），协议层是随时可触发的横切机制——
 * 这两类都不参与"下一步该做什么"的排序，也不计入本书的必经进度。
 */
export function isSequential(s: Stage): boolean {
  return !s.crossBook && s.layer !== 'protocol'
}

/**
 * 门禁通过率。
 * 可判定项（有 auto）以系统判定为准，人勾不动；主观项才看人勾。
 * 硬项没全过就永远不算通过。
 * autos: checkId → 是否通过（undefined = 数据不足，按未通过计但不算失败）
 */
export function gateProgress(
  stage: Stage,
  checked: Record<string, boolean>,
  autos?: Record<string, { pass: boolean } | null | undefined>,
) {
  const state = (g: GateItem): 'pass' | 'fail' | 'pending' => {
    if (g.auto) {
      const r = autos?.[g.auto]
      if (r == null) return 'pending'
      return r.pass ? 'pass' : 'fail'
    }
    return checked[g.id] ? 'pass' : 'pending'
  }
  const total = stage.gate.length
  const done = stage.gate.filter((g) => state(g) === 'pass').length
  const failed = stage.gate.filter((g) => state(g) === 'fail').length
  const hardLeft = stage.gate.filter((g) => g.hard && state(g) !== 'pass').length
  const autoCount = stage.gate.filter((g) => g.auto).length
  return { total, done, failed, hardLeft, autoCount, passed: total > 0 && done === total, state }
}

/** 这本书要不要走这个环节 */
export function weightOf(
  stage: Stage,
  ctx: { archetypes: Archetype[]; channel: ChannelId; venue: VenueId },
): Weight {
  const r = stage.route
  // 正向匹配优先：一个类型可归属多个原型，先看它命中了什么，再看排除
  if (r.always) return '必经'
  if (r.archetypes?.some((a) => ctx.archetypes.includes(a))) return '必经'
  if (r.channels?.includes(ctx.channel)) return '必经'
  if (r.venues?.includes(ctx.venue)) return '必经'
  // 一个正向条件都没命中，且命中排除项 → 这本书用不上
  if (r.notFor?.some((a) => ctx.archetypes.includes(a))) return '不适用'
  return '增强'
}

export function routeOf(ctx: { archetypes: Archetype[]; channel: ChannelId; venue: VenueId }) {
  return STAGES.map((s) => ({ stage: s, weight: weightOf(s, ctx) }))
}
