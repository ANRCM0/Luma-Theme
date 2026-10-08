import {readFileSync,writeFileSync,mkdirSync,cpSync,rmSync} from 'node:fs';
import {join} from 'node:path';
const html=readFileSync('dist/index.html','utf8');
const out='theme-package';
rmSync(out,{recursive:true,force:true});
mkdirSync(out,{recursive:true});
cpSync('dist/assets',join(out,'assets'),{recursive:true});
const script=[...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g)].map(m=>m[1]);
const css=[...html.matchAll(/<link\b[^>]*href="([^"]+\.css)"[^>]*>/g)].map(m=>m[1]);
if(!script.length||!css.length||[...script,...css].some(p=>!p.startsWith('/theme/vv-theme/assets/')))throw Error('Unexpected Vite asset paths');
const title='{{ $title }}';
const blade='<!doctype html>\n<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title>\n'+css.map(p=>'<link rel="stylesheet" href="'+p+'">').join('\n')+'\n'+script.map(p=>'<script type="module" crossorigin src="'+p+'"></script>').join('\n')+'\n</head><body><script>window.routerBase="/";window.settings={title:@json($title),assets_path:"/theme/vv-theme/assets",version:@json($version),description:@json($description),logo:@json($logo),theme:{color:@json($theme_config["theme_color"] ?? "default")},background_url:@json($theme_config["background_url"] ?? ""),navigation:{mode:@json($theme_config["layout_mode"] ?? "top"),sidebarCollapsed:@json($theme_config["sidebar_collapsed_default"] ?? "0"),items:@json($theme_config["nav_items"] ?? "dashboard,shop,profile,ticket,menu,!orders")},subscriptionCenter:{clientGuide:@json($theme_config["subscription_client_guide"] ?? "1"),resetAction:@json($theme_config["subscription_reset_action"] ?? "1"),renewalAction:@json($theme_config["subscription_renew_action"] ?? "1"),showNextReset:@json($theme_config["subscription_show_next_reset"] ?? "1")},catalog:{defaultPeriod:@json($theme_config["shop_default_period"] ?? "all"),featuredIds:@json($theme_config["shop_featured_ids"] ?? ""),compareEnabled:@json($theme_config["shop_compare_enabled"] ?? "1"),showSavings:@json($theme_config["shop_show_savings"] ?? "1"),showDescription:@json($theme_config["shop_show_description"] ?? "1")},welcome:{enabled:@json($theme_config["welcome_enabled"] ?? "1"),newUserHours:@json($theme_config["welcome_new_hours"] ?? 48),expiryHours:@json($theme_config["welcome_expiry_hours"] ?? 72),trafficLowGB:@json($theme_config["welcome_low_traffic_gb"] ?? 10),trafficLowPercent:@json($theme_config["welcome_low_traffic_percent"] ?? 10),secondaryCard:@json($theme_config["welcome_secondary_card"] ?? "recommend")},notice:{popupEnabled:@json($theme_config["notice_popup_enabled"] ?? "1"),centerEnabled:@json($theme_config["notice_center_enabled"] ?? "1"),tag:@json($theme_config["notice_popup_tag"] ?? ""),frequency:@json($theme_config["notice_popup_frequency"] ?? "once"),scope:@json($theme_config["notice_popup_scope"] ?? "all"),style:@json($theme_config["notice_popup_style"] ?? "classic")}};</script><div id="root"></div>{!! $theme_config["custom_html"] ?? "" !!}</body></html>\n';
writeFileSync(join(out,'dashboard.blade.php'),blade);
writeFileSync(join(out,'config.json'),JSON.stringify({name:'vv-theme',version:process.env.THEME_VERSION||'0.7.0',description:'React live user portal for TXBoard',author:'ANRCM0',compatibility:{txboard:'*'},configs:[
 {group:'品牌与外观',label:'主题色',field_name:'theme_color',field_type:'select',select_options:{default:'默认青色',blue:'蓝色',darkblue:'深蓝色',black:'黑色'},default_value:'default'},
 {group:'品牌与外观',label:'背景图片 URL',field_name:'background_url',field_type:'input'},
 {group:'页面布局',label:'桌面端布局',field_name:'layout_mode',field_type:'select',select_options:{top:'顶部导航',sidebar:'左侧边栏'},default_value:'top',description:'手机端始终使用底部导航，避免空间不足'},
 {group:'页面布局',label:'默认收起侧边栏',field_name:'sidebar_collapsed_default',field_type:'switch',default_value:'0',description:'仅在左侧边栏布局、桌面屏幕上生效'},
 {group:'菜单与导航',label:'菜单显示与排序',field_name:'nav_items',field_type:'navigation',select_options:{dashboard:'我的面板',shop:'购买套餐',profile:'账号设置',ticket:'服务工单',menu:'全部菜单',orders:'我的订单'},default_value:'dashboard,shop,profile,ticket,menu,!orders',description:'取消勾选即隐藏导航项；我的面板与全部菜单始终保留'},
 {group:'个性化欢迎',label:'启用动态欢迎卡片',field_name:'welcome_enabled',field_type:'switch',default_value:'1',description:'根据真实用户订阅状态显示不同提示；关闭后使用通用欢迎文案'},
 {group:'个性化欢迎',label:'新用户判定时长（小时）',field_name:'welcome_new_hours',field_type:'number',default_value:48,description:'只在尚未订阅时判定为新用户；0 关闭新用户窗口'},
 {group:'个性化欢迎',label:'即将到期提醒（小时）',field_name:'welcome_expiry_hours',field_type:'number',default_value:72,description:'有有效订阅时，到期时间进入此范围提示续费'},
 {group:'个性化欢迎',label:'流量不足绝对阈值（GB）',field_name:'welcome_low_traffic_gb',field_type:'number',default_value:10,description:'与百分比阈值取较小值；避免小流量套餐一直触发提醒'},
 {group:'个性化欢迎',label:'流量不足比例（%）',field_name:'welcome_low_traffic_percent',field_type:'number',default_value:10,description:'剩余流量低于套餐额度的该比例时提示；与 GB 阈值取较小值'},
 {group:'个性化欢迎',label:'首页侧边卡片',field_name:'welcome_secondary_card',field_type:'select',select_options:{recommend:'推荐套餐',usage:'流量使用概览',wallet:'账户余额'},default_value:'recommend'},
 {group:'订阅管理',label:'显示客户端导入引导',field_name:'subscription_client_guide',field_type:'switch',default_value:'1',description:'按设备展示对应客户端与导入步骤；复制链接和二维码始终可用'},
 {group:'订阅管理',label:'显示流量重置操作',field_name:'subscription_reset_action',field_type:'switch',default_value:'1',description:'仍需服务端确认有效订阅、当前套餐和重置价格'},
 {group:'订阅管理',label:'显示当前套餐续费入口',field_name:'subscription_renew_action',field_type:'switch',default_value:'1',description:'点选时实时查询服务端可续费套餐；禁用时仍可浏览套餐'},
 {group:'订阅管理',label:'显示下次重置时间',field_name:'subscription_show_next_reset',field_type:'switch',default_value:'1'},
 {group:'套餐商店',label:'默认展示周期',field_name:'shop_default_period',field_type:'select',select_options:{all:'全部周期',month_price:'月付',quarter_price:'季付',half_year_price:'半年付',year_price:'年付',two_year_price:'两年付',three_year_price:'三年付',onetime_price:'一次性'},default_value:'all'},
 {group:'套餐商店',label:'精选套餐 ID',field_name:'shop_featured_ids',field_type:'input',default_value:'',placeholder:'例如 1,3（留空不显示精选角标）',description:'仅作为首页与商店的展示推荐，不影响订单权限或价格'},
 {group:'套餐商店',label:'允许套餐对比',field_name:'shop_compare_enabled',field_type:'switch',default_value:'1'},
 {group:'套餐商店',label:'显示周期价格对比差额',field_name:'shop_show_savings',field_type:'switch',default_value:'1',description:'仅在套餐同时有月付和长周期价格且长周期更便宜时展示'},
 {group:'套餐商店',label:'显示套餐描述',field_name:'shop_show_description',field_type:'switch',default_value:'1'},
 {group:'公告通知',label:'自动弹窗',field_name:'notice_popup_enabled',field_type:'switch',default_value:'1'},
 {group:'公告通知',label:'通知铃铛与公告中心',field_name:'notice_center_enabled',field_type:'switch',default_value:'1'},
 {group:'公告通知',label:'自动弹窗标签',field_name:'notice_popup_tag',field_type:'input',placeholder:'留空为全部，例如 important 或 popup，多个标签用逗号隔开',default_value:''},
 {group:'公告通知',label:'自动弹出频率',field_name:'notice_popup_frequency',field_type:'select',select_options:{once:'每版公告只提醒一次',session:'同一浏览器会话一次',daily:'每 24 小时提醒一次',always:'每次打开页面提醒'},default_value:'once'},
 {group:'公告通知',label:'自动弹出范围',field_name:'notice_popup_scope',field_type:'select',select_options:{all:'任意登录页后',dashboard:'仅进入用户主页'},default_value:'all'},
 {group:'公告通知',label:'弹窗视觉样式',field_name:'notice_popup_style',field_type:'select',select_options:{classic:'经典通知',compact:'简洁通知',feature:'强调通知'},default_value:'classic'},
 {group:'扩展内容',label:'自定义 HTML（管理员可信内容）',field_name:'custom_html',field_type:'textarea',public:false}
]},null,2)+'\n');
console.log('TXBoard package staged:',script.length,'scripts,',css.length,'stylesheets');
