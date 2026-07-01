// js/board.js
import { auth, db, OWNER_UID } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

async function initBoard() {
  const boardEl = document.getElementById("marquee-board");
  if (!boardEl) return;

  const pageId = boardEl.dataset.pageId || "default";

  boardEl.innerHTML = `
    <div class="marquee-wrap">
      <div class="marquee-track">
        <span class="marquee-text"></span>
        <span class="marquee-text" aria-hidden="true"></span>
      </div>
      <button class="marquee-edit-btn" title="전광판 수정" style="display:none;">수정</button>
    </div>

    <div class="marquee-modal-overlay" style="display: none;">
        <div class="marquee-modal">
            <h3 class="marquee-modal-title">문구 수정</h3>
            <p class="marquee-modal-page">페이지: <strong>${pageId}</strong></p>
            <textarea class="marquee-modal-textarea" row="3" maxlength="300" placeholder="표시할 문구 입력"></textarea>
            <div class="marquee-modal-actions">
                <button class="marquee-btn-cancel">취소</button>
                <button class="marquee-btn-save">저장</button>
            </div>
            <p class="marquee-modal-msg"></p>
        </div>
    </div>`;

  const textEls    = boardEl.querySelectorAll(".marquee-text");
  const editBtn    = boardEl.querySelector(".marquee-edit-btn");
  const overlay    = boardEl.querySelector(".marquee-modal-overlay");
  const textarea   = boardEl.querySelector(".marquee-modal-textarea");
  const btnCancel  = boardEl.querySelector(".marquee-btn-cancel");
  const btnSave    = boardEl.querySelector(".marquee-btn-save");
  const msgEl      = boardEl.querySelector(".marquee-modal-msg");

  async function loadText() {
    try {
      const snap = await getDoc(doc(db, "marquee", pageId));
      return snap.exists() ? snap.data().text || "" : "";
    } catch {
      return "";
    }
  }

  function applyText(text) {
    const display = text.trim() || "문구를 설정해주세요.";
    textEls.forEach((el) => (el.textContent = display + "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"));
  }

  const initialText = await loadText();
  applyText(initialText);

  onAuthStateChanged(auth, (user) => {
    if (user && user.uid === OWNER_UID) {
      editBtn.style.display = "flex";
    } else {
      editBtn.style.display = "none";
    }
  });

  editBtn.addEventListener("click", async () => {
    const current = await loadText();
    textarea.value = current;
    msgEl.textContent = "";
    overlay.style.display = "flex";
    textarea.focus();
  });

  btnCancel.addEventListener("click", () => {
    overlay.style.display = "none";
  });

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.style.display = "none";
  });

  btnSave.addEventListener("click", async () => {
    const newText = textarea.value.trim();
    if (!newText) {
      msgEl.textContent = "문구를 입력해주세요.";
      return;
    }

    btnSave.disabled = true;
    msgEl.textContent = "저장 중...";

    try {
      await setDoc(doc(db, "marquee", pageId), {
        text: newText,
        updatedAt: new Date().toISOString(),
      });
      applyText(newText);
      msgEl.textContent = "저장 완료";
      setTimeout(() => (overlay.style.display = "none"), 800);
    } catch (err) {
      console.error(err);
      msgEl.textContent = "저장에 실패했습니다.";
    } finally {
      btnSave.disabled = false;
    }
  });
}

initBoard();