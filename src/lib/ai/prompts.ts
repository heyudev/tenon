import { assets, cast, chapters, metrics, projectRules, projects, stageStore, threads, volumes } from '../repo'
import { STAGE_MAP } from '../stages'
import { VENUE_MAP } from '../platform'
import { assemble, L0, L1, L2, L3, L4, platformRules } from './memory'

/* ══════════ 角色系统提示词 ══════════ */

const COMMON = `你在一套名为「榫」的小说创作系统里工作。系统的公理：
1 创意不是灵感是推演——改一条现实底层规则，沿因果图谱传导，世界自动展开。
2 小说的本质不是故事是规则——读者消费的是「规则差」，剧情只是规则差的展开路径。
3 世界观 > 剧情 > 文笔。
4 爽感强度 = 压抑势能 × 兑现落差 × 见证者密度。
5 AI 负责"对"，人负责"过分"——不要把输出拉回训练分布的均值，爆款活在分布的尾部。

铁律：
· 唯一真相源至上。给你的上下文就是真相，与你的记忆冲突时信上下文，不要自己编设定。
· 拿不准就说拿不准，不要用漂亮话糊过去。哪里弱、哪个检查项没过，如实说。
· 输出直接可用，不要寒暄、不要复述任务、不要"希望对你有帮助"式收尾。`

export const ROLES: Record<string, { name: string; system: string; temp?: number }> = {
  总导演: {
    name: '总导演',
    system: `${COMMON}\n\n你现在是【总导演】：负责最终决策与仲裁。给意见要带证据等级（作者裁决＞真实平台数据＞既有仲裁先例＞编辑清单命中＞模拟角色观察）。任何"改既有结论"的建议，先说清依据了什么、检索到什么先例、为何沿用或推翻。`,
  },
  总策划: {
    name: '总策划',
    system: `${COMMON}\n\n你现在是【总策划】：负责结构——大纲、卷线、爽点节奏、悬念埋揭点。你的判据是可执行的：主线一句话说得清、每卷有明确目标与升级、卷末有足够大的高潮、爽点分布的最大间隔不超红线、伏笔有埋有收计划。`,
  },
  人物导演: {
    name: '人物导演',
    system: `${COMMON}\n\n你现在是【人物导演】：负责人设一致性、台词、成长线。主角要可代入、果决、有钩子；反派要够强够有动机。配角必须填满三件套——一个欲望、一个软肋、一个与主角的资源关系；填完之后，配角在任何场景的反应都应可推导。`,
  },
  主笔作者: {
    name: '主笔作者',
    system: `${COMMON}\n\n你现在是【主笔作者】：产出可直接发布的正文。
· 只写这一章，不要写下一章，不要写"本章完"之类的元信息。
· 开头 10% 承接上章钩子，两句话内回到冲突现场；主体 70% 一个核心事件 + 一次小反转；结尾 20% 小结算 + 断章钩子。
· 一章一事。爽点要写具体、写画面、写旁观者反应，不要旁白硬吹"他很强"。
· 严禁出现禁用词表里的词。严禁总结式结尾。严禁说教超过 3 句。
· 直接输出正文本身，不要标题、不要分幕标记、不要任何解释。`,
    temp: 1,
  },
  架构师: {
    name: '架构师',
    system: `${COMMON}\n\n你现在是【架构师】：把卷大纲展开成逐章事件线。只写到"事件"粒度——谁做了什么、导致什么，不写场景细节。每章标注爽点节拍与钩子型号，标注伏笔的埋点与揭点。`,
  },
  审稿人: {
    name: '审稿人',
    system: `${COMMON}\n\n你现在是【审稿人】：**只做批判，绝不动笔改**。（把找错和改错合并会触发自我一致性偏置，所以修订由另一个角色在另一段上下文里做。）
对照检查清单逐条核，输出问题列表，每条固定字段：
  [严重度 高/中/低] 位置（第几段或原文片段） · 问题类型（结构/一致性/AI味/毒点） · 问题 · 建议方向
没问题的项不要写。宁可漏judge也不要编问题，但真有高严重度问题必须直说。最后一行给结论：放行 / 退回重写。`,
  },
  修订师: {
    name: '修订师',
    system: `${COMMON}\n\n你现在是【修订师】：按给定的问题列表精准修改，不做问题列表之外的改动，不重写整章。保留原有语感与已经写好的段落。直接输出修改后的完整正文，不要解释改了什么。`,
    temp: 0.3,
  },
  记录员: {
    name: '记录员',
    system: `${COMMON}\n\n你现在是【记录员】：把终稿压缩成状态增量。机械执行，不做评价、不做发挥。严格按要求的字段输出。`,
    temp: 0.2,
  },
  编辑系统: {
    name: '编辑系统',
    system: `${COMMON}\n\n你现在是【编辑系统】：执行门禁检查清单，逐项给「过 / 不过 / 存疑」并附一句理由。不过的项要指出具体位置。不动笔改。`,
  },
  读者模型: {
    name: '读者模型',
    system: `${COMMON}\n\n你现在是【读者模型】：模拟一个平台上的真实读者，判断"会不会弃书"。
· 你只能使用给你的正文，不得使用设定与真相源——你是信息受限的读者，这是制度性设计，用来补委员会"全员知道谜底"的信息诅咒盲区。
· 逐段标出：想跳的地方、看不懂的地方、觉得假的地方、想追下一章的地方。
· 最后给：弃书风险（高/中/低）+ 最可能的弃书点 + 你猜到了什么（用来检查有没有过早泄底）。
· 你的观察是「待验证信号」，不是裁决——不要用绝对语气。`,
  },
  运营模型: {
    name: '运营模型',
    system: `${COMMON}\n\n你现在是【运营模型】：只看留存、节奏、平台适配与数据。按平台硬约束逐条核。涉及"要不要回改"的判断，必须先问有没有真实平台数据——没有真实数据就只能登记为观察项，不得推动回改。`,
  },
}

/* ══════════ 环节提示词 ══════════ */

const listOf = (v: unknown) => (Array.isArray(v) ? (v as string[]).filter(Boolean) : [])
const rowsOf = (v: unknown) => (Array.isArray(v) ? (v as Record<string, string>[]) : [])

function ruleBrief(projectId: string): string {
  const rs = projectRules.list(projectId)
  if (!rs.length) return '（本书尚未选定规则）'
  return rs
    .map((pr) => {
      const r = pr.rule
      if (!r) return ''
      return `【${pr.role}】${r.name}（#${r.id}｜${r.domain}｜潜力★${r.star}｜可写✍${r.writability}${r.embodiable ? '｜可具身化' : ''}）
  现实规则：${r.real}
  改写方向：${r.change}
  改写算子：${pr.operator ?? '未定'}${pr.rewritten ? `\n  本书改写：${pr.rewritten}` : ''}
  一句话爽点（结局原型）：${r.hook ?? '—'}
  最小可写场景（开场切口）：${r.scene ?? '—'}
  挂载概念：${r.concepts.join('·')}
  微型世界：${r.micro.filter(Boolean).join(' / ')}${
        r.deep
          ? `\n  已有五问推演：①${r.deep.q1}\n    ②${r.deep.q2}\n    ③${r.deep.q3}\n    ④${r.deep.q4}\n    ⑤${r.deep.q5}`
          : ''
      }`
    })
    .join('\n\n')
}

function craftBrief(ids: string[]): string {
  const cards = assets.craftBy(ids)
  if (!cards.length) return ''
  return `\n\n【本环节适用的方法论（必须遵守其中的判据）】\n${cards
    .map((c) => `── ${c.title} ──\n${c.body}`)
    .join('\n\n')}`
}

export interface PromptSpec {
  system: string
  prompt: string
  role: string
}

export function buildStagePrompt(projectId: string, stageId: string, actionId: string): PromptSpec {
  const stage = STAGE_MAP[stageId]
  const p = projects.get(projectId)!
  const st = stageStore.all(projectId)
  const action = stage.ai?.find((a) => a.id === actionId)
  const role = action?.role ?? '总策划'

  const v = VENUE_MAP[p.venue ?? ''] ?? VENUE_MAP['fanqie-m']
  const head = `作品《${p.title}》｜阵地：${v.name}（${v.channel}）${p.logline ? `｜卖点：${p.logline}` : ''}\n当前环节：${stage.no} ${stage.title} —— ${stage.purpose}\n`
  const rules = `\n【本书选用的规则】\n${ruleBrief(projectId)}\n`
  const craft = craftBrief(stage.craft)
  const gate = `\n\n【本环节门禁（你的产出必须能过这些）】\n${stage.gate.map((g) => `· ${g.text}${g.hard ? ' 【硬项】' : ''}`).join('\n')}`

  let body = ''
  const d = (id: string) => st[id]?.data ?? {}

  switch (`${stageId}/${actionId}`) {
    case 'b1-market/scan':
      body = `按「需求存量 × 供给缺口 × 规则库优势」的三元交集，为这本书给出 2-3 个候选赛道。
每个候选写：赛道名 / 需求判断（榜单头部更新状态与读者活跃）/ 供给缺口（窗口期在哪）/ 我的规则库优势（能用哪些规则）/ 对标书 3 本及各自规则差 / 我的差异一句话。
最后给一条推荐与理由，并指出这条路上最大的风险。`
      break

    case 'b3-rules/recon':
      body = `为下面这些候选规则设计同类调研方案（关口零）。
对每条规则：① 给 5-8 个用来在番茄/起点搜索的关键词与书名模式；② 列出最可能已经占了这条规则的作品类型；③ 给出判定"空白/零星/密集/红海"的具体标准；④ 如果撞车，给 2 条仍然可用的留白方向。
记住：高星 ≈ 高撞车。组合是绕开红海的主要武器。`
      break

    case 'b4-operator/variants':
      body = `对主规则跑全部五个改写算子（反转/量化/交易化/垄断化/隐藏化），每个算子给：
· 改写后的规则一句话
· 这个世界最刺眼的一个画面
· 天然适配的题材与平台
· 它的天花板（能撑几卷）与地板（第一章好不好写）
最后推荐一个主算子，说明为什么，并指出如果选它、第二卷最可能在哪里崩。`
      break

    case 'b5-graph/propagate': {
      const concepts = projectRules.list(projectId).flatMap((r) => r.rule?.concepts ?? [])
      const edges = assets.edges().filter((e) => concepts.includes(e.src) || concepts.includes(e.dst))
      body = `入口概念：${[...new Set(concepts)].join('、')}
可用的因果边（源→目标｜强度｜方向｜反馈｜机制）：
${edges.map((e) => `  ${e.src}→${e.dst}｜${e.strength}｜${e.direction}｜${e.feedback}｜${e.mechanism}`).join('\n')}

跑三阶传导，产出《扰动路径图》：
1 一阶：逐条边问"扰动沿这条边过去，目标概念发生什么"，给具体后果不要抽象词。
2 二阶：继续外推一层。
3 环路：至少找出一个正反馈环（阶层固化引擎）和一个负反馈环（世界为什么还没崩）。
⚠ 这张图谱的正反馈边严重过采样（87:15）。如果你找不到现成的负反馈环，必须自己补一个刹车，并说明补的是哪一类：制度（税收/配额/反垄断/禁令）、物理（上限/代价递增/边际递减）、社会（伦理反弹/禁忌）、还是对手（既得利益者的镇压——这一类最好用，刹车本身就是反派）。`
      break
    }

    case 'b6-civ/five':
      body = `跑五问推演。顺序即因果链，不可跳步，后一问必须能从前一问推出来。
① 社会剧变：社会/商业/法律/人 四个切面各发生什么（每个切面 2-3 条具体的事，不要抽象概括）
② 谁受益 · 谁受损：写出具体的阵营，不是"富人穷人"这种懒惰分法
③ 新权力结构：谁掌握新规则的分配权/审批权/豁免权
④ 最激烈的冲突：必须发生在 ② 的两个阵营之间
⑤ 爽点在哪：主角站在冲突的哪个位置，兑现什么落差

已有的扰动路径：${JSON.stringify(d('b5-graph'))}`
      break

    case 'b6-civ/six':
      body = `根据下面的五问推演结果，固化出稳态六件套：新法律 / 新经济 / 新职业 / 新组织 / 新黑市 / 新战争。
每件套给 2-4 条具体的东西（有名字、有细节），不要写成概念说明。
⚠ 黑市是自洽性的试金石：一个没有黑市的架空文明一定是假的。如果你想不出黑市，直接说明——那意味着规则的稀缺性或代价设计有问题。
最后给三层纵深各一句话假设：表层稳态（1-2卷）/ 隐藏结构（3-4卷揭开）/ 元规则（终卷）。

五问推演：
${JSON.stringify(d('b6-civ'), null, 1)}`
      break

    case 'b7-concept/logline':
      body = `按模板生成 5 个一句话卖点变体：
  当〔现实规则〕变成〔改写后规则〕，一个〔与新规则关系特殊的主角〕必须/可以〔核心动作〕。
每个变体后面附三条自评：可传播（能否被原样转述）/ 自展开（听者会追问什么）/ 有主角位（句子里有没有站着一个人）。
然后按立项评分卡十项给每个变体打分（0-2 分/项）并给总分，推荐得分最高的一个。
最后给 3 个书名候选：${VENUE_MAP[p.venue ?? '']?.name.includes('番茄') ? '番茄向——书名直接把规则差说出来' : '起点向——可留一层势，但简介第一行必须给出规则差'}。

文明推演结果：
${JSON.stringify(d('b6-civ'), null, 1)}`
      break

    case 'b7-concept/elevator':
      body = `你是一个没看过任何设定的普通读者，在电梯里听到了这句卖点：
"${d('b7-concept').logline ?? p.logline ?? '（尚未填写）'}"

如实反应：你能原样转述给第三个人吗？你会追问什么（列出你脑子里自动冒出来的问题）？还是你只想礼貌点头？
然后说：你会不会点开这本书？为什么？最后指出这句话里最没劲的那个词。`
      break

    case 'c1-resource/flow':
      body = `为这个世界确定 1-2 种核心资源，每种按五要素做深：产生源头 / 流动路径 / 沉淀形态 / 黑市形态 / 世界观类比。
另外给两条硬约束：① 总量与再生速率（防数值膨胀的锚）；② 主角的获取路径差——主角获取这种资源的方式与常人有何结构性不同，这就是金手指的资源学定义。
提示：${VENUE_MAP[p.venue ?? '']?.name.includes('番茄') ? '番茄偏爱可量化的无形资源（数值可见＝爽点可见）' : '起点偏爱守恒严格的有形资源体系（审计快感）'}。

文明稳态：${JSON.stringify(d('b6-civ'), null, 1)}`
      break

    case 'c2-power/ladder':
      body = `设计力量体系的等级表，四列必须对齐：境界名称 / 资源门槛 / 规则权限 / 社会身份。
军规：
· 等级必须是资源的函数，门槛要精确到资源的状态（持有？固化？流通？收益？）——写不清就会在黄金三章被读者审计出漏洞。
· 每个大境界解锁一种新的规则权限（低级只能用规则→中级能钻空子→高级能局部改写规则）。
· 每一级要有对应的社会身份、法律权利、经济待遇。
· 总级数 ≈ 卷数 × 1.5。
然后给：代价机制（同币种/可转嫁/延迟支付）、至少两种金手指刹车、三次换轨各一句话。
最后自测：任取两个相邻等级的角色对战，30 秒内说出胜负与原因。说不出就重做。

核心资源：${JSON.stringify(d('c1-resource'), null, 1)}`
      break

    case 'c6-bible/day':
      body = `写一张"文明快照：普通人的一天"——用一个具体 NPC 的 24 小时，校验所有设定是否落地。
他叫什么、干什么活、早餐吃什么、通勤怎么走、工作里最怕哪一条规则、下班后最想要什么、睡前算的是哪一笔账。
要求：全程不解释设定，只让设定从动作里渗出来。写完之后，用一句话指出这张快照暴露了哪条设定还没想清楚。`
      break

    case 'c6-bible/terms':
      body = `为这个世界拟术语表，最多 7 个进入前十章。
构词法：熟词 + 新义（如"向下权""时窖""命税"——第一次见就能猜出七成含义）。拒绝生造音译词。
每个术语给：词 / 含义 / 它第一次出现时读者应该怎么理解 / 它在哪一卷会被翻转出第二层含义。`
      break

    case 'd1-hero/hero':
      body = `设计主角卡。
1 站位三选一：例外者（规则对他不生效）/ 套利者（比所有人更早更深理解规则）/ 执法者（持有规则的执行审判权限）。说明为什么选这个。
2 开局困境：必须由新规则直接造成，且要数字化、具体化（还剩 3 天 / 欠 47 万 / 信用分 11）。
3 双层动机：表层具体而小（救妹妹、还债、活过这个月），深层中期觉醒（改写规则本身）。开局只给表层。
4 性格 = 对规则的态度（敬畏/戏耍/憎恨/利用），这是人物弧光的坐标轴。
5 一句话人设（改编时不失真的那种）。
6 第一章他手里握着的那个东西是什么。`
      break

    case 'd1-hero/faces':
      body = `排出前 10 张脸（打脸链）。级别递增，每 20-30 章消耗一张。
每张脸给：名字 / 身份与级别 / 他凭什么看不起主角 / 主角用哪条规则差打他 / 见证者是谁 / 预计在第几章消耗。
注意：打脸对象不能是无名路人（没有情绪投射价值），每个阵营至少要有一张脸。`
      break

    case 'f1-outline/arc':
      body = `把这本书规划成四层揭露结构，给出卷级分配。
L1 表层规则（1-2卷，读者："这设定真爽"）→ L2 隐藏结构（3-4卷，"原来还有内幕"）→ L3 规则的管理员（5-7卷，"格局打开了"）→ L4 元规则（8-终卷，"居然能圆回来"）。
每一层给：本层要揭露什么、主角的力量轨道在哪一轨、本层最大的爽点、本层结束时读者的新认知。
⚠ 规则守恒：终卷的一切必须在第一卷已经埋下种子。请明确指出第一卷里哪几个细节是终局的种子。
最后写第一章的开场切口（谁｜在哪｜握着什么｜做什么），必须是场景不是社论标题。`
      break

    case 'f2-volume/vol': {
      const vs = volumes.list(projectId)
      body = `为下面这一卷细化卷纲：单卷目标 / 核心冲突 / 爽点分布 / 卷末大高潮 / 涉及伏笔的埋与收。
卷模板：卷首新地图或新阶层 → 本卷规则差展示 → 主角建立局部优势 → 中段危机（代价清算或身份暴露）→ 卷尾大爽点 + 下一层的钩子。
这一卷同时要能作为一个独立的短剧闭环（IP 接口），请指出哪一段是那个闭环。

已有卷结构：
${vs.map((v) => `${v.vid}《${v.title}》｜目标：${v.goal ?? '未定'}｜层级：${v.reveal_layer ?? '未定'}`).join('\n') || '（尚未建卷）'}`
      break
    }

    case 'f3-threads/seed':
      body = `为这本书开出初始悬念账本，10-15 条。
三层配比：章级 70%（当章或次章揭，维持翻页）/ 卷级 25%（卷首埋卷尾揭，维持追更）/ 书级 1-3 条（第一卷埋终卷揭，通常＝元规则之谜，维持口碑）。
每条给：悬念内容 / 层级 / 读者可见线索（埋的时候读者看到的是什么）/ 真相 / 计划埋设章 / 计划回收章。
⚠ 禁止"埋了但没记回收计划"。书级悬念要标明每卷用什么方式露头一次。`
      break

    case 'f4-beats/line': {
      const vs = volumes.list(projectId)
      const th = threads.list(projectId)
      body = `为当前卷生成 40 章事件线。每章一行，格式：
第N章｜事件（谁做了什么、导致什么）｜节拍（蓄能/过渡/微爽/中爽/大爽）｜钩子型号（危机钩/悬念钩/期待钩/反转钩）｜埋 FS-xxx｜收 FS-xxx

纪律：
· 只写事件粒度，不写场景细节。
· ${VENUE_MAP[p.venue ?? '']?.name.includes('番茄') ? '番茄排期：每章一个微爽点，每 3 章一个中爽点，每 20-30 章一个卷级大爽点' : '起点排期：每 2-3 章一个中爽点，大爽点前允许 5-8 章蓄能，但蓄能期必须有进展感'}。
· 连续 3 章不得用同型钩子。
· ⚠ 排期自检看总量会漏，必须看间隔：${VENUE_MAP[p.venue ?? '']?.name.includes('番茄') ? '不得出现连续 ≥3 章无中爽及以上' : '不得出现连续 ≥8 章无中爽及以上'}。写完后自己扫一遍最大间隔并报告。

卷结构：
${vs.map((v) => `${v.vid}《${v.title}》｜${v.goal ?? ''}｜高潮：${v.climax ?? '未定'}`).join('\n') || '（尚未建卷）'}
伏笔账本：
${th.map((t) => `${t.fid}（${t.level}）${t.content}｜计划第${t.plan_ch ?? '?'}章回收`).join('\n') || '（账本为空）'}`
      break
    }

    case 'h3-diagnose/diag': {
      const ms = metrics.list(projectId)
      const chs = chapters.list(projectId)
      body = `按诊断决策树分析下面的章级数据，定位问题章并给出创作动作。

数据（章号｜完读｜追读｜流失｜停留｜书架）：
${ms.map((m) => `第${m.chapter_no}章｜${m.finish ?? '-'}｜${m.follow ?? '-'}｜${m.drop_off ?? '-'}｜${m.stay ?? '-'}｜${m.shelf ?? '-'}`).join('\n') || '（尚无数据）'}

对应章节的设计（章号｜节拍｜钩子型号｜事件）：
${chs.filter((c) => ms.some((m) => m.chapter_no === c.no)).map((c) => `第${c.no}章｜${c.beat}｜${c.hook_type ?? '-'}｜${c.event ?? c.core_event ?? '-'}`).join('\n')}

要求：
1 先判断样本量够不够（章级诊断至少 1000+ 展示，前 100 个读者只够判断死没死）。
2 逐个异常走决策树，指出是"蓄能超期/爽点空转/水章/钩子同型化/打脸链断档/规则差红利耗尽"里的哪一种。
3 给动作，并标注用的是哪个杠杆（回改已发章节 / 调整未发章节 / 调整卷计划）。
4 ⚠ 不可实验项不许动：规则差本身、主角站位、力量体系。数据只负责证伪立项，不负责摇摆日常。
5 每条结论标注证据等级。仅凭推测不得建议回改已发布正文。`
      break
    }

    case 'h5-retro/retro': {
      const th = threads.list(projectId)
      body = `做本卷复盘，回答资产回流四问，并给出回流到资产层的具体内容：
1 本卷哪个爽点数据最好 → 抽象成可复用的变奏模式（对手级别 × 见证场合 × 兑现资源 三轴的哪个组合）
2 哪个设定读者反应超预期（好或坏）→ 写成一句可以回写到规则笔记「实战记录」的话
3 哪次数据诊断判对了/判错了 → 该修订哪条健康线经验值
4 AI 流水线哪个环节返工最多 → 该修订哪个角色的提示词，怎么改

另外做伏笔对账：
${th.map((t) => `${t.fid}｜${t.status}｜埋第${t.planted_ch ?? '?'}章｜计划第${t.plan_ch ?? '?'}章收${t.actual_ch ? `｜实收第${t.actual_ch}章` : ''}`).join('\n') || '（账本为空）'}
指出：有没有逾期未收的？有没有书级悬念这一卷没露过头？`
      break
    }

    default:
      body = `请完成这一环节：${stage.purpose}
产出物：${stage.output}
需要填写的字段：${stage.fields.map((f) => f.label).join('、') || '（自由格式）'}
${action?.hint ? `\n具体要求：${action.hint}` : ''}`
  }

  const upstream = stage.needs.length
    ? `\n【上游环节产出】\n${stage.needs.map((n) => `── ${STAGE_MAP[n].title} ──\n${JSON.stringify(st[n]?.data ?? {}, null, 1)}`).join('\n')}\n`
    : ''

  return {
    role,
    system: ROLES[role]?.system ?? ROLES.总策划.system,
    prompt: head + rules + upstream + craft + gate + '\n\n【任务】\n' + body,
  }
}

/* ══════════ 流水线：章节级 ══════════ */

export type PipelineRole = '写手' | '审稿人' | '修订师' | '记录员' | '读者模型' | '运营模型'

export function buildChapterPrompt(
  projectId: string,
  chapterId: string,
  role: PipelineRole,
  extra?: string,
): PromptSpec {
  const p = projects.get(projectId)!
  const ch = chapters.get(chapterId)!
  const ctx = assemble(projectId, { chapterNo: ch.no, chapter: ch })
  const v = VENUE_MAP[p.venue ?? ''] ?? VENUE_MAP['fanqie-m']
  const words = `${v.words[0]}-${v.words[1]}`

  switch (role) {
    case '写手':
      return {
        role: '主笔作者',
        system: ROLES.主笔作者.system,
        prompt: `${ctx}

【任务】写第 ${ch.no} 章的正文，${words} 字。

动手前先在心里核对（不要输出核对过程）：本章的核心事件是什么、反转在哪、钩子是什么型、爽点在第几幕兑现、见证者是谁。
${ch.no <= 3 ? `\n⚠ 这是黄金三章之一，额外要求：
第1章：前 300 字内出现一个"现实里不可能"的具体场景（不是设定说明）；主角出场即处于新规则造成的、数字化的具体困境；禁止世界观讲解连续超过 3 句、禁止回忆童年、禁止配角先于主角出场。
第2章：金手指与规则差同源；激活伴随代价或限制的暗示；主角完成第一个微小但具体的翻盘（赢回 100 块也行，证明可用性不是碾压）。
第3章：一个完整的小型爽点闭环——蓄能（被轻视）→ 兑现（用规则差翻盘）→ 见证（至少一个配角态度反转）；抛出第一个卷级悬念。\n` : ''}
直接输出正文。${extra ? `\n\n补充要求：${extra}` : ''}`,
      }

    case '审稿人':
      return {
        role: '审稿人',
        system: ROLES.审稿人.system,
        prompt: `${ctx}

【待审正文】
"""
${ch.body ?? '（正文为空）'}
"""

【检查清单】
结构：一章一事？信息增量能一句话说清？三幕比例大致 10/70/20？开头两句内回到冲突？章尾钩子是四型之一且与前两章不同型？爽点节拍在排期上？字数在 ${words} 区间？
一致性：出场人物的言行对得上人物状态表吗（尤其：谁知道什么秘密——有没有人知道了他不该知道的事）？新设定与世界观圣经冲突吗？时间线合理吗？
AI味：有没有禁用词？有没有总结式结尾？有没有车轱辘话？情绪是不是被形容词代替了动作？
毒点：不可逆损失？主角降智（忽略自己已展示过的能力或信息）？蓄能超窗口？说教超过 3 句？题材背刺？

按角色约定的固定字段输出问题列表，最后给放行/退回结论。${extra ? `\n\n额外关注：${extra}` : ''}`,
      }

    case '修订师':
      return {
        role: '修订师',
        system: ROLES.修订师.system,
        prompt: `${ctx}

【原正文】
"""
${ch.body ?? ''}
"""

【要修的问题列表】
${extra ?? ch.review ?? '（无）'}

只改问题列表里点到的地方，其余保持原样。直接输出修改后的完整正文。`,
      }

    case '记录员':
      return {
        role: '记录员',
        system: ROLES.记录员.system,
        prompt: `${L2(projectId, ch.cast)}${L3(projectId, ch.no)}

【本章终稿】
"""
${ch.body ?? ''}
"""

按下面的格式输出状态增量，不要任何额外说明：

摘要：（150 字以内，写给未来的自己看的，不是复制正文。要包含：发生了什么、谁的状态变了、留下了什么）
信息增量：（一句话说清读者这一章知道了什么新的）
爽点：（本章的兑现是什么，没有就写"无"）
章末Hook：（原文那句）
人物状态变化：（每行一个，格式 C-xxx 名字：变了什么。没有就写"无"）
埋设伏笔：（FS-xxx：内容 | 计划回收章。没有就写"无"）
回收伏笔：（FS-xxx。没有就写"无"）
新设定：（需要分配 ID 入库的新地点/势力/道具/能力。没有就写"无"）
锁定项：（本章是否确立了"以后不能改"的关键设定。没有就写"无"）
⚠ 矛盾上报：（与既有真相源冲突的地方，发现就写清楚，不要自己圆。没有就写"无"）`,
      }

    case '读者模型':
      return {
        role: '读者模型',
        system: ROLES.读者模型.system,
        prompt: `你是「${VENUE_MAP[p.venue ?? '']?.name ?? '免费阅读平台'}」上的一个普通读者。你没有看过任何设定文档，你只读到过这本书前面的章节和现在这一章。

${L3(projectId, ch.no)}

【本章正文】
"""
${ch.body ?? ''}
"""

如实反应，不要客气。${extra ? `\n\n${extra}` : ''}`,
      }

    case '运营模型':
      return {
        role: '运营模型',
        system: ROLES.运营模型.system,
        prompt: `${L0(projectId)}${platformRules(p)}
${L3(projectId, ch.no)}

【本章正文】
"""
${ch.body ?? ''}
"""

按平台硬约束逐条核：字数口径、开头钩子位置、爽点密度与位置、章末钩子强度与型号、节奏与信息密度、是否单线清晰。
每条给「过/不过/存疑」+ 一句理由（不过的要指出具体位置）。最后给：这一章会不会掉数据、掉在哪。`,
      }
  }
}

/** 架构师：整卷事件线 */
export function buildArchitectPrompt(projectId: string, volumeId: string): PromptSpec {
  const v = volumes.list(projectId).find((x) => x.id === volumeId)!
  const p = projects.get(projectId)!
  return {
    role: '架构师',
    system: ROLES.架构师.system,
    prompt: `${L0(projectId)}${L1(projectId, volumeId)}
${L2(projectId, [])}
${platformRules(p)}

【任务】为 ${v.vid}《${v.title}》生成逐章事件线（30-40 章）。
每章一行：第N章｜事件｜节拍（蓄能/过渡/微爽/中爽/大爽）｜钩子型号｜埋 FS-xxx｜收 FS-xxx
写完后自己扫一遍爽点的最大间隔并报告；连续 3 章同型钩子的地方要自己调开。`,
  }
}

export { L0, L1, L2, L3, L4, assemble }
