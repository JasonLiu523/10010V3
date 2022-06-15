const namespace = '@xream'
const key = 'pcr'

const $ = new Env(key)

const KEY_DISABLED = `${namespace}.${key}.disabled`
const KEY_MW = `${namespace}.${key}.mw`
const KEY_PCR = `${namespace}.${key}.pcr`
const KEY_EXPIRE_HOURS = `${namespace}.${key}.expireHours`
const KEY_ALERT_HOURS = `${namespace}.${key}.alertHours`
const KEY_ALERT_TIME = `${namespace}.${key}.alertTime`
const KEY_BARK = `${namespace}.${key}.bark`
const KEY_PUSHDEER = `${namespace}.${key}.pushdeer`
const KEY_TITLE = `@${namespace}.10010.title`
const KEY_SUBTITLE = `@${namespace}.10010.subtitle`
const KEY_BODY = `@${namespace}.10010.body`
const KEY_REQUEST_NOTIFY_DISABLED = `${namespace}.${key}.requestNotifyDisabled`

const expireHours = $.getdata(KEY_EXPIRE_HOURS) || 72
const alertHours = $.getdata(KEY_ALERT_HOURS) || 24
const alertTime = $.getdata(KEY_ALERT_TIME) || '08:00'
const titleTpl = $.getdata(KEY_TITLE) || '核酸报告 剩余有效时间'
const subtitleTpl = $.getdata(KEY_SUBTITLE) || '[剩余小时数] 小时'
const bodyTpl = $.getdata(KEY_BODY) || '检测中 [检测中的采样时间]'
let result
let isPcrJSON

!(async () => {
  const disabled = $.getdata(KEY_DISABLED)

  if (String(disabled) === 'true') {
    $.log('ℹ️ 已禁用')
    return
  }
  if (typeof $request !== 'undefined') {
    $.log('ℹ️ 是 request', $.toStr($request))
    let url = $request.url
    let body = $request.body
    let headers = $request.headers
    $.log('url', url)
    $.log('headers', $.toStr(headers))
    $.log('body', $.toStr(body))

    if (/^https?:\/\/pcr\.json/.test(url)) {
      $.log('ℹ️ 是 pcr.json')
      isPcrJSON = true

      result = { pcr: await getPcr() }
    } else if (/https?:\/\/smartgate\.ywtbsupappw\.sh\.gov\.cn\/ebus\/swift\/mw\/v1/.test(url)) {
      $.log('ℹ️ 是抓包')
      if (!headers || !body) {
        throw new Error('未获取到 headers/body')
      }
      $.setjson({ headers, body }, KEY_MW)
      await notify(`核酸报告`, `✅ 获取到 headers/body`, `已保存`)
    }
  } else {
    $.log('ℹ️ 不是 request')
    await getPcr()
  }
})()
  .catch(async e => {
    $.log(e)
    $.log($.toStr(e))
    const error = $.lodash_get(e, 'message') || $.lodash_get(e, 'error') || e
    await notify(`核酸报告`, `❌`, `${error}`, {})
    result = { error }
  })
  .finally(() => {
    $.done(
      isPcrJSON
        ? {
            response: {
              status: 200,
              body: JSON.stringify(result || {}),
              headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST,GET,OPTIONS,PUT,DELETE',
                'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
              },
            },
          }
        : result
    )
  })
async function getPcr() {
  let mw
  try {
    console.log(`① 开始获取 mw`)
    const mwOpts = $.getjson(KEY_MW) || {}
    const mwHeaders = $.lodash_get(mwOpts, 'headers')
    const mwBody = $.lodash_get(mwOpts, 'body')
    $.log('mwHeaders', $.toStr(mwHeaders))
    $.log('mwBody', $.toStr(mwBody))
    if (!mwHeaders || !mwBody) {
      throw new Error('无 headers/body 请先打开随申办微信小程序')
    }
    const mwRes = await $.http.post({
      url: `https://smartgate.ywtbsupappw.sh.gov.cn/ebus/swift/mw/v1`,
      headers: mwHeaders,
      body: JSON.parse(mwBody),
    })
    const mwResStatus = $.lodash_get(mwRes, 'status') || $.lodash_get(mwRes, 'statusCode') || 200
    $.log('↓ res status', mwResStatus)
    let mwResBody = String($.lodash_get(mwRes, 'body'))
    try {
      mwResBody = JSON.parse(mwResBody)
    } catch (e) {}
    $.log('↓ res body', $.toStr(mwResBody))
    mw = $.lodash_get(mwResBody, 'data')
    if (!mw) {
      throw new Error(
        $.lodash_get(mwResBody, 'desc') ||
          $.lodash_get(mwResBody, 'error') ||
          $.lodash_get(mwResBody, 'message') ||
          '未知错误'
      )
    }
    $.log('✅ 获取到 mw', mw)
    // await notify(`核酸报告`, `✅ 获取到 mw`, mw)
  } catch (e) {
    console.log(e)
    throw new Error(`获取 mw 失败: ${$.lodash_get(e, 'message') || e}`)
  }
  let pcrResBody
  try {
    console.log(`② 开始获取报告`)
    const pcrRes = await $.http.post({
      url: `https://suishenmaback2.sh.gov.cn/smzy/shspace/hs/getByMwV3?mw=${encodeURIComponent(mw)}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
    const pcrResStatus = $.lodash_get(pcrRes, 'status') || $.lodash_get(pcrRes, 'statusCode') || 200
    $.log('↓ res status', pcrResStatus)
    pcrResBody = String($.lodash_get(pcrRes, 'body'))
    try {
      pcrResBody = JSON.parse(pcrResBody)
    } catch (e) {}
    $.log('↓ res body', $.toStr(pcrResBody))
    const code = $.lodash_get(pcrResBody, 'code')
    if (String(code) !== '200') {
      throw new Error(
        $.lodash_get(pcrResBody, 'desc') ||
          $.lodash_get(pcrResBody, 'error') ||
          $.lodash_get(pcrResBody, 'message') ||
          '未知错误'
      )
    }
    // await notify(`核酸报告`, `✅ 获取到 pcr`, pcr)
  } catch (e) {
    console.log(e)
    throw new Error(`获取 pcr 失败: ${$.lodash_get(e, 'message') || e}`)
  }

  let latestPcr = $.lodash_get(pcrResBody, 'data.0')
  let latestSampleDate = $.lodash_get(latestPcr, 'sample_date')
  let latestReportDate = $.lodash_get(latestPcr, 'report_date')

  let reportedPcr = latestPcr
  let reportedSampleDate = latestSampleDate
  let reportedReportDate = latestReportDate

  if (!reportedReportDate) {
    $.log('没有检测时间 应该是检测中 使用上一次')
    reportedPcr = $.lodash_get(pcrResBody, 'data.1')
    reportedSampleDate = $.lodash_get(reportedPcr, 'sample_date')
    reportedReportDate = $.lodash_get(reportedPcr, 'report_date')
  } else {
    latestPcr = undefined
    latestSampleDate = undefined
    latestReportDate = undefined
  }
  if (reportedSampleDate) {
    const diff = new Date().getTime() - new Date(reportedSampleDate).getTime()
    const diffHours = expireHours - diff / 1000 / 3600

    const diffDays = Math.floor(diffHours / 24)
    const remainHours = Math.floor(diffHours - diffDays * 24)
    const totalDiffHours = Math.floor(diffHours)
    $.log(`📅 核酸剩余有效时间: ${totalDiffHours}小时 ~= ${diffDays} 天 ${remainHours} 小时(向下取整)`)
    const msgData = {
      ...reportedPcr,
      latestPcr,
      diffDays,
      remainHours,
      totalDiffHours,
      alertTime,
      expireHours,
      alertHours,
    }
    msg = {
      title: renderTpl(titleTpl, msgData),
      subtitle: renderTpl(subtitleTpl, msgData),
      body: renderTpl(bodyTpl, msgData),
    }

    pcrResBody.msg = msg
    pcrResBody.msgData = msgData
    pcrResBody.reportedPcr = reportedPcr
    if (!latestReportDate) {
      pcrResBody.latestPcr = latestPcr
    }
    // if (totalDiffHours <= alertHours) {
    //   $.log(`剩余有效期小于等于 ${alertHours}, 发送通知`)
    //   notify(msg.title, msg.subtitle, msg.body)
    // } else {
    //   const now = new Date()
    //   const diff =
    //     new Date(`${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()} ${alertTime}`).getTime() +
    //     1000 * 3600 * 24 -
    //     new Date().getTime()
    //   const diffHours = diff / 1000 / 3600
    //   const totalDiffHours = Math.floor(diffHours)
    //   $.log(`📅 到明天的 ${alertTime} 剩余有效期: ${totalDiffHours}小时(向下取整)`)
    //   if (totalDiffHours <= alertHours) {
    //     $.log(`如果到明天的 ${alertTime} 剩余有效期就会小于等于 ${alertHours}, 现在就发送通知`)
    //     notify(msg.title, msg.subtitle, msg.body)
    //   } else {
    //     $.log('不发送通知')
    //   }
    // }
    $.setjson(pcrResBody, KEY_PCR)
    $.log('pcrResBody', $.toStr(pcrResBody))
    $.log('通知预览', msg.title, msg.subtitle, msg.body)
    const requestNotifyDisabled = $.getdata(KEY_REQUEST_NOTIFY_DISABLED)

    if (String(requestNotifyDisabled) !== 'true') {
      notify(msg.title, msg.subtitle, msg.body)
    }
    return pcrResBody
  }
}
async function notify(title, subtitle, body) {
  const pushdeer = $.getdata(KEY_PUSHDEER)
  const bark = $.getdata(KEY_BARK)

  if (pushdeer || bark) {
    if (pushdeer) {
      try {
        const url = pushdeer.replace('[推送全文]', encodeURIComponent(`${title}\n${subtitle}\n${body}`))
        $.log(`开始 PushDeer 请求: ${url}`)
        const res = await $.http.get({ url })
        // console.log(res)
        const status = $.lodash_get(res, 'status')
        $.log('↓ res status')
        $.log(status)
        let resBody = String($.lodash_get(res, 'body') || $.lodash_get(res, 'rawBody'))
        try {
          resBody = JSON.parse(resBody)
        } catch (e) {}
        $.log('↓ res body')
        console.log($.toStr(resBody))
        if (!['0', '200'].includes(String($.lodash_get(resBody, 'code')))) {
          throw new Error($.lodash_get(resBody, 'message') || $.lodash_get(resBody, 'msg') || '未知错误')
        }
      } catch (e) {
        console.log(e)
        $.msg('核酸报告', `❌ PushDeer 请求`, `${$.lodash_get(e, 'message') || $.lodash_get(e, 'error') || e}`, {})
      }
    }
    if (bark) {
      try {
        const url = bark
          .replace('[推送标题]', encodeURIComponent(title))
          .replace('[推送内容]', encodeURIComponent(`${subtitle}\n${body}`))
        $.log(`开始 bark 请求: ${url}`)
        const res = await $.http.get({ url })
        // console.log(res)
        const status = $.lodash_get(res, 'status')
        $.log('↓ res status')
        $.log(status)
        let resBody = String($.lodash_get(res, 'body') || $.lodash_get(res, 'rawBody'))
        try {
          resBody = JSON.parse(resBody)
        } catch (e) {}
        $.log('↓ res body')
        console.log($.toStr(resBody))
        if (!['0', '200'].includes(String($.lodash_get(resBody, 'code')))) {
          throw new Error($.lodash_get(resBody, 'message') || $.lodash_get(resBody, 'msg') || '未知错误')
        }
      } catch (e) {
        console.log(e)
        $.msg('核酸报告', `❌ bark 请求`, `${$.lodash_get(e, 'message') || $.lodash_get(e, 'error') || e}`, {})
      }
    }
  } else {
    $.msg(`${title}`, subtitle, body)
  }
}
function renderTpl(tpl, data) {
  return tpl
    .replace('[采样时间]', data.sample_date || '')
    .replace('[检测时间]', data.report_date || '')
    .replace('[姓名]', data.name || '')
    .replace('[检测项目]', data.check_project || '')
    .replace('[检测机构]', data.test_orgname || '')
    .replace('[检测结果]', data.nat_result_name || '')
    .replace('[现在时间]', new Date().toLocaleString('zh'))
    .replace('[有效时长]', data.expireHours || '')
    .replace('[提醒时长]', data.alertHours || '')
    .replace('[提醒时间]', data.alertTime || '')
    .replace('[剩余天数部分]', data.diffDays || '')
    .replace('[剩余小时部分]', data.remainHours || '')
    .replace('[剩余小时数]', data.totalDiffHours || '')
    .replace('[提醒时间]', data.alertTime || '')
    .replace('[检测中的采样时间]', $.lodash_get(data, 'latestPcr.sample_date') || '-')
    .replace(/  +/g, ' ')
}
function lodash_set(obj, path, value) {
  if (Object(obj) !== obj) return obj // When obj is not an object
  // If not yet an array, get the keys from the string-path
  if (!Array.isArray(path)) path = path.toString().match(/[^.[\]]+/g) || []
  path.slice(0, -1).reduce(
    (
      a,
      c,
      i // Iterate all of them except the last one
    ) =>
      Object(a[c]) === a[c] // Does the key exist and is its value an object?
        ? // Yes: then follow that path
          a[c]
        : // No: create the key. Is the next key a potential array-index?
          (a[c] =
            Math.abs(path[i + 1]) >> 0 === +path[i + 1]
              ? [] // Yes: assign a new array object
              : {}), // No: assign a new plain object
    obj
  )[path[path.length - 1]] = value // Finally assign the value to the last key
  return obj // Return the top-level object to allow chaining
}

// prettier-ignore
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,o)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.encoding="utf-8",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`\ud83d\udd14${this.name}, \u5f00\u59cb!`)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $httpClient&&"undefined"==typeof $loon}isLoon(){return"undefined"!=typeof $loon}isShadowrocket(){return"undefined"!=typeof $rocket}isStash(){return"undefined"!=typeof $environment&&$environment["stash-version"]}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const i=this.getdata(t);if(i)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,i)=>e(i))})}runScript(t,e){return new Promise(s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let o=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");o=o?1*o:20,o=e&&e.timeout?e.timeout:o;const[r,a]=i.split("@"),h={url:`http://${a}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:o},headers:{"X-Key":r,Accept:"*/*"}};this.post(h,(t,e,i)=>s(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),o=JSON.stringify(this.data);s?this.fs.writeFileSync(t,o):i?this.fs.writeFileSync(e,o):this.fs.writeFileSync(t,o)}}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let o=t;for(const t of i)if(o=Object(o)[t],void 0===o)return s;return o}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),o=s?this.getval(s):"";if(o)try{const t=JSON.parse(o);e=t?this.lodash_get(t,i,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,o]=/^@(.*?)\.(.*?)$/.exec(e),r=this.getval(i),a=i?"null"===r?null:r||"{}":"{}";try{const e=JSON.parse(a);this.lodash_set(e,o,t),s=this.setval(JSON.stringify(e),i)}catch(e){const r={};this.lodash_set(r,o,t),s=this.setval(JSON.stringify(r),i)}}else s=this.setval(t,e);return s}getval(t){return this.isSurge()||this.isLoon()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,e){return this.isSurge()||this.isLoon()?$persistentStore.write(t,e):this.isQuanX()?$prefs.setValueForKey(t,e):this.isNode()?(this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0):this.data&&this.data[e]||null}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){if(t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,i)});else if(this.isQuanX())this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:o,body:r}=t;e(null,{status:s,statusCode:i,headers:o,body:r},r)},t=>e(t));else if(this.isNode()){let s=require("iconv-lite");this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:i,statusCode:o,headers:r,rawBody:a}=t,h=s.decode(a,this.encoding);e(null,{status:i,statusCode:o,headers:r,rawBody:a,body:h},h)},t=>{const{message:i,response:o}=t;e(i,o,o&&s.decode(o.rawBody,this.encoding))})}}post(t,e=(()=>{})){const s=t.method?t.method.toLocaleLowerCase():"post";if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient[s](t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status?s.status:s.statusCode,s.status=s.statusCode),e(t,s,i)});else if(this.isQuanX())t.method=s,this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:o,body:r}=t;e(null,{status:s,statusCode:i,headers:o,body:r},r)},t=>e(t));else if(this.isNode()){let i=require("iconv-lite");this.initGotEnv(t);const{url:o,...r}=t;this.got[s](o,r).then(t=>{const{statusCode:s,statusCode:o,headers:r,rawBody:a}=t,h=i.decode(a,this.encoding);e(null,{status:s,statusCode:o,headers:r,rawBody:a,body:h},h)},t=>{const{message:s,response:o}=t;e(s,o,o&&i.decode(o.rawBody,this.encoding))})}}time(t,e=null){const s=e?new Date(e):new Date;let i={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in i)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?i[e]:("00"+i[e]).substr((""+i[e]).length)));return t}msg(e=t,s="",i="",o){const r=t=>{if(!t)return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:this.isSurge()?{url:t}:void 0;if("object"==typeof t){if(this.isLoon()){let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}if(this.isQuanX()){let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl,i=t["update-pasteboard"]||t.updatePasteboard;return{"open-url":e,"media-url":s,"update-pasteboard":i}}if(this.isSurge()){let e=t.url||t.openUrl||t["open-url"];return{url:e}}}};if(this.isMute||(this.isSurge()||this.isLoon()?$notification.post(e,s,i,r(o)):this.isQuanX()&&$notify(e,s,i,r(o))),!this.isMuteLog){let t=["","==============\ud83d\udce3\u7cfb\u7edf\u901a\u77e5\ud83d\udce3=============="];t.push(e),s&&t.push(s),i&&t.push(i),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){const s=!this.isSurge()&&!this.isQuanX()&&!this.isLoon();s?this.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t.stack):this.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t)}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;this.log("",`\ud83d\udd14${this.name}, \u7ed3\u675f! \ud83d\udd5b ${s} \u79d2`),this.log(),this.isSurge()||this.isQuanX()||this.isLoon()?$done(t):this.isNode()&&process.exit(1)}}(t,e)}
