/* ============================
   DCS BLOG, shared helpers
   (markdown renderer + utils)
   ============================ */

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
           .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function slugify(t) {
  return t.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function fmtDate(iso) {
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("en-NG", {
      year: "numeric", month: "long", day: "numeric"
    });
  } catch (e) { return iso; }
}

function readingTime(md) {
  const words = md.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

/* ---------- tiny markdown renderer ---------- */
function renderMarkdown(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  let html = "";
  let i = 0;
  let inCode = false, codeBuf = [], codeLang = "";
  let listType = null; // "ul" | "ol"

  const inline = (s) =>
    esc(s)
      .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/\[([^\]]+)\]\(((?:https?:|mailto:)[^)\s]+)\)/g, (m, t, u) => {
        const ext = u.startsWith("http");
        return '<a href="' + u + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' + t + "</a>";
      });

  const closeList = () => {
    if (listType) { html += `</${listType}>`; listType = null; }
  };

  while (i < lines.length) {
    const line = lines[i];

    // fenced code
    if (line.trim().startsWith("```")) {
      if (!inCode) {
        inCode = true;
        codeLang = line.trim().slice(3).trim();
        codeBuf = [];
      } else {
        inCode = false;
        closeList();
        html += `<pre class="code-block"><div class="code-lang">${esc(codeLang || "code")}</div><code>${esc(codeBuf.join("\n"))}</code></pre>`;
      }
      i++; continue;
    }
    if (inCode) { codeBuf.push(line); i++; continue; }

    // blank line
    if (!line.trim()) { closeList(); i++; continue; }

    // headings
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      closeList();
      const lvl = h[1].length;
      const id = slugify(h[2]);
      const sizes = ["h1", "h2", "h3", "h4"];
      html += `<${sizes[lvl - 1]} id="${id}">${inline(h[2])}</${sizes[lvl - 1]}>`;
      i++; continue;
    }

    // hr
    if (/^---+$/.test(line.trim())) { closeList(); html += "<hr>"; i++; continue; }

    // quote
    if (line.trim().startsWith("> ")) {
      closeList();
      html += `<blockquote>${inline(line.trim().slice(2))}</blockquote>`;
      i++; continue;
    }

    // image
    const img = line.trim().match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
    if (img) {
      closeList();
      html += `<figure><img src="${esc(img[2])}" alt="${esc(img[1])}" loading="lazy"></figure>`;
      i++; continue;
    }

    // lists
    const ul = line.match(/^\s*[-*]\s+(.*)$/);
    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (ul) {
      if (listType !== "ul") { closeList(); html += "<ul>"; listType = "ul"; }
      html += `<li>${inline(ul[1])}</li>`;
      i++; continue;
    }
    if (ol) {
      if (listType !== "ol") { closeList(); html += "<ol>"; listType = "ol"; }
      html += `<li>${inline(ol[1])}</li>`;
      i++; continue;
    }

    // paragraph (consume consecutive non-special lines)
    closeList();
    const buf = [line.trim()];
    i++;
    while (i < lines.length && lines[i].trim() &&
           !/^(#{1,4}\s|>|```|!\[|---+$|\s*[-*]\s|\s*\d+[.)]\s)/.test(lines[i])) {
      buf.push(lines[i].trim());
      i++;
    }
    html += `<p>${buf.map(inline).join("<br>")}</p>`;
  }

  closeList();
  if (inCode) html += `<pre class="code-block"><code>${esc(codeBuf.join("\n"))}</code></pre>`;
  return html;
}

/* ---------- cover with gradient fallback ---------- */
function coverStyle(post) {
  if (post.cover) {
    return `background-image:url('${post.cover}')`;
  }
  return `background-image:linear-gradient(135deg,#0C0F15 0%,#0d2420 45%,#134B39 100%)`;
}
