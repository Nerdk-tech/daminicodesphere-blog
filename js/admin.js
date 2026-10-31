/* ============================
   DCS BLOG, ADMIN PANEL
   Publishes posts to GitHub via
   the Contents API (repo = the
   blog itself; hosting platform
   auto-redeploys on push).
   ============================ */

/* CHANGE THIS PASSWORD to whatever you want.
   It's a light gate for the panel UI, the real
   key is your GitHub token, which never leaves
   your browser. */
const ADMIN_PASSWORD = "codesphere-admin";

const GH = {
  token: localStorage.getItem("dcs_gh_token") || "",
  api: "https://api.github.com"
};

const $ = (id) => document.getElementById(id);

/* ---------- tiny toast ---------- */
let toastTimer;
function toast(msg, bad) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.toggle("bad", !!bad);
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}

/* ---------- gate ---------- */
function unlockPanel() {
  $("gate").hidden = true;
  $("panel").hidden = false;
  $("logoutBtn").hidden = false;
  GH.token ? showManager() : ($("tokenSetup").hidden = false);
}

$("gateForm").addEventListener("submit", (e) => {
  e.preventDefault();
  if ($("gatePass").value === ADMIN_PASSWORD) {
    sessionStorage.setItem("dcs_admin", "1");
    unlockPanel();
  } else {
    toast("Wrong password", true);
    $("gatePass").value = "";
  }
});

$("logoutBtn").addEventListener("click", () => {
  sessionStorage.removeItem("dcs_admin");
  location.reload();
});

if (sessionStorage.getItem("dcs_admin") === "1") unlockPanel();

/* ---------- github helpers ---------- */
async function ghFetch(path, opts = {}) {
  const res = await fetch(GH.api + path, {
    ...opts,
    headers: {
      Authorization: "Bearer " + GH.token,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(opts.headers || {})
    }
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || "GitHub error " + res.status);
  }
  return res.json();
}

async function getFile(path) {
  const { owner, repo, branch } = DCS.github;
  const d = await ghFetch(`/repos/${owner}/${repo}/contents/${path}?ref=${branch}`);
  return {
    sha: d.sha,
    text: decodeURIComponent(escape(atob(d.content.replace(/\n/g, ""))))
  };
}


/* ---- SEO: rebuild sitemap.xml + feed.xml from the posts index ---- */
function buildSitemap(posts) {
  const BASE = "https://blog.daminicodesphere.org";
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const last = posts.length ? posts[0].date : new Date().toISOString().slice(0, 10);
  let x = '<?xml version="1.0" encoding="UTF-8"?>\n';
  x += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';
  x += '  <url>\n    <loc>' + BASE + '/</loc>\n    <lastmod>' + last + '</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n';
  x += '    <image:image>\n      <image:loc>' + BASE + '/assets/img/blog-og.png</image:loc>\n      <image:title>Daminicodesphere Blog</image:title>\n    </image:image>\n  </url>\n';
  posts.forEach(p => {
    x += '  <url>\n    <loc>' + BASE + '/post/' + p.slug + '</loc>\n    <lastmod>' + p.date + '</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n';
    if (p.cover) {
      const img = p.cover.startsWith("http") ? p.cover : BASE + "/" + p.cover.replace(/^\//, "");
      x += '    <image:image>\n      <image:loc>' + esc(img) + '</image:loc>\n      <image:title>' + esc(p.title) + '</image:title>\n    </image:image>\n';
    }
    x += '  </url>\n';
  });
  x += '</urlset>\n';
  return x;
}

function buildFeed(posts) {
  const BASE = "https://blog.daminicodesphere.org";
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  let f = '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel>\n';
  f += '<title>Daminicodesphere Blog</title>\n<link>' + BASE + '/</link>\n<description>Notes on AI, code and building in public.</description>\n';
  posts.forEach(p => {
    f += '<item><title>' + esc(p.title) + '</title><link>' + BASE + '/post/' + p.slug + '</link><guid>' + BASE + '/post/' + p.slug + '</guid>';
    f += '<pubDate>' + new Date(p.date + "T09:00:00Z").toUTCString() + '</pubDate><description>' + esc(p.excerpt || "") + '</description></item>\n';
  });
  f += '</channel></rss>\n';
  return f;
}

async function syncSeoFiles(posts) {
  try {
    const sm = await getFile("sitemap.xml").catch(() => null);
    await putFile("sitemap.xml", buildSitemap(posts), "Update sitemap", sm ? sm.sha : undefined);
  } catch (e) { /* non-fatal */ }
  try {
    const fd = await getFile("feed.xml").catch(() => null);
    await putFile("feed.xml", buildFeed(posts), "Update feed", fd ? fd.sha : undefined);
  } catch (e) { /* non-fatal */ }
}

async function putFile(path, text, message, sha) {
  const { owner, repo, branch } = DCS.github;
  return ghFetch(`/repos/${owner}/${repo}/contents/${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      branch,
      content: btoa(unescape(encodeURIComponent(text))),
      ...(sha ? { sha } : {})
    })
  });
}

async function deleteFile(path, message, sha) {
  const { owner, repo, branch } = DCS.github;
  return ghFetch(`/repos/${owner}/${repo}/contents/${path}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, branch, sha })
  });
}

/* ---------- token setup ---------- */
$("tokenSave").addEventListener("click", async () => {
  const t = $("tokenInput").value.trim();
  if (!t) return;
  $("tokenStatus").textContent = "Testing…";
  try {
    const res = await fetch(GH.api + "/user", {
      headers: { Authorization: "Bearer " + t, Accept: "application/vnd.github+json" }
    });
    if (!res.ok) throw new Error();
    const user = await res.json();
    GH.token = t;
    localStorage.setItem("dcs_gh_token", t);
    $("tokenStatus").textContent = "Connected as " + user.login + " ✓";
    toast("GitHub connected");
    setTimeout(showManager, 700);
  } catch (e) {
    $("tokenStatus").textContent = "Invalid token, try again";
    toast("Token failed", true);
  }
});

/* ---------- manager ---------- */
async function loadPostsIndex() {
  try {
    const f = await getFile("posts/posts.json");
    return { posts: JSON.parse(f.text), sha: f.sha };
  } catch (e) {
    return { posts: [], sha: null };
  }
}

async function showManager() {
  $("tokenSetup").hidden = true;
  $("manager").hidden = false;
  $("editor").hidden = true;
  const list = $("postList");
  list.innerHTML = '<p class="loading-inline">Loading…</p>';
  const { posts } = await loadPostsIndex();
  posts.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  if (!posts.length) {
    list.innerHTML = '<p class="loading-inline">No posts yet, hit “+ New post”.</p>';
    return;
  }

  list.innerHTML = "";
  posts.forEach(p => {
    const row = document.createElement("div");
    row.className = "post-row";
    row.innerHTML =
      "<div><strong></strong><span>" + esc(fmtDate(p.date)) + "</span></div>" +
      '<div class="row-actions">' +
        '<a class="btn-ghost btn-sm" target="_blank" rel="noopener" href="post/' + encodeURIComponent(p.slug) + '">View</a>' +
        '<button class="btn-ghost btn-sm act-edit">Edit</button>' +
        '<button class="btn-danger btn-sm act-del">Delete</button>' +
      "</div>";
    row.querySelector("strong").textContent = p.title;
    row.querySelector(".act-edit").addEventListener("click", () => openEditor(p));
    row.querySelector(".act-del").addEventListener("click", async () => {
      if (!confirm("Delete “" + p.title + "”?")) return;
      try {
        const idx = await loadPostsIndex();
        const next = idx.posts.filter(x => x.slug !== p.slug);
        if (idx.sha) await putFile("posts/posts.json", JSON.stringify(next, null, 2), "Remove post: " + p.title, idx.sha);
        await syncSeoFiles(next);
        try {
          const f = await getFile("posts/" + p.slug + ".md");
          await deleteFile("posts/" + p.slug + ".md", "Delete file: " + p.slug, f.sha);
        } catch (e) { /* file may not exist */ }
        toast("Post deleted");
        showManager();
      } catch (e) {
        toast("Delete failed: " + e.message, true);
      }
    });
    list.appendChild(row);
  });
}

$("newPostBtn").addEventListener("click", () => openEditor(null));
$("backBtn").addEventListener("click", showManager);

/* ---------- editor ---------- */
let editingSlug = null;

async function openEditor(post) {
  editingSlug = post ? post.slug : null;
  $("manager").hidden = true;
  $("editor").hidden = false;
  $("edTitle").value = post ? post.title : "";
  $("edCover").value = post ? (post.cover || "") : "";
  $("edTags").value = post ? (post.tags || []).join(", ") : "";
  $("edExcerpt").value = post ? (post.excerpt || "") : "";
  if (post) {
    try {
      const f = await getFile("posts/" + post.slug + ".md");
      $("edContent").value = f.text;
    } catch (e) { $("edContent").value = ""; }
  } else {
    $("edContent").value = "";
  }
  updatePreview();
}

function updatePreview() {
  $("previewPane").innerHTML = renderMarkdown($("edContent").value || "_Nothing yet, start typing…_");
}
["edContent", "edTitle", "edExcerpt", "edTags", "edCover"].forEach(id =>
  $(id).addEventListener("input", updatePreview)
);
$("previewBtn").addEventListener("click", () => {
  const pane = $("previewPane");
  pane.classList.toggle("fullscreen");
  document.body.classList.toggle("preview-mode");
});

/* markdown toolbar */
document.querySelectorAll(".md-toolbar button").forEach(btn => {
  btn.addEventListener("click", () => {
    const ta = $("edContent");
    const open = btn.dataset.md.replace(/\\n/g, "\n");
    const close = (btn.dataset.mdClose || "").replace(/\\n/g, "\n");
    const s = ta.selectionStart, e = ta.selectionEnd;
    const sel = ta.value.slice(s, e);
    ta.setRangeText(open + sel + close, s, e, "select");
    if (sel) ta.setSelectionRange(s + open.length, s + open.length + sel.length);
    ta.focus();
    updatePreview();
  });
});

/* ---------- publish ---------- */
$("publishBtn").addEventListener("click", async () => {
  const title = $("edTitle").value.trim();
  const content = $("edContent").value.trim();
  if (!title || !content) {
    toast("Title and content are required", true);
    return;
  }

  const slug = editingSlug || slugify(title);
  const post = {
    slug,
    title,
    date: new Date().toISOString().slice(0, 10),
    excerpt: $("edExcerpt").value.trim(),
    cover: $("edCover").value.trim(),
    tags: $("edTags").value.split(",").map(t => t.trim()).filter(Boolean),
    file: "posts/" + slug + ".md"
  };

  $("publishBtn").disabled = true;
  $("publishBtn").textContent = "Publishing…";

  try {
    // 1. write the markdown file
    let mdSha;
    try {
      const f = await getFile("posts/" + slug + ".md");
      mdSha = f.sha;
    } catch (e) { mdSha = null; }
    await putFile("posts/" + slug + ".md", content,
      (mdSha ? "Update post: " : "Add post: ") + title, mdSha);

    // 2. update the index
    const idx = await loadPostsIndex();
    let posts = idx.posts.filter(p => p.slug !== slug);
    posts.unshift(post);
    await putFile("posts/posts.json", JSON.stringify(posts, null, 2),
      "Update posts index", idx.sha);
    await syncSeoFiles(posts);

    toast("Published! Site redeploys in ~1 min");
    setTimeout(showManager, 900);
  } catch (e) {
    toast("Publish failed: " + e.message, true);
  } finally {
    $("publishBtn").disabled = false;
    $("publishBtn").textContent = "Publish";
  }
});
