import * as path from "node:path";
import { defineConfig } from "rspress/config";
import alignImage from "rspress-plugin-align-image";

export default defineConfig({
  base: "/vocespace_doc",
  root: path.join(__dirname, "docs"),
  title: "Vocespace Doc",
  description: "Documentation for Vocespace",
  icon: "/favicon.ico",
  logo: {
    light: "/vocespace.svg",
    dark: "/vocespace.svg",
  },
  lang: "en",
  globalStyles: path.join(__dirname, 'theme', 'index.css'),
  plugins: [alignImage({
    justify: 'center',
    containerClassNames: ['img-center'],
  })],
  themeConfig: {
    enableContentAnimation: true,
    locales: [
      {
        lang: "en",
        label: "English",
        title: "Vocespace",
        description: "Documentation for Vocespace",
        outlineTitle: 'Table of Contents',
      },
      {
        lang: "zh",
        label: "中文",
        title: "Vocespace",
        description: "Vocespace 的文档",
        outlineTitle: '目录',
      },
    ],
    socialLinks: [
      {
        icon: "github",
        mode: "link",
        content: "https://github.com/Privoce/GenUI",
      },
    ],
  },
  markdown: {
    showLineNumbers: true,
    checkDeadLinks: true,
    highlightLanguages:[['rs', 'rust']]
  },
  route: {
    cleanUrls: true,
  },
  multiVersion: {
    default: "v0.1.0",
    versions: ["v0.1.0"],
  },
  search: {
    versioned: true,
  },
  
});
