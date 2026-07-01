// js/font.js
import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  doc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

function isCSSCode(str) {
    return str && (str.includes("@font-face") || str.includes("@import"));
}

export function injectFontCSS({ label, cssName, url, fontFaceCSS, fontFamily, type }) {
  const cssContent = fontFaceCSS || (isCSSCode(url) ? url : null);
  const isWebfont = type === "webfont" || !!cssContent;

  if (isWebfont) {
    if (!document.querySelector(`style[data-font-face="${cssName}"]`)) {
      const style = document.createElement("style");
      style.dataset.fontFace = cssName;
      style.textContent = cssContent;
      document.head.appendChild(style);
    }
  } else if (url) {
    if (!document.querySelector(`link[data-font="${cssName}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = url;
      link.dataset.font = cssName;
      document.head.appendChild(link);
    }
  }

  if (!document.querySelector(`style[data-font-style="${cssName}"]`)) {
    const familyName = fontFamily || label;
    const style = document.createElement("style");
    style.dataset.fontStyle = cssName;
    style.textContent = `.ql-font-${cssName} { font-family: '${familyName}', sans-serif !important; }`;
    document.head.appendChild(style);
  }
}

export async function loadFonts(onEach) {
  const snap = await getDocs(collection(db, "fonts"));
  snap.forEach((docSnap) => {
    const data = docSnap.data();
    injectFontCSS(data);
    if (onEach) onEach(data);
  });
}

export async function saveFont(fontData) {
  let data = { ...fontData };
  if (isCSSCode(data.url)) {
    data = { label: data.label, cssName: data.cssName, type: "webfont", fontFaceCSS: data.url };
  }
  await setDoc(doc(db, "fonts", data.cssName), data);
}
