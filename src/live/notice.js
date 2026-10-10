// Notification metadata is public to the signed-in account. Only remember IDs,
// never notice bodies or user credentials, in the browser's local storage.
const PREFIX='vv-theme:notice-seen:';

export function noticeStorageKey(user){
 const identity=user?.id??user?.email;
 return identity==null||String(identity).trim()===''?null:PREFIX+encodeURIComponent(String(identity));
}

export const noticeVersion=(notice)=>{
 if(notice?.id!=null)return String(notice.id)+':'+String(notice.created_at??0);
 // Notices without a stable id still need a per-item identity for the
 // unseen/read badges; fall back to title + publish time.
 if(notice?.title==null)return null;
 return 'n:'+String(notice.title)+':'+String(notice.created_at??0);
};

export function readSeenNotices(storage,user){
 const key=noticeStorageKey(user);
 if(!key)return [];
 try {
  const data=JSON.parse(storage.getItem(key)||'[]');
  return Array.isArray(data)?data.filter(x=>typeof x==='string').slice(-100):[];
 }catch{return []}
}

export function unseenNotices(notices,storage,user){
 const known=new Set(readSeenNotices(storage,user));
 return (Array.isArray(notices)?notices:[])
  .filter(item=>noticeVersion(item)&&!known.has(noticeVersion(item)));
}

export function markNoticesSeen(notices,storage,user){
 const key=noticeStorageKey(user);
 if(!key)return;
 const seen=new Set(readSeenNotices(storage,user));
 for(const item of Array.isArray(notices)?notices:[]){
  const version=noticeVersion(item);
  if(version)seen.add(version);
 }
 try{storage.setItem(key,JSON.stringify([...seen].slice(-100)))}catch{/* Private browsing can disable storage. */}
}

// Render announcement content as text, not as server-supplied executable HTML.
export function noticePlainText(content){
 return String(content??'')
  .replace(/<\s*br\s*\/?>/gi,'\n')
  .replace(/<\s*\/(?:p|div|li|h[1-6])\s*>/gi,'\n')
  .replace(/<[^>]*>/g,'')
  .replace(/&nbsp;/gi,' ')
  .replace(/&amp;/gi,'&')
  .replace(/&lt;/gi,'<')
  .replace(/&gt;/gi,'>')
  .replace(/&quot;/gi,'"')
  .trim();
}
