# 联通余量(v3)

使用了 [chavyleung 大佬的 Env.js](https://github.com/chavyleung/scripts/blob/master/Env.js)

兼容 QuanX, Surge, Loon, Shadowrocket, Stash, [elecV2P](https://github.com/elecV2/elecV2P), [青龙](https://github.com/whyour/qinglong) 等

无需抓包, 在 Box.js 界面上可以直接配置或进行短信验证码登录.

同时提供了 `http(s)://10010.json` 接口, 直接返回余量信息. 方便和别的工具整合. 请求时的通知可在 Box.js 设置中关闭(禁用作为请求脚本使用时的通知).

<table>
  <tr>
    <td valign="top"><img src="screenshots/4.PNG"></td>
    <td valign="top"><img src="screenshots/1.PNG"></td>
    <td valign="top"><img src="screenshots/2.PNG"></td>
    <td valign="top"><img src="screenshots/3.PNG"></td>
  </tr>
 </table>

## 直接使用 Surge 模块

[https://raw.githubusercontent.com/xream/scripts/main/surge/modules/10010v3/10010.sgmodule](https://raw.githubusercontent.com/xream/scripts/main/surge/modules/10010v3/10010.sgmodule)

Shadowrocket 也支持 使用类似 Surge

## 或者手动设置定时任务

```
[MITM]
hostname = %APPEND% 10010.json

[Script]
联通余量(v3) = type=cron,cronexp=*/5 * * * *,timeout=30,script-path=https://raw.githubusercontent.com/xream/scripts/main/surge/modules/10010v3/10010.js

联通余量(v3)接口 = type=http-request,pattern=^https?:\/\/10010\.json,script-path=https://raw.githubusercontent.com/xream/scripts/main/surge/modules/10010v3/10010.js,requires-body=true,max-size=0,timeout=30

# Loon
cron "*/5 * * * *" script-path=https://raw.githubusercontent.com/xream/scripts/main/surge/modules/10010v3/10010.js

# QuanX
*/5 * * * * https://raw.githubusercontent.com/xream/scripts/main/surge/modules/10010v3/10010.js, tag=联通余量查询
```

## BoxJs 订阅

使用 [BoxJs 测试版](https://chavyleung.gitbook.io/boxjs) 添加 [订阅](https://raw.githubusercontent.com/xream/scripts/main/boxjs/boxjs.json)

## 配置

### 登录方式一

仅填写手机号密码和 appId 保存 即可自动登录

### 登录方式二

1. 填写手机号, 保存, 执行发送验证码
2. 填写验证码, 保存, 执行用验证码登录
3. 先刷新, 再设置密码, 保存. 以后即可自动登录

### 几个包名正则配置

1. 不计算剩余流量的流量包名正则(excludeRemainPkg)

在联通原始值不正确时 进行修正. 例 (定向流量|免流资费|免费流量) , 匹配的包不计算剩余

2. 叠加到免流流量的流量包名正则(freePkg)

在联通原始值不正确时 进行修正. 例 设置 (定向流量|免流资费|免费流量), 匹配的包叠加到总免流流量

3. 需要单独显示的流量包名正则(otherPkg)

例 设置 (加油包|福利|学习强国), 将显示 剩余 536.98M 加油包 46.12M 福利 490.86M 学习强国 1234.56M 免流 41.66G

### 修正联通的流量(剩余和免流)

联通返回了总的`已用流量`和`已免流量`, 但是`套餐内流量&流量包`里又会出现我们关注的免流包, 或者有不需要关注的免流包也有计入剩余流量.

举例:

1. 钉钉无限定向在 `套餐内流量&流量包`里, 是免流包. 所以我们可以设置 `叠加到免流流量的流量包名正则(freePkg)` 和 `不计算剩余流量的流量包名正则(excludeRemainPkg)` 为 `(钉钉定向免流资费|套餐内专享免费流量)`

2. 流邦卡在 `套餐内流量&流量包`里有一个 `30GB流邦卡专属免流包`, 它有剩余流量, 我们不需要它计入总剩余流量. 所以我们可以设置 `不计算剩余流量的流量包名正则(excludeRemainPkg)` 为 `(免流包|套餐内专享免费流量)`

其他情况 请自行查看包(可在正常执行过一次后, 在 Box.js 界面最下方的详情里查看), 添加正则. 如果你不会正则, 可以直接按这个写 `(A|B|C)` 表示包含 A 或 B 或 C. 最好直接复制, 注意标点符号.

### 通知模板

通知标题模板

> 默认: [套], 例: 流邦卡 19 元套餐

通知副标题模板

> 默认: 时长 [时] 跳 [跳] 免 [免], 例: 时长 1 分钟 跳 10M 免 10M

通知正文模板

> 默认: 剩余 [剩] [单] 免流 [总免], 例: 剩余 5.03G 福利 1G 免流 26.35G

其他变量

> [时] 现在时间 [总] 总共流量

通知单独显示的包名模板(即 [单] 的内部模板) 这几个变量仅此处可用

> 默认: [包] 剩余[剩] 已用[用], 例: 福利包 剩余 1G 已用 1G

## V2P

在 `TASK(定时任务)` 中, 点击`添加单个任务`, 设置 `联通余量`, `cron定时`, `30 */5 * * * *`, `运行JS`, `https://raw.githubusercontent.com/xream/scripts/main/surge/modules/10010v3/10010.js`

#### 配置

在 `JSMANAGE(JS 文件管理)` 中的 `store/cookie 常量储存管理` 中手动设置, 参考以下内容(字段说明 以 [BoxJs 配置项](https://github.com/xream/scripts/blob/main/boxjs/boxjs.json)为准 ), 自行设置 KEY 和 VALUE 即可.

默认脚本为 `10010.js`, 使用 store 中的 `xream` 存储数据. 可手动执行一次脚本, store 中将自动创建该项.

```JSON
{"10010":{"appId":"","mobile":"","password":""}}
```

#### 多账号使用

默认脚本为 `10010.js`, 使用 store 中的 `xream` 存储数据.

命名为 `_ABC_10010.js` 时, 使用 store 中的 `ABC` 存储数据.

## 青龙

拉取单独文件 `ql raw https://raw.githubusercontent.com/xream/scripts/main/surge/modules/10010v3/10010.js`

设置定时任务

可以先手动执行一次, 脚本管理里出现 `box.data` 文件.

配置文件 `box.data`

参考以下内容(字段说明 以 [BoxJs 配置项](https://github.com/xream/scripts/blob/main/boxjs/boxjs.json)为准 ), 自行设置 KEY 和 VALUE 即可

```JSON
{"xream":"{\"10010\":{\"appId\":\"\", \"mobile\":\"\", \"password\":\"\"}}"}
```

#### 通知

`sendNotify.js` 版本不一, 可能标题和正文之间有多次换行. 如果要实现一个通知横幅看全标题/副标题/正文三行, 需要自己修改 `sendNotify.js`.

例如: 修改 青龙 `config/sendNotify.js` 里的 `function ddBotNotify` 里的拼接字符串逻辑, 把 `${text}\n\n${desp}` 改成 `${text}\n${desp}`

#### 多账号使用

默认脚本使用 `box.data` 中的 `xream` 存储数据.

命名为 `_ABC_10010.js` 时, 使用 `box.data` 中的 `ABC` 存储数据.

若要实现多账号使用不同的通知方式, 可参考如下操作:

例如, 默认使用的是钉钉, 现在希望账号 miku 使用 Bark.

可以在 `_ABC_10010.js` 最上方添加如下代码:

```JavaScript
process.env.DD_BOT_TOKEN=undefined
process.env.DD_BOT_SECRET=undefined

process.env.BARK_PUSH="https://api.day.app/123456789"
```

意思是清除默认的钉钉的环境变量, 并设置 Bark 的环境变量

## Scriptable

请求 `http(s)://10010.json` 接口, 直接返回余量信息.

需要脚本配合 Surge 模块默认已开启此接口. 其他客户端的配置请自行参考对应的配置方式, 可参考 Surge 的手动配置方式:

```
[MITM]
hostname = %APPEND% 10010.json

[Script]
联通余量(v3) = type=cron,cronexp=*/5 * * * *,timeout=30,script-path=https://raw.githubusercontent.com/xream/scripts/main/surge/modules/10010v3/10010.js

联通余量(v3)接口 = type=http-request,pattern=^https?:\/\/10010\.json,script-path=https://raw.githubusercontent.com/xream/scripts/main/surge/modules/10010v3/10010.js,requires-body=true,max-size=0,timeout=30
```

请求时的通知可在 Box.js 设置中关闭(禁用作为请求脚本使用时的通知).

仅提供最简实现方式的展示, 可自行修改源码

## 脚本

依赖: [「小件件」开发环境.js](https://raw.githubusercontent.com/xream/scripts/main/scriptable/「小件件」开发环境.js)

[10010.js](https://raw.githubusercontent.com/xream/scripts/main/scriptable/10010/10010.js)

<table>
  <tr>
    <td valign="top"><img src="screenshots/5.jpg"></td>
  </tr>
 </table>
