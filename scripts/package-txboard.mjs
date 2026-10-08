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
const blade='<!doctype html>\n<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title>\n'+css.map(p=>'<link rel="stylesheet" href="'+p+'">').join('\n')+'\n'+script.map(p=>'<script type="module" crossorigin src="'+p+'"></script>').join('\n')+'\n</head><body><script>window.routerBase="/";window.settings={title:@json($title),assets_path:"/theme/vv-theme/assets",version:@json($version),description:@json($description),logo:@json($logo),theme:{color:@json($theme_config["theme_color"] ?? "default")},background_url:@json($theme_config["background_url"] ?? ""),notice:{popupEnabled:@json($theme_config["notice_popup_enabled"] ?? "1"),centerEnabled:@json($theme_config["notice_center_enabled"] ?? "1"),tag:@json($theme_config["notice_popup_tag"] ?? ""),frequency:@json($theme_config["notice_popup_frequency"] ?? "once"),scope:@json($theme_config["notice_popup_scope"] ?? "all"),style:@json($theme_config["notice_popup_style"] ?? "classic")}};</script><div id="root"></div>{!! $theme_config["custom_html"] ?? "" !!}</body></html>\n';
writeFileSync(join(out,'dashboard.blade.php'),blade);
writeFileSync(join(out,'config.json'),JSON.stringify({name:'vv-theme',version:process.env.THEME_VERSION||'0.3.0',description:'React live user portal for TXBoard',author:'ANRCM0',compatibility:{txboard:'*'},configs:[
 {label:'主题色',field_name:'theme_color',field_type:'select',select_options:{default:'默认青色',blue:'蓝色',darkblue:'深蓝色',black:'黑色'},default_value:'default'},
 {label:'背景图片 URL',field_name:'background_url',field_type:'input'},
 {label:'公告 · 自动弹窗',field_name:'notice_popup_enabled',field_type:'switch',default_value:'1'},
 {label:'公告 · 通知铃铛与公告中心',field_name:'notice_center_enabled',field_type:'switch',default_value:'1'},
 {label:'公告 · 自动弹窗标签',field_name:'notice_popup_tag',field_type:'input',placeholder:'留空为全部；例如 important 或 popup，多个标签逗号隔开',default_value:''},
 {label:'公告 · 自动弹出频率',field_name:'notice_popup_frequency',field_type:'select',select_options:{once:'每版公告只提醒一次',session:'同一浏览器会话一次',daily:'每 24 小时提醒一次',always:'每次打开页面提醒'},default_value:'once'},
 {label:'公告 · 自动弹出范围',field_name:'notice_popup_scope',field_type:'select',select_options:{all:'任意登录页后',dashboard:'仅进入用户主页'},default_value:'all'},
 {label:'公告 · 弹窗视觉样式',field_name:'notice_popup_style',field_type:'select',select_options:{classic:'经典通知',compact:'简洁通知',feature:'强调通知'},default_value:'classic'},
 {label:'自定义 HTML（管理员可信内容）',field_name:'custom_html',field_type:'textarea',public:false}
]},null,2)+'\n');
console.log('TXBoard package staged:',script.length,'scripts,',css.length,'stylesheets');
