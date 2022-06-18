// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-gray; icon-glyph: magic;
// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-gray; icon-glyph: magic;

 

// 添加require，是为了vscode中可以正确引入包，以获得自动补全等功能
if (typeof require === 'undefined') require = importModule
const { Base } = require("./「小件件」开发环境")


// @组件代码开始
class Widget extends Base {
  /**
   * 传递给组件的参数，可以是桌面 Parameter 数据，也可以是外部如 URLScheme 等传递的数据
   * @param {string} arg 自定义参数
   */
  constructor (arg) {
    super(arg)
    this.url = 'http://boxjs.net/#/app/xream.pcr'

    this.getRealtimeData = async () => {
      console.log('getRealtimeData from http://pcr.json')
      try {
        const req = new Request('http://pcr.json')
        req.timeoutInterval = 10
        req.method = 'GET'
        const res = await req.loadJSON()
        // console.log(res)
        // console.log(res.pcr)
        return res.pcr
      } catch (e) {
        console.error(e)
      }
    }

    this.getBoxjsData = async () => {
      console.log('getBoxjsData from http://boxjs.net/query/boxdata')
      try {
        const req = new Request('http://boxjs.net/query/boxdata')
        req.timeoutInterval = 3
        req.method = 'GET'
        const res = await req.loadJSON()
        // console.log(res)
        const pcr = JSON.parse(res.datas["@xream.pcr.pcr"])
        const expireHours = res.datas["@xream.pcr.expireHours"]
        const reportedReportTimestamp = pcr.reportedReportTimestamp
        pcr.msgData.expireHours = expireHours
        pcr.reportedReportTimestamp = reportedReportTimestamp
        // console.log(res)
        return pcr
      } catch (e) {
        console.error(e)
      }
    }
  }


  /**
   * 渲染函数，函数名固定
   * 可以根据 this.widgetFamily 来判断小组件尺寸，以返回不同大小的内容
   */
  async render () {
    const [realtimeData, boxjsData] = await Promise.all([this.getRealtimeData(), this.getBoxjsData()])
    let data = {
      msg: {
        title: '未获取到数据',
        subtitle: '请确保',
        body: 'http://pcr.json 或 http://boxjs.net 正常',
      }
    }

    if (realtimeData) {
      console.log(`使用实时数据`)
      data = realtimeData
      data.version = '实时'
    } else if(boxjsData){
      console.log(`使用 boxjs 缓存数据`)
      data = boxjsData
      data.version = '缓存'
    }
    if (data.reportedReportTimestamp) {
      data.expireTimestamp = data.reportedReportTimestamp + data.msgData.expireHours * 3600 * 1000
    } 
    
    return await this[`${this.widgetFamily}Widget`]({ data, url: this.url })
  }

  /**
   * 渲染小尺寸组件
   */
  async smallWidget ({url, data}) {
    const w = new ListWidget()
    

    w.addSpacer();
   
    let titleText
    if (data.expireTimestamp && data.expireTimestamp <= new Date().getTime()) {
      titleText = w.addText('已过期')
      titleText.font = Font.boldSystemFont(20)
      titleText.textColor = Color.dynamic(Color.red(), Color.red())
      titleText.centerAlignText()
      titleText.textOpacity = 0.5
    } else {
      titleText = w.addText(data.msg.title)
      titleText.font = Font.boldSystemFont(10)
      titleText.textColor = Color.dynamic(Color.black(), Color.white())
      titleText.centerAlignText()
      titleText.textOpacity = 0.5
    }
      
    w.addSpacer()
    
    let subtitleText

    if (data.expireTimestamp) {
      let dateFormatter = new DateFormatter()
      dateFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSZ"
      dateFormatter.locale = "en_US"
      const DATE = new Date(data.expireTimestamp).toISOString()
      subtitleText = w.addDate(dateFormatter.date(DATE))
      subtitleText.applyRelativeStyle()
    } else {
      subtitleText = w.addText(data.msg.subtitle)

    }

    subtitleText.font = Font.boldSystemFont(20)
    subtitleText.textColor = Color.dynamic(Color.black(), Color.white())
    subtitleText.centerAlignText()
    subtitleText.textOpacity = 1
   

   
      
    w.addSpacer()
    
    const latestPcr = data.msgData.latestPcr || {}
    const latestPcrSampleDate = latestPcr.sample_date
    if (latestPcrSampleDate) {
      const bodyText = w.addText(`检测中 ${latestPcrSampleDate}`)
      bodyText.font = Font.boldSystemFont(10)
      bodyText.textColor = Color.dynamic(Color.black(), Color.white())
      bodyText.centerAlignText()
      bodyText.textOpacity = 0.5
        
      
    }
    w.addSpacer()
   

    const nowText = w.addText([data.version, '刷新于',[new Date().getHours(), new Date().getMinutes()]
            .map(i => String(i).padStart(2, '0'))
            .join(':')].filter(i => i !== null).join(' '))
    nowText.font = Font.boldSystemFont(10)
    nowText.textColor = Color.dynamic(Color.black(), Color.white())
    nowText.centerAlignText()
    nowText.textOpacity = 0.25
      
    w.addSpacer()
    
    w.url = url
    return w
  }
  /**
   * 渲染中尺寸组件
   */
  async mediumWidget ({url, data}) {
    const w = new ListWidget()
    

    w.addSpacer();
   
    const titleText = w.addText(data.msg.title)
    titleText.font = Font.boldSystemFont(12)
    titleText.textColor = Color.dynamic(Color.black(), Color.white())
    titleText.centerAlignText()
    titleText.textOpacity = 0.5
      
    w.addSpacer()

    const subtitleText = w.addText(data.msg.subtitle)
    subtitleText.font = Font.boldSystemFont(12)
    subtitleText.textColor = Color.dynamic(Color.black(), Color.white())
    subtitleText.centerAlignText()
    subtitleText.textOpacity = 0.75
      
    w.addSpacer()

    const bodyText = w.addText(data.msg.body)
    bodyText.font = Font.boldSystemFont(12)
    bodyText.textColor = Color.dynamic(Color.black(), Color.white())
    bodyText.centerAlignText()
    bodyText.textOpacity = 0.75
      
    w.addSpacer()
    
    w.url = url
    return w
  }
  /**
   * 渲染大尺寸组件
   */
  async largeWidget ({url, data}) {
    const w = new ListWidget()
    

    w.addSpacer();
   
    const titleText = w.addText(data.msg.title)
    titleText.font = Font.boldSystemFont(12)
    titleText.textColor = Color.dynamic(Color.black(), Color.white())
    titleText.centerAlignText()
    titleText.textOpacity = 0.5
      
    w.addSpacer()

    const subtitleText = w.addText(data.msg.subtitle)
    subtitleText.font = Font.boldSystemFont(12)
    subtitleText.textColor = Color.dynamic(Color.black(), Color.white())
    subtitleText.centerAlignText()
    subtitleText.textOpacity = 0.75
      
    w.addSpacer()

    const bodyText = w.addText(data.msg.body)
    bodyText.font = Font.boldSystemFont(12)
    bodyText.textColor = Color.dynamic(Color.black(), Color.white())
    bodyText.centerAlignText()
    bodyText.textOpacity = 0.75
      
    w.addSpacer()
    
    w.url = url
    return w
  
    
  }

  
  /**
   * 自定义注册点击事件，用 actionUrl 生成一个触发链接，点击后会执行下方对应的 action
   * @param {string} url 打开的链接
   */
  async actionOpenUrl (url) {
    Safari.openInApp(url, false)
    // Safari.open(`shortcuts://run-shortcut?name=${encodeURIComponent('下为壁纸')}&input=${encodeURIComponent(url)}`)
  }

}
// @组件代码结束

const { Testing } = require("./「小件件」开发环境")
await Testing(Widget)

