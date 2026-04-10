import { marked } from "marked";

const MARKDOWN_CSS = `
* { box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  font-size: 14px;
  line-height: 1.6;
  color: #24292f;
  background: #fff;
  padding: 24px 32px;
  margin: 0;
  word-wrap: break-word;
}
h1, h2, h3, h4, h5, h6 {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.25;
}
h1 { font-size: 2em; padding-bottom: 0.3em; border-bottom: 1px solid #d1d9e0; }
h2 { font-size: 1.5em; padding-bottom: 0.3em; border-bottom: 1px solid #d1d9e0; }
h3 { font-size: 1.25em; }
h4 { font-size: 1em; }
p { margin-top: 0; margin-bottom: 16px; }
a { color: #0969da; text-decoration: none; }
a:hover { text-decoration: underline; }
img { max-width: 100%; height: auto; }
ul, ol { padding-left: 2em; margin-bottom: 16px; }
li { margin-bottom: 4px; }
li + li { margin-top: 4px; }
blockquote {
  margin: 0 0 16px;
  padding: 0 16px;
  color: #656d76;
  border-left: 4px solid #d1d9e0;
}
code {
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 85%;
  background: #f6f8fa;
  border-radius: 6px;
  padding: 0.2em 0.4em;
}
pre {
  background: #f6f8fa;
  border-radius: 6px;
  padding: 16px;
  overflow-x: auto;
  margin-bottom: 16px;
  line-height: 1.45;
}
pre code {
  background: transparent;
  padding: 0;
  font-size: 85%;
}
table {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 16px;
}
th, td {
  border: 1px solid #d1d9e0;
  padding: 6px 13px;
  text-align: left;
}
th { font-weight: 600; background: #f6f8fa; }
tr:nth-child(even) { background: #f6f8fa; }
hr {
  border: none;
  border-top: 1px solid #d1d9e0;
  margin: 24px 0;
}
input[type="checkbox"] {
  margin-right: 6px;
}
`;

export const renderMarkdownToHtml = (md: string, title?: string): string => {
  const html = marked.parse(md, { gfm: true, breaks: true }) as string;
  const titleTag = title ? `<title>${title}</title>` : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
${titleTag}
<style>${MARKDOWN_CSS}</style>
</head>
<body>${html}</body>
</html>`;
};
