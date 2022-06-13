const rootNamespace = '@xream'
const subNamespace = 'sub_store_mega'
const namespace = `${rootNamespace}.${subNamespace}`

const $ = new Env(subNamespace)
if (HTTP) {
  console.log(`HTTP`, HTTP)
  $.http = HTTP()
}

const KEY_CACHE = `${namespace}.cache`

const title = getVal('title') || 'Sub-Store Mega'

const disabled = getVal('disabled')
/* 混淆 */
const host = getVal('host')
/* 路径 */
const pathOpt = getVal('path')
/* network */
const network = getVal('network')
/* network */
const defaultNetworkPath = getVal('defaultNetworkPath') || '/'
/* 节点名前缀 */
const prefix = getVal('prefix') || ''
/* 节点名后缀 */
const suffix = getVal('suffix') || ''
/* 附加 Host 前缀 */
const hostPrefix = getVal('hostPrefix') || ''
const hostSuffix = getVal('hostSuffix') || ''
/* 附加 Path 前缀 */
const pathPrefix = getVal('pathPrefix') || ''
const pathSuffix = getVal('pathSuffix') || ''
/* 附加 IP 前缀 */
const ipPrefix = String(getVal('ipPrefix')) === 'true'
const ipSuffix = String(getVal('ipSuffix')) === 'true'
/* 附加 network 前缀 */
const networkPrefix = String(getVal('networkPrefix')) === 'true'
const networkSuffix = String(getVal('networkSuffix')) === 'true'
/* 端口 */
const port = getVal('port')
/* 排序 */
const autoSort = String(getVal('sort')) === 'true'
/* 域名 转 IP */
const resolve = String(getVal('resolve')) === 'true'
const resolver = getVal('resolver') || 'cloudflare'
/* 域名解析等待时间(单位 秒) 因为 API 有频次限制*/
const sleep = getVal('sleep') || 0
/* 域名解析结果缓存时间(单位 秒) */
const expire = getVal('expire') || 30 * 60 // 若 <= 0 则不缓存
/* 域名解析结果缓存最大数 */
const cacheMaxSize = getVal('cacheMaxSize') || 100
/* 成功后通知 */
const notifyOnSuccessDisabled = String(getVal('notifyOnSuccessDisabled')) === 'true'

/* [⚠️] 调试时模拟在线的域名解析 设置为随机 IP */
const mock = String(getVal('mock')) === 'true'

/* [⚠️] 清除缓存 */
if (String(getVal('clearCache')) === 'true') {
  $.setjson({}, KEY_CACHE)
  $.setdata(false, `${namespace}.clearCache`)
}

let resolveTimes = 0
let cacheHitTimes = 0
let resolvedCount = 0
let unresolvedCount = 0

/* 缓存 */
let cache = $.getjson(KEY_CACHE) || {}

let cacheSize = Object.keys(cache).length
console.log(`cache: ${cacheSize}`)

async function operator(proxies = []) {
  if (String(disabled) === 'true') {
    $.log(`已禁用`)
    return proxies
  }
  try {
    const startedAt = Date.now()
    const result = await main(proxies)
    let cacheKeys = Object.keys(cache)
    cacheKeys = cacheKeys.slice(-cacheMaxSize)
    cache = Object.fromEntries(
    Object.entries(cache).filter(([key, value]) => cacheKeys.includes(key)) )

    console.log(`cache: ${Object.keys(cache).length}`)
    $.setjson(cache, KEY_CACHE)
    console.log(`本次使用缓存次数: ${cacheHitTimes}`)
    console.log(`本次在线解析次数: ${resolveTimes}`)
    console.log(`解析成功数: ${resolvedCount}`)
    console.log(`解析失败数: ${unresolvedCount}`)
    console.log(`总耗时: ${Math.round((Date.now() - startedAt) / 1000)}s`)
    if (!notifyOnSuccessDisabled) {
      $.msg(
        title,
        `✅ 总耗时 ${Math.round((Date.now() - startedAt) / 1000)}s`,
        `使用缓存数 ${cacheHitTimes}\n解析成功数 ${resolvedCount}\n解析失败数 ${unresolvedCount}`
      )
    }
    return result
  } catch (e) {
    console.log(e)
    $.msg(title, `❌`, `${$.lodash_get(e, 'message') || e}`)
  }
}
async function main(proxies) {
  let result = []
  if (sleep <= 0) {
    result = await Promise.all(proxies.map(p => proxyHander(p)))
  } else {
    for await (let p of proxies) {
      p = await proxyHander(p)
      result.push(p)
    }
  }

  return result.sort((a, b) => b._sort - a._sort)
}

async function proxyHander(p) {
  /* network */
  if (network) {
    p = setNetwork(p, network)
  }
  /* 混淆 */
  if (host) {
    p = setHost(p, host)
  }
  /* 路径 */
  if (pathOpt) {
    p = setPath(p, pathOpt)
  }


  /* 设置端口 */
  if (port) {
    p = setPort(p, port)
  }
  /* 节点名附加 network */
  if (networkPrefix || networkSuffix) {
    const network = p.network ? `[${p.network.toLocaleUpperCase()}]` : ''
    if (network) {
      p = setName(p, networkPrefix ? network : '', networkSuffix ? network : '')
    }
  }
  /* 排序 */
  if (autoSort) {
    p = sort(p)
  }
  /* 域名 转 IP */
  if (resolve) {
    p = await resolveServer(p)
  }
  /* 设置节点名 */
  p = setName(p, prefix, suffix)
  return p
}

async function resolveServer(p) {
  let ip
  if (!isIPV4(p.server)) {
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
      console.log(`⚠️ cache miss: ${p.server}`)
      delete cache[p.server]
    }
    /* 在线查询 */
    if (!isIPV4(ip)) {
      console.log(`👉🏻 开始在线查询: ${resolver} ${p.server}`)
      resolveTimes += 1
      if (mock) {
        console.log(`模拟在线查询 随机 IP`)
        ip = `${Math.round(Math.random() * 200)}.${Math.round(Math.random() * 200)}.${Math.round(
          Math.random() * 200
        )}.${Math.round(Math.random() * 200)}`
      } else {
        try {
          if (resolver === 'google') {
            const res = await $.http.get({
              url: `https://8.8.4.4/resolve?name=${encodeURIComponent(p.server)}&type=A`,
              headers: {
                accept: 'application/dns-json',
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
            const status = $.lodash_get(body, 'Status')
            if (status !== 0) {
              throw new Error(`${resolver} ${p.server} 请求 ${resStatus} ${status}`)
            }
            const answers = $.lodash_get(body, 'Answer') || []
            ip = $.lodash_get(answers, `${answers.length-1}.data`)
            console.log('↓ ip')
            console.log(ip)
            if (!isIPV4(ip)) {
              throw new Error(`${resolver} ${p.server} 解析 ${ip} 不是 IPV4`)
            }
          } else if(resolver === 'ip-api') {
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
              throw new Error(`${p.server} 请求 ${status} ${$.lodash_get(body, 'message') || '未知错误'}`)
            }
            ip = $.lodash_get(body, 'query')

            console.log('↓ ip')
            console.log(ip)
            if (!isIPV4(ip)) {
              throw new Error(`${resolver} ${p.server} 解析 ${ip} 不是 IPV4`)
            }
          }else {
            const res = await $.http.get({
              url: `https://1.0.0.1/dns-query?name=${encodeURIComponent(p.server)}&type=A`,
              headers: {
                accept: 'application/dns-json',
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
            const status = $.lodash_get(body, 'Status')
            if (status !== 0) {
              throw new Error(`${resolver} ${p.server} 请求 ${resStatus} ${status}`)
              // throw new Error(`${p.server} 请求 ${status} ${$.lodash_get(body, 'message') || '未知错误'}`)
            }
            const answers = $.lodash_get(body, 'Answer') || []
            ip = $.lodash_get(answers, `${answers.length-1}.data`)
            console.log('↓ ip')
            console.log(ip)
            if (!isIPV4(ip)) {
              throw new Error(`${resolver} ${p.server} 解析 ${ip} 不是 IPV4`)
            }
          }
          resolvedCount += 1
        } catch (e) {
          console.log(e)
          console.log(`❌ 在线查询 ${resolver} ${p.server} 失败: ${$.lodash_get(e, 'message') || e}`)
          unresolvedCount += 1
        }
        /* 等待 */
        await new Promise(r => setTimeout(r, sleep * 1000))
      }
      console.log(`👉🏻 在线查询结果: ${resolver} ${p.server} ${ip}`)
      if (isIPV4(ip)) {
        $.lodash_set(cache, cacheKey, [ip, Date.now()])
        console.log(`在线查询结果有效 set cache: ${p.server} ${ip} expire in ${Math.round(expire / 60)} min(s)`)
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
      p = setName(p, ipPrefix ? ipTxt : '', ipSuffix ? ipTxt : '')
    }
  }
  return p
}
function getVal(key) {
  return $.lodash_get($arguments, key) || $.getdata(`${namespace}.${key}`)
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
  } else if (p.name.includes('香港6')) {
    // 含关键词的排上面
    sort = 20
  } else if (p.name.includes('香港2')) {
    sort = 19
  } else if (p.name.includes('韩国')) {
    sort = 18
  } else if (p.name.includes('香港4')) {
    sort = 17
  } else if (p.name.includes('香港3')) {
    sort = 16
  } else if (p.name.includes('孟买')) {
    sort = 15
  } else if (p.name.includes('香港')) {
    sort = 14
  } else if (p.name.includes('日本')) {
    sort = 13
  } else if (p.name.includes('美国')) {
    sort = 12
  }
  // 单独排个序
  //  if(name.startsWith('国内') && name.includes('内蒙') && name.includes('香港')){
  //    sort = 7
  //  }
  p._sort = sort
  return p
}
function setHost(p, host) {
  if (['vmess', 'vless'].includes(p.type)) {
    /* 把 非 server 的部分都设置为 host */
    /* skip-cert-verify 在这里设为 true 有需求就再加一个节点操作吧 */
    p['skip-cert-verify'] = true
    p.servername = host
    p['tls-hostname'] = host
    p.sni = host
    if (p.network === 'ws') {
      $.lodash_set(p, 'ws-opts.headers.Host', host)
    } else if (p.network === 'h2') {
      $.lodash_set(p, 'h2-opts.host', [host])
    } else if (p.network === 'http') {
      $.lodash_set(p, 'http-opts.headers.Host', [host])
    } else if (p.network) {
      $.lodash_set(p, `${p.network}-opts.headers.Host`, [host])
    }
    if (p.network && !p._hostSet) {
      p._hostSet = true
      p = setName(p, hostPrefix ? hostPrefix : '', hostSuffix ? hostSuffix : '')
    }
  }
  return p
}
function setPath(p, path) {
  if (['vmess', 'vless'].includes(p.type)) {
    if (p.network === 'ws') {
      $.lodash_set(p, 'ws-opts.path', path)
    } else if (p.network === 'h2') {
      $.lodash_set(p, 'h2-opts.path', path)
    } else if (p.network === 'http') {
      $.lodash_set(p, 'http-opts.path', [path])
    } else if (p.network) {
      $.lodash_set(p, `${p.network}-opts.path`, path)
    }
    if (p.network && !p._pathSet) {
      p._pathSet = true
      p = setName(p, pathPrefix ? pathPrefix : '', pathSuffix ? pathSuffix : '')
    }
  }
  return p
}
function setNetwork(p, network) {
  if (['vmess', 'vless'].includes(p.type)) {
    let hostOpt
    if (p.network === 'ws') {
      hostOpt = $.lodash_get(p, 'ws-opts.headers.Host')
    } else if (p.network === 'h2') {
      hostOpt = $.lodash_get(p, 'h2-opts.host.0')
    } else if (p.network === 'http') {
      hostOpt = $.lodash_get(p, 'http-opts.headers.Host.0')
    } else if (p.network) {
      hostOpt = $.lodash_get(p, `${p.network}-opts.headers.Host.0`)
    }
    let pathOpt
    if (p.network === 'ws') {
      pathOpt = $.lodash_get(p, 'ws-opts.path')
    } else if (p.network === 'h2') {
      pathOpt = $.lodash_get(p, 'h2-opts.path')
    } else if (p.network === 'http') {
      pathOpt = $.lodash_get(p, 'http-opts.path.0')
    } else if (p.network) {
      pathOpt = $.lodash_get(p, `${p.network}-opts.path`)
    }
    delete p[`${p.network}-opts`]
    p.network = network
    if (hostOpt) {
      setHost(p, hostOpt)
    }
    setPath(p, pathOpt || defaultNetworkPath)
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
function Env(name, opts) {
  class Http {
    constructor(env) {
      this.env = env
    }

    send(opts, method = 'GET') {
      opts = typeof opts === 'string' ? { url: opts } : opts
      let sender = this.get
      if (method === 'POST') {
        sender = this.post
      }
      return new Promise((resolve, reject) => {
        sender.call(this, opts, (err, resp, body) => {
          if (err) reject(err)
          else resolve(resp)
        })
      })
    }

    get(opts) {
      return this.send.call(this.env, opts)
    }

    post(opts) {
      return this.send.call(this.env, opts, 'POST')
    }
  }

  return new (class {
    constructor(name, opts) {
      this.name = name
      this.http = new Http(this)
      this.data = null
      this.dataFile = 'box.dat'
      this.logs = []
      this.isMute = false
      this.isNeedRewrite = false
      this.logSeparator = '\n'
      this.encoding = 'utf-8'
      this.startTime = new Date().getTime()
      Object.assign(this, opts)
      this.log('', `🔔${this.name}, 开始!`)
    }

    isNode() {
      return 'undefined' !== typeof module && !!module.exports
    }

    isQuanX() {
      return 'undefined' !== typeof $task
    }

    isSurge() {
      return 'undefined' !== typeof $httpClient && 'undefined' === typeof $loon
    }

    isLoon() {
      return 'undefined' !== typeof $loon
    }

    isShadowrocket() {
      return 'undefined' !== typeof $rocket
    }

    isStash() {
      return 'undefined' !== typeof $environment && $environment['stash-version']
    }

    toObj(str, defaultValue = null) {
      try {
        return JSON.parse(str)
      } catch {
        return defaultValue
      }
    }

    toStr(obj, defaultValue = null) {
      try {
        return JSON.stringify(obj)
      } catch {
        return defaultValue
      }
    }

    getjson(key, defaultValue) {
      let json = defaultValue
      const val = this.getdata(key)
      if (val) {
        try {
          json = JSON.parse(this.getdata(key))
        } catch {}
      }
      return json
    }

    setjson(val, key) {
      try {
        return this.setdata(JSON.stringify(val), key)
      } catch {
        return false
      }
    }

    getScript(url) {
      return new Promise((resolve) => {
        this.get({ url }, (err, resp, body) => resolve(body))
      })
    }

    runScript(script, runOpts) {
      return new Promise((resolve) => {
        let httpapi = this.getdata('@chavy_boxjs_userCfgs.httpapi')
        httpapi = httpapi ? httpapi.replace(/\n/g, '').trim() : httpapi
        let httpapi_timeout = this.getdata('@chavy_boxjs_userCfgs.httpapi_timeout')
        httpapi_timeout = httpapi_timeout ? httpapi_timeout * 1 : 20
        httpapi_timeout = runOpts && runOpts.timeout ? runOpts.timeout : httpapi_timeout
        const [key, addr] = httpapi.split('@')
        const opts = {
          url: `http://${addr}/v1/scripting/evaluate`,
          body: { script_text: script, mock_type: 'cron', timeout: httpapi_timeout },
          headers: { 'X-Key': key, 'Accept': '*/*' }
        }
        this.post(opts, (err, resp, body) => resolve(body))
      }).catch((e) => this.logErr(e))
    }

    loaddata() {
      if (this.isNode()) {
        this.fs = this.fs ? this.fs : require('fs')
        this.path = this.path ? this.path : require('path')
        const curDirDataFilePath = this.path.resolve(this.dataFile)
        const rootDirDataFilePath = this.path.resolve(process.cwd(), this.dataFile)
        const isCurDirDataFile = this.fs.existsSync(curDirDataFilePath)
        const isRootDirDataFile = !isCurDirDataFile && this.fs.existsSync(rootDirDataFilePath)
        if (isCurDirDataFile || isRootDirDataFile) {
          const datPath = isCurDirDataFile ? curDirDataFilePath : rootDirDataFilePath
          try {
            return JSON.parse(this.fs.readFileSync(datPath))
          } catch (e) {
            return {}
          }
        } else return {}
      } else return {}
    }

    writedata() {
      if (this.isNode()) {
        this.fs = this.fs ? this.fs : require('fs')
        this.path = this.path ? this.path : require('path')
        const curDirDataFilePath = this.path.resolve(this.dataFile)
        const rootDirDataFilePath = this.path.resolve(process.cwd(), this.dataFile)
        const isCurDirDataFile = this.fs.existsSync(curDirDataFilePath)
        const isRootDirDataFile = !isCurDirDataFile && this.fs.existsSync(rootDirDataFilePath)
        const jsondata = JSON.stringify(this.data)
        if (isCurDirDataFile) {
          this.fs.writeFileSync(curDirDataFilePath, jsondata)
        } else if (isRootDirDataFile) {
          this.fs.writeFileSync(rootDirDataFilePath, jsondata)
        } else {
          this.fs.writeFileSync(curDirDataFilePath, jsondata)
        }
      }
    }

    lodash_get(source, path, defaultValue = undefined) {
      const paths = path.replace(/\[(\d+)\]/g, '.$1').split('.')
      let result = source
      for (const p of paths) {
        result = Object(result)[p]
        if (result === undefined) {
          return defaultValue
        }
      }
      return result
    }

    lodash_set(obj, path, value) {
      if (Object(obj) !== obj) return obj
      if (!Array.isArray(path)) path = path.toString().match(/[^.[\]]+/g) || []
      path
        .slice(0, -1)
        .reduce((a, c, i) => (Object(a[c]) === a[c] ? a[c] : (a[c] = Math.abs(path[i + 1]) >> 0 === +path[i + 1] ? [] : {})), obj)[
        path[path.length - 1]
      ] = value
      return obj
    }

    getdata(key) {
      let val = this.getval(key)
      // 如果以 @
      if (/^@/.test(key)) {
        const [, objkey, paths] = /^@(.*?)\.(.*?)$/.exec(key)
        const objval = objkey ? this.getval(objkey) : ''
        if (objval) {
          try {
            const objedval = JSON.parse(objval)
            val = objedval ? this.lodash_get(objedval, paths, '') : val
          } catch (e) {
            val = ''
          }
        }
      }
      return val
    }

    setdata(val, key) {
      let issuc = false
      if (/^@/.test(key)) {
        const [, objkey, paths] = /^@(.*?)\.(.*?)$/.exec(key)
        const objdat = this.getval(objkey)
        const objval = objkey ? (objdat === 'null' ? null : objdat || '{}') : '{}'
        try {
          const objedval = JSON.parse(objval)
          this.lodash_set(objedval, paths, val)
          issuc = this.setval(JSON.stringify(objedval), objkey)
        } catch (e) {
          const objedval = {}
          this.lodash_set(objedval, paths, val)
          issuc = this.setval(JSON.stringify(objedval), objkey)
        }
      } else {
        issuc = this.setval(val, key)
      }
      return issuc
    }

    getval(key) {
      if (this.isSurge() || this.isLoon()) {
        return $persistentStore.read(key)
      } else if (this.isQuanX()) {
        return $prefs.valueForKey(key)
      } else if (this.isNode()) {
        this.data = this.loaddata()
        return this.data[key]
      } else {
        return (this.data && this.data[key]) || null
      }
    }

    setval(val, key) {
      if (this.isSurge() || this.isLoon()) {
        return $persistentStore.write(val, key)
      } else if (this.isQuanX()) {
        return $prefs.setValueForKey(val, key)
      } else if (this.isNode()) {
        this.data = this.loaddata()
        this.data[key] = val
        this.writedata()
        return true
      } else {
        return (this.data && this.data[key]) || null
      }
    }

    initGotEnv(opts) {
      this.got = this.got ? this.got : require('got')
      this.cktough = this.cktough ? this.cktough : require('tough-cookie')
      this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar()
      if (opts) {
        opts.headers = opts.headers ? opts.headers : {}
        if (undefined === opts.headers.Cookie && undefined === opts.cookieJar) {
          opts.cookieJar = this.ckjar
        }
      }
    }

    get(opts, callback = () => {}) {
      console.log(4)
      if (opts.headers) {
        delete opts.headers['Content-Type']
        delete opts.headers['Content-Length']
      }
      if (this.isSurge() || this.isLoon()) {
        if (this.isSurge() && this.isNeedRewrite) {
          opts.headers = opts.headers || {}
          Object.assign(opts.headers, { 'X-Surge-Skip-Scripting': false })
        }
        $httpClient.get(opts, (err, resp, body) => {
          if (!err && resp) {
            resp.body = body
            resp.statusCode = resp.status ? resp.status : resp.statusCode
            resp.status = resp.statusCode
          }
          callback(err, resp, body)
        })
      } else if (this.isQuanX()) {
        if (this.isNeedRewrite) {
          opts.opts = opts.opts || {}
          Object.assign(opts.opts, { hints: false })
        }
        $task.fetch(opts).then(
          (resp) => {
            const { statusCode: status, statusCode, headers, body } = resp
            callback(null, { status, statusCode, headers, body }, body)
          },
          (err) => callback(err)
        )
      } else if (this.isNode()) {
        let iconv = require('iconv-lite')
        this.initGotEnv(opts)
        this.got(opts)
          .on('redirect', (resp, nextOpts) => {
            try {
              if (resp.headers['set-cookie']) {
                const ck = resp.headers['set-cookie'].map(this.cktough.Cookie.parse).toString()
                if (ck) {
                  this.ckjar.setCookieSync(ck, null)
                }
                nextOpts.cookieJar = this.ckjar
              }
            } catch (e) {
              this.logErr(e)
            }
            // this.ckjar.setCookieSync(resp.headers['set-cookie'].map(Cookie.parse).toString())
          })
          .then(
            (resp) => {
              const { statusCode: status, statusCode, headers, rawBody } = resp
              const body = iconv.decode(rawBody, this.encoding)
              callback(null, { status, statusCode, headers, rawBody, body }, body)
            },
            (err) => {
              const { message: error, response: resp } = err
              callback(error, resp, resp && iconv.decode(resp.rawBody, this.encoding))
            }
          )
      }
    }

    post(opts, callback = () => {}) {
      const method = opts.method ? opts.method.toLocaleLowerCase() : 'post'
      // 如果指定了请求体, 但没指定`Content-Type`, 则自动生成
      if (opts.body && opts.headers && !opts.headers['Content-Type']) {
        opts.headers['Content-Type'] = 'application/x-www-form-urlencoded'
      }
      if (opts.headers) delete opts.headers['Content-Length']
      if (this.isSurge() || this.isLoon()) {
        if (this.isSurge() && this.isNeedRewrite) {
          opts.headers = opts.headers || {}
          Object.assign(opts.headers, { 'X-Surge-Skip-Scripting': false })
        }
        $httpClient[method](opts, (err, resp, body) => {
          if (!err && resp) {
            resp.body = body
            resp.statusCode = resp.status ? resp.status : resp.statusCode
            resp.status = resp.statusCode
          }
          callback(err, resp, body)
        })
      } else if (this.isQuanX()) {
        opts.method = method
        if (this.isNeedRewrite) {
          opts.opts = opts.opts || {}
          Object.assign(opts.opts, { hints: false })
        }
        $task.fetch(opts).then(
          (resp) => {
            const { statusCode: status, statusCode, headers, body } = resp
            callback(null, { status, statusCode, headers, body }, body)
          },
          (err) => callback(err)
        )
      } else if (this.isNode()) {
        let iconv = require('iconv-lite')
        this.initGotEnv(opts)
        const { url, ..._opts } = opts
        this.got[method](url, _opts).then(
          (resp) => {
            const { statusCode: status, statusCode, headers, rawBody } = resp
            const body = iconv.decode(rawBody, this.encoding)
            callback(null, { status, statusCode, headers, rawBody, body }, body)
          },
          (err) => {
            const { message: error, response: resp } = err
            callback(error, resp, resp && iconv.decode(resp.rawBody, this.encoding))
          }
        )
      }
    }
    /**
     *
     * 示例:$.time('yyyy-MM-dd qq HH:mm:ss.S')
     *    :$.time('yyyyMMddHHmmssS')
     *    y:年 M:月 d:日 q:季 H:时 m:分 s:秒 S:毫秒
     *    其中y可选0-4位占位符、S可选0-1位占位符，其余可选0-2位占位符
     * @param {string} fmt 格式化参数
     * @param {number} 可选: 根据指定时间戳返回格式化日期
     *
     */
    time(fmt, ts = null) {
      const date = ts ? new Date(ts) : new Date()
      let o = {
        'M+': date.getMonth() + 1,
        'd+': date.getDate(),
        'H+': date.getHours(),
        'm+': date.getMinutes(),
        's+': date.getSeconds(),
        'q+': Math.floor((date.getMonth() + 3) / 3),
        'S': date.getMilliseconds()
      }
      if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (date.getFullYear() + '').substr(4 - RegExp.$1.length))
      for (let k in o)
        if (new RegExp('(' + k + ')').test(fmt))
          fmt = fmt.replace(RegExp.$1, RegExp.$1.length == 1 ? o[k] : ('00' + o[k]).substr(('' + o[k]).length))
      return fmt
    }

    /**
     * 系统通知
     *
     * > 通知参数: 同时支持 QuanX 和 Loon 两种格式, EnvJs根据运行环境自动转换, Surge 环境不支持多媒体通知
     *
     * 示例:
     * $.msg(title, subt, desc, 'twitter://')
     * $.msg(title, subt, desc, { 'open-url': 'twitter://', 'media-url': 'https://github.githubassets.com/images/modules/open_graph/github-mark.png' })
     * $.msg(title, subt, desc, { 'open-url': 'https://bing.com', 'media-url': 'https://github.githubassets.com/images/modules/open_graph/github-mark.png' })
     *
     * @param {*} title 标题
     * @param {*} subt 副标题
     * @param {*} desc 通知详情
     * @param {*} opts 通知参数
     *
     */
    msg(title = name, subt = '', desc = '', opts) {
      const toEnvOpts = (rawopts) => {
        if (!rawopts) return rawopts
        if (typeof rawopts === 'string') {
          if (this.isLoon()) return rawopts
          else if (this.isQuanX()) return { 'open-url': rawopts }
          else if (this.isSurge()) return { url: rawopts }
          else return undefined
        } else if (typeof rawopts === 'object') {
          if (this.isLoon()) {
            let openUrl = rawopts.openUrl || rawopts.url || rawopts['open-url']
            let mediaUrl = rawopts.mediaUrl || rawopts['media-url']
            return { openUrl, mediaUrl }
          } else if (this.isQuanX()) {
            let openUrl = rawopts['open-url'] || rawopts.url || rawopts.openUrl
            let mediaUrl = rawopts['media-url'] || rawopts.mediaUrl
            let updatePasteboard = rawopts['update-pasteboard'] || rawopts.updatePasteboard
            return { 'open-url': openUrl, 'media-url': mediaUrl, 'update-pasteboard': updatePasteboard }
          } else if (this.isSurge()) {
            let openUrl = rawopts.url || rawopts.openUrl || rawopts['open-url']
            return { url: openUrl }
          }
        } else {
          return undefined
        }
      }
      if (!this.isMute) {
        if (this.isSurge() || this.isLoon()) {
          $notification.post(title, subt, desc, toEnvOpts(opts))
        } else if (this.isQuanX()) {
          $notify(title, subt, desc, toEnvOpts(opts))
        }
      }
      if (!this.isMuteLog) {
        let logs = ['', '==============📣系统通知📣==============']
        logs.push(title)
        subt ? logs.push(subt) : ''
        desc ? logs.push(desc) : ''
        console.log(logs.join('\n'))
        this.logs = this.logs.concat(logs)
      }
    }

    log(...logs) {
      if (logs.length > 0) {
        this.logs = [...this.logs, ...logs]
      }
      console.log(logs.join(this.logSeparator))
    }

    logErr(err, msg) {
      const isPrintSack = !this.isSurge() && !this.isQuanX() && !this.isLoon()
      if (!isPrintSack) {
        this.log('', `❗️${this.name}, 错误!`, err)
      } else {
        this.log('', `❗️${this.name}, 错误!`, err.stack)
      }
    }

    wait(time) {
      return new Promise((resolve) => setTimeout(resolve, time))
    }

    done(val = {}) {
      const endTime = new Date().getTime()
      const costTime = (endTime - this.startTime) / 1000
      this.log('', `🔔${this.name}, 结束! 🕛 ${costTime} 秒`)
      this.log()
      if (this.isSurge() || this.isQuanX() || this.isLoon()) {
        $done(val)
      } else if (this.isNode()) {
        process.exit(1)
      }
    }
  })(name, opts)
}
