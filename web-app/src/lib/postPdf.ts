import { getLanguage, t } from "@/lib/language";
import type { Post } from "@/lib/posts";

function addText(parent: HTMLElement, name: string, value: string, className?: string) {
  const element = parent.ownerDocument.createElement(name);
  if (className) element.className = className;
  element.textContent = value;
  parent.appendChild(element);
  return element;
}

export function exportPostPdf(post: Post): boolean {
  // A separate print document gives the browser its native Save as PDF flow.
  const popup = window.open("", "_blank");
  if (!popup) return false;
  const doc = popup.document;
  doc.documentElement.lang = getLanguage();
  doc.title = `Iruka - ${t("投稿")} - ${post.id.slice(0, 8)}`;
  const style = doc.createElement("style");
  style.textContent = `
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #17212b; background: #fff; font-family: -apple-system, BlinkMacSystemFont, "Yu Gothic", "Hiragino Kaku Gothic ProN", "Noto Sans CJK JP", sans-serif; }
    article { width: 210mm; min-height: 297mm; margin: auto; padding: 25mm 23mm 20mm; }
    .brand { color: #1681bc; font-size: 15px; font-weight: 700; letter-spacing: .03em; }
    .rule { height: 1px; margin: 17mm 0 15mm; background: #d9e5ed; }
    h1 { margin: 0 0 13mm; font-size: 22px; line-height: 1.4; }
    .name { margin: 0; font-size: 16px; font-weight: 700; }
    .handle { margin: 2mm 0 0; color: #6e7f8b; font-size: 12px; }
    .body { margin: 14mm 0 17mm; font-size: 20px; line-height: 1.8; white-space: pre-wrap; overflow-wrap: anywhere; }
    .date { color: #647786; font-size: 11px; }
    .footer { position: absolute; top: 270mm; width: 164mm; border-top: 1px solid #d9e5ed; padding-top: 5mm; color: #82929d; font-size: 9px; overflow-wrap: anywhere; }
    @media screen { body { background: #e8edf1; padding: 16px; } article { position: relative; box-shadow: 0 8px 30px #14243222; background: #fff; } }
    @media print { article { position: relative; } }
  `;
  doc.head.appendChild(style);
  const article = doc.createElement("article");
  addText(article, "div", "Iruka", "brand");
  addText(article, "h1", t("投稿"));
  addText(article, "div", "", "rule");
  addText(article, "p", post.authorName, "name");
  addText(article, "p", post.handle, "handle");
  addText(article, "p", post.body, "body");
  const locale = getLanguage() === "en" ? "en-US" : getLanguage() === "ko" ? "ko-KR" : "ja-JP";
  addText(article, "time", new Date(post.createdAt).toLocaleString(locale, { dateStyle: "long", timeStyle: "short" }), "date")
    .setAttribute("datetime", post.createdAt);
  addText(article, "div", `ID: ${post.id}`, "footer");
  doc.body.appendChild(article);
  popup.setTimeout(() => { popup.focus(); popup.print(); }, 100);
  return true;
}
