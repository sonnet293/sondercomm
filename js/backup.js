// js/backup.js
import { auth, db, OWNER_UID } from "./firebase.js";
import { loadFonts } from "./fonts.js";

loadFonts();

import {
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const postList = document.getElementById("post-list");
const skeletonList = document.getElementById("skeleton-list");
const emptyState = document.getElementById("empty-state");
const toastEl = document.getElementById("toast");
const paginationEl = document.getElementById("pagination");

const PAGE_SIZE = 4;
let visiblePosts = [];
let currentPage = 1;

const secretModal = document.getElementById("secret-modal");
const secretModalClose = document.getElementById("secret-modal-close");
const secretModalConfirm = document.getElementById("secret-modal-confirm");
const secretPwInput = document.getElementById("secret-pw-input");
const modalPwError = document.getElementById("modal-pw-error");

const postModal = document.getElementById("post-modal");
const postModalClose = document.getElementById("post-modal-close");
const postModalTitle = document.getElementById("post-modal-title");
const postModalBody = document.getElementById("post-modal-body");
const postModalMeta = document.getElementById("post-modal-meta");

let allPosts = [];
let pendingPost = null;
let userRole = null;

// TODO: 날짜 점 단위로 바꾸기
function formatDate(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

async function getUserRole(user) {
  if (!user) return null;
  if (user.uid === OWNER_UID) return "owner";
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    return snap.exists() ? (snap.data().role ?? null) : null;
  } catch {
    return null;
  }
}

function canViewPost(post) {
  if (post.visibility === undefined) return true;

  switch (post.visibility) {
    case "public": return true;
    case "friend": return userRole === "friend" || userRole === "owner";
    case "secret":
      if (post.secretPassword) return true;
      return userRole === "owner";
    default: return true;
  }
}

async function loadPosts() {
  try {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    allPosts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const visible = allPosts.filter(canViewPost);

    skeletonList.style.display = "none";

    if (visible.length === 0) {
      emptyState.style.display = "flex";
      return;
    }

    postList.style.display = "flex";
    visiblePosts = visible;
    currentPage = 1;
    renderPage(currentPage);
  } catch (err) {
    skeletonList.style.display = "none";
    showToast("글을 불러오는 데 실패했습니다: " + err.message, true);
  }
}

function renderPage(page) {
  const totalPages = Math.max(1, Math.ceil(visiblePosts.length / PAGE_SIZE));
  currentPage = Math.min(Math.max(1, page), totalPages);

  const start = (currentPage - 1) * PAGE_SIZE;
  renderCards(visiblePosts.slice(start, start + PAGE_SIZE));
  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  paginationEl.innerHTML = "";
  if (totalPages <= 1) return;

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "page-btn" + (i === currentPage ? " active" : "");
    btn.textContent = String(i);
    btn.addEventListener("click", () => {
      renderPage(i);
      postList.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    paginationEl.appendChild(btn);
  }
}

function renderCards(posts) {
  postList.innerHTML = "";
  posts.forEach(post => {
    const card = document.createElement("article");
    card.className = "post-card";
    card.dataset.id = post.id;

    const thumb = post.thumbnailUrl
      ? `<div class="card-thumb"><img src="${post.thumbnailUrl}" alt="" loading="lazy" /></div>`
      : `<div class="card-thumb card-thumb--empty">
           <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
             <rect x="3" y="5" width="26" height="22" rx="4" stroke="currentColor" stroke-width="1.5"/>
             <path d="M3 19l7-6 6 6 4-4 9 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
           </svg>
         </div>`;
    const lockSvg = `<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><rect x="2" y="4.5" width="6" height="5" rx="1" stroke="currentColor" stroke-width="1.1"/><path d="M3.5 4.5V3.5a1.5 1.5 0 013 0v1" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/></svg>`;
    const peopleSvg = `<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="3.5" cy="3" r="1.6" stroke="currentColor" stroke-width="1.1"/><path d="M1 8.5c0-1.4 1.1-2.5 2.5-2.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/><circle cx="7.5" cy="5" r="1.3" stroke="currentColor" stroke-width="1"/><path d="M5.5 8.5C5.5 7.4 6.4 6.5 7.5 6.5" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg>`;

    const vis = post.visibility ?? (post.isSecret ? "secret" : "public"); // TODO: 상황 보고 지우기
    const secretBadge = vis === "secret"
      ? `<span class="badge badge-secret">${lockSvg} 비밀글</span>`
      : vis === "friend"
      ? `<span class="badge badge-friend">${peopleSvg} 멤버 공개</span>`
      : "";

      card.innerHTML = `
        ${thumb}
        <div class="card-body">
          <div class="card-top">
            <h2 class="card-title">${post.title}</h2>
            ${secretBadge}
          </div>
          <p class="card-date">${formatDate(post.createdAt)}</p>
        </div>`;

      card.addEventListener("click", () => handleCardClick(post));
      postList.appendChild(card);
  });
}

function handleCardClick(post) {
  if (post.secretPassword && userRole !== "owner") {
    openSecretModal(post);
  } else {
    openPostModal(post);
  }
}

function openSecretModal(post) {
  pendingPost = post;
  secretPwInput.value = "";
  modalPwError.textContent = "";
  secretModal.classList.add("active");
  setTimeout(() => secretPwInput.focus(), 100);
}

function closeSecretModal() {
  secretModal.classList.remove("active");
  pendingPost = null;
  secretPwInput.value = "";
  modalPwError.textContent = "";
}

secretModalClose.addEventListener("click", closeSecretModal);
secretModal.addEventListener("click", (e) => { if (e.target === secretModal) closeSecretModal(); });

secretModalConfirm.addEventListener("click", () => {
  if (!pendingPost) return;
  const input = secretPwInput.value;
  if (input === pendingPost.secretPassword) {
    const post = pendingPost;
    closeSecretModal();
    openPostModal(post);
  } else {
    modalPwError.textContent = "비밀번호가 틀렸습니다.";
    secretPwInput.value = "";
  }
});

function openPostModal(post) {
  postModalTitle.textContent = post.title;
  postModalBody.innerHTML = post.contentHtml ?? post.content ?? "";
  postModalMeta.textContent = formatDate(post.createdAt);
  postModal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closePostModal() {
  postModal.classList.remove("active");
  document.body.style.overflow = "";
}

postModalClose.addEventListener("click", closePostModal);

let toastTimer;
function showToast(msg, isError = false) {
  toastEl.textContent = msg;
  toastEl.className = "toast show" + (isError ? " error" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2500);
}

const writeFab = document.getElementById("write-fab");

onAuthStateChanged(auth, async (user) => {
  userRole = await getUserRole(user);
  if (userRole === "owner") writeFab.style.display = "flex";
  loadPosts();
});