const { menu, createId } = require("./_sharedData");

function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

module.exports = (req, res) => {
  const { method } = req;

  if (method === "GET") {
    return sendJson(res, 200, menu);
  }

  if (method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { id, name, price, image, category } = JSON.parse(body || "{}");
        if (!name || !price) {
          return sendJson(res, 400, { error: "name and price are required" });
        }
        const item = {
          id: id || createId(),
          name,
          price,
          image:
            image ||
            "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=60",
          category: category || "Specials",
        };
        menu.push(item);
        return sendJson(res, 201, item);
      } catch (e) {
        return sendJson(res, 400, { error: "Invalid JSON body" });
      }
    });
    return;
  }

  // Update / delete specific item via query ?id=...
  if (method === "PUT" || method === "DELETE") {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const id = url.searchParams.get("id");
    if (!id) return sendJson(res, 400, { error: "id query parameter is required" });

    const idx = menu.findIndex((m) => m.id === id);
    if (idx === -1) return sendJson(res, 404, { error: "Menu item not found" });

    if (method === "DELETE") {
      menu.splice(idx, 1);
      res.statusCode = 204;
      return res.end();
    }

    // PUT
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const patch = JSON.parse(body || "{}");
        const existing = menu[idx];
        const updated = { ...existing, ...patch, id: existing.id };
        menu[idx] = updated;
        return sendJson(res, 200, updated);
      } catch {
        return sendJson(res, 400, { error: "Invalid JSON body" });
      }
    });
    return;
  }

  res.statusCode = 405;
  res.setHeader("Allow", "GET,POST,PUT,DELETE");
  res.end();
};


