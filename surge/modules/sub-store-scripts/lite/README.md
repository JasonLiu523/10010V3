# Sub-Store Lite

> 欢迎关注频道 [https://t.me/zhetengsha](https://t.me/zhetengsha) 加入群组 [https://t.me/zhetengsha_group](https://t.me/zhetengsha_group)

特点:

- 支持修改 `host` 混淆, `path` 路径, `port` 端口, `method` 请求方式(网络为 `http` 时, 可能需要设置此项)

- 兼容不同的 network(`vmess`, `vless` 的 `ws`, `h2`, `http` 和其他)

- 兼容 QuanX, Surge, Loon, Shadowrocket, Stash 等客户端和 Node.js 环境

## Sub-Store 脚本使用方法

打开 Sub-Store => 订阅 => 编辑 => 节点操作+ => 脚本操作 => 链接 => 粘贴 [https://raw.githubusercontent.com/xream/scripts/main/surge/modules/sub-store-scripts/lite/index.js](https://raw.githubusercontent.com/xream/scripts/main/surge/modules/sub-store-scripts/lite/index.js) => 保存

引用格式如下：

例 设置 Host 混淆为 `a.189.cn`, 为修改了 Host 的节点名添加后缀 `[北停]`

`https://raw.githubusercontent.com/xream/scripts/main/surge/modules/sub-store-scripts/lite/index.js#host=a.189.cn&hostSuffix=[北停]`

参数列表如下：

`host` 修改 Host 混淆. 默认为空 不修改. 例 a.189.cn

`hostPrefix` 为修改了 Host 的节点名添加前缀. 默认为空

`hostSuffix` 为修改了 Host 的节点名添加后缀. 默认为空. 例 [微博混淆]

`path` 修改 Path 路径. 默认为空 不修改. 例 /TS/recharge/tzUrl.html

`pathPrefix` 为修改了 Path 的节点名添加前缀. 默认为空

`pathSuffix` 为修改了 Path 的节点名添加后缀. 默认为空. 例 [广停路径]

`port` 修改 Port 端口 默认为空 不修改. 例 80

`portPrefix` 为修改了 Port 的节点名添加前缀. 默认为空

`portSuffix` 为修改了 Port 的节点名添加前缀. 默认为空. 例 [80]

`method` method 默认为空 不修改. 例 `GET`. 网络为 `http` 时, 可能需要设置此项
