import { DEFAULT_WORLD_SEMANTICS } from '@/utils/town/world-semantics.js';
import { DEFAULT_WORLD_CONVERSATION_VISIBILITY } from '@/utils/town/world-conversation-visibility.js';

function createResidence(zoneId, unitId) {
  return {
    zoneId,
    unitId
  };
}

function createResidenceLocationId(zoneId, unitId) {
  return `residence:${zoneId}:${unitId}`;
}

function createAddress(zoneName, unitLabel) {
  return `${zoneName} ${unitLabel}`;
}

function createHomeBlock(start, end, actions) {
  return {
    start,
    end,
    locationRef: { type: 'home' },
    actions
  };
}

function createWorkBlock(start, end, actions) {
  return {
    start,
    end,
    locationRef: { type: 'work' },
    actions
  };
}

function createLocationBlock(start, end, locationId, actions) {
  return {
    start,
    end,
    locationRef: {
      type: 'location',
      locationId
    },
    actions
  };
}

function createSceneActivity(id, name, description, tags = [], isSocial = false) {
  return {
    id,
    name,
    description,
    tags,
    isSocial
  };
}

function createSceneZone(id, name, description, activities = []) {
  return {
    id,
    name,
    description,
    activities
  };
}

const SEASIDE_APARTMENT = {
  id: 'seaside-apartment',
  name: '海风公寓'
};

const ELM_LANE = {
  id: 'elm-lane',
  name: '榆树里'
};

const PLAYER_RESIDENCE = createResidence(SEASIDE_APARTMENT.id, '1-101');
const LIN_XI_RESIDENCE = createResidence(SEASIDE_APARTMENT.id, '1-102');
const ZHOU_YING_RESIDENCE = createResidence(SEASIDE_APARTMENT.id, '2-201');
const CHENG_CHENG_RESIDENCE = createResidence(SEASIDE_APARTMENT.id, '2-202');
const JIANG_YU_RESIDENCE = createResidence(ELM_LANE.id, '7-101');
const SHEN_LU_RESIDENCE = createResidence(ELM_LANE.id, '7-102');

const PLAYER_ADDRESS = createAddress(SEASIDE_APARTMENT.name, '1-101');
const LIN_XI_ADDRESS = createAddress(SEASIDE_APARTMENT.name, '1-102');
const ZHOU_YING_ADDRESS = createAddress(SEASIDE_APARTMENT.name, '2-201');
const CHENG_CHENG_ADDRESS = createAddress(SEASIDE_APARTMENT.name, '2-202');
const JIANG_YU_ADDRESS = createAddress(ELM_LANE.name, '7-101');
const SHEN_LU_ADDRESS = createAddress(ELM_LANE.name, '7-102');

const MOON_COFFEE_SCENE_CONTENT = {
  zones: [
    createSceneZone('coffee-counter', '点单吧台', '最容易发生短句交流和顺手寒暄的位置。', [
      createSceneActivity('coffee-order-drink', '点单取餐', '排队点单、等咖啡做好，再顺手把饮品端走。', ['日常', '消费', '停留']),
      createSceneActivity('coffee-chat-with-clerk', '和店员闲聊', '趁店里不忙时和吧台的人交换几句小镇近况。', ['社交', '消息', '熟人'], true),
      createSceneActivity('coffee-treat-someone', '顺手请客', '替刚好遇见的人点一杯喝的，气氛自然会松一点。', ['社交', '请客', '关系'], true)
    ]),
    createSceneZone('coffee-window-seats', '窗边座位', '能看到街口和海风，适合坐一会儿。', [
      createSceneActivity('coffee-sit-and-watch', '靠窗发呆', '抱着杯子看外面的人来人往，让自己慢下来。', ['独处', '观察', '休息']),
      createSceneActivity('coffee-small-talk', '小声聊天', '和坐在对面的人低声接话，聊些轻松话题。', ['社交', '轻松', '停留'], true),
      createSceneActivity('coffee-write-notes', '写点东西', '拿纸笔记下想法、待办或刚听来的消息。', ['独处', '记录', '安静'])
    ])
  ]
};

const HARBOR_PARK_SCENE_CONTENT = {
  zones: [
    createSceneZone('park-square', '中央空地', '开阔、显眼，适合晨练和临时凑活动。', [
      createSceneActivity('park-stretch', '晨练拉伸', '在空地上活动身体，顺便看看今天谁也来了。', ['运动', '晨间', '公开']),
      createSceneActivity('park-group-game', '临时组局', '有人起头就能凑起飞盘、慢跑或小游戏。', ['社交', '活动', '公开'], true),
      createSceneActivity('park-watch-crowd', '站着看热闹', '不一定加入，只是在边上观察气氛和人群。', ['观察', '停留', '公开'])
    ]),
    createSceneZone('park-bench', '树荫长椅', '不想走动的人会自然停在这里。', [
      createSceneActivity('park-sit-and-rest', '遛弯歇脚', '走累了坐一会儿，顺手喝口水。', ['休息', '停留', '日常']),
      createSceneActivity('park-people-watch', '看人来人往', '边坐边留意熟人有没有从眼前经过。', ['观察', '熟人', '停留']),
      createSceneActivity('park-bench-chat', '坐着闲聊', '和刚好坐下的人慢慢接起话题。', ['社交', '轻松', '熟人'], true)
    ])
  ]
};

const OLD_BOOKSTORE_SCENE_CONTENT = {
  zones: [
    createSceneZone('bookstore-reading-area', '阅读区', '书架和长椅围出来的小角落，声音会自然放轻。', [
      createSceneActivity('bookstore-browse-shelves', '挑书翻看', '沿着书架慢慢抽出感兴趣的书翻几页。', ['阅读', '安静', '独处']),
      createSceneActivity('bookstore-quiet-reading', '安静阅读', '拿着已经挑好的书坐下看一会儿。', ['阅读', '独处', '安静']),
      createSceneActivity('bookstore-copy-lines', '抄摘句子', '把看到的句子、书单或灵感记下来。', ['记录', '阅读', '独处'])
    ]),
    createSceneZone('bookstore-counter', '店员柜台', '适合开口问书，也最容易听到最近谁来过。', [
      createSceneActivity('bookstore-ask-for-recommendation', '问书荐书', '跟店员聊最近想看什么，让对方顺手推荐。', ['社交', '阅读', '熟人'], true),
      createSceneActivity('bookstore-checkout', '结账包书', '把挑好的书递过去，顺手说上两句。', ['消费', '停留', '日常']),
      createSceneActivity('bookstore-local-gossip', '聊镇上新消息', '借着结账或问书，顺手聊起最近的见闻。', ['社交', '消息', '熟人'], true)
    ])
  ]
};

const SUNSET_PIER_SCENE_CONTENT = {
  zones: [
    createSceneZone('pier-railing', '栏杆边', '最适合看海和等晚霞的位置。', [
      createSceneActivity('pier-watch-sea', '看海吹风', '靠着栏杆吹风，看远处船影和海面。', ['独处', '观察', '停留']),
      createSceneActivity('pier-wait-sunset', '等日落', '慢慢等天色变化，往往会比预想停得更久。', ['独处', '黄昏', '停留']),
      createSceneActivity('pier-rail-chat', '并肩闲聊', '两个人肩并肩站着，比坐下来更容易自然开口。', ['社交', '黄昏', '关系'], true)
    ]),
    createSceneZone('pier-supply-corner', '渔具堆旁', '渔船靠岸时，这一带会一下子热闹起来。', [
      createSceneActivity('pier-watch-boats', '看渔船靠岸', '站在一边看今天的船什么时候回来。', ['观察', '码头', '公开']),
      createSceneActivity('pier-help-carry-box', '帮忙搬小箱', '顺手搭把手，把轻一点的箱子挪到边上。', ['行动', '帮忙', '公开'], true),
      createSceneActivity('pier-hear-dock-news', '听码头八卦', '靠近忙碌的人群时，总能听到几条新消息。', ['消息', '熟人', '公开'], true)
    ])
  ]
};

const HARBOR_MARKET_SCENE_CONTENT = {
  zones: [
    createSceneZone('market-fresh-stalls', '生鲜摊位', '最热闹也最容易停下来讨价还价的地方。', [
      createSceneActivity('market-pick-seafood', '挑海货', '在摊前比比新鲜程度，慢慢挑要带走的东西。', ['消费', '日常', '公开']),
      createSceneActivity('market-bargain', '讨价还价', '和摊主来回讲价，周围的人也会顺嘴插话。', ['社交', '消费', '热闹'], true),
      createSceneActivity('market-exchange-news', '互通消息', '买菜买鱼的时候顺便问今天谁见过谁。', ['社交', '消息', '熟人'], true)
    ]),
    createSceneZone('market-snack-edge', '小吃边摊', '边走边吃、临时停留最常发生在这里。', [
      createSceneActivity('market-eat-snack', '站着吃点心', '买点热乎的小吃，站在摊边慢慢吃。', ['日常', '停留', '轻松']),
      createSceneActivity('market-bring-something-home', '顺手带东西', '给家里或熟人捎点小吃、酱菜或日用品。', ['日常', '采购', '熟人']),
      createSceneActivity('market-share-table-chat', '拼边角位置聊天', '人多时会自然和旁边的人挤在一起说几句。', ['社交', '热闹', '轻松'], true)
    ])
  ]
};

const TIDE_CLINIC_SCENE_CONTENT = {
  zones: [
    createSceneZone('clinic-waiting-area', '候诊区', '大家会下意识放轻声音，但也不会完全不说话。', [
      createSceneActivity('clinic-wait-for-number', '排队等号', '坐着或站着等轮到自己。', ['日常', '等待', '公开']),
      createSceneActivity('clinic-read-notice', '看公告栏', '看营业时间、值班安排或健康提醒。', ['观察', '等待', '日常']),
      createSceneActivity('clinic-quiet-greeting', '轻声寒暄', '如果碰到熟人，会压低声音交换近况。', ['社交', '熟人', '轻声'], true)
    ]),
    createSceneZone('clinic-nurse-desk', '护士台', '真正开口求助和问清楚细节的地方。', [
      createSceneActivity('clinic-ask-symptoms', '咨询症状', '把自己的不舒服简单说清楚，确认该怎么排。', ['咨询', '日常', '服务'], true),
      createSceneActivity('clinic-ask-medicine', '取药问法', '问清服药方式和注意事项。', ['咨询', '服务', '日常']),
      createSceneActivity('clinic-ask-shift-time', '打听值班时间', '想确认下次什么时候再来比较合适。', ['咨询', '时间', '服务'], true)
    ])
  ]
};

const SEASIDE_APARTMENT_SCENE_CONTENT = {
  zones: [
    createSceneZone('seaside-lobby', '一楼门厅', '进出楼的人都会在这里短暂停一下。', [
      createSceneActivity('seaside-pickup-delivery', '取快递', '低头找自己的包裹，再顺手确认有没有拿错。', ['日常', '停留', '生活']),
      createSceneActivity('seaside-meet-neighbor', '楼下碰面', '和刚下楼或刚回来的人打个招呼。', ['社交', '邻里', '生活'], true),
      createSceneActivity('seaside-read-notice', '看公告栏', '看看今天有没有维修、催缴或临时通知。', ['观察', '生活', '公告'])
    ]),
    createSceneZone('seaside-rooftop', '晾晒天台', '偏安静，但只要有人上来就很容易彼此注意到。', [
      createSceneActivity('seaside-air-bedding', '晒被通风', '把床品或厚衣服搬上来晒一阵。', ['家务', '生活', '停留']),
      createSceneActivity('seaside-collect-clothes', '收衣服', '看天色差不多就把已经晒好的衣服收走。', ['家务', '生活', '日常']),
      createSceneActivity('seaside-rooftop-breeze', '站着吹风', '忙完不立刻下楼，顺手在边上歇口气。', ['休息', '独处', '停留'])
    ])
  ]
};

const ELM_LANE_SCENE_CONTENT = {
  zones: [
    createSceneZone('elm-alley-entry', '巷口长椅', '邻里最容易看到彼此进出的地方。', [
      createSceneActivity('elm-sit-for-air', '坐门口透气', '端着水杯坐一会儿，看巷子里有没有熟人经过。', ['休息', '邻里', '停留']),
      createSceneActivity('elm-watch-neighbors', '看邻里经过', '不一定要叫住谁，但会留意今天大家都去哪。', ['观察', '邻里', '生活']),
      createSceneActivity('elm-greet-neighbors', '顺嘴打招呼', '人一对上眼，就自然会互相问候两句。', ['社交', '邻里', '生活'], true)
    ]),
    createSceneZone('elm-notice-wall', '公告墙边', '租房、拼车和杂事消息常常会停在这里。', [
      createSceneActivity('elm-read-posters', '看租房告示', '慢慢看哪家有房、哪家在转租。', ['观察', '信息', '生活']),
      createSceneActivity('elm-exchange-errands', '交换杂事消息', '顺手问谁今天去市场、谁能帮忙带点东西。', ['社交', '生活', '熟人'], true),
      createSceneActivity('elm-wait-to-head-out', '等人一起出门', '站在这里等等熟人，再一起往外走。', ['等待', '熟人', '同行'], true)
    ])
  ]
};

export const DEFAULT_WORLD_TEMPLATE = {
  id: 'default-town',
  name: '海风镇',
  lore: '一座临海小镇，居民彼此熟悉，生活节奏温和但不乏故事。',
  worldSemantics: DEFAULT_WORLD_SEMANTICS,
  worldConversationVisibility: DEFAULT_WORLD_CONVERSATION_VISIBILITY,
  playerIdentityTemplates: [
    {
      id: 'new-resident',
      name: '普通居民 / 新搬入住户',
      summary: '刚搬进海风公寓的新住户，正在认识这个小镇。',
      residence: PLAYER_RESIDENCE,
      address: PLAYER_ADDRESS,
      identity: '普通居民',
      wallet: 1200
    }
  ],
  publicLocations: [
    {
      id: 'moon-coffee',
      name: '月街咖啡',
      category: 'shop',
      openHours: ['08:00-22:00'],
      description: '靠海街角的小咖啡馆，是居民交换消息和情绪补给的固定据点。'
    },
    {
      id: 'harbor-park',
      name: '港口公园',
      category: 'public',
      openHours: ['00:00-24:00'],
      description: '镇上最开放的公共空间，晨练、遛弯和临时相遇大多发生在这里。'
    },
    {
      id: 'old-bookstore',
      name: '旧灯书屋',
      category: 'shop',
      openHours: ['10:00-20:00'],
      description: '一家气味安静的旧书店，常有人在傍晚时分进来躲一会儿风。'
    },
    {
      id: 'sunset-pier',
      name: '落潮码头',
      category: 'public',
      openHours: ['00:00-24:00'],
      description: '渔船靠岸和看晚霞的地方，清晨和傍晚都各有自己的热闹。'
    },
    {
      id: 'harbor-market',
      name: '港湾集市',
      category: 'shop',
      openHours: ['06:30-18:30'],
      description: '海风镇最有烟火气的地方，新鲜海货、日用品和小道消息都在这里流动。'
    },
    {
      id: 'tide-clinic',
      name: '潮汐诊所',
      category: 'service',
      openHours: ['08:00-21:00'],
      description: '镇上处理日常看诊和小病小痛的诊所，居民彼此都很熟。'
    }
  ],
  residentialZones: [
    {
      id: SEASIDE_APARTMENT.id,
      name: SEASIDE_APARTMENT.name,
      description: '靠海不远的老公寓，租客和老住户混住，楼道里总有生活声。',
      units: [
        { id: '1-101', label: '1-101', accessPolicy: 'consent_required' },
        { id: '1-102', label: '1-102', accessPolicy: 'consent_required' },
        { id: '2-201', label: '2-201', accessPolicy: 'consent_required' },
        { id: '2-202', label: '2-202', accessPolicy: 'consent_required' },
        { id: '3-301', label: '3-301', accessPolicy: 'consent_required' }
      ]
    },
    {
      id: ELM_LANE.id,
      name: ELM_LANE.name,
      description: '离港口更近的小型住宅区，住户彼此认识，来访一般都会先打招呼。',
      units: [
        { id: '7-101', label: '7-101', accessPolicy: 'consent_required' },
        { id: '7-102', label: '7-102', accessPolicy: 'consent_required' },
        { id: '8-201', label: '8-201', accessPolicy: 'consent_required' }
      ]
    }
  ],
  locations: [
    { id: 'seaside-apartment', name: '海风公寓', type: 'residence', openHours: ['00:00-24:00'] },
    { id: 'moon-coffee', name: '月街咖啡', type: 'shop', openHours: ['08:00-22:00'] },
    { id: 'harbor-park', name: '港口公园', type: 'public', openHours: ['00:00-24:00'] },
    { id: 'old-bookstore', name: '旧灯书屋', type: 'shop', openHours: ['10:00-20:00'] },
    { id: 'sunset-pier', name: '落潮码头', type: 'public', openHours: ['00:00-24:00'] },
    { id: 'harbor-market', name: '港湾集市', type: 'shop', openHours: ['06:30-18:30'] },
    { id: 'tide-clinic', name: '潮汐诊所', type: 'service', openHours: ['08:00-21:00'] },
    { id: 'elm-lane', name: '榆树里', type: 'residence', openHours: ['00:00-24:00'] }
  ],
  professions: [
    { id: 'cafe-clerk', name: '咖啡店店员', workLocationId: 'moon-coffee', workStartHour: 9, workEndHour: 18 },
    { id: 'bookstore-keeper', name: '书屋店长', workLocationId: 'old-bookstore', workStartHour: 10, workEndHour: 20 },
    { id: 'park-instructor', name: '公园活动教练', workLocationId: 'harbor-park', workStartHour: 7, workEndHour: 16 },
    { id: 'fishmonger', name: '鱼摊老板', workLocationId: 'harbor-market', workStartHour: 6, workEndHour: 15 },
    { id: 'clinic-nurse', name: '诊所护士', workLocationId: 'tide-clinic', workStartHour: 8, workEndHour: 17 }
  ],
  scheduleTemplates: [
    {
      id: 'cafe-weekday',
      name: '咖啡店平日日程',
      dayTypes: ['weekday'],
      blocks: [
        createHomeBlock('07:00', '08:30', ['起床整理', '做早饭']),
        createWorkBlock('09:00', '18:00', ['开店准备营业', '制作咖啡', '整理吧台']),
        createLocationBlock('18:30', '20:00', 'harbor-park', ['散步放风', '看海发呆']),
        createHomeBlock('20:30', '23:00', ['回家洗漱', '窝在沙发休息'])
      ]
    },
    {
      id: 'cafe-weekday',
      name: '咖啡店店员周末日程',
      dayTypes: ['weekend'],
      blocks: [
        createHomeBlock('08:00', '09:30', ['睡到自然醒', '给阳台植物浇水']),
        createLocationBlock('09:30', '12:30', 'harbor-market', ['逛集市挑家用食材', '帮摊主试吃新点心']),
        createLocationBlock('13:00', '16:30', 'harbor-park', ['坐在树荫下发呆', '给朋友带杯冰饮']),
        createLocationBlock('17:00', '19:00', 'sunset-pier', ['沿着码头散步', '看傍晚的海面换色']),
        createHomeBlock('19:30', '22:30', ['回家做简单晚饭', '窝在窗边听歌'])
      ]
    },
    {
      id: 'bookstore-weekday',
      name: '书屋店长平日日程',
      dayTypes: ['weekday'],
      blocks: [
        createHomeBlock('08:00', '09:30', ['整理书袋', '写今日推荐卡片']),
        createWorkBlock('10:00', '20:00', ['整理新到书单', '接待来店读者', '布置橱窗陈列']),
        createHomeBlock('20:30', '22:30', ['核对当天账本', '泡茶读小说'])
      ]
    },
    {
      id: 'bookstore-weekday',
      name: '书屋店长周末日程',
      dayTypes: ['weekend'],
      blocks: [
        createHomeBlock('08:30', '10:00', ['慢慢整理书架', '挑一本今天想带出的书']),
        createLocationBlock('10:30', '13:00', 'harbor-park', ['带着刚挑的书在长椅上慢读', '给路过的小孩推荐故事书']),
        createLocationBlock('13:30', '16:00', 'harbor-market', ['在旧物摊翻淘旧书', '和摊主聊版次']),
        createLocationBlock('16:30', '19:00', 'old-bookstore', ['把周末淘来的旧书摆上新角落', '短时开门招待熟客']),
        createHomeBlock('19:30', '22:00', ['记下今天遇见的人', '泡茶整理批注'])
      ]
    },
    {
      id: 'park-weekday',
      name: '公园活动教练平日日程',
      dayTypes: ['weekday'],
      blocks: [
        createWorkBlock('06:30', '09:30', ['带队热身', '晨跑领队', '整理活动器材']),
        createWorkBlock('10:00', '16:00', ['策划团体活动', '陪孩子做户外游戏']),
        createLocationBlock('17:00', '19:00', 'moon-coffee', ['补充体力休息', '和熟客闲聊']),
        createHomeBlock('20:00', '22:30', ['冲澡放松', '拉伸收操'])
      ]
    },
    {
      id: 'park-weekday',
      name: '公园活动教练周末日程',
      dayTypes: ['weekend'],
      blocks: [
        createLocationBlock('07:00', '09:00', 'sunset-pier', ['带着便携音箱晨跑', '在码头边拉伸热身']),
        createLocationBlock('09:30', '12:30', 'harbor-park', ['组织周末飞盘局', '拉着熟人一起晒太阳']),
        createLocationBlock('13:00', '15:00', 'harbor-market', ['在集市买大瓶柠檬水', '顺手帮街坊拎东西']),
        createLocationBlock('15:30', '18:30', 'moon-coffee', ['在窗边补充体力', '跟来公园的人约下次活动']),
        createHomeBlock('19:00', '22:00', ['洗掉一身汗', '给明天的活动写便签'])
      ]
    },
    {
      id: 'market-weekday',
      name: '鱼摊老板平日日程',
      dayTypes: ['weekday'],
      blocks: [
        createLocationBlock('05:30', '06:30', 'sunset-pier', ['收鱼清点', '和清晨渔船对货']),
        createWorkBlock('06:30', '15:00', ['支摊叫卖', '收拾冰台', '和熟客讨价还价']),
        createLocationBlock('15:30', '17:30', 'moon-coffee', ['喝冰美式歇口气', '听街坊聊小镇消息']),
        createHomeBlock('18:00', '22:00', ['回家补觉', '清洗围裙和手套'])
      ]
    },
    {
      id: 'market-weekday',
      name: '鱼摊老板周末日程',
      dayTypes: ['weekend'],
      blocks: [
        createLocationBlock('05:30', '08:30', 'sunset-pier', ['接周末渔船的货', '帮熟人分拣海鲜']),
        createWorkBlock('08:30', '12:30', ['支摊叫卖周末鲜货', '给老主顾多留一把海菜']),
        createLocationBlock('13:00', '15:00', 'harbor-park', ['在树荫下打盹', '和路过街坊吹海风聊天']),
        createLocationBlock('15:30', '18:30', 'moon-coffee', ['喝一大杯冰咖啡', '听人聊今天集市见闻']),
        createHomeBlock('19:00', '22:00', ['把冰桶和围裙洗干净', '早早回家补觉'])
      ]
    },
    {
      id: 'clinic-weekday',
      name: '诊所护士平日日程',
      dayTypes: ['weekday'],
      blocks: [
        createHomeBlock('07:00', '08:00', ['扎起头发出门', '检查今天的排班']),
        createWorkBlock('08:00', '17:00', ['整理药柜', '接待来看诊的居民', '记录体温和药单']),
        createLocationBlock('17:30', '19:00', 'harbor-park', ['在公园慢走放松', '给自己买杯热饮']),
        createHomeBlock('19:30', '22:30', ['翻病例笔记', '听着广播休息'])
      ]
    },
    {
      id: 'clinic-weekday',
      name: '诊所护士周末日程',
      dayTypes: ['weekend'],
      blocks: [
        createHomeBlock('08:00', '10:00', ['睡醒后慢慢收拾', '给自己煮一壶热茶']),
        createLocationBlock('10:30', '12:30', 'harbor-market', ['替诊所顺路买常备用品', '挑新鲜水果带回家']),
        createLocationBlock('13:00', '15:30', 'sunset-pier', ['坐在码头边吹海风', '看渔船慢慢靠岸']),
        createLocationBlock('16:00', '18:30', 'harbor-park', ['在公园长椅上休息', '和熟悉的街坊慢慢聊天']),
        createHomeBlock('19:00', '22:30', ['整理下周排班便签', '早点洗漱休息'])
      ]
    }
  ],
  starterResidents: [
    {
      id: 'heroine-lin-xi',
      name: '林汐',
      worldId: 'default-town',
      avatar: '/static/ai-avatar.png',
      relation: '初相识',
      location: LIN_XI_ADDRESS,
      settings: {
        age: '24',
        gender: '女',
        appearance: '栗色长发，常把围裙系得很整齐，眼神柔和但很会观察人。',
        personality: '温柔、细心、慢热，擅长照顾气氛，也会把在意的事记在心里。',
        likes: '手冲咖啡、靠窗位、晚风、安静但不冷场的陪伴',
        dislikes: '浪费食物、把承诺说得太轻、故作热闹',
        bio: '林汐是月街咖啡最稳当的店员，早晨总是第一个把店里灯光和香气都整理好。她在海风镇长大，熟悉每一条街的节奏，对新搬来的住户会多留一份心。',
        userRelation: '你是刚搬来海风镇的新住户，她对你有礼貌的好奇。',
        workplace: '月街咖啡',
        workDays: [1, 2, 3, 4, 5],
        workStartHour: 9,
        workEndHour: 18
      },
      townProfile: {
        role: 'core',
        residence: LIN_XI_RESIDENCE,
        homeLocationId: createResidenceLocationId(LIN_XI_RESIDENCE.zoneId, LIN_XI_RESIDENCE.unitId),
        professionId: 'cafe-clerk',
        scheduleTemplateId: 'cafe-weekday'
      },
      townRuntime: {
        currentLocationId: createResidenceLocationId(LIN_XI_RESIDENCE.zoneId, LIN_XI_RESIDENCE.unitId),
        currentLocationName: LIN_XI_ADDRESS,
        currentAction: '起床整理',
        availability: 'normal',
        lastSimulatedSlice: 0
      }
    },
    {
      id: 'heroine-zhou-ying',
      name: '周萤',
      worldId: 'default-town',
      avatar: '/static/ai-avatar.png',
      relation: '初相识',
      location: ZHOU_YING_ADDRESS,
      settings: {
        age: '25',
        gender: '女',
        appearance: '黑色短发，穿衬衫和针织马甲，抱着书时会下意识抿嘴笑。',
        personality: '克制、聪明、带一点口是心非，熟了之后会很会接梗。',
        likes: '旧书边角的气味、带批注的小说、傍晚时分的安静书店',
        dislikes: '粗暴翻书、过度打探隐私、把话说绝',
        bio: '周萤经营旧灯书屋，白天像在照料一座小型避风港。她记人很准，谁来过几次、看过哪类书，大多都记得，只是不太会主动承认自己在意。',
        userRelation: '你和她还不熟，但她已经把你归进“以后可能常见到的人”。',
        workplace: '旧灯书屋',
        workDays: [1, 2, 3, 4, 5],
        workStartHour: 10,
        workEndHour: 20
      },
      townProfile: {
        role: 'core',
        residence: ZHOU_YING_RESIDENCE,
        homeLocationId: createResidenceLocationId(ZHOU_YING_RESIDENCE.zoneId, ZHOU_YING_RESIDENCE.unitId),
        professionId: 'bookstore-keeper',
        scheduleTemplateId: 'bookstore-weekday'
      },
      townRuntime: {
        currentLocationId: createResidenceLocationId(ZHOU_YING_RESIDENCE.zoneId, ZHOU_YING_RESIDENCE.unitId),
        currentLocationName: ZHOU_YING_ADDRESS,
        currentAction: '整理书袋',
        availability: 'normal',
        lastSimulatedSlice: 0
      }
    },
    {
      id: 'heroine-cheng-cheng',
      name: '程澄',
      worldId: 'default-town',
      avatar: '/static/ai-avatar.png',
      relation: '初相识',
      location: CHENG_CHENG_ADDRESS,
      settings: {
        age: '23',
        gender: '女',
        appearance: '高马尾，运动外套常搭在肩上，说话时手势很多，笑起来很亮。',
        personality: '外向、热心、行动派，容易把别人的情绪也一起扛在自己身上。',
        likes: '晨跑、团体活动、把人拉出门晒太阳、冰镇柠檬水',
        dislikes: '拖拖拉拉、阴阳怪气、把自己困在屋里太久',
        bio: '程澄是港口公园的活动教练，小镇里不少孩子和老人都认识她。她习惯把一整天的节奏拉快，也最容易把街坊之间的消息串起来。',
        userRelation: '你见过她几次，她总会先一步跟你打招呼，像已经把你当潜在朋友。',
        workplace: '港口公园',
        workDays: [1, 2, 3, 4, 5],
        workStartHour: 7,
        workEndHour: 16
      },
      townProfile: {
        role: 'core',
        residence: CHENG_CHENG_RESIDENCE,
        homeLocationId: createResidenceLocationId(CHENG_CHENG_RESIDENCE.zoneId, CHENG_CHENG_RESIDENCE.unitId),
        professionId: 'park-instructor',
        scheduleTemplateId: 'park-weekday'
      },
      townRuntime: {
        currentLocationId: createResidenceLocationId(CHENG_CHENG_RESIDENCE.zoneId, CHENG_CHENG_RESIDENCE.unitId),
        currentLocationName: CHENG_CHENG_ADDRESS,
        currentAction: '晨起拉伸',
        availability: 'normal',
        lastSimulatedSlice: 0
      }
    },
    {
      id: 'resident-jiang-yu',
      name: '江屿',
      worldId: 'default-town',
      avatar: '/static/ai-avatar.png',
      relation: '街坊',
      location: JIANG_YU_ADDRESS,
      settings: {
        age: '31',
        gender: '男',
        appearance: '晒得微黑，穿防水围裙和胶靴，嗓门不小但笑起来很憨。',
        personality: '直来直去、嘴快心软、消息灵通，常常边忙边跟人聊天。',
        likes: '清晨的新鲜海货、便宜又好喝的咖啡、热闹集市',
        dislikes: '坑人秤、临时爽约、浪费新鲜食材',
        bio: '江屿在港湾集市卖鱼，天没亮就会先去落潮码头接货。他和镇上的许多人都打过交道，是很适合用来撑起人流感和街坊消息流的背景居民。',
        userRelation: '你认识他这个脸熟的街坊，但还谈不上熟。',
        workplace: '港湾集市',
        workDays: [1, 2, 3, 4, 5],
        workStartHour: 6,
        workEndHour: 15
      },
      townProfile: {
        role: 'background',
        residence: JIANG_YU_RESIDENCE,
        homeLocationId: createResidenceLocationId(JIANG_YU_RESIDENCE.zoneId, JIANG_YU_RESIDENCE.unitId),
        professionId: 'fishmonger',
        scheduleTemplateId: 'market-weekday'
      },
      townRuntime: {
        currentLocationId: createResidenceLocationId(JIANG_YU_RESIDENCE.zoneId, JIANG_YU_RESIDENCE.unitId),
        currentLocationName: JIANG_YU_ADDRESS,
        currentAction: '揉着眼准备出门',
        availability: 'normal',
        lastSimulatedSlice: 0
      }
    },
    {
      id: 'resident-shen-lu',
      name: '沈鹿',
      worldId: 'default-town',
      avatar: '/static/ai-avatar.png',
      relation: '街坊',
      location: SHEN_LU_ADDRESS,
      settings: {
        age: '27',
        gender: '女',
        appearance: '低马尾，白色针织外套外常套着浅蓝工作服，动作很利落。',
        personality: '沉稳、耐心、善于安抚人，偶尔会在疲惫时显出一点发呆般的温柔。',
        likes: '整齐干净的工作台、热茶、傍晚散步、有人认真听她说话',
        dislikes: '无意义的逞强、重复犯同样的错、把身体不当回事',
        bio: '沈鹿在潮汐诊所做护士，见惯了海风镇的人来来往往，也知道许多居民不轻易说出口的小毛病。她很适合作为“小镇真实生活感”的背景锚点之一。',
        userRelation: '你知道她在诊所工作，偶尔在公园或咖啡店见过。',
        workplace: '潮汐诊所',
        workDays: [1, 2, 3, 4, 5],
        workStartHour: 8,
        workEndHour: 17
      },
      townProfile: {
        role: 'background',
        residence: SHEN_LU_RESIDENCE,
        homeLocationId: createResidenceLocationId(SHEN_LU_RESIDENCE.zoneId, SHEN_LU_RESIDENCE.unitId),
        professionId: 'clinic-nurse',
        scheduleTemplateId: 'clinic-weekday'
      },
      townRuntime: {
        currentLocationId: createResidenceLocationId(SHEN_LU_RESIDENCE.zoneId, SHEN_LU_RESIDENCE.unitId),
        currentLocationName: SHEN_LU_ADDRESS,
        currentAction: '检查今天的排班',
        availability: 'normal',
        lastSimulatedSlice: 0
      }
    }
  ]
};

const DEFAULT_PUBLIC_SCENE_CONTENT_BY_ID = {
  'moon-coffee': MOON_COFFEE_SCENE_CONTENT,
  'harbor-park': HARBOR_PARK_SCENE_CONTENT,
  'old-bookstore': OLD_BOOKSTORE_SCENE_CONTENT,
  'sunset-pier': SUNSET_PIER_SCENE_CONTENT,
  'harbor-market': HARBOR_MARKET_SCENE_CONTENT,
  'tide-clinic': TIDE_CLINIC_SCENE_CONTENT
};

const DEFAULT_RESIDENTIAL_SCENE_CONTENT_BY_ID = {
  'seaside-apartment': SEASIDE_APARTMENT_SCENE_CONTENT,
  'elm-lane': ELM_LANE_SCENE_CONTENT
};

DEFAULT_WORLD_TEMPLATE.publicLocations = DEFAULT_WORLD_TEMPLATE.publicLocations.map((location) => ({
  ...location,
  sceneContent: DEFAULT_PUBLIC_SCENE_CONTENT_BY_ID[location.id] || { zones: [] }
}));

DEFAULT_WORLD_TEMPLATE.residentialZones = DEFAULT_WORLD_TEMPLATE.residentialZones.map((zone) => ({
  ...zone,
  sceneContent: DEFAULT_RESIDENTIAL_SCENE_CONTENT_BY_ID[zone.id] || { zones: [] }
}));
