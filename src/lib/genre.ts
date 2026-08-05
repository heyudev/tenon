// 平台 × 频道 × 类型 —— 三个正交参数，决定这本书走哪条路线、按什么阈值判定。
//
// 平台 = 商业模型（钱怎么来 → 什么指标决定生死 → 章长与节奏）
// 频道 = 读者契约（读者为什么读 → 什么算爽 → 什么是雷）
// 类型 = 路线（哪些环节必经、哪些是增强、哪些跟这本书无关）
//
// 纯数据，客户端服务端共用。

import type { ChannelId, VenueId } from './platform'
import { VENUE_MAP, OPERATORS } from './platform'

const OPERATORS_BIZ = Object.fromEntries(Object.values(OPERATORS).map((o) => [o.id, o.biz]))

export type { ChannelId, VenueId }

/** 路线原型：类型 → 原型 → 环节必经性。一个类型可归属多个原型。 */
export type Archetype = 'world' | 'power' | 'people' | 'plot' | 'slice'

export const ARCHETYPES: { id: Archetype; label: string; desc: string }[] = [
  { id: 'world', label: '重设定', desc: '世界观本身就是卖点，读者为"这个世界怎么运转"而来' },
  { id: 'power', label: '重成长', desc: '变强的阶梯是主轴，读者追的是可预期的跃迁' },
  { id: 'people', label: '重人物', desc: '关系与情感是主轴，读者为人和人之间的事而来' },
  { id: 'plot', label: '重情节', desc: '谜题、布局与反转是主轴，读者为"接下来会怎样"而来' },
  { id: 'slice', label: '轻设定', desc: '贴着日常经验，靠具体质感和小满足留人' },
]

/* ══════════════ 平台：见 lib/platform.ts（含运营全景与差异对照） ══════════════ */

export { OPERATORS, VENUES, VENUE_MAP, DIMENSIONS, KEY_DIFFS, volatileItems, venuesOf } from './platform'
export type { Operator, Venue, Fact, DimensionId, OperatorId } from './platform'

/* ══════════════ 频道：读者契约 ══════════════ */

export interface Channel {
  id: ChannelId
  /** 读者为什么读这本书 */
  contract: string
  /** 核心快感来源 */
  pleasures: string[]
  /** 主轴构成 */
  spine: string
  /** 情感线的地位 */
  romance: '主轴' | '副线' | '可选'
  /** 结构特征 */
  structure: string[]
  /** 雷区（命中即掉数据） */
  mines: string[]
  /** 主角的不可让渡属性 */
  protagonist: string[]
}

export const CHANNELS: Record<ChannelId, Channel> = {
  男频: {
    id: '男频',
    contract: '读者要的是**代入一个不断掌控更多的人**。他看的是"我"在变强、在赢、在被承认。',
    pleasures: ['变强与跃迁', '打脸与扬名', '掌控与开疆', '复仇清算', '信息差碾压'],
    spine: '事业线／成长线为主轴，感情线是配菜',
    romance: '副线',
    structure: [
      '打脸链：脸的级别随主角等级同步上升，每 20-30 章消耗一张',
      '等级阶梯：可预期的跃迁节点 ＋ 不可预期的跃迁方式',
      '金手指：与规则差同源，带代价与刹车',
      '势力扩张：从个人到团队到势力到格局',
    ],
    mines: [
      '绿帽及一切擦边',
      '主角受辱当场无找补且拖章',
      '圣母、优柔、该杀不杀',
      '感情戏挤压主线篇幅',
      '后宫处理失衡引发读者站队骂战',
    ],
    protagonist: ['果决，不纠结', '不吃暗亏', '有明确且持续升级的目标', '能力必须持续可见地增长'],
  },
  女频: {
    id: '女频',
    contract:
      '读者要的是**看一个女性夺回定义自己的权力**。她看的是关系里的胜利、被看见、以及不再任人处置。',
    pleasures: ['被看见与被珍视', '逆袭打脸', '掌握主动权', '关系胜利', '身份反转与真相曝光'],
    spine: '情感线与事业线双主轴并行，两条线要互相供能',
    romance: '主轴',
    structure: [
      '情感节拍：试探 → 靠近 → 误解／危机 → 确认 → 共同对外',
      '认可阶梯：从被否定到被承认，阶段性地拿回话语权',
      '群像关系网：闺蜜／对手／长辈／旧人各有功能位',
      '身份与真相：反转多挂在身份、身世、旧账上',
    ],
    mines: [
      '女主恋爱脑、为男主放弃自我',
      '误会流拖过 3 章不解',
      '男主行为越界却被美化（强制、羞辱、控制）',
      '雌竞过度、女性角色全员降智',
      '女主被动等待被拯救',
    ],
    protagonist: [
      '任何时候都保有主动权，不靠别人替她解决核心问题',
      '有独立于感情的目标',
      '情感必须有回应，单向暗恋不能长期占主轴',
      '受害经历不能成为唯一人格',
    ],
  },
}

/* ══════════════ 类型：决定路线 ══════════════ */

export interface Genre {
  id: string
  name: string
  channel: ChannelId | '双频'
  archetypes: Archetype[]
  venueFit: VenueId[]
  /** 这个类型的读者契约，一句话 */
  contract: string
  /** 必备元素：缺了读者会觉得"这不是我要的那类书" */
  musts: string[]
  /** 类型专属雷区 */
  mines: string[]
  /** 开篇节奏模板 */
  opening: string
}

export const GENRES: Genre[] = [
  // ── 男频 ──
  {
    id: 'g-urban-power',
    name: '都市异能',
    channel: '男频',
    archetypes: ['world', 'power'],
    venueFit: ['fanqie-m', 'qimao-m', 'qidian', 'zongheng'],
    contract: '现实世界的皮，超常规则的骨。读者要"如果我在这条街上有这个能力"。',
    musts: ['能力与现代生活的具体接口', '隐藏身份的张力', '同类者的圈子与秩序', '可见的实力分级'],
    mines: ['能力设定复杂到要讲三章', '现代社会对超常事件毫无反应', '能力无代价无限制'],
    opening: '第 1 章能力在日常场景里首次显形；第 2 章代价或限制露头；第 3 章第一次用它翻盘。',
  },
  {
    id: 'g-system',
    name: '系统流',
    channel: '男频',
    archetypes: ['power', 'world'],
    venueFit: ['fanqie-m', 'qimao-m'],
    contract: '一切可量化、可进度条。读者要的是数值增长的确定性快感。',
    musts: ['面板/任务/奖励的稳定规则', '数值可见且可预期', '任务驱动的短周期兑现', '系统的来源之谜'],
    mines: ['系统万能到没有决策', '数值膨胀失控', '系统人格化后抢主角戏'],
    opening: '第 1 章系统绑定并给出第一个任务；第 2 章完成首任务拿到可见收益；第 3 章用收益完成一次公开兑现。',
  },
  {
    id: 'g-rule-horror',
    name: '规则怪谈',
    channel: '男频',
    archetypes: ['world', 'plot'],
    venueFit: ['fanqie-m', 'qimao-m', 'qidian', 'zongheng'],
    contract: '违反规则会死，而规则本身是残缺的、有陷阱的。读者要的是解谜与活命。',
    musts: ['规则以清单形式明示', '规则之间存在冲突或陷阱', '死亡真实发生', '"规则的规则"预埋'],
    mines: ['规则前后不自洽', '主角靠运气活命而非推理', '第二卷无新规则层可揭'],
    opening: '第 1 章规则清单当面砸下并立刻死人；第 2 章主角靠读规则活命；第 3 章发现规则有陷阱。',
  },
  {
    id: 'g-infinite',
    name: '无限流',
    channel: '男频',
    archetypes: ['world', 'plot', 'power'],
    venueFit: ['qidian', 'zongheng'],
    contract: '副本轮转，主线在副本之外。读者要的是每个副本的新奇 ＋ 主线的深谜。',
    musts: ['副本进入与结算机制', '跨副本可积累的资本', '队友与背叛', '主神/幕后的谜'],
    mines: ['副本之间毫无关联，主线断裂', '队友工具人化', '结算规则不透明导致爽点不可预期'],
    opening: '第 1 章被强制拉入首个副本；第 2 章摸清结算规则；第 3 章用规则漏洞完成首次通关。',
  },
  {
    id: 'g-xianxia',
    name: '玄幻修仙',
    channel: '男频',
    archetypes: ['power', 'world'],
    venueFit: ['qidian', 'zongheng'],
    contract: '境界森严，资源稀缺，逆流而上。读者追的是长线的可预期跃迁。',
    musts: ['清晰的境界体系与资源门槛', '宗门/家族/势力格局', '功法与传承', '寿元与代价'],
    mines: ['境界体系断层或无天花板', '资源来路随手给', '前期把牌打光'],
    opening: '第 1 章展示境界森严与主角的低位；第 2 章拿到不合常理的机缘；第 3 章用它跨级完成一次证明。',
  },
  {
    id: 'g-wuxia',
    name: '武侠',
    channel: '男频',
    archetypes: ['power', 'people', 'plot'],
    venueFit: ['qidian', 'zongheng'],
    contract: '人情与恩怨的江湖，武功是手段不是目的。读者要的是分寸感与快意。',
    musts: ['门派/势力的人际网络', '恩怨的来龙去脉', '武功的招式质感', '江湖规矩与道义边界'],
    mines: ['武功数值化到失去质感', '恩怨动机单薄', '江湖没有规矩只有打斗'],
    opening: '第 1 章一场有分寸的交手立起主角的手段与处境；第 2 章旧账露头；第 3 章第一次动手清账。',
  },
  {
    id: 'g-history',
    name: '历史权谋',
    channel: '男频',
    archetypes: ['plot', 'people'],
    venueFit: ['qidian', 'zongheng'],
    contract: '在既定的历史约束里腾挪。读者要的是布局的精密与人心的算计。',
    musts: ['时代约束的真实感', '多方势力的利益结构', '信息差与情报线', '每一步都有代价'],
    mines: ['主角开挂碾压不需要算计', '配角智商为剧情服务', '史实细节硬伤'],
    opening: '第 1 章一个具体的政治困局砸到主角头上；第 2 章他看到别人看不到的那条线；第 3 章第一次以小博大。',
  },
  {
    id: 'g-scifi',
    name: '科幻',
    channel: '男频',
    archetypes: ['world', 'plot'],
    venueFit: ['qidian', 'zongheng'],
    contract: '一个设定推到底的世界。读者要的是逻辑的严密与尺度的震撼。',
    musts: ['核心设定的物理/社会后果推到底', '技术与人的关系', '尺度感', '设定驱动的伦理困境'],
    mines: ['技术名词堆砌但无推演', '设定与剧情脱节', '尺度写大了收不回来'],
    opening: '第 1 章用一个具体场景展示设定的后果；第 2 章主角与设定的个人关系确立；第 3 章设定的第一层反转。',
  },
  {
    id: 'g-business',
    name: '都市职场商战',
    channel: '男频',
    archetypes: ['plot', 'people', 'slice'],
    venueFit: ['fanqie-m', 'qimao-m', 'qidian', 'zongheng'],
    contract: '规则内的博弈。读者要的是专业感与翻盘的解气。',
    musts: ['行业细节的可信度', '资源与人脉的具体流动', '对手的专业强度', '每次翻盘的可复盘性'],
    mines: ['商战靠嘴炮和巧合', '行业细节外行', '对手降智'],
    opening: '第 1 章一个具体的职场绝境；第 2 章主角的信息/能力差露头；第 3 章第一次当众翻盘。',
  },
  {
    id: 'g-apocalypse',
    name: '末世求生',
    channel: '男频',
    archetypes: ['world', 'power', 'slice'],
    venueFit: ['fanqie-m', 'qimao-m'],
    contract: '资源归零重新分配。读者要的是囤积、经营与秩序重建的踏实感。',
    musts: ['灾变规则明确', '物资的具体清单感', '人性的秩序考验', '安全区的建立与扩张'],
    mines: ['物资随手就有', '人性写成纯恶', '灾变规则中途改'],
    opening: '第 1 章灾变当场发生且主角有一步领先；第 2 章第一批物资到手；第 3 章第一次守住自己的东西。',
  },
  {
    id: 'g-farming',
    name: '种田基建',
    channel: '双频',
    archetypes: ['slice', 'world'],
    venueFit: ['fanqie-m', 'fanqie-f', 'qimao-m', 'qimao-f', 'qidian', 'qdmm', 'jjwxc'],
    contract: '从无到有把日子过起来。读者要的是可见的积累与稳定的小满足。',
    musts: ['积累的可见刻度', '具体的生产/生活细节', '邻里与家人的关系网', '阶段性的经营目标'],
    mines: ['积累速度失真', '冲突全靠恶邻', '中段进入无目标的日常水章'],
    opening: '第 1 章一穷二白的具体处境；第 2 章第一份收成或第一笔进账；第 3 章第一次因积累而被人另眼相看。',
  },
  {
    id: 'g-return',
    name: '赘婿逆袭·战神归来',
    channel: '男频',
    archetypes: ['power', 'people'],
    venueFit: ['fanqie-m', 'qimao-m'],
    contract: '身份的巨大落差 ＋ 随时可兑现的真实力。读者要的是压抑与释放的高频循环。',
    musts: ['被轻视的具体处境', '隐藏身份的可信理由', '身份揭露的分层兑现', '见证者密度'],
    mines: ['憋屈过长', '身份揭露一次性用完', '打脸对象是无名路人'],
    opening: '第 1 章当众受辱；第 2 章真实身份的一角露给读者（不露给配角）；第 3 章第一次小规模亮身份。',
  },

  // ── 女频 ──
  {
    id: 'g-modern-romance',
    name: '现代言情',
    channel: '女频',
    archetypes: ['people', 'slice'],
    venueFit: ['fanqie-f', 'qimao-f', 'qdmm', 'hongxiu', 'jjwxc'],
    contract: '两个成年人如何真正靠近。读者要的是被珍视的确定感与关系的进展。',
    musts: ['双方都有独立目标', '情感节拍清晰可追', '误解必须短且有信息基础', '第三方压力来自结构不是脸谱'],
    mines: ['误会流拖沓', '男主行为越界被美化', '女主为爱放弃事业线', '第三者靠降智推动'],
    opening: '第 1 章两人以有张力的方式相遇；第 2 章各自的目标与阻碍立起来；第 3 章第一次真正的靠近或交锋。',
  },
  {
    id: 'g-entertainment',
    name: '娱乐圈',
    channel: '女频',
    archetypes: ['people', 'plot'],
    venueFit: ['fanqie-f', 'qimao-f'],
    contract: '在一个全是表演的场里做真实的人。读者要的是被误解到被正名的全过程。',
    musts: ['舆论场的具体运作（热搜/通稿/粉丝）', '作品与业务能力的实证', '资源与人脉的流动', '打脸要在公开场合'],
    mines: ['业务能力靠旁白吹', '舆论反转靠巧合', '对家全员降智', '洗白过快失去张力'],
    opening: '第 1 章一场公开的塌房或羞辱；第 2 章主角的真本事/金手指露头；第 3 章第一次小规模舆论翻盘。',
  },
  {
    id: 'g-palace',
    name: '宅斗宫斗',
    channel: '女频',
    archetypes: ['people', 'plot'],
    venueFit: ['qdmm', 'hongxiu', 'jjwxc', 'fanqie-f', 'qimao-f'],
    contract: '在封闭的权力结构里活下去并向上走。读者要的是算计的精密与位次的攀升。',
    musts: ['清晰的位次与规矩', '每一步都有具体利益', '对手的合理动机', '信息与人脉的经营'],
    mines: ['靠现代思维碾压', '对手行为不合利益逻辑', '主角靠男性权威解决核心问题'],
    opening: '第 1 章一次具体的规矩性羞辱；第 2 章主角读懂了别人没读懂的规矩；第 3 章第一次借规矩反击。',
  },
  {
    id: 'g-transmigration',
    name: '穿书快穿',
    channel: '女频',
    archetypes: ['plot', 'world'],
    venueFit: ['fanqie-f', 'qimao-f'],
    contract: '知道剧本却要改写它。读者要的是信息差与命运反抗的双重快感。',
    musts: ['原剧情与现实的偏差机制', '改写的代价', '每个世界的独立闭环', '贯穿的主线目标'],
    mines: ['剧情知识万能', '世界之间无关联', '改写无代价'],
    opening: '第 1 章穿入并意识到自己知道结局；第 2 章第一次试图改写并付出代价；第 3 章确立长期目标。',
  },
  {
    id: 'g-rebirth',
    name: '重生复仇',
    channel: '女频',
    archetypes: ['plot', 'people'],
    venueFit: ['fanqie-f', 'qimao-f'],
    contract: '带着答案回到题目里。读者要的是提前布局与逐个清算的解气。',
    musts: ['前世死因具体且不公', '重生点的选择有意义', '仇人梯队与清算顺序', '蝴蝶效应带来的失控'],
    mines: ['前世信息万能无失效', '复仇对象一次性解决', '重生后立刻无敌失去张力'],
    opening: '第 1 章前世结局 ＋ 重生瞬间；第 2 章用已知信息拿到第一步优势；第 3 章第一个仇人被清算一角。',
  },
  {
    id: 'g-female-fantasy',
    name: '女强玄幻仙侠',
    channel: '女频',
    archetypes: ['power', 'world', 'people'],
    venueFit: ['qdmm', 'hongxiu', 'jjwxc', 'fanqie-f', 'qimao-f'],
    contract: '力量与情感同时成立。读者要的是既能打也被爱。',
    musts: ['独立于感情的力量成长线', '境界与资源体系', '情感线与成长线互相供能', '女主的决断时刻'],
    mines: ['力量成长靠男主给予', '感情线打断成长节奏', '女主强只体现在嘴上'],
    opening: '第 1 章展示低位与不甘；第 2 章拿到成长的钥匙；第 3 章第一次靠自己跨级。',
  },
  {
    id: 'g-era',
    name: '年代文',
    channel: '女频',
    archetypes: ['slice', 'people'],
    venueFit: ['fanqie-f', 'qimao-f'],
    contract: '在物质匮乏的年代把日子过明白。读者要的是时代质感与踏实的向上。',
    musts: ['年代细节的准确质感', '家庭与邻里的关系网', '物质积累的可见刻度', '时代约束下的选择'],
    mines: ['年代细节穿帮', '用现代观念直接碾压时代', '冲突全靠极品亲戚'],
    opening: '第 1 章一个具体的年代困境；第 2 章第一次靠本事改善处境；第 3 章第一次被人重新看待。',
  },
  {
    id: 'g-mystery',
    name: '悬疑推理',
    channel: '双频',
    archetypes: ['plot', 'people'],
    venueFit: ['qidian', 'qdmm', 'jjwxc', 'fanqie-m', 'fanqie-f', 'qimao-m', 'qimao-f'],
    contract: '谜面公平、谜底意外。读者要的是与作者的智力对局。',
    musts: ['线索对读者公平可见', '每案有独立闭环', '主线谜题贯穿', '推理过程可复盘'],
    mines: ['靠隐瞒关键信息制造反转', '主角靠灵光一闪破案', '案件之间毫无主线关联'],
    opening: '第 1 章抛出一个反常的谜面；第 2 章主角的方法论露头；第 3 章解开第一层但露出更大的谜。',
  },
]

export const GENRE_MAP: Record<string, Genre> = Object.fromEntries(GENRES.map((g) => [g.id, g]))

export function genresOf(channel: ChannelId): Genre[] {
  return GENRES.filter((g) => g.channel === channel || g.channel === '双频')
}

/* ══════════════ 节奏模板：平台 × 频道 ══════════════ */

export interface BeatTemplate {
  /** 每章至少要有的东西 */
  perChapter: string
  /** 中爽及以上的目标间隔 */
  midBeat: string
  /** 大爽的目标间隔 */
  bigBeat: string
  /** 开篇窗口 */
  openWindow: string
  /** 情感线的排期要求 */
  romance: string
}

export function beatTemplate(venueId: VenueId, c: ChannelId): BeatTemplate {
  const v = VENUE_MAP[venueId]
  const fanqie = v ? OPERATORS_BIZ[v.operator] === '免费阅读 · 广告分成' : true
  return {
    perChapter: fanqie
      ? '一个微爽点（进账／打脸／进展／信息增量，任一）＋ 一个强钩子'
      : '一次实质推进 ＋ 中等以上强度的章末钩',
    midBeat: fanqie ? '每 3 章一个中爽点，连续 ≥3 章无中爽即红线' : '每 2-3 章一个中爽点，最长空档不超过 8 章',
    bigBeat: fanqie ? '每 20-30 章一个卷级大爽点' : '每卷末一个大高潮，卡在能拉数据的节点',
    openWindow: fanqie ? '黄金三章，第 1 章前 300-500 字出钩子' : '前 5-8 章立住，但第 1 章仍须给出核心差异',
    romance:
      c === '女频'
        ? '情感线与事业线交替供能：每 5-8 章必须有一次关系状态的变化（靠近／退后／确认／裂痕），长期停滞即掉追读'
        : '感情线全程不得挤压主线；单章感情戏占比不超过三成，且必须同时推进主线或人物',
  }
}

/* ══════════════ 入口分诊 ══════════════ */

export type EntryId = 'blank' | 'scene' | 'rule' | 'genre' | 'stuck' | 'done'

export interface Entry {
  id: EntryId
  label: string
  desc: string
  /** 从哪个环节开始走 */
  start: string
  /** 这条入口的路径说明 */
  path: string
}

export const ENTRIES: Entry[] = [
  {
    id: 'blank',
    label: '什么都还没有',
    desc: '就是想写一本书，方向都还没定。',
    start: 'b1-market',
    path: '先定类型与读者契约 → 再按类型去规则库找料 → 正向管线推演',
  },
  {
    id: 'scene',
    label: '有一个画面',
    desc: '脑子里有个具体场景挥之不去：某个人、在某个地方、握着某个东西、做着某件事。',
    start: 'b9-reverse',
    path: '逆向管线：写下画面 → 反查它踩在哪条规则上 → 用五问校验它撑不撑得起长篇 → 补辅规则抬天花板',
  },
  {
    id: 'rule',
    label: '有一条规则 / 一个设定点子',
    desc: '"如果 XX 可以交易会怎样" 这类。',
    start: 'b3-rules',
    path: '正向管线：查重 → 改写算子 → 传导推演 → 文明推演 → 立项',
  },
  {
    id: 'genre',
    label: '想写某个类型',
    desc: '认准了要写娱乐圈 / 规则怪谈 / 宅斗之类。',
    start: 'b2-genre',
    path: '类型契约先立住 → 按类型的必备元素反推需要什么设定 → 再去规则库补料',
  },
  {
    id: 'stuck',
    label: '有一本卡住的书',
    desc: '写到一半写不下去，或者数据不行。',
    start: 'x-rescue',
    path: '卡文救火协议诊断卡点 → 定位是设定不够用、动机断了、还是排期塌了 → 回对应环节补',
  },
  {
    id: 'done',
    label: '完本了，要开下一本',
    desc: '上一本写完，想复用积累。',
    start: 'i2-derive',
    path: '完本复盘 → 资产回流 → 世界观复用或换赛道 → 新书立项',
  },
]
