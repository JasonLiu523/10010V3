# 联通余量

## 联通余量(v3) 测试中

无需抓包 使用短信验证码登录 简化操作 增加了通知模板等自定义

[https://github.com/xream/scripts/tree/main/surge/modules/10010v3](https://github.com/xream/scripts/tree/main/surge/modules/10010v3)

---

> 以下为 v2 内容

<table style="padding: 10px">

  <tr>
    <td><img src="https://i.loli.net/2021/07/24/XeZEUqbjJgC7RFV.jpg" width="400px"></td>
    <td><img src="https://i.loli.net/2021/07/24/yYrJmK7znEwiDsT.jpg" width="400px"></td>
  </tr>
   <tr>
    <td><img src="https://i.loli.net/2021/07/24/JWC21sOSPrp3duR.jpg" height="200px" width="200px"></td>
  </tr>
</table>

> 联通余量(v2)

v2 版本使用 [OpenAPI](https://github.com/Peng-YM/QuanX/tree/master/Tools/OpenAPI), so WORA.

新特性:

- 多账号

- 同步配置至 V2P

- 自动登录

- 更多自定义项

  - 当前时间段内有*非免流*才会通知

  - `free_pkg(免流流量包名正则)` 和 `exclude_remain_pkg(不计算剩余流量的流量包名正则)` 简要说明(字段说明 以 [BoxJs 配置项](https://github.com/xream/scripts/blob/main/boxjs/boxjs.json)为准)

    - 部分用户反馈冰钉开副卡后免流显示异常. 因为联通未将钉钉定向计入免流字段. 需设置 `free_pkg(免流流量包名正则)` 和 `exclude_remain_pkg(不计算剩余流量的流量包名正则)` 为 `(钉钉定向免流资费|套餐内专享免费流量)`

    - 流邦或类似的套餐 需要设置 `exclude_remain_pkg(不计算剩余流量的流量包名正则)` 为 `(头条系APP免流|套餐内专享免费流量)`

注意事项:

- 最新版全部本地加密 ~~设置中的 `加密接口` 用于在非 Node 环境中加密手机号和密码, 可打开 [rsapublickeyencode](https://runkit.com/xream/rsapublickeyencode) 自己部署/Clone 后点击 endpoint 得到地址, 填入设置. 如果你看不懂的话, 直接填我的也行(不保证永久有效): `https://rsapublickeyencode-kesbkwnyc07x.runkit.sh`~~

## 懒人 Surge Module

[联通余量(v2)](https://raw.githubusercontent.com/xream/scripts/main/surge/modules/10010/10010v2.sgmodule)

## 手动设置 Scripts

### 联通余量(v2)

Shadowrocket 也支持 使用类似 Surge

```
[MITM]
hostname = m.client.10010.com

[Script]
# Surge

联通余量: Cookie = type=http-request,pattern=^https?:\/\/m\.client\.10010\.com\/(servicequerybusiness\/operationservice\/queryOcsPackageFlowLeftContent|servicequerybusiness\/balancenew\/accountBalancenew\.htm|mobileService\/onLine\.htm),requires-body=1,max-size=0,timeout=30,script-path=https://raw.githubusercontent.com/xream/scripts/main/surge/modules/10010/10010_query.js,debug=true
联通余量: 查询 = type=cron,cronexp=*/5 * * * *,timeout=30,script-path=https://raw.githubusercontent.com/xream/scripts/main/surge/modules/10010/10010_query.js,wake-system=true

# Loon
http-request ^https?:\/\/m\.client\.10010\.com\/(servicequerybusiness\/operationservice\/queryOcsPackageFlowLeftContent|servicequerybusiness\/balancenew\/accountBalancenew\.htm|mobileService\/onLine\.htm) script-path=https://raw.githubusercontent.com/xream/scripts/main/surge/modules/10010/10010_query.js, requires-body=true, timeout=10, tag=联通余量Cookie
cron "*/5 * * * *" script-path=https://raw.githubusercontent.com/xream/scripts/main/surge/modules/10010/10010_query.js

# QuanX(未测试 不清楚如何判断当前网络是否为 WiFi)
^https?:\/\/m\.client\.10010\.com\/(servicequerybusiness\/operationservice\/queryOcsPackageFlowLeftContent|servicequerybusiness\/balancenew\/accountBalancenew\.htm|mobileService\/onLine\.htm) url script-request-body https://raw.githubusercontent.com/xream/scripts/main/surge/modules/10010/10010_query.js
*/5 * * * * https://raw.githubusercontent.com/xream/scripts/main/surge/modules/10010/10010_query.js, tag=联通余量查询
```

## BoxJs 订阅

使用 [BoxJs 测试版](https://chavyleung.gitbook.io/boxjs) 添加 [订阅](https://raw.githubusercontent.com/xream/scripts/main/boxjs/boxjs.json) 后, Scriptable 脚本可支持缓存 Cookie

可设置:

- 使用 WiFi 时, 也进行检查(Surge/Loon 默认不检查; 其他 app 总是检查)

- 当前时间段内无用量时, 也进行通知(默认不通知)

- 获取 cookie 时, 自动通过 V2P webhook 同步 cookie

<table style="padding: 10px">
  <tr>
    <td><img src="https://i.loli.net/2021/07/25/ApmGUxL5ujTwkBn.jpg" height="600px"></td>
    <td><img src="https://i.loli.net/2021/07/25/ApmGUxL5ujTwkBn.jpg" height="600px"></td>
  </tr>
</table>

## 其实你并不需要获取 Cookie

有些用户不理解 MitM/解密 HTTPS/生成安装信任证书等前置知识, 其实你只需要提供 appId, 手机号, 密码~~和远程加密接口~~, 开启自动登录就能进行查询.

> appId 获取最方便的方法就是手机文件管理器，找到路径为 Unicom/appid 的文件打开复制

或者使用 https://t.me/chinaunicom_api_bot (我写的 灵车警告 不保证可用性) 里的短信验证码功能获取:

```
/sms 18600000000 发送短信登录验证码

/login 18600000000 1234 使用短信验证码登录
因为我比较懒 只会返回 appId 和 cookie 方便你使用本bot或用于其他流量监控工具
```

> 最新版全部本地加密 ~~设置中的 `加密接口` 用于在非 Node 环境中加密手机号和密码, 可打开 [rsapublickeyencode](https://runkit.com/xream/rsapublickeyencode) 自己部署/Clone 后点击 endpoint 得到地址, 填入设置. 如果你看不懂的话, 直接填我的也行(不保证永久有效): `https://rsapublickeyencode-kesbkwnyc07x.runkit.sh`~~

## 获取 Cookie

登录中国联通 app, 打开余量查询, 获取 Cookie

## V2P

### 联通余量(v2)

在 `TASK(定时任务)` 中, 点击`添加单个任务`, 设置 `联通余量`, `cron定时`, `30 */5 * * * *`, `运行JS`, `https://raw.githubusercontent.com/xream/scripts/main/surge/modules/10010/10010_query.js`

#### 配置

正确设置 BoxJs 后, Cookie 更新时将自动同步数据到 V2P.

通过启用 `V2P 是否在直接执行脚本时同步一次` 并保存, 再手动执行脚本实现单次同步

也可在 `JSMANAGE(JS 文件管理)` 中的 `store/cookie 常量储存管理` 中手动设置, 参考以下内容(字段说明 以 [BoxJs 配置项](https://github.com/xream/scripts/blob/main/boxjs/boxjs.json)为准 ), 自行设置 KEY 和 VALUE 即可

```JSON
{
  "ignore_flow": "10",
  "same": "false",
  "no_url": "true",
  "v2p_disabled": "false",
  "name": "@xream 米粉",
  "maintenance_disabled": "true",
  "cookie_notification_disabled": "false",
  "autoSign": "true",
  "mobile": "",
  "password": "",
  "appId": "",
  "rsapublicKeyEncodeAPI": "https://rsapublickeyencode-kesbkwnyc07x.runkit.sh/",
  "other_pkg": "(日租|学习强国)",
  "exclude_remain_pkg": "(学习强国后向定向流量|套餐内专享免费流量)",
  "free_pkg": "(钉钉定向免流资费|套餐内专享免费流量)",
  "cookie_disabled": "false",
  "device": {
    "deviceOS": "",
    "deviceBrand": "",
    "deviceModel": "",
    "buildSn": "",
    "deviceId": ""
  },
  "encoded": {
    "mobile": "",
    "password": "",
    "original": {
      "mobile": "",
      "password": ""
    }
  },
  "last": {},
  "cookie": ""
}
```

#### 多账号使用

默认脚本为 `10010_query.js`, 使用 store 中的 `10010_query`.

另一台设备上, 应在 BoxJs 中设置 `自定义名称(默认为套餐名)` 以区分不同账号的通知, 设置 `V2P store/cookie 常量储存 key` 为不同于 `10010_query` 的值, 例如: `YAA`

```JSON
[
  {
    "id": "@10010_query.name",
    "name": "自定义名称(默认为套餐名)",
    "val": "",
    "type": "text",
    "desc": ""
  },
  {
    "id": "@10010_query.v2p.store.key",
    "name": "V2P store/cookie 常量储存 key",
    "val": "",
    "type": "text",
    "desc": "默认为 10010_query"
  }
]
```

在设备上进行一次同步, 此时将同步 key 为 `YAA` 的 store 至 V2P.

在 V2P 上, 上传或保存脚本 `10010_query.js` 的内容, 命名为 `__YAA__10010_query.js`.

之后, 脚本 `__YAA__10010_query.js` 执行时, 会自动从脚本名中获取 store key 名 `YAA` 并使用.

## 青龙

拉取单独文件 `ql raw https://raw.githubusercontent.com/xream/scripts/main/surge/modules/10010/10010_query.js`

设置定时任务 `task raw_10010_10010_query.js`

配置文件 `10010_query.json`

参考以下内容(字段说明 以 [BoxJs 配置项](https://github.com/xream/scripts/blob/main/boxjs/boxjs.json)为准 ), 自行设置 KEY 和 VALUE 即可

注意: 青龙 为 Node 环境, 不提供 `rsapublicKeyEncodeAPI` 加密接口时, 自动进行本地加密

```JSON
{
  "ignore_flow": "10",
  "same": "false",
  "no_url": "true",
  "v2p_disabled": "false",
  "name": "@xream 米粉",
  "maintenance_disabled": "true",
  "cookie_notification_disabled": "false",
  "autoSign": "true",
  "mobile": "",
  "password": "",
  "appId": "",
  "rsapublicKeyEncodeAPI": "https://rsapublickeyencode-kesbkwnyc07x.runkit.sh/",
  "other_pkg": "(日租|学习强国)",
  "exclude_remain_pkg": "(学习强国后向定向流量|套餐内专享免费流量)",
  "free_pkg": "(钉钉定向免流资费|套餐内专享免费流量)",
  "cookie_disabled": "false",
  "device": {
    "deviceOS": "",
    "deviceBrand": "",
    "deviceModel": "",
    "buildSn": "",
    "deviceId": ""
  },
  "encoded": {
    "mobile": "",
    "password": "",
    "original": {
      "mobile": "",
      "password": ""
    }
  },
  "last": {},
  "cookie": ""
}
```

#### 多账号使用

新建一个脚本 `__miku__10010_query.js`, 并将原脚本 `10010_query.js` 中的内容复制过来.

新建 `miku.json` 或运行一次 `__miku__10010_query.js` 自动生成 `miku.json`

编辑 `miku.json`

若要实现多账号使用不同的通知方式, 可参考如下操作:

例如, 默认使用的是钉钉, 现在希望账号 miku 使用 Bark.

可以在 `__miku__10010_query.js` 最上方添加如下代码:

```JavaScript
process.env.DD_BOT_TOKEN=undefined
process.env.DD_BOT_SECRET=undefined

process.env.BARK_PUSH="https://api.day.app/123456789"
```

意思是清除默认的钉钉的环境变量, 并设置 Bark 的环境变量

#### 配置

正确设置 BoxJs 后, Cookie 会自动同步到 V2P

其他配置可在 `JSMANAGE(JS 文件管理)` 中的 `store/cookie 常量储存管理` 中手动设置, 参考以下内容(字段说明 以 [BoxJs 配置项](https://github.com/xream/scripts/blob/main/boxjs/boxjs.json)为准 ), 自行设置 KEY 和 VALUE 即可

```JSON
{
  "ignore_flow": "10",
  "same": "false",
  "no_url": "true",
  "v2p_disabled": "false",
  "name": "@xream 米粉",
  "maintenance_disabled": "true",
  "cookie_notification_disabled": "false",
  "autoSign": "true",
  "mobile": "",
  "password": "",
  "appId": "",
  "rsapublicKeyEncodeAPI": "https://rsapublickeyencode-kesbkwnyc07x.runkit.sh/",
  "other_pkg": "(日租|学习强国)",
  "exclude_remain_pkg": "(学习强国后向定向流量|套餐内专享免费流量)",
  "free_pkg": "(钉钉定向免流资费|套餐内专享免费流量)",
  "cookie_disabled": "false",
  "device": {
    "deviceOS": "",
    "deviceBrand": "",
    "deviceModel": "",
    "buildSn": "",
    "deviceId": ""
  },
  "encoded": {
    "mobile": "",
    "password": "",
    "original": {
      "mobile": "",
      "password": ""
    }
  },
  "last": {},
  "cookie": ""
}
```

## Scriptable

> 目前仍可用 暂停维护 欢迎 PR

## 脚本

依赖: [「小件件」开发环境.js](https://raw.githubusercontent.com/xream/scripts/main/scriptable/「小件件」开发环境.js)

[联通余量.js](https://raw.githubusercontent.com/xream/scripts/main/scriptable/10010/联通余量.js)

<table style="padding: 10px">
  <tr>
    <td><img src="https://i.loli.net/2021/07/22/vFj9uLMp6BbZmWP.jpg" height="200px"></td>
    <td><img src="https://i.loli.net/2021/07/22/3mnxdtJ8TFMfazu.jpg" height="200px"></td>
  </tr>
</table>
