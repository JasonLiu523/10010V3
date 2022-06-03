const key = 'sub_store_mega'

const $ = new Env(key)

const KEY_DISABLED = `@xream.${key}.disabled`
const KEY_TITLE = `@xream.${key}.title`
const KEY_HOST = `@xream.${key}.host`
const KEY_PATH = `@xream.${key}.path`
const KEY_NETWORK = `@xream.${key}.network`
const KEY_PREFIX = `@xream.${key}.prefix`
const KEY_SUFFIX = `@xream.${key}.suffix`
const KEY_PORT= `@xream.${key}.port`
const KEY_SORT= `@xream.${key}.sort`
const KEY_RESOLVE= `@xream.${key}.resolve`
const KEY_HOST_PREFIX= `@xream.${key}.hostPrefix`
const KEY_HOST_SUFFUX= `@xream.${key}.hostSuffix`
const KEY_PATH_PREFIX= `@xream.${key}.pathPrefix`
const KEY_PATH_SUFFUX= `@xream.${key}.pathSuffix`
const KEY_IP_PREFIX= `@xream.${key}.ipPrefix`
const KEY_IP_SUFFUX= `@xream.${key}.ipSuffix`
const KEY_NETWORK_PREFIX= `@xream.${key}.networkPrefix`
const KEY_NETWORK_SUFFUX= `@xream.${key}.networkSuffix`
const KEY_SLEEP= `@xream.${key}.sleep`
const KEY_EXPIRE= `@xream.${key}.expire`
const KEY_CACHE = `@xream.${key}.cache`
const KEY_CACHE_MAX_SIZE = `@xream.${key}.cacheMaxSize`
const KEY_NOTIFY_ON_SUCCESS_DISABLED = `@xream.${key}.notifyOnSuccessDisabled`
const KEY_MOCK = `@xream.${key}.mock`
const KEY_CLEAR_CACHE = `@xream.${key}.clearCache`

const title = $.getdata(KEY_TITLE) || 'Sub-Store Mega'

/* 混淆 */
const host = $.getdata(KEY_HOST)
/* 路径 */
const pathOpt = $.getdata(KEY_PATH)
/* network */
const network = $.getdata(KEY_NETWORK)
/* 节点名前缀 */
const prefix = $.getdata(KEY_PREFIX)
/* 节点名后缀 */
const suffix = $.getdata(KEY_SUFFIX)
/* 附加 Host 前缀 */
const hostPrefix =  $.getdata(KEY_HOST_PREFIX)
const hostSuffix =  $.getdata(KEY_HOST_SUFFUX)
/* 附加 Path 前缀 */
const pathPrefix =  $.getdata(KEY_PATH_PREFIX)
const pathSuffix =  $.getdata(KEY_PATH_SUFFUX)
/* 附加 IP 前缀 */
const ipPrefix =  String($.getdata(KEY_IP_PREFIX)) === 'true'
const ipSuffix =  String($.getdata(KEY_IP_SUFFUX)) === 'true'
/* 附加 network 前缀 */
const networkPrefix =  String($.getdata(KEY_NETWORK_PREFIX)) === 'true'
const networkSuffix =  String($.getdata(KEY_NETWORK_SUFFUX)) === 'true'
/* 端口 */
const port = $.getdata(KEY_PORT)
/* 排序 */
const autoSort = String($.getdata(KEY_SORT)) === 'true'
/* 域名 转 IP */
const resolve = String($.getdata(KEY_RESOLVE)) === 'true'
/* 域名解析等待时间(单位 秒) 因为 API 有频次限制*/
const sleep = $.getdata(KEY_SLEEP) || 1.5
/* 域名解析结果缓存时间(单位 秒) */
const expire = $.getdata(KEY_EXPIRE) || 30 * 60 // 若 <= 0 则不缓存
/* 域名解析结果缓存最大数 */
const cacheMaxSize = $.getdata(KEY_CACHE_MAX_SIZE) || 100
/* 成功后通知 */
const notifyOnSuccessDisabled = String($.getdata(KEY_NOTIFY_ON_SUCCESS_DISABLED)) === 'true'

/* [⚠️] 调试时模拟在线的域名解析 设置为随机 IP */
const mock = String($.getdata(KEY_MOCK)) === 'true'

/* [⚠️] 清除缓存 */
if (String($.getdata(KEY_CLEAR_CACHE)) === 'true') {
  $.setjson({}, KEY_CACHE)
  $.setdata(false, KEY_CLEAR_CACHE)
}

let resolveTimes = 0
let cacheHitTimes = 0
let hostSet
let pathSet
async function operator(proxies) {
  const disabled = $.getdata(KEY_DISABLED)
  if (String(disabled) === 'true') {
    $.log(`已禁用`)
    return proxies
  }
  try {
    const startedAt = Date.now()
    const result = await main(proxies)
    console.log(`本次使用缓存次数: ${cacheHitTimes}`)
    console.log(`本次在线解析次数: ${resolveTimes}`)
    console.log(`总耗时: ${Math.round((Date.now() - startedAt) / 1000)}s`)
    if (!notifyOnSuccessDisabled) {
      $.msg(
        title,
        `✅ 总耗时 ${Math.round((Date.now() - startedAt) / 1000)}s`,
        `在线解析数 ${resolveTimes}\n使用缓存数 ${cacheHitTimes}`
      )
    }
    return result
  } catch (e) {
    console.log(e)
    $.msg(title, `❌`, `${$.lodash_get(e, 'message') || e}`)
  }
}
async function main(proxies) {
  const result = []

  for await (let p of proxies) {
    /* 混淆 */
    if (host) {
      p = setHost(p, host)
    }
    /* 路径 */
    if (pathOpt) {
      p = setPath(p, pathOpt)
    }
    /* network */
    if (network) {
      p = setNetwork(p, network)
    }

    /* 设置端口 */
    if (port) {
      p = setPort(p, port)
    }
    /* 节点名附加 network */
    if (networkPrefix || networkSuffix) {
      const network = p.network ? `[${p.network.toLocaleUpperCase()}]` : ''
      if (network) {
        p = setName(p, networkPrefix?network:'' , networkSuffix?network:'')  
      }
    }
    /* 排序 */
    if (autoSort) {
      sort(p)
    }
    /* 域名 转 IP */
    if (resolve) {
      p = await resolveServer(p)
    }
    /* 设置节点名 */
    p = setName(p, prefix, suffix)
    result.push(p)
  }

  return result.sort((a, b) => b.sort - a.sort)
}
async function resolveServer(p) {
  let ip
  if (!isIPV4(p.server)) {
    /* 缓存 */
    let cache = $.getjson(KEY_CACHE) || {}

    const cacheSize = Object.keys(cache).length
    console.log(`cache: ${cacheSize}`)
    if (cacheSize + 1 > cacheMaxSize) {
      console.log(`delete first cache item`)
      delete cache[Object.keys(cache)[0]]
    }
    const cacheKey = p.server.replace(/\./g, '_')
    const cachedItem = $.lodash_get(cache, cacheKey, [])
    const [cachedIP, timestamp] = cachedItem
    if (expire > 0 && isIPV4(cachedIP) && timestamp) {
      const diff = (Date.now() - timestamp) / 1000
      console.log(`cache diff ${Math.round(diff / 60)} min(s): ${p.server} ${cachedIP}`)
      if (diff <= expire) {
        console.log(`✅ cache expire in ${Math.round((expire - diff) / 60)} min(s): ${p.server} ${cachedIP}`)
        cacheHitTimes += 1
        ip = cachedIP
      } else {
        console.log(`❌ cache expire: ${p.server} ${cachedIP}`)
        delete cache[p.server]
      }
    } else {
      console.log(`❌ cache miss: ${p.server}`)
      delete cache[p.server]
    }
    /* 在线查询 */
    if (!isIPV4(ip)) {
      console.log(`开始在线查询: ${p.server}`)
      resolveTimes += 1
      if (mock) {
        console.log(`模拟在线查询 随机 IP`)
        ip = `${Math.round(Math.random() * 200)}.${Math.round(Math.random() * 200)}.${Math.round(
          Math.random() * 200
        )}.${Math.round(Math.random() * 200)}`
      } else {
        try {
          const res = await $.http.get({
            url: `http://ip-api.com/json/${encodeURIComponent(p.server)}?lang=zh-CN`,
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 12_3_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.60 Safari/537.36',
            },
          })
          const resStatus = $.lodash_get(res, 'status')
          console.log('↓ res status')
          console.log(resStatus)
          let body = $.lodash_get(res, 'body')
          console.log('↓ res body')
          console.log(body)
          body = $.toObj(body)
          const status = $.lodash_get(body, 'status')
          if (status !== 'success') {
            throw new Error(`${p.server} 请求 ${status} ${$.lodash_get(e, 'message') || '未知错误'}`)
          }
          ip = $.lodash_get(body, 'query')
          console.log('↓ ip')
          console.log(ip)
          if (!isIPV4(ip)) {
            throw new Error(`${p.server} 解析 ${ip} 不是 IPV4`)
          }
        } catch (e) {
          console.log(e)
          console.log(`❌ 在线查询 ${p.server} 失败: ${$.lodash_get(e, 'message') || e}`)
          throw new Error(e)
        }
        /* 等待 */
        await new Promise(r => setTimeout(r, sleep * 1000))
      }
      console.log(`在线查询结果: ${p.server} ${ip}`)
      if (isIPV4(ip)) {
        $.lodash_set(cache, cacheKey, [ip, Date.now()])
        console.log(`在线查询结果有效 set cache: ${p.server} ${ip} expire in ${Math.round(expire / 60)} min(s)`)
        $.setjson(cache, KEY_CACHE)
      }
    }
    /* 设置节点 server 为 IP */
    if (isIPV4(ip)) {
      p.server = ip
    }
  }
  if (isIPV4(ip)) {
    /* 节点名附加 IP前缀后缀 */
    if (ipPrefix || ipSuffix) {
      const ipTxt = `[${ip}]`
      p = setName(p, ipPrefix?ipTxt:'' , ipSuffix?ipTxt:'')  
    }
  }
  return p
}
function isIPV4(ip) {
  return /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)(\.(?!$)|$)){4}$/.test(ip)
}
function sort(p) {
  /* 排序逻辑 */
  // 默认排序值 0
  let sort = 0

  if (p.name.startsWith('国内') && p.name.includes('限速')) {
    // 国内开头且限速的 排最下面
    sort = -10
  } else if (p.name.startsWith('国内')) {
    // 国内开头 排默认排序的下面
    sort = -1
  } else if (p.name.includes('香港2')) {
    // 含关键词的排上面
    sort = 20
  } else if (p.name.includes('香港3')) {
    sort = 19
  } else if (p.name.includes('香港4')) {
    sort = 18
  } else if (p.name.includes('韩国')) {
    sort = 17
  } else if (p.name.includes('香港5')) {
    sort = 16
  } else if (p.name.includes('日本1')) {
    sort = 15
  } else if (p.name.includes('香港')) {
    // 别的香港的 排默认的上面
    sort = 1
  }
  // 单独排个序
  //  if(name.startsWith('国内') && name.includes('内蒙') && name.includes('香港')){
  //    sort = 7
  //  }
  p.sort = sort
  return p
}
function setHost(p, host) {
  if (['vmess', 'vless'].includes(p.type) && p.network) {
    /* 把 非 server 的部分都设置为 host */
    /* skip-cert-verify 在这里设为 true 有需求就再加一个节点操作吧 */
    p['skip-cert-verify'] = true
    p.servername = host
    p['tls-hostname'] = host
    p.sni = host
    if (p.network === 'ws') {
      $.lodash_set(p, 'ws-opts.headers.Host', host)
    } else if (p.network === 'h2'){
      $.lodash_set(p, 'h2-opts.host', [host])
    } else if (p.network === 'http'){
      $.lodash_set(p, 'http-opts.headers.Host', [host])
    } else if (p.network){
      $.lodash_set(p, `${p.network}-opts.headers.Host`, [host])
    }
    if (p.network && !hostSet) {
      hostSet = true
      p = setName(p, hostPrefix?hostPrefix:'' , hostSuffix?hostSuffix:'')  
    }
  }
  return p
}
function setPath(p, path) {
  if (['vmess', 'vless'].includes(p.type) && p.network) {
    if (p.network === 'ws') {
      $.lodash_set(p, 'ws-opts.path', path)
    } else if (p.network === 'h2'){
      $.lodash_set(p, 'h2-opts.path', path)
    } else if (p.network === 'http'){
      $.lodash_set(p, 'http-opts.path', path)
    } else if (p.network){
      $.lodash_set(p, `${p.network}-opts.path`, path)
    }
    if (p.network && !pathSet) {
      pathSet = true
      p = setName(p, pathPrefix?pathPrefix:'' , pathSuffix?pathSuffix:'')  
    }
  }
  return p
}
function setNetwork(p, network) {
  if (['vmess', 'vless'].includes(p.type) && p.network) {
    let hostOpt
    if (p.network === 'ws') {
      hostOpt = $.lodash_get(p, 'ws-opts.headers.Host') 
    } else if (p.network === 'h2'){
      hostOpt = $.lodash_get(p, 'h2-opts.host.0')
    } else if (p.network === 'http'){
      hostOpt = $.lodash_get(p, 'http-opts.headers.Host.0')
    } else if (p.network){
      hostOpt = $.lodash_get(p, `${p.network}-opts.headers.Host.0`)
    }
    let pathOpt
    if (p.network === 'ws') {
      pathOpt = $.lodash_get(p, 'ws-opts.path')
    } else if (p.network === 'h2'){
      pathOpt = $.lodash_get(p, 'h2-opts.path')
    } else if (p.network === 'http'){
      pathOpt = $.lodash_get(p, 'http-opts.path')
    } else if (p.network){
      pathOpt = $.lodash_get(p, `${p.network}-opts.path`)
    }
    delete p[`${p.network}-opts`]
    p.network = network
    setHost(p, hostOpt)
    setPath(p, pathOpt)

  }
  return p
}
function setPort(p, port) {
  p.port = port
  setName(p, '', `[${port}]`)
  return p
}
function setName(p, prefix = '', suffix = '') {
  p.name = `${prefix}${p.name}${suffix}`
  return p
}

// prettier-ignore
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,r)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.encoding="utf-8",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`\ud83d\udd14${this.name}, \u5f00\u59cb!`)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $httpClient&&"undefined"==typeof $loon}isLoon(){return"undefined"!=typeof $loon}isShadowrocket(){return"undefined"!=typeof $rocket}isStash(){return"undefined"!=typeof $environment&&$environment["stash-version"]}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const i=this.getdata(t);if(i)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,i)=>e(i))})}runScript(t,e){return new Promise(s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let r=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");r=r?1*r:20,r=e&&e.timeout?e.timeout:r;const[o,h]=i.split("@"),n={url:`http://${h}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:r},headers:{"X-Key":o,Accept:"*/*"}};this.post(n,(t,e,i)=>s(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):i?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of i)if(r=Object(r)[t],void 0===r)return s;return r}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),r=s?this.getval(s):"";if(r)try{const t=JSON.parse(r);e=t?this.lodash_get(t,i,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(e),o=this.getval(i),h=i?"null"===o?null:o||"{}":"{}";try{const e=JSON.parse(h);this.lodash_set(e,r,t),s=this.setval(JSON.stringify(e),i)}catch(e){const o={};this.lodash_set(o,r,t),s=this.setval(JSON.stringify(o),i)}}else s=this.setval(t,e);return s}getval(t){return this.isSurge()||this.isLoon()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,e){return this.isSurge()||this.isLoon()?$persistentStore.write(t,e):this.isQuanX()?$prefs.setValueForKey(t,e):this.isNode()?(this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0):this.data&&this.data[e]||null}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){if(t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)});else if(this.isQuanX())this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t));else if(this.isNode()){let s=require("iconv-lite");this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:i,statusCode:r,headers:o,rawBody:h}=t,n=s.decode(h,this.encoding);e(null,{status:i,statusCode:r,headers:o,rawBody:h,body:n},n)},t=>{const{message:i,response:r}=t;e(i,r,r&&s.decode(r.rawBody,this.encoding))})}}post(t,e=(()=>{})){const s=t.method?t.method.toLocaleLowerCase():"post";if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient[s](t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)});else if(this.isQuanX())t.method=s,this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t));else if(this.isNode()){let i=require("iconv-lite");this.initGotEnv(t);const{url:r,...o}=t;this.got[s](r,o).then(t=>{const{statusCode:s,statusCode:r,headers:o,rawBody:h}=t,n=i.decode(h,this.encoding);e(null,{status:s,statusCode:r,headers:o,rawBody:h,body:n},n)},t=>{const{message:s,response:r}=t;e(s,r,r&&i.decode(r.rawBody,this.encoding))})}}time(t,e=null){const s=e?new Date(e):new Date;let i={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in i)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?i[e]:("00"+i[e]).substr((""+i[e]).length)));return t}msg(e=t,s="",i="",r){const o=t=>{if(!t)return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:this.isSurge()?{url:t}:void 0;if("object"==typeof t){if(this.isLoon()){let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}if(this.isQuanX()){let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl,i=t["update-pasteboard"]||t.updatePasteboard;return{"open-url":e,"media-url":s,"update-pasteboard":i}}if(this.isSurge()){let e=t.url||t.openUrl||t["open-url"];return{url:e}}}};if(this.isMute||(this.isSurge()||this.isLoon()?$notification.post(e,s,i,o(r)):this.isQuanX()&&$notify(e,s,i,o(r))),!this.isMuteLog){let t=["","==============\ud83d\udce3\u7cfb\u7edf\u901a\u77e5\ud83d\udce3=============="];t.push(e),s&&t.push(s),i&&t.push(i),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){const s=!this.isSurge()&&!this.isQuanX()&&!this.isLoon();s?this.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t.stack):this.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t)}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;this.log("",`\ud83d\udd14${this.name}, \u7ed3\u675f! \ud83d\udd5b ${s} \u79d2`),this.log(),this.isSurge()||this.isQuanX()||this.isLoon()?$done(t):this.isNode()&&process.exit(1)}}(t,e)}
