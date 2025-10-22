// ====== CONFIG ======
const API = "http://localhost:4000/api/posts";

// ====== ELEMENTS ======
const els = {
  list: document.getElementById("list"),
  empty: document.getElementById("empty"),
  pager: document.getElementById("pager"),
  form: document.getElementById("postForm"),
  id: document.getElementById("postId"),
  title: document.getElementById("title"),
  content: document.getElementById("content"),
  author: document.getElementById("author"),
  tags: document.getElementById("tags"),
  published: document.getElementById("published"),
  resetBtn: document.getElementById("resetBtn"),
  search: document.getElementById("search"),
  searchBtn: document.getElementById("searchBtn"),
  searchMobile: document.getElementById("searchMobile"),
  searchBtnMobile: document.getElementById("searchBtnMobile"),
  refreshBtn: document.getElementById("refreshBtn"),
  toast: document.getElementById("toast"),
  confirmModal: document.getElementById("confirmModal"),
  cancelDel: document.getElementById("cancelDel"),
  confirmDel: document.getElementById("confirmDel"),
  themeToggle: document.getElementById("themeToggle"),
};
let state = { page: 1, q: "" };
let pendingDeleteId = null;

// ====== THEME ======
// Light mode default - tidak ada dark mode toggle
(function initTheme() {
  // Set default light mode
  document.documentElement.classList.remove("dark");
  localStorage.setItem("theme", "light");
})();

// ====== HELPERS ======
function escapeHTML(str = "") {
  return str.replace(/[&<>"']/g, (m) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[m]));
}
function showToast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.remove("hidden");
  setTimeout(() => els.toast.classList.add("hidden"), 1800);
}
function formatTime(ts) {
  return new Date(ts).toLocaleString();
}
function badge(text) {
  return `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-700 border border-primary-200">${escapeHTML(text)}</span>`;
}
function skeletonCards(n = 4) {
  els.list.innerHTML = "";
  for (let i = 0; i < n; i++) {
    const li = document.createElement("li");
    li.className = "animate-pulse bg-white rounded-2xl p-6 border border-gray-200 shadow-sm";
    li.innerHTML = `
      <div class="h-6 w-3/4 bg-gray-200 rounded-lg mb-4"></div>
      <div class="h-4 w-full bg-gray-200 rounded mb-2"></div>
      <div class="h-4 w-2/3 bg-gray-200 rounded mb-4"></div>
      <div class="flex items-center gap-2 mb-4">
        <div class="w-8 h-8 bg-gray-200 rounded-full"></div>
        <div class="h-4 w-24 bg-gray-200 rounded"></div>
      </div>
      <div class="flex gap-2">
        <div class="h-6 w-16 bg-gray-200 rounded-full"></div>
        <div class="h-6 w-20 bg-gray-200 rounded-full"></div>
      </div>
    `;
    els.list.appendChild(li);
  }
  els.empty.classList.add("hidden");
}

// ====== FETCH & RENDER ======
async function fetchPosts() {
  skeletonCards();
  try {
    const url = new URL(API);
    url.searchParams.set("page", state.page);
    url.searchParams.set("limit", 8);
    if (state.q) url.searchParams.set("q", state.q);
    const res = await fetch(url);
    const data = await res.json();
    renderList(data.items || []);
    renderPager(Number(data.page || 1), Number(data.pages || 1));
  } catch (e) {
    console.error(e);
    els.list.innerHTML = "";
    els.empty.classList.remove("hidden");
  }
}

function renderList(items) {
  els.list.innerHTML = "";
  if (!items.length) {
    els.empty.classList.remove("hidden");
    return;
  }
  els.empty.classList.add("hidden");

  // Update article count
  const countEl = document.getElementById("articleCount");
  if (countEl) {
    countEl.textContent = `${items.length} artikel`;
  }

  for (const p of items) {
    const li = document.createElement("li");
    li.className = "group bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 hover:border-primary-200";
    const initials = escapeHTML((p.author || "A").slice(0,1).toUpperCase());
    li.innerHTML = `
      <div class="flex items-start justify-between gap-4 mb-4">
        <h3 class="text-xl font-semibold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-2">${escapeHTML(p.title)}</h3>
        ${p.published
          ? `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
              <svg class="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
              Published
            </span>`
          : `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
              <svg class="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Draft
            </span>`
        }
      </div>

      <p class="text-gray-600 mb-4 line-clamp-3 leading-relaxed">${escapeHTML(p.content)}</p>

      <div class="flex items-center gap-3 mb-4">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm">
            ${initials}
          </div>
          <div>
            <div class="text-sm font-medium text-gray-900">${escapeHTML(p.author || "Anonymous")}</div>
            <div class="text-xs text-gray-500">${formatTime(p.createdAt)}</div>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap gap-2 mb-4">
        ${(p.tags || []).map(badge).join("")}
      </div>

      <div class="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100">
        <button data-id="${p._id}" class="edit flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-primary-300 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all duration-200 font-medium">
          <svg class="w-4 h-4 mr-2 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
          Edit
        </button>
        <button data-id="${p._id}" class="del flex-1 sm:flex-none px-4 py-3 rounded-xl bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 font-medium">
          <svg class="w-4 h-4 mr-2 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
          Delete
        </button>
      </div>
    `;
    els.list.appendChild(li);
  }

  // actions
  els.list.querySelectorAll(".edit").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const res = await fetch(`${API}/${id}`);
      const p = await res.json();
      els.id.value = p._id;
      els.title.value = p.title;
      els.content.value = p.content;
      els.author.value = p.author || "";
      els.tags.value = (p.tags || []).join(", ");
      els.published.checked = !!p.published;
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
  els.list.querySelectorAll(".del").forEach(btn => {
    btn.addEventListener("click", () => {
      pendingDeleteId = btn.dataset.id;
      openModal();
    });
  });
}

function renderPager(page, pages) {
  els.pager.innerHTML = "";
  if (pages <= 1) return;

  const mkBtn = (text, disabled, onClick) => {
    const b = document.createElement("button");
    b.textContent = text;
    b.className = `px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-primary-300 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all duration-200 font-medium ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`;
    b.disabled = disabled;
    b.onclick = onClick;
    return b;
  };

  els.pager.append(
    mkBtn("← Sebelumnya", page <= 1, () => { state.page = page - 1; fetchPosts(); }),
    (() => { 
      const s = document.createElement("span"); 
      s.className = "text-xs sm:text-sm self-center mx-2 sm:mx-4 text-gray-500 font-medium text-center"; 
      s.textContent = `${page} / ${pages}`; 
      return s; 
    })(),
    mkBtn("Selanjutnya →", page >= pages, () => { state.page = page + 1; fetchPosts(); }),
  );
}

// ====== FORM ======
els.form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    title: els.title.value.trim(),
    content: els.content.value.trim(),
    author: els.author.value.trim(),
    tags: els.tags.value,
    published: els.published.checked
  };
  const id = els.id.value;
  const method = id ? "PUT" : "POST";
  const url = id ? `${API}/${id}` : API;

  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    let err = "Terjadi error.";
    try { err = (await res.json()).error || err; } catch {}
    alert(err);
    return;
  }
  resetForm();
  showToast(id ? "Post diperbarui" : "Post dibuat");
  fetchPosts();
});

function resetForm() {
  els.id.value = "";
  els.title.value = "";
  els.content.value = "";
  els.author.value = "";
  els.tags.value = "";
  els.published.checked = true;
}
els.resetBtn.addEventListener("click", resetForm);

// ====== SEARCH (debounced) ======
function debounce(fn, ms = 450) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
const doSearch = () => {
  state.q = (els.search?.value || els.searchMobile?.value || "").trim();
  state.page = 1;
  fetchPosts();
};
els.search?.addEventListener("input", debounce(doSearch, 400));
els.searchBtn?.addEventListener("click", doSearch);
els.searchMobile?.addEventListener("input", debounce(doSearch, 400));
els.searchBtnMobile?.addEventListener("click", doSearch);
els.refreshBtn?.addEventListener("click", () => {
  if (els.search) els.search.value = "";
  if (els.searchMobile) els.searchMobile.value = "";
  state.q = ""; state.page = 1; fetchPosts();
});

// ====== CONFIRM DELETE ======
// Mobile-optimized modal handling
function openModal() {
  document.body.classList.add('modal-open');
  els.confirmModal.showModal();
}

function closeModal() {
  document.body.classList.remove('modal-open');
  els.confirmModal.close();
}

// Handle modal events
els.cancelDel.addEventListener("click", closeModal);
els.confirmDel.addEventListener("click", async () => {
  if (!pendingDeleteId) return;
  
  // Show loading state
  const originalText = els.confirmDel.textContent;
  els.confirmDel.textContent = "Menghapus...";
  els.confirmDel.disabled = true;
  
  try {
    await fetch(`${API}/${pendingDeleteId}`, { method: "DELETE" });
    pendingDeleteId = null;
    closeModal();
    showToast("Artikel berhasil dihapus");
    fetchPosts();
  } catch (error) {
    console.error("Error deleting post:", error);
    showToast("Gagal menghapus artikel");
  } finally {
    els.confirmDel.textContent = originalText;
    els.confirmDel.disabled = false;
  }
});

// Handle backdrop click to close modal
els.confirmModal.addEventListener("click", (e) => {
  if (e.target === els.confirmModal) {
    closeModal();
  }
});

// Handle escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && els.confirmModal.open) {
    closeModal();
  }
});

// ====== INIT ======
fetchPosts();
