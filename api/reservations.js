const { reservations, createId } = require("./_sharedData");

function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

module.exports = (req, res) => {
  const { method } = req;

  if (method === "GET") {
    return sendJson(res, 200, reservations);
  }

  if (method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        const {
          id,
          name,
          phone,
          guests,
          date,
          time,
          occasion,
          notes,
          userEmail,
        } = payload;

        if (!name || !phone || !guests || !date || !time) {
          return sendJson(res, 400, {
            error: "name, phone, guests, date and time are required for a reservation",
          });
        }

        const reservation = {
          id: id || createId(),
          name,
          phone,
          guests: Number(guests),
          date,
          time,
          occasion: occasion || "",
          notes: notes || "",
          userEmail: userEmail || null,
          createdAt: Date.now(),
          status: "pending",
        };
        reservations.push(reservation);
        return sendJson(res, 201, reservation);
      } catch {
        return sendJson(res, 400, { error: "Invalid JSON body" });
      }
    });
    return;
  }

  if (method === "PATCH") {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const id = url.searchParams.get("id");
    if (!id) return sendJson(res, 400, { error: "id query parameter is required" });

    const idx = reservations.findIndex((r) => r.id === id);
    if (idx === -1) return sendJson(res, 404, { error: "Reservation not found" });

    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { status } = JSON.parse(body || "{}");
        if (!["pending", "approved", "rejected"].includes(status)) {
          return sendJson(res, 400, {
            error: "status must be pending, approved or rejected",
          });
        }
        reservations[idx] = { ...reservations[idx], status };
        return sendJson(res, 200, reservations[idx]);
      } catch {
        return sendJson(res, 400, { error: "Invalid JSON body" });
      }
    });
    return;
  }

  if (method === "DELETE") {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const id = url.searchParams.get("id");

    if (id) {
      const idx = reservations.findIndex((r) => r.id === id);
      if (idx === -1) return sendJson(res, 404, { error: "Reservation not found" });
      reservations.splice(idx, 1);
    } else {
      // Clear all reservations
      reservations.length = 0;
    }

    res.statusCode = 204;
    return res.end();
  }

  res.statusCode = 405;
  res.setHeader("Allow", "GET,POST,PATCH,DELETE");
  res.end();
};


