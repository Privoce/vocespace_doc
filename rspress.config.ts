import * as path from "node:path";
import { defineConfig } from "rspress/config";

export default defineConfig({
  root: path.join(__dirname, "docs"),
  title: "VoceSpace Doc",
  description: "Documentation for VoceSpace",
  icon: "/favicon.ico",
  logo: {
    light: "/vocespace.svg",
    dark: "/vocespace.svg",
  },
  lang: "en",
  globalStyles: path.join(__dirname, "theme", "index.css"),
  themeConfig: {
    enableContentAnimation: true,
    locales: [
      {
        lang: "en",
        label: "English",
        title: "VoceSpace",
        description: "Documentation for VoceSpace",
        outlineTitle: "Table of Contents",
      },
      {
        lang: "zh",
        label: "中文",
        title: "VoceSpace",
        description: "VoceSpace 的文档",
        outlineTitle: "目录",
      },
    ],
    socialLinks: [
      {
        icon: "github",
        mode: "link",
        content: "https://github.com/Privoce/vocespace-client",
      },
      {
        icon: "wechat",
        mode: "dom",
        content:
          '<div style="height: 100px; width: 100px;"><img src="https://static.readdy.ai/image/736cb33f85ee328c22e5d7e17bec9c40/1e18fe5f59b60ead0da50d1d023aab98.png" alt="WeChat QR Code"></img></div>',
      },
    ],
  },
  markdown: {
    showLineNumbers: true,
    checkDeadLinks: true,
    highlightLanguages: [["rs", "rust"]],
  },
  route: {
    cleanUrls: true,
  },
  // multiVersion: {
  //   default: "v0.1.0",
  //   versions: ["v0.1.0"],
  // },
  search: {
    versioned: true,
  },
});
