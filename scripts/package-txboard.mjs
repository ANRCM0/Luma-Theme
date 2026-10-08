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
const blade='<!doctype html>\n<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title>\n'+css.map(p=>'<link rel="stylesheet" href="'+p+'">').join('\n')+'\n'+script.map(p=>'<script type="module" crossorigin src="'+p+'"></script>').join('\n')+'\n</head><body><script>window.routerBase="/";window.settings={title:@json($title),assets_path:"/theme/vv-theme/assets",version:@json($version),description:@json($description),logo:@json($logo),theme:{color:@json($theme_config["theme_color"] ?? "default")},background_url:@json($theme_config["background_url"] ?? ""),navigation:{mode:@json($theme_config["layout_mode"] ?? "top"),sidebarCollapsed:@json($theme_config["sidebar_collapsed_default"] ?? "0"),items:@json($theme_config["nav_items"] ?? "dashboard,shop,profile,ticket,menu,!orders")},notice:{popupEnabled:@json($theme_config["notice_popup_enabled"] ?? "1"),centerEnabled:@json($theme_config["notice_center_enabled"] ?? "1"),tag:@json($theme_config["notice_popup_tag"] ?? ""),frequency:@json($theme_config["notice_popup_frequency"] ?? "once"),scope:@json($theme_config["notice_popup_scope"] ?? "all"),style:@json($theme_config["notice_popup_style"] ?? "classic")}};</script><div id="root"></div>{!! $theme_config["custom_html"] ?? "" !!}</body></html>\n';
writeFileSync(join(out,'dashboard.blade.php'),blade);
writeFileSync(join(out,'config.json'),JSON.stringify({name:'vv-theme',version:process.env.THEME_VERSION||'0.4.0',description:'React live user portal for TXBoard',author:'ANRCM0',compatibility:{txboard:'*'},configs:[
 {group:'品牌与外观',label:'主题色',field_name:'theme_color',field_type:'select',select_options:{default:'默认青色',blue:'蓝色',darkblue:'深蓝色',black:'黑色'},default_value:'default'},
 {group:'品牌与外观',label:'背景图片 URL',field_name:'background_url',field_type:'input'},
 {group:'页面布局',label:'桌面端布局',field_name:'layout_mode',field_type:'select',select_options:{top:'顶部导航',sidebar:'左侧边栏'},default_value:'top',description:'手机端始终使用底部导航，避免空间不足'},
 {group:'页面布局',label:'默认收起侧边栏',field_name:'sidebar_collapsed_default',field_type:'switch',default_value:'0',description:'仅在左侧边栏布局、桌面屏幕上生效'},
 {group:'菜单与导航',label:'菜单显示与排序',field_name:'nav_items',field_type:'navigation',select_options:{dashboard:'我的面板',shop:'购买套餐',profile:'账号设置',ticket:'服务工单',menu:'全部菜单',orders:'我的订单'},default_value:'dashboard,shop,profile,ticket,menu,!orders',description:'取消勾选即隐藏导航项；我的面板与全部菜单始终保留'},
 {group:'公告通知',label:'自动弹窗',field_name:'notice_popup_enabled',field_type:'switch',default_value:'1'},
 {group:'公告通知',label:'通知铃铛与公告中心',field_name:'notice_center_enabled',field_type:'switch',default_value:'1'},
 {group:'公告通知',label:'自动弹窗标签',field_name:'notice_popup_tag',field_type:'input',placeholder:'留空为全部，例如 important 或 popup，多个标签用逗号隔开',default_value:''},
 {group:'公告通知',label:'自动弹出频率',field_name:'notice_popup_frequency',field_type:'select',select_options:{once:'每版公告只提醒一次',session:'同一浏览器会话一次',daily:'每 24 小时提醒一次',always:'每次打开页面提醒'},default_value:'once'},
 {group:'公告通知',label:'自动弹出范围',field_name:'notice_popup_scope',field_type:'select',select_options:{all:'任意登录页后',dashboard:'仅进入用户主页'},default_value:'all'},
 {group:'公告通知',label:'弹窗视觉样式',field_name:'notice_popup_style',field_type:'select',select_options:{classic:'经典通知',compact:'简洁通知',feature:'强调通知'},default_value:'classic'},
 {group:'扩展内容',label:'自定义 HTML（管理员可信内容）',field_name:'custom_html',field_type:'textarea',public:false}
]},null,2)+'\n');
console.log('TXBoard package staged:',script.length,'scripts,',css.length,'stylesheets');
