function b64ToUint6(nChr) {
  return nChr > 64 && nChr < 91
    ? nChr - 65
    : nChr > 96 && nChr < 123
    ? nChr - 71
    : nChr > 47 && nChr < 58
    ? nChr + 4
    : nChr === 43
    ? 62
    : nChr === 47
    ? 63
    : 0
}

function base64DecToArr(sBase64, nBlockSize) {
  var sB64Enc = sBase64.replace(/[^A-Za-z0-9\+\/]/g, '')

  var nInLen = sB64Enc.length

  var nOutLen = nBlockSize ? Math.ceil(((nInLen * 3 + 1) >>> 2) / nBlockSize) * nBlockSize : (nInLen * 3 + 1) >>> 2

  var aBytes = new Uint8Array(nOutLen)

  for (var nMod3, nMod4, nUint24 = 0, nOutIdx = 0, nInIdx = 0; nInIdx < nInLen; nInIdx++) {
    nMod4 = nInIdx & 3
    nUint24 |= b64ToUint6(sB64Enc.charCodeAt(nInIdx)) << (18 - 6 * nMod4)
    if (nMod4 === 3 || nInLen - nInIdx === 1) {
      for (nMod3 = 0; nMod3 < 3 && nOutIdx < nOutLen; nMod3++, nOutIdx++) {
        aBytes[nOutIdx] = (nUint24 >>> ((16 >>> nMod3) & 24)) & 255
      }
      nUint24 = 0
    }
  }

  return aBytes
}

function uint6ToB64(nUint6) {
  return nUint6 < 26
    ? nUint6 + 65
    : nUint6 < 52
    ? nUint6 + 71
    : nUint6 < 62
    ? nUint6 - 4
    : nUint6 === 62
    ? 43
    : nUint6 === 63
    ? 47
    : 65
}

function base64EncArr(aBytes) {
  var eqLen = (3 - (aBytes.length % 3)) % 3

  var sB64Enc = ''

  for (var nMod3, nLen = aBytes.length, nUint24 = 0, nIdx = 0; nIdx < nLen; nIdx++) {
    nMod3 = nIdx % 3
    nUint24 |= aBytes[nIdx] << ((16 >>> nMod3) & 24)
    if (nMod3 === 2 || aBytes.length - nIdx === 1) {
      sB64Enc += String.fromCharCode(
        uint6ToB64((nUint24 >>> 18) & 63),
        uint6ToB64((nUint24 >>> 12) & 63),
        uint6ToB64((nUint24 >>> 6) & 63),
        uint6ToB64(nUint24 & 63)
      )
      nUint24 = 0
    }
  }

  return eqLen === 0 ? sB64Enc : sB64Enc.substring(0, sB64Enc.length - eqLen) + (eqLen === 1 ? '=' : '==')
}

function UTF8ArrToStr(aBytes) {
  var sView = ''

  for (var nPart, nLen = aBytes.length, nIdx = 0; nIdx < nLen; nIdx++) {
    nPart = aBytes[nIdx]
    sView += String.fromCharCode(
      nPart > 251 && nPart < 254 && nIdx + 5 < nLen
        ? (nPart - 252) * 1073741824 +
            ((aBytes[++nIdx] - 128) << 24) +
            ((aBytes[++nIdx] - 128) << 18) +
            ((aBytes[++nIdx] - 128) << 12) +
            ((aBytes[++nIdx] - 128) << 6) +
            aBytes[++nIdx] -
            128
        : nPart > 247 && nPart < 252 && nIdx + 4 < nLen
        ? ((nPart - 248) << 24) +
          ((aBytes[++nIdx] - 128) << 18) +
          ((aBytes[++nIdx] - 128) << 12) +
          ((aBytes[++nIdx] - 128) << 6) +
          aBytes[++nIdx] -
          128
        : nPart > 239 && nPart < 248 && nIdx + 3 < nLen
        ? ((nPart - 240) << 18) + ((aBytes[++nIdx] - 128) << 12) + ((aBytes[++nIdx] - 128) << 6) + aBytes[++nIdx] - 128
        : nPart > 223 && nPart < 240 && nIdx + 2 < nLen
        ? ((nPart - 224) << 12) + ((aBytes[++nIdx] - 128) << 6) + aBytes[++nIdx] - 128
        : nPart > 191 && nPart < 224 && nIdx + 1 < nLen
        ? ((nPart - 192) << 6) + aBytes[++nIdx] - 128
        : nPart
    )
  }

  return sView
}

function strToUTF8Arr(sDOMStr) {
  var aBytes
  var nChr
  var nStrLen = sDOMStr.length
  var nArrLen = 0

  for (var nMapIdx = 0; nMapIdx < nStrLen; nMapIdx++) {
    nChr = sDOMStr.charCodeAt(nMapIdx)
    nArrLen += nChr < 0x80 ? 1 : nChr < 0x800 ? 2 : nChr < 0x10000 ? 3 : nChr < 0x200000 ? 4 : nChr < 0x4000000 ? 5 : 6
  }

  aBytes = new Uint8Array(nArrLen)

  for (var nIdx = 0, nChrIdx = 0; nIdx < nArrLen; nChrIdx++) {
    nChr = sDOMStr.charCodeAt(nChrIdx)
    if (nChr < 128) {
      aBytes[nIdx++] = nChr
    } else if (nChr < 0x800) {
      aBytes[nIdx++] = 192 + (nChr >>> 6)
      aBytes[nIdx++] = 128 + (nChr & 63)
    } else if (nChr < 0x10000) {
      aBytes[nIdx++] = 224 + (nChr >>> 12)
      aBytes[nIdx++] = 128 + ((nChr >>> 6) & 63)
      aBytes[nIdx++] = 128 + (nChr & 63)
    } else if (nChr < 0x200000) {
      aBytes[nIdx++] = 240 + (nChr >>> 18)
      aBytes[nIdx++] = 128 + ((nChr >>> 12) & 63)
      aBytes[nIdx++] = 128 + ((nChr >>> 6) & 63)
      aBytes[nIdx++] = 128 + (nChr & 63)
    } else if (nChr < 0x4000000) {
      aBytes[nIdx++] = 248 + (nChr >>> 24)
      aBytes[nIdx++] = 128 + ((nChr >>> 18) & 63)
      aBytes[nIdx++] = 128 + ((nChr >>> 12) & 63)
      aBytes[nIdx++] = 128 + ((nChr >>> 6) & 63)
      aBytes[nIdx++] = 128 + (nChr & 63)
    } else {
      aBytes[nIdx++] = 252 + (nChr >>> 30)
      aBytes[nIdx++] = 128 + ((nChr >>> 24) & 63)
      aBytes[nIdx++] = 128 + ((nChr >>> 18) & 63)
      aBytes[nIdx++] = 128 + ((nChr >>> 12) & 63)
      aBytes[nIdx++] = 128 + ((nChr >>> 6) & 63)
      aBytes[nIdx++] = 128 + (nChr & 63)
    }
  }

  return aBytes
}

function encode(str) {
  const utf8Arr = strToUTF8Arr(str)
  return base64EncArr(utf8Arr)
}
function decode(str) {
  const utf8Output = base64DecToArr(str)
  return UTF8ArrToStr(utf8Output)
}
function operator(proxies) {
  try {
    const rawInfo = $.read('subs')
    const readName = $.read('collections')
    const subtag = $request.url.match(/download\/(collection\/)?([\w-_]*)/)[2]
    if ($request.url.match(/\/collection\//)) {
      //collection subscription.
      const isOpen = readName[subtag].process.map(o => o.type).indexOf('Script Operator') != -1
      for (var i = 0; i < readName[subtag].subscriptions.length; i++) {
        $.raw_Name = readName[subtag].subscriptions[i]
        if (!isOpen) break //prevent queries in certain cases.
        AllSubs(rawInfo[$.raw_Name].url, $.raw_Name)
      }
    } else {
      //single subscription.
      $.raw_Name = rawInfo[subtag].name
      AllSubs(rawInfo[subtag].url, $.raw_Name)
    }
  } catch (e) {
    $.error(`\n🔹 订阅昵称:「 ${$.raw_Name || '未知'} 」\n🔺 查询失败:「 ${err.message || err} 」`)
  } finally {
    return proxies
  }
}

async function AllSubs(subsUrl, subsName) {
  try {
    // $.log('〽️ 开始进行信息查询: ' + subsUrl)
    const res = await $.http.get({
      url: subsUrl,
      headers: { 'User-Agent': 'Shadowrocket/1598 CFNetwork/1331.0.7 Darwin/21.4.0' },
    })
    let body = res.body
    $.log('↓ res body')
    console.log(body)
    try {
      body = decode(body)
    } catch (e) {
      $.error(`\n🔹 订阅昵称:「 ${subsName} 」\n🔺 解码失败:「 ${e.message || e} 」`)
    }
    const lines = body.split(/\r?\n/)
    if (lines) {
      const info = lines[0]
      if (info && info.indexOf('://') === -1) {
        $.notify(`🔹 订阅昵称:「 ${subsName} 」`, '', info)
      }
    }
  } catch (er) {
    $.error(`\n🔹 订阅昵称:「 ${subsName} 」\n🔺 查询失败:「 ${er.message || er} 」`)
  }
}
