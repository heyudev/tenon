// 发布阵地全景
//
// 建模纠正：平台与频道**不是两根独立的轴**。
//   起点中文网本身就是男频站，女频在同集团的另外几个站；
//   番茄男频与女频虽同属一个 App，但分类、榜单、读者画像、主流题材各不相同。
// 所以正确的单元是「阵地 = 运营商 × 频道」，两层：
//   运营商层（Operator）—— 商业模型、结算、签约上架、后台、审核。同一运营商下各阵地共享
//   阵地层（Venue）    —— 读者画像、主流题材、榜单分类、节奏参数、字数。逐阵地不同
//
// 知识纪律（不变）：
//   结构性机制写在这里；分成比例、全勤、签约门槛、榜单名称这类会变的，
//   一律标 volatile 留空，由作者核实后自己填并记日期。
//   **不写任何我没把握的具体数字**——看起来精确、实际过期的数字比没有更危险。

export type ChannelId = '男频' | '女频'
export type OperatorId = '番茄' | '七猫' | '阅文' | '晋江' | '纵横'
export type VenueId =
  | 'fanqie-m' | 'fanqie-f'
  | 'qimao-m' | 'qimao-f'
  | 'qidian' | 'qdmm' | 'hongxiu' | 'yunqi'
  | 'jjwxc'
  | 'zongheng'

export interface Fact {
  k: string
  v: string
  /** 易变：平台随时调整，必须自行核实 */
  volatile?: boolean
  /** 为什么这一条重要 */
  why?: string
}

/** 运营商：商业模型层。同一运营商下的各阵地共享这些 */
export interface Operator {
  id: OperatorId
  name: string
  biz: '免费阅读 · 广告分成' | '付费订阅'
  model: string
  revenue: Fact[]
  onboarding: Fact[]
  contentRules: Fact[]
  distribution: Fact[]
  dashboard: Fact[]
  ops: Fact[]
  risk: Fact[]
}

/** 阵地：作者实际投稿的那个地方 */
export interface Venue {
  id: VenueId
  operator: OperatorId
  name: string
  channel: ChannelId
  tagline: string
  /** 什么时候定生死 */
  deathline: string
  /** 这个阵地看什么指标 */
  metrics: string[]
  /** 单章字数区间 */
  words: [number, number]
  wordsNote: string
  /** 中爽及以上的最大允许间隔（章） */
  maxBeatGap: number
  /** 蓄能的耐受窗口（章） */
  tensionWindow: number
  /** 读者画像 */
  readers: string
  /** 这个阵地的主流题材 */
  hotGenres: string[]
  /** 阵地硬规则 */
  hardRules: string[]
  /** 榜单与分类、阵地特有的东西 */
  notes: Fact[]
}

export const DIMENSIONS = [
  { id: 'revenue', label: '收入与结算', desc: '钱从哪来、怎么算、什么时候到' },
  { id: 'onboarding', label: '开书到上架', desc: '注册 → 签约 → 上架的完整路径' },
  { id: 'contentRules', label: '内容规范', desc: '字数口径、章节、分卷、审核' },
  { id: 'distribution', label: '流量与分发', desc: '谁决定你的书被推给多少人' },
  { id: 'dashboard', label: '数据后台', desc: '能看到什么指标、什么时候能看到' },
  { id: 'ops', label: '运营动作', desc: '更新节奏、活动、读者互动' },
  { id: 'risk', label: '风险', desc: '会怎么死' },
] as const

export type DimensionId = (typeof DIMENSIONS)[number]['id']

/* ══════════════ 运营商层 ══════════════ */

const FREE_COMMON = {
  revenue: [
    { k: '主要收入', v: '广告分成——读者读你的书时看到的广告，按有效阅读产生收益', why: '这就是为什么留存＝收入：读得越久，广告位越多' },
    { k: '计价口径', v: '按有效阅读量／时长结算，不是按订阅份数', why: '决定了"让人一直读下去"比"让人愿意付钱"更重要' },
    { k: '分成比例／单价', v: '', volatile: true, why: '直接决定收入预期，必须查当期官方说明' },
    { k: '全勤奖', v: '有全勤机制，要求日更字数与更新天数', volatile: true, why: '新书期的主要现金流，断一天可能整月归零' },
    { k: '签约形式', v: '常见有分成、保底、买断几类，条款差异很大', volatile: true, why: '买断＝旱涝保收但放弃上限；分成＝赌数据' },
    { k: '结算周期', v: '', volatile: true },
    { k: '独家与否', v: '独家通常有更高分成或更多资源位，代价是不能多平台发', why: '影响你能不能一稿多投' },
  ],
  onboarding: [
    { k: '开书门槛', v: '注册即可开书，不需要先签约', why: '试错成本极低——这是免费阅读平台最大的结构优势' },
    { k: '签约时机', v: '积累一定字数后申请或被编辑联系；数据是主要依据', volatile: true },
    { k: '签约字数门槛', v: '', volatile: true },
    { k: '审核', v: '开书与章节都要过内容审核；免费平台受众最广，尺度把控更紧', why: '尺度问题在这里比在付费平台更容易出事' },
    { k: '上架概念', v: '没有"上架/入V"这一步——免费阅读，一开始就对所有人开放', why: '所以生死线全部前移到前三章' },
  ],
  contentRules: [
    { k: '字数口径', v: '', volatile: true, why: '关系到全勤达标判定' },
    { k: '章节标题', v: '标题即钩子，可以直白、可以长，直接写冲突或悬念', why: '标题是列表页唯一的抓手，是免费的钩子位' },
    { k: '分卷', v: '分卷概念弱化，读者基本按章连续读', why: '不要指望用卷来做节奏，节奏全在章级' },
    { k: '排版', v: '段落短、对白多、留白多；长段落在手机屏上是劝退', why: '视觉密度直接影响完读率' },
    { k: '敏感与审核红线', v: '暴力、情色、政治、宗教民族、犯罪教学等；具体口径以平台规则为准', volatile: true },
  ],
  distribution: [
    { k: '分发主体', v: '算法。书像短视频一样被分发：冷启动流量池 → 数据达标 → 更大流量池', why: '书的命运由数据决定，不由编辑决定——这对会读数据的作者是巨大红利' },
    { k: '冷启动', v: '新书进入小流量池试水，用前几章的留存数据决定是否放大', why: '前三章定生死的机制根源' },
    { k: '编辑推荐权重', v: '低于算法。编辑资源存在但不是决定性因素', why: '不要把精力全花在维护编辑关系上' },
    { k: '标签', v: '标签决定算法把书分发给谁；选错比没选更糟', why: '错误分发会带来"根本不是目标读者"的差评' },
    { k: '翻身机会', v: '数据不好基本没有二次分发机会', why: '所以黄金三章要按数据反复重写——它是投放素材，不是文物' },
  ],
  dashboard: [
    { k: '可见指标', v: '在读人数、完读率、追读率、章节流失分布、加书架、阅读时长等', volatile: true },
    { k: '刷新频率', v: '', volatile: true, why: '决定你多久能做一次诊断' },
    { k: '章级粒度', v: '通常可看到逐章数据，这是定位事故章的关键', why: '流失尖峰章＝事故章，必须能定位到章' },
    { k: '样本量', v: '章级诊断至少等该章 1000+ 展示；前 100 个读者只够判断"死没死"', why: '过早下结论会把正常波动当成问题' },
  ],
  ops: [
    { k: '更新节奏', v: '高频更新有利算法；日更甚至多更是常态', why: '更新频率本身是算法权重之一' },
    { k: '断更后果', v: '影响推荐权重，且可能影响全勤', volatile: true, why: '这是存稿必须有下限的原因' },
    { k: '回改已发章节', v: '支持，且应该做——尤其是黄金三章', why: '成本最低的一个数据杠杆' },
    { k: '读者互动', v: '评论区为主；读者画像偏碎片阅读，互动深度低于付费平台' },
    { k: '活动与征文', v: '平台活动频繁，参加活动通常带资源位', volatile: true },
  ],
  risk: [
    { k: '头号死法', v: '前三章数据差 → 永远拿不到流量 → 写下去也没人看', why: '所以开篇要写 3-5 版比着选' },
    { k: '审核风险', v: '免费平台受众最广，尺度问题更容易出事', why: '核心设定踩线要在立项时就发现' },
    { k: '读者容差', v: '对文笔容忍度极高，对"不爽"容忍度极低', why: '结构问题比文笔问题致命得多' },
    { k: '换书成本', v: '数据差时换书比硬救更划算', why: '这是与付费平台最大的策略差异' },
  ],
} satisfies Omit<Operator, 'id' | 'name' | 'biz' | 'model'>

const PAID_COMMON = {
  revenue: [
    { k: '主要收入', v: 'VIP 章节订阅分成。读者按章付费，作者拿分成', why: '一个愿意付钱的读者，价值远高于一个免费读者——这决定了写作策略' },
    { k: '计价口径', v: '按订阅的字数计价（含标点的总字数）', why: '这就是为什么字数口径是硬闸——它直接是钱' },
    { k: '千字分成／比例', v: '', volatile: true },
    { k: '其它收入', v: '月票／推荐票相关奖励、打赏、全勤、各类征文奖金；长线还有完本与长尾收益', volatile: true },
    { k: '签约形式', v: '常见有分成、保底、买断；不同合同对 IP 改编权的处理差异很大', volatile: true, why: '改编权条款要逐条看——世界观是固定资产，别随手签掉' },
    { k: '结算周期', v: '', volatile: true },
  ],
  onboarding: [
    { k: '开书门槛', v: '注册即可开书发公众章' },
    { k: '签约', v: '达到一定字数后申请签约，编辑审稿决定；签约是上架的前提', volatile: true, why: '不签约就没有 VIP 章，也就没有订阅收入' },
    { k: '签约字数门槛', v: '', volatile: true },
    { k: '公众期', v: '签约后到上架前的免费章节期，任务是积累收藏', why: '这一段的唯一 KPI 是收藏，不是爽' },
    { k: '上架（入 V）', v: '从某一章开始转为付费；上架首日的订阅数基本决定这本书的命运', volatile: true, why: '首订是命门——所有前期工作都在为这一天蓄力' },
    { k: '上架前准备', v: '入 V 前最后一章要有强钩子；上架首章要给足；建议囤稿', why: '上架期断更或降质＝直接损失最贵的一批读者' },
  ],
  contentRules: [
    { k: '字数口径', v: '含标点的总字数（≈文件总字符）', why: '这是计费口径，也是全勤判定口径' },
    { k: '章节标题', v: '可以含蓄，也可以直白；不像免费平台那样必须当钩子用' },
    { k: '分卷', v: '分卷体系明确，卷是读者感知进度的单位', why: '卷末大高潮是拉数据的节点' },
    { k: '设定容忍度', v: '可以写更厚的世界观、更复杂的多线，但仍不许大段堆开头', why: '这是相对免费平台最大的创作自由度' },
    { k: '审核', v: '同样有内容审核；对设定的容忍度高，对违规内容不会更松', volatile: true },
  ],
  distribution: [
    { k: '分发主体', v: '编辑推荐位 + 榜单 + 分类页；算法权重低于免费平台', why: '编辑关系与推荐位申请是真实的工作项' },
    { k: '推荐位', v: '不同位置的量级差异很大，通常需要申请或由编辑分配', volatile: true },
    { k: '榜单体系', v: '多套榜单各自对应不同的读者行为，具体榜单名与规则见各阵地', volatile: true, why: '知道自己在冲哪个榜，才知道该动员读者做什么' },
    { k: '书评区', v: '老读者会写长评、打分、在社区安利或劝退', why: '设定漏洞会被做成劝退帖置顶——这就是逻辑自洽是商业要求的原因' },
  ],
  dashboard: [
    { k: '上架前可见', v: '收藏、推荐票、点击等', why: '公众期只能靠收藏判断，没有订阅数据' },
    { k: '上架后可见', v: '订阅数、首订、追订、均订等', volatile: true, why: '订阅数据只有上架后才有——这是与免费平台最大的诊断差异' },
    { k: '追订/均订比', v: '最新章订阅 / 平均订阅。低于约七成说明近期内容在劝退老读者', why: '这是最灵敏的近期质量指标' },
    { k: '章评/段评', v: '文本反馈量大且质量高', why: '老读者的差评是免费的结构诊断' },
  ],
  ops: [
    { k: '更新节奏', v: '稳定日更；签约后通常有全勤要求', volatile: true },
    { k: '断更后果', v: '影响全勤与追读粘性；老读者对断更的记忆比免费读者长', why: '这里的读者是主动追更的，断更＝背叛' },
    { k: '回改已发章节', v: '相对不鼓励——付费读者已经为旧章付过钱', why: '这是与免费平台的关键策略差异：这里要靠"调整未发章节"而不是回改' },
    { k: '读者互动', v: '书评区、章说、书友群；互动深度高，读者会形成社群', why: '社群本身是留存资产' },
    { k: '完本', v: '完本有加成，且完本书有长尾收益', why: '太监的代价在这里比免费平台大得多' },
  ],
  risk: [
    { k: '头号死法', v: '上架首订差 → 收入撑不住 → 太监', why: '所以公众期的唯一任务是攒收藏' },
    { k: '逻辑风险', v: '老读者对设定漏洞零容忍，会公开做劝退', why: '一致性闸在这里是商业必需品' },
    { k: '慢热陷阱', v: '容忍慢热，但不容忍"拿慢热当水字数的借口"' },
    { k: '合同风险', v: 'IP 改编权条款要逐条看清', volatile: true, why: '世界观是固定资产，签掉了就不是你的了' },
  ],
} satisfies Omit<Operator, 'id' | 'name' | 'biz' | 'model'>

export const OPERATORS: Record<OperatorId, Operator> = {
  番茄: {
    id: '番茄',
    name: '番茄小说',
    biz: '免费阅读 · 广告分成',
    model: '字节系。算法分发，留存驱动推荐量。男女频同一 App 内分频道运营。',
    ...FREE_COMMON,
  },
  七猫: {
    id: '七猫',
    name: '七猫免费小说',
    biz: '免费阅读 · 广告分成',
    model: '免费阅读阵营的另一极。整体逻辑与番茄同构，具体分成与流量结构以官方为准。',
    ...FREE_COMMON,
  },
  阅文: {
    id: '阅文',
    name: '阅文集团',
    biz: '付费订阅',
    model: '起点／起点女生网／红袖添香／云起书院同属一系。**各站是独立阵地**，编辑体系、榜单、读者群都不同。',
    ...PAID_COMMON,
  },
  晋江: {
    id: '晋江',
    name: '晋江文学城',
    biz: '付费订阅',
    model: '独立体系的女频重镇。VIP 订阅制，读者社群成熟、评论文化强势。',
    ...PAID_COMMON,
  },
  纵横: {
    id: '纵横',
    name: '纵横中文网',
    biz: '付费订阅',
    model: '男频付费站。规模小于起点，但仍是男频订阅向的一个选项。',
    ...PAID_COMMON,
  },
}

/* ══════════════ 阵地层 ══════════════ */

const FREE_HARD = [
  '第一章前 300~500 字必须出钩子，禁止先铺世界观',
  '前三章交代清楚：主角是谁、金手指/能力是什么、第一个爽点、大目标方向',
  '每章章末必须留强钩，无钩不发',
  '憋屈超过 1~2 章未释放即危险',
  '单线清晰，不要复杂多线并行',
]
const PAID_HARD = [
  '世界观有体系、有上升空间，但仍不许大段堆在开头',
  '成长/情感节奏不许断层，每阶段有对应爽点、对手、目标',
  '主线不许失焦，卷末必须有大高潮',
  '入 V 前的公众章末尾要有强钩子冲订阅转化',
  '逻辑自洽是商业要求不是艺术追求——漏洞会被做成劝退帖',
]

export const VENUES: Venue[] = [
  {
    id: 'fanqie-m',
    operator: '番茄',
    name: '番茄 · 男频',
    channel: '男频',
    tagline: '免费男频的最大流量池',
    deathline: '前 3 章。冷启动数据决定这本书的流量天花板。',
    metrics: ['完读率', '追读率', '停留时长', '加书架率'],
    words: [2000, 3000],
    wordsNote: '碎片阅读，段短、对白多、留白多，手机屏读感优先',
    maxBeatGap: 3,
    tensionWindow: 2,
    readers: '下沉市场为主，碎片时间，"小白"占比高。被算法推来的陌生人，耐心极低。',
    hotGenres: ['都市异能', '系统流', '赘婿逆袭·战神归来', '规则怪谈', '末世求生', '都市职场商战'],
    hardRules: FREE_HARD,
    notes: [
      { k: '分类与榜单', v: '', volatile: true, why: '决定你的书跟谁比、被谁看见' },
      { k: '爽点密度', v: '每章至少一个微爽点；连续 3 章无中爽即红线', why: '这是系统判门禁的依据' },
      { k: '标题风格', v: '直白、冲突前置、可以长', why: '列表页唯一抓手' },
    ],
  },
  {
    id: 'fanqie-f',
    operator: '番茄',
    name: '番茄 · 女频',
    channel: '女频',
    tagline: '免费女频的主战场',
    deathline: '前 3 章。同样是算法冷启动。',
    metrics: ['完读率', '追读率', '停留时长', '加书架率'],
    words: [2000, 3000],
    wordsNote: '同男频：碎片阅读，段短、对白多',
    maxBeatGap: 3,
    tensionWindow: 2,
    readers: '女性向下沉读者为主，碎片时间。对情绪价值敏感，对"憋屈"和"被辜负"的忍耐度更低。',
    hotGenres: ['娱乐圈', '重生复仇', '现代言情', '穿书快穿', '年代文', '宅斗宫斗'],
    hardRules: [
      ...FREE_HARD,
      '情感线是主轴之一：每 5-8 章必须有一次关系状态变化，长期停滞即掉追读',
      '女主必须始终保有主动权，不靠别人替她解决核心问题',
    ],
    notes: [
      { k: '分类与榜单', v: '', volatile: true },
      { k: '与男频的差别', v: '同一 App、同一套算法逻辑，但分类页、榜单、题材、读者预期完全不同', why: '不要拿男频的爽点节奏套女频' },
      { k: '雷区加码', v: '误会流拖过 3 章、男主越界被美化、女主恋爱脑——这几条在免费平台掉数据最快', why: '免费读者划走的成本为零' },
    ],
  },
  {
    id: 'qimao-m',
    operator: '七猫',
    name: '七猫 · 男频',
    channel: '男频',
    tagline: '免费男频的第二极',
    deathline: '前 3 章。',
    metrics: ['完读率', '追读率', '停留时长'],
    words: [2000, 3000],
    wordsNote: '同免费阅读通例',
    maxBeatGap: 3,
    tensionWindow: 2,
    readers: '与番茄男频高度重叠，具体画像差异以平台数据为准。',
    hotGenres: ['都市异能', '系统流', '赘婿逆袭·战神归来', '末世求生'],
    hardRules: FREE_HARD,
    notes: [
      { k: '与番茄的差异', v: '', volatile: true, why: '分成、流量规模、审核口径都要单独核实，别默认与番茄一致' },
      { k: '分类与榜单', v: '', volatile: true },
    ],
  },
  {
    id: 'qimao-f',
    operator: '七猫',
    name: '七猫 · 女频',
    channel: '女频',
    tagline: '免费女频的第二极',
    deathline: '前 3 章。',
    metrics: ['完读率', '追读率', '停留时长'],
    words: [2000, 3000],
    wordsNote: '同免费阅读通例',
    maxBeatGap: 3,
    tensionWindow: 2,
    readers: '与番茄女频高度重叠，具体画像差异以平台数据为准。',
    hotGenres: ['现代言情', '重生复仇', '年代文', '穿书快穿'],
    hardRules: [...FREE_HARD, '情感线每 5-8 章要有关系状态变化'],
    notes: [
      { k: '与番茄的差异', v: '', volatile: true },
      { k: '分类与榜单', v: '', volatile: true },
    ],
  },
  {
    id: 'qidian',
    operator: '阅文',
    name: '起点中文网',
    channel: '男频',
    tagline: '男频付费的标杆',
    deathline: '前 30 章的收藏→首订转化。上架首订基本决定命运。',
    metrics: ['收藏转化', '首订率', '追订/均订比', '章评情绪'],
    words: [3000, 4500],
    wordsNote: '按含标点的总字数计费口径。低于下限不得送审，扩写只补信息密度不加气氛',
    maxBeatGap: 8,
    tensionWindow: 5,
    readers: '老书虫密度最高。设定党、考据党聚集，吃长线、吃纵深，对逻辑漏洞零容忍。',
    hotGenres: ['玄幻修仙', '武侠', '历史权谋', '科幻', '都市异能', '无限流'],
    hardRules: PAID_HARD,
    notes: [
      { k: '这是男频站', v: '起点中文网本身面向男频。女频作品应投同集团的女频阵地，不是这里', why: '投错阵地＝读者根本不在这里' },
      { k: '榜单体系', v: '推荐票、收藏、月票等多套榜；具体名称与规则以官方为准', volatile: true },
      { k: '月票', v: '月票榜是重要曝光来源，通常有月末冲榜动员', volatile: true },
      { k: 'IP 改编', v: '影视/动漫/游戏改编通道最成熟', why: 'IP 思维的书优先考虑这里' },
    ],
  },
  {
    id: 'qdmm',
    operator: '阅文',
    name: '起点女生网',
    channel: '女频',
    tagline: '阅文体系的女频阵地',
    deathline: '前 30 章的收藏→首订转化。',
    metrics: ['收藏转化', '首订率', '追订/均订比', '章评情绪'],
    words: [3000, 4500],
    wordsNote: '含标点的总字数计费口径',
    maxBeatGap: 8,
    tensionWindow: 5,
    readers: '女频付费读者，吃长线与人物关系，对人设崩塌与男主越界零容忍。',
    hotGenres: ['女强玄幻仙侠', '宅斗宫斗', '现代言情', '重生复仇', '穿书快穿'],
    hardRules: [
      ...PAID_HARD,
      '情感线与成长线双主轴并行，两条线要互相供能',
      '女主要有独立于感情的目标，感情必须有回应',
    ],
    notes: [
      { k: '与起点中文网的关系', v: '同集团、不同站。编辑体系、榜单、读者群都是独立的', why: '这正是"起点×女频"不是一个合法组合的原因' },
      { k: '榜单与分类', v: '', volatile: true },
      { k: '与红袖/云起的分工', v: '', volatile: true, why: '同集团几个女频站的定位差异，投稿前要自己确认' },
    ],
  },
  {
    id: 'hongxiu',
    operator: '阅文',
    name: '红袖添香',
    channel: '女频',
    tagline: '阅文体系的老牌女频站',
    deathline: '前 30 章的收藏→首订转化。',
    metrics: ['收藏转化', '首订率', '追订/均订比'],
    words: [3000, 4500],
    wordsNote: '含标点的总字数计费口径',
    maxBeatGap: 8,
    tensionWindow: 5,
    readers: '女频付费读者，偏情感向。',
    hotGenres: ['现代言情', '重生复仇', '宅斗宫斗', '年代文'],
    hardRules: [...PAID_HARD, '情感线是主轴，节拍要排到章'],
    notes: [
      { k: '定位', v: '', volatile: true, why: '与起点女生网、云起的分工要自己确认，别默认三站可以互换' },
      { k: '榜单与分类', v: '', volatile: true },
    ],
  },
  {
    id: 'yunqi',
    operator: '阅文',
    name: '云起书院',
    channel: '女频',
    tagline: '阅文体系的女频站之一',
    deathline: '前 30 章的收藏→首订转化。',
    metrics: ['收藏转化', '首订率', '追订/均订比'],
    words: [3000, 4500],
    wordsNote: '含标点的总字数计费口径',
    maxBeatGap: 8,
    tensionWindow: 5,
    readers: '女频付费读者。',
    hotGenres: ['女强玄幻仙侠', '现代言情', '穿书快穿'],
    hardRules: [...PAID_HARD, '情感线是主轴，节拍要排到章'],
    notes: [
      { k: '定位', v: '', volatile: true, why: '同集团几个女频站的差异要自己确认' },
      { k: '榜单与分类', v: '', volatile: true },
    ],
  },
  {
    id: 'jjwxc',
    operator: '晋江',
    name: '晋江文学城',
    channel: '女频',
    tagline: '女频的独立重镇',
    deathline: '收藏与积分决定曝光；上架后看订阅。',
    metrics: ['收藏', '评论量', '订阅', '追订'],
    words: [3000, 5000],
    wordsNote: '以平台计费口径为准',
    maxBeatGap: 8,
    tensionWindow: 6,
    readers: '女频核心读者群，评论文化强势、社群成熟。对人设、三观、逻辑的挑剔程度高于免费平台一个量级。',
    hotGenres: ['现代言情', '宅斗宫斗', '穿书快穿', '悬疑推理', '女强玄幻仙侠'],
    hardRules: [
      ...PAID_HARD,
      '三观问题会被公开讨论：男主越界、女主让渡主动权、雌竞过度，都会引发长评讨伐',
      '文案（简介）在这里的权重极高，是读者点进来的主要依据',
    ],
    notes: [
      { k: '体系独立', v: '与阅文系完全不同的站，签约、榜单、积分、读者文化都是自己一套', volatile: true, why: '别拿起点的经验套过来' },
      { k: '评论文化', v: '长评与讨论区活跃，读者反馈质量高但也更尖锐', why: '这里的读者反馈是最好的结构诊断来源' },
      { k: '积分/榜单规则', v: '', volatile: true },
      { k: '签约与上架规则', v: '', volatile: true },
    ],
  },
  {
    id: 'zongheng',
    operator: '纵横',
    name: '纵横中文网',
    channel: '男频',
    tagline: '男频付费的另一选项',
    deathline: '收藏→首订转化。',
    metrics: ['收藏', '首订', '追订'],
    words: [3000, 4500],
    wordsNote: '含标点的总字数计费口径',
    maxBeatGap: 8,
    tensionWindow: 5,
    readers: '男频付费读者，规模小于起点。',
    hotGenres: ['玄幻修仙', '都市异能', '历史权谋', '武侠'],
    hardRules: PAID_HARD,
    notes: [
      { k: '与起点的差异', v: '', volatile: true, why: '规模、分成、编辑资源都要单独核实' },
      { k: '榜单与分类', v: '', volatile: true },
    ],
  },
]

export const VENUE_MAP: Record<string, Venue> = Object.fromEntries(VENUES.map((v) => [v.id, v]))

export function venuesOf(channel: ChannelId): Venue[] {
  return VENUES.filter((v) => v.channel === channel)
}
export function venuesByBiz(biz: Operator['biz']): Venue[] {
  return VENUES.filter((v) => OPERATORS[v.operator].biz === biz)
}

/** 两类商业模型的关键差异——这是选阵地时最该先想清楚的 */
export const KEY_DIFFS: { item: string; free: string; paid: string; note: string }[] = [
  {
    item: '钱怎么来',
    free: '广告分成，按有效阅读结算',
    paid: 'VIP 订阅分成，按订阅字数结算',
    note: '前者卖时长，后者卖内容——决定了"留住"和"值得付费"哪个优先',
  },
  {
    item: '有没有上架这一步',
    free: '没有。开书即对所有人开放',
    paid: '有。公众期攒收藏 → 上架转付费',
    note: '所以前者生死线在前 3 章，后者在前 30 章与上架首日',
  },
  {
    item: '单章字数',
    free: '2000-3000',
    paid: '3000-4500（含标点计费口径）',
    note: '付费站的字数直接是钱，低于下限不得送审',
  },
  {
    item: '章节标题',
    free: '标题即钩子，直白、可长',
    paid: '可含蓄，不承担钩子职责',
    note: '免费平台的标题是列表页唯一抓手，是白送的钩子位',
  },
  {
    item: '谁决定流量',
    free: '算法。数据达标层层放大',
    paid: '编辑推荐位 + 榜单',
    note: '前者要会读数据，后者要会经营编辑关系与榜单动员',
  },
  {
    item: '什么时候能看到收入指标',
    free: '一开始就有阅读数据',
    paid: '订阅数据要等上架',
    note: '付费站在公众期只能靠收藏判断，诊断手段更少',
  },
  {
    item: '数据差了怎么办',
    free: '回改已发章节（尤其黄金三章）',
    paid: '调整未发章节；回改已付费章节不受欢迎',
    note: '同一个杠杆在两类平台的成本完全相反',
  },
  {
    item: '换书还是硬救',
    free: '数据差换书更划算',
    paid: '签约后换书成本高，倾向硬救',
    note: '试错成本的差异决定了策略',
  },
  {
    item: '读者容差',
    free: '容文笔，不容"不爽"',
    paid: '容慢热，不容逻辑漏洞',
    note: '两边的"致命错误"根本不是同一类',
  },
  {
    item: '太监的代价',
    free: '较低，换本书重来',
    paid: '很高，影响口碑与后续签约',
    note: '付费站完本有长尾收益，太监等于放弃它',
  },
]

/** 某个阵地里需要作者自己核实的项 */
export function volatileItems(venueId: string): { scope: string; label: string; k: string; why?: string }[] {
  const v = VENUE_MAP[venueId]
  if (!v) return []
  const op = OPERATORS[v.operator]
  const out: { scope: string; label: string; k: string; why?: string }[] = []
  for (const d of DIMENSIONS) for (const f of op[d.id]) if (f.volatile) out.push({ scope: op.name, label: d.label, k: f.k, why: f.why })
  for (const f of v.notes) if (f.volatile) out.push({ scope: v.name, label: '阵地', k: f.k, why: f.why })
  return out
}
