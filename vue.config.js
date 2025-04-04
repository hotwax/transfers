const path = require('path')
require("@hotwax/app-version-info")
module.exports = {
  configureWebpack: {
    resolve: {
      alias: {
        vue: path.resolve('./node_modules/vue')
      }
    }
  },
  pwa: {
    name: "Transfers - HotWax Commerce",
    themeColor: "#FFFFFF",
    manifestOptions: {
      short_name: "Transfers",
      start_url: "./"
    },
    id: "/",
    display: "standalone",
    background_color: "#000000"
  },
  runtimeCompiler: true,
  transpileDependencies: ['@hotwax/dxp-components']
}
