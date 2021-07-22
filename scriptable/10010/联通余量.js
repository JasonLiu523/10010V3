// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: gray; icon-glyph: globe;
// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: pink; icon-glyph: mobile-alt;
//
// iOS 桌面组件脚本 @「小件件」
// 开发说明：请从 Widget 类开始编写，注释请勿修改
// https://x.im3x.cn
//

// 添加require，是为了vscode中可以正确引入包，以获得自动补全等功能
if (typeof require === 'undefined') require = importModule;
const {
  Base
} = require('./「小件件」开发环境');

// @组件代码开始
class Widget extends Base {
  /**
   * 传递给组件的参数，可以是桌面 Parameter 数据，也可以是外部如 URLScheme 等传递的数据
   * @param {string} arg 自定义参数
   */
  constructor(arg) {
    super(arg);
    this.name = '联通余量';
    this.cacheKey = '10010_query'
    this.url = 'chinaunicom://?open=%7B%22openType%22:%22url%22,%22title%22:%22%E4%BD%99%E9%87%8F%E6%9F%A5%E8%AF%A2%22,%22openUrl%22:%22https://m.client.10010.com/mobileService/openPlatform/openPlatLine.htm?to_url=https://img.client.10010.com/yuliangchaxun2/index.html?linkType=unicomNewShare&mobileA=https://m1.img.10010.com/resources/7188192A31B5AE06E41B64DA6D65A9B0/20201222/jpg/20201222114110.jpg&businessName=%E4%BD%99%E9%87%8F%E6%9F%A5%E8%AF%A2&businessCode=https://m1.img.10010.com/resources/7188192A31B5AE06E41B64DA6D65A9B0/20201222/jpg/20201222114110.jpg&shareType=1&mobileB=F8A34DFF6F9346E68343756DB268C5A5&duanlianjieabc=0tygAa4n%22%7D'
    this.setupGradient = async () => {
      // Requirements: sunrise
      // if (!sunData) { await setupSunrise() }
      const currentDate = new Date();
      const sunData = {
        sunrise: 1610492017000,
        sunset: 1610529162000
      };
      // Determines if the provided date is at night.
      const isNight = dateInput => {
        const timeValue = dateInput.getTime();
        return timeValue < sunData.sunrise || timeValue > sunData.sunset;
      };
      let gradient = {
        dawn: {
          color() {
            return [
              new Color('142C52'),
              new Color('1B416F'),
              new Color('62668B'),
            ];
          },
          position() {
            return [0, 0.5, 1];
          },
        },

        sunrise: {
          color() {
            return [
              new Color('274875'),
              new Color('766f8d'),
              new Color('f0b35e'),
            ];
          },
          position() {
            return [0, 0.8, 1.5];
          },
        },

        midday: {
          color() {
            return [new Color('3a8cc1'), new Color('90c0df')];
          },
          position() {
            return [0, 1];
          },
        },

        noon: {
          color() {
            return [
              new Color('b2d0e1'),
              new Color('80B5DB'),
              new Color('3a8cc1'),
            ];
          },
          position() {
            return [-0.2, 0.2, 1.5];
          },
        },

        sunset: {
          color() {
            return [
              new Color('32327A'),
              new Color('662E55'),
              new Color('7C2F43'),
            ];
          },
          position() {
            return [0.1, 0.9, 1.2];
          },
        },

        twilight: {
          color() {
            return [
              new Color('021033'),
              new Color('16296b'),
              new Color('414791'),
            ];
          },
          position() {
            return [0, 0.5, 1];
          },
        },

        night: {
          color() {
            return [
              new Color('16296b'),
              new Color('021033'),
              new Color('021033'),
              new Color('113245'),
            ];
          },
          position() {
            return [-0.5, 0.2, 0.5, 1];
          },
        },
      };

      const sunrise = sunData.sunrise;
      const sunset = sunData.sunset;
      const utcTime = currentDate.getTime();

      function closeTo(time, mins) {
        return Math.abs(utcTime - time) < mins * 60000;
      }

      // Use sunrise or sunset if we're within 30min of it.
      if (closeTo(sunrise, 15)) {
        return gradient.sunrise;
      }
      if (closeTo(sunset, 15)) {
        return gradient.sunset;
      }

      // In the 30min before/after, use dawn/twilight.
      if (closeTo(sunrise, 45) && utcTime < sunrise) {
        return gradient.dawn;
      }
      if (closeTo(sunset, 45) && utcTime > sunset) {
        return gradient.twilight;
      }

      // Otherwise, if it's night, return night.
      if (isNight(currentDate)) {
        return gradient.night;
      }

      // If it's around noon, the sun is high in the sky.
      if (currentDate.getHours() == 12) {
        return gradient.noon;
      }
      // Otherwise, return the "typical" theme.
      return gradient.midday;
    };
  }

  /**
   * 渲染函数，函数名固定
   * 可以根据 this.widgetFamily 来判断小组件尺寸，以返回不同大小的内容
   */
  async render() {
    try {
    const interval = this.arg || 60
    this.interval = interval
    let shouldFetch

    if (Keychain.contains(this.cacheKey)) {
      const cache = JSON.parse(Keychain.get(this.cacheKey));
      const list = cache.list
      const time = cache.time
      if ((new Date().getTime() - time) / 1000 / 60 > interval) {
        shouldFetch = true
      } else {
        list[list.length - 1].value += `/${interval}分`
        this.list = list
      }

    } else {
      shouldFetch = true
    }
// shouldFetch = true
    if (shouldFetch) {

      const balanceReq = async () => {
        const req = new Request(
          'https://m.client.10010.com/servicequerybusiness/balancenew/accountBalancenew.htm'
        );
        req.method = 'GET';
        req.headers = {
          // 'Content-Type': 'application/x-www-form-urlencoded',
        };
        // req.body = ``;
        // return await req.loadJSON();
        const res = await req.loadString();
        console.log(res)
        return JSON.parse(res);
      };
      const pkgReq = async () => {
        const req = new Request(
          'https://m.client.10010.com/servicequerybusiness/operationservice/queryOcsPackageFlowLeftContent'
        );
        req.method = 'GET';
        req.headers = {
          // 'Content-Type': 'application/x-www-form-urlencoded',
        };
        // req.body = ``;
        // return await req.loadJSON();
        const res = await req.loadString();
        console.log(res)
        return JSON.parse(res);
      };
      const [balanceRes, pkgRes] = await Promise.all([
        balanceReq(),
        pkgReq(),
      ]);
      // console.log(balanceRes)
      // console.log(pkgRes)
      this.name = pkgRes.packageName;
      this.list = [{
        name: '话费',
        color: 'e2e2e2',
        value: `¥${balanceRes.curntbalancecust}`
      }, ];

      pkgRes.resources.map(({
        details,
        type
      }) => {
        if (type === 'flow') {
          details.map(detail => {
            let {
              addUpItemName,
              feePolicyName,
              remain,
              use
            } = detail
            const name = feePolicyName || addUpItemName
            remain = parseFloat(remain)
            use = parseFloat(use)
            if (!isNaN(remain)) {
              if (remain > 0) {
                let remainTxt = remain.toFixed(2)
                if (remainTxt > 1024) {
                  remainTxt = `${(remainTxt/1024).toFixed(2)}G`
                } else {
                  remainTxt = `${remainTxt}M`
                }
                this.list.push({
                  name,
                  color: 'FF0000',
                  value: `${remainTxt}`
                });
              }
            } else if (!isNaN(use)) {
              let useTxt = use.toFixed(2)
              if (useTxt > 1024) {
                useTxt = `${(useTxt/1024).toFixed(2)}G`
              } else {
                useTxt = `${useTxt}M`
              }
              this.list.push({
                name,
                color: '32CD32',
                value: `${useTxt}`
              });
            }
          })
        }
      });
      this.list.push({
        name: '更新',
        color: 'e2e2e2',
        value: [new Date().getHours(), new Date().getMinutes()]
          .map(i => String(i).padStart(2, "0"))
          .join(':'),
      });
      Keychain.set(
        this.cacheKey,
        JSON.stringify({
          list: this.list,
          time: new Date().getTime()
        })
      );
    }

      return await this[`${this.widgetFamily}Widget`]();
    } catch (e) {
      console.error(e)
      let notify = new Notification();
      notify.title = `❌ ${this.name}`;
      notify.subtitle = `可尝试点击通知登录中国联通 打开余量查询`;
      notify.openURL = this.url;
      notify.body = String(e.message || e)
      await notify.schedule();
    }
  }

  /**
   * 渲染小尺寸组件
   */
  async smallWidget() {


    let w = new ListWidget();
    // let nextRefresh = Date.now() + 1000*60*this.interval // add interval miuntes to now
    // 	  w.refreshAfterDate = new Date(nextRefresh)
    w.addSpacer();

    this.list.map((v, i) => {
      const cell = w.addStack();
      cell.centerAlignContent();
      const name = cell.addText(v.name);
      name.font = Font.boldSystemFont(10);
      //       name.lineLimit = 2;
      if (i === 0) {
        name.textColor = new Color('#fe2d46', 1);
      } else if (i === 1) {
        name.textColor = new Color('#ff6600', 1);
      } else if (i === 2) {
        name.textColor = new Color('#faa90e', 1);
      } else if (i === 3) {
        name.textColor = new Color('#9195a3', 1);
      } else {
        name.textColor = new Color('#e2e2e2', 1);
      }
      cell.addSpacer();
      const value = cell.addText(v.value);
      value.font = Font.lightSystemFont(10);
      value.lineLimit = 1;
      if (v.color) {
        value.textColor = new Color(v.color);
      }
      w.addSpacer();
    });
    w.url = this.url;
    w.addSpacer();

    let gradient = new LinearGradient();
    let gradientSettings = await this.setupGradient();

    gradient.colors = gradientSettings.color();
    gradient.locations = gradientSettings.position();

    w.backgroundGradient = gradient;

    return w;
  }
  /**
   * 渲染中尺寸组件
   */
  async mediumWidget() {}
  /**
   * 渲染大尺寸组件
   */
  async largeWidget() {}

  /**
   * 自定义注册点击事件，用 actionUrl 生成一个触发链接，点击后会执行下方对应的 action
   * @param {string} url 打开的链接
   */
  async actionOpenUrl(url) {
    Safari.openInApp(url, false);
  }
}
// @组件代码结束

const {
  Testing
} = require('./「小件件」开发环境');
await Testing(Widget);