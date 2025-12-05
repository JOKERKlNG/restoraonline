const { sales } = require("./_sharedData");

function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

module.exports = (req, res) => {
  const { method } = req;

  if (method === "GET") {
    return sendJson(res, 200, sales);
  }

  if (method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { items, total } = JSON.parse(body || "{}");
        if (!Array.isArray(items) || typeof total !== "number") {
          return sendJson(res, 400, {
            error: "items (array) and total (number) are required",
          });
        }
        const sale = {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          timestamp: Date.now(),
          total,
          items,
        };
        sales.push(sale);
        return sendJson(res, 201, sale);
      } catch {
        return sendJson(res, 400, { error: "Invalid JSON body" });
      }
    });
    return;
  }

  res.statusCode = 405;
  res.setHeader("Allow", "GET,POST");
  res.end();
};


