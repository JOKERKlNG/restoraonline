const { reviews, createId, menu } = require("./_sharedData");

function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

module.exports = (req, res) => {
  const { method } = req;

  if (method === "GET") {
    return sendJson(res, 200, reviews);
  }

  if (method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { id, itemId, rating, reviewerName, text } = JSON.parse(body || "{}");
        if (!itemId || !rating || !reviewerName || !text) {
          return sendJson(res, 400, {
            error: "itemId, rating, reviewerName and text are required",
          });
        }
        const item = menu.find((m) => m.id === itemId);
        const review = {
          id: id || createId(),
          itemId,
          itemName: item?.name || "Unknown",
          rating: Number(rating),
          reviewerName,
          text,
          timestamp: Date.now(),
        };
        reviews.push(review);
        return sendJson(res, 201, review);
      } catch {
        return sendJson(res, 400, { error: "Invalid JSON body" });
      }
    });
    return;
  }

  if (method === "DELETE") {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const id = url.searchParams.get("id");
    if (!id) return sendJson(res, 400, { error: "id query parameter is required" });

    const idx = reviews.findIndex((r) => r.id === id);
    if (idx === -1) return sendJson(res, 404, { error: "Review not found" });
    reviews.splice(idx, 1);
    res.statusCode = 204;
    return res.end();
  }

  res.statusCode = 405;
  res.setHeader("Allow", "GET,POST,DELETE");
  res.end();
};


