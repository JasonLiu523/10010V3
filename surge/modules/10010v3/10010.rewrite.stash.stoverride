name: 10010v3
desc: 联通余量(v3)

http:
  force-http-engine:
    - "10010.json:80"
    - "10010.json:443"
  mitm:
    - 10010.json
  script:
    - match: ^https?:\/\/10010\.json
      name: "10010v3"
      type: request
      require-body: true
      timeout: 60
      # debug: true

tiles:
  - name: "10010v3"
    interval: 300
    title: "联通余量"
    content: ""
    icon: "arrow.up.arrow.down.circle"
    backgroundColor: "#663399"

cron:
  script:
    - name: "10010v3"
      cron: "*/5 * * * *" # at every 5th minute
      timeout: 60

script-providers:
  "10010v3":
    url: https://raw.githubusercontent.com/xream/scripts/main/surge/modules/10010v3/10010.js
    interval: 86400
