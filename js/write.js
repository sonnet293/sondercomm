// js/write.js
import { auth, db, OWNER_UID } from "./firebase.js";
import { uploadImage } from "./supabase.js";
import { injectFontCSS, loadFonts, saveFont } from "./fonts.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const Font = Quill.import("formats/font");
Font.whitelist = ["serif", "monospace", "pretendard"];
Quill.register(Font, true);

const Size = Quill.import("attributors/style/font");
Size.whitelist = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px", "36px", "48px"];
Quill.register(Size, true);

const quill = new Quill("#editor", {
    theme: "snow",
    placeholder: "",
    modules: {
        toolbar: { container: "#toolbar" } //TODO: handler 추가
    },
});

let currentUser = null;
let cropperInstance = null;
let pendingImageFile = null;
let colorTarget = "color";
let currentR = 0, currentG = 0, currentB = 0;
let thumbnailBlob = null;

// 에디터
const editorSection = document.getElementById("editor-section");
const toastEl = document.getElementById("toast");

// 썸네일
const thumbnailArea = document.getElementById("thumbnail-area");
const thumbnailInput = document.getElementById("thumbnail-input");
const thumbnailPreview = document.getElementById("thumbnail-preview");
const thumbnailPlaceholder = document.getElementById("thumbnail-placeholder");
const thumbnailRemove = document.getElementById("thumbnail-remove");