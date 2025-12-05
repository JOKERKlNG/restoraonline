const STORAGE_KEYS = {
  // Kept for graceful fallback if backend is not reachable
  MENU: "restora_menu",
  REVIEWS: "restora_reviews",
  RESERVATIONS: "restora_reservations",
};

// Use a relative API base so it works from any host (localhost or LAN IP)
const API_BASE = "/api";

function withTimeout(ms, fetchPromise) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetchPromise(controller.signal).finally(() => clearTimeout(timer));
}

async function apiGet(path, fallbackFn) {
  try {
    const res = await withTimeout(500, (signal) =>
      fetch(`${API_BASE}${path}`, { signal })
    );
    if (!res.ok) throw new Error(`GET ${path} failed with ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`API GET ${path} failed, falling back to local storage`, err);
    return fallbackFn ? fallbackFn() : null;
  }
}

async function apiPost(path, body, fallbackFn) {
  try {
    const res = await withTimeout(700, (signal) =>
      fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal,
      })
    );
    if (!res.ok) throw new Error(`POST ${path} failed with ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`API POST ${path} failed, using local storage`, err);
    return fallbackFn ? fallbackFn() : null;
  }
}

async function apiDelete(path, fallbackFn) {
  try {
    const res = await withTimeout(500, (signal) =>
      fetch(`${API_BASE}${path}`, { method: "DELETE", signal })
    );
    if (!res.ok && res.status !== 204)
      throw new Error(`DELETE ${path} failed with ${res.status}`);
    return true;
  } catch (err) {
    console.warn(`API DELETE ${path} failed, using local storage`, err);
    return fallbackFn ? fallbackFn() : null;
  }
}

async function apiPatch(path, body, fallbackFn) {
  try {
    const res = await withTimeout(700, (signal) =>
      fetch(`${API_BASE}${path}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal,
      })
    );
    if (!res.ok) throw new Error(`PATCH ${path} failed with ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`API PATCH ${path} failed, using local storage`, err);
    return fallbackFn ? fallbackFn() : null;
  }
}

const CURRENT_USER_KEY = "RestoraCurrentUser";

const createId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

// Local default menu used only when backend is not reachable and local storage is empty
const defaultMenu = [
  {
    id: createId(),
    name: "Coq au Vin",
    price: 850,
    image:
      "https://raw.githubusercontent.com/JOKERKlNG/Restora/refs/heads/main/French%20Food%201.png",
    category: "Main Course",
  },
  {
    id: createId(),
    name: "Bouillabaisse",
    price: 1200,
    image:
      "https://raw.githubusercontent.com/JOKERKlNG/Restora/refs/heads/main/French%20Food%202.png",
    category: "Main Course",
  },
  {
    id: createId(),
    name: "Ratatouille",
    price: 650,
    image:
      "https://raw.githubusercontent.com/JOKERKlNG/Restora/refs/heads/main/French%20Food%203.png",
    category: "Vegetarian",
  },
  {
    id: createId(),
    name: "Escargot",
    price: 750,
    image:
      "https://raw.githubusercontent.com/JOKERKlNG/Restora/refs/heads/main/French%20Food%204.png",
    category: "Appetizer",
  },
  {
    id: createId(),
    name: "Crêpes",
    price: 450,
    image:
      "https://raw.githubusercontent.com/JOKERKlNG/Restora/refs/heads/main/French%20Food%205.png",
    category: "Dessert",
  },
  {
    id: createId(),
    name: "French Onion Soup",
    price: 420,
    image:
      "https://raw.githubusercontent.com/JOKERKlNG/Restora/refs/heads/main/French%20Food%206.png",
    category: "Soup",
  },
  {
    id: createId(),
    name: "Beef Bourguignon",
    price: 1100,
    image:
      "https://raw.githubusercontent.com/JOKERKlNG/Restora/refs/heads/main/French%20Food%207.png",
    category: "Main Course",
  },
];

const state = {
  menu: [],
  cart: new Map(),
  editingId: null,
  lastRenderedReviews: null, // Cache to prevent unnecessary re-renders
  isRenderingReviews: false, // Flag to prevent concurrent renders
};

const els = {
  menuList: document.querySelector("#menuList"),
  cartList: document.querySelector("#cartList"),
  cartEmptyState: document.querySelector("#cartEmptyState"),
  subtotal: document.querySelector("#billSubtotal"),
  tax: document.querySelector("#billTax"),
  total: document.querySelector("#billTotal"),
  payNowBtn: document.querySelector("#payNowBtn"),
  clearCartBtn: document.querySelector("#clearCartBtn"),
  paymentArea: document.querySelector("#paymentArea"),
  printBillBtn: document.querySelector("#printBillBtn"),
  manageBtn: document.querySelector("#manageMenuBtn"),
  modal: document.querySelector("#manageModal"),
  closeModalBtn: document.querySelector("#closeModalBtn"),
  deleteItemBtn: document.querySelector("#deleteItemBtn"),
  form: document.querySelector("#menuForm"),
  itemId: document.querySelector("#itemId"),
  itemName: document.querySelector("#itemName"),
  itemPrice: document.querySelector("#itemPrice"),
  itemImage: document.querySelector("#itemImage"),
  itemCategory: document.querySelector("#itemCategory"),
  billTemplate: document.querySelector("#billTemplate"),
  writeReviewBtn: document.querySelector("#writeReviewBtn"),
  reviewModal: document.querySelector("#reviewModal"),
  closeReviewModalBtn: document.querySelector("#closeReviewModalBtn"),
  reviewForm: document.querySelector("#reviewForm"),
  reviewItemId: document.querySelector("#reviewItemId"),
  reviewRating: document.querySelector("#reviewRating"),
  reviewerName: document.querySelector("#reviewerName"),
  reviewText: document.querySelector("#reviewText"),
  cancelReviewBtn: document.querySelector("#cancelReviewBtn"),
  reviewsList: document.querySelector("#reviewsList"),
  reviewsEmptyState: document.querySelector("#reviewsEmptyState"),
  starRating: document.querySelector("#starRating"),
  manageReviewsBtn: document.querySelector("#manageReviewsBtn"),
  manageReviewsModal: document.querySelector("#manageReviewsModal"),
  closeManageReviewsModalBtn: document.querySelector("#closeManageReviewsModalBtn"),
  manageReviewsList: document.querySelector("#manageReviewsList"),
  // User/profile
  userGreeting: document.querySelector("#userGreeting"),
  userNameDisplay: document.querySelector("#userNameDisplay"),
  userAvatarCircle: document.querySelector("#userAvatarCircle"),
  userAvatarInitials: document.querySelector("#userAvatarInitials"),
  openProfileBtn: document.querySelector("#openProfileBtn"),
  logoutBtn: document.querySelector("#logoutBtn"),
  profileModal: document.querySelector("#profileModal"),
  profileForm: document.querySelector("#profileForm"),
  profileName: document.querySelector("#profileName"),
  profileAvatarUrl: document.querySelector("#profileAvatarUrl"),
  profileEmail: document.querySelector("#profileEmail"),
  profileAvatarCircle: document.querySelector("#profileAvatarCircle"),
  profileAvatarInitials: document.querySelector("#profileAvatarInitials"),
  profileCancelBtn: document.querySelector("#profileCancelBtn"),
  closeProfileModalBtn: document.querySelector("#closeProfileModalBtn"),
  // Reservations
  reserveTableBtn: document.querySelector("#reserveTableBtn"),
  viewReservationsBtn: document.querySelector("#viewReservationsBtn"),
  reservationModal: document.querySelector("#reservationModal"),
  closeReservationModalBtn: document.querySelector("#closeReservationModalBtn"),
  reservationForm: document.querySelector("#reservationForm"),
  reservationName: document.querySelector("#reservationName"),
  reservationTime: document.querySelector("#reservationTime"),
  reservationGuests: document.querySelector("#reservationGuests"),
  reservationRequests: document.querySelector("#reservationRequests"),
  reservationMessage: document.querySelector("#reservationMessage"),
  cancelReservationBtn: document.querySelector("#cancelReservationBtn"),
  adminReservationsModal: document.querySelector("#adminReservationsModal"),
  closeAdminReservationsModalBtn: document.querySelector("#closeAdminReservationsModalBtn"),
  adminReservationsList: document.querySelector("#adminReservationsList"),
};

const printRoot = document.createElement("div");
printRoot.id = "printRoot";
document.body.appendChild(printRoot);

// Handle logout - clear current user and admin state, then go back to login page
if (els.logoutBtn) {
  els.logoutBtn.addEventListener("click", () => {
    try {
      localStorage.removeItem(CURRENT_USER_KEY);
    } catch (e) {
      console.warn("Unable to clear current user on logout", e);
    }
    try {
      localStorage.setItem("isAdmin", "false");
      sessionStorage.removeItem("isAdmin");
    } catch (e) {
      console.warn("Unable to clear admin status on logout", e);
    }
    // From "assests/main page/index.html" go back to the main login page at project root
    window.location.href = "../../index.html";
  });
}

function getCurrentUser() {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn("Unable to read current user", e);
    return null;
  }
}

function saveCurrentUser(user) {
  try {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } catch (e) {
    console.warn("Unable to save current user", e);
  }
}

function getInitials(name) {
  if (!name) return "R";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] || "";
  const second = parts[1]?.[0] || "";
  return (first + second).toUpperCase() || "R";
}

function applyUserToUI() {
  const user = getCurrentUser();
  const name = user?.name || "Guest";
  if (els.userGreeting) {
    els.userGreeting.textContent = user
      ? `Welcome, ${name}`
      : "Welcome to Restora";
  }
  if (els.userNameDisplay) {
    els.userNameDisplay.textContent = user ? name : "";
  }
  const initials = getInitials(name);
  if (els.userAvatarInitials) {
    els.userAvatarInitials.textContent = initials;
  }
  if (els.userAvatarCircle) {
    if (user?.avatarUrl) {
      els.userAvatarCircle.style.backgroundImage = `url('${user.avatarUrl}')`;
      els.userAvatarCircle.style.backgroundSize = "cover";
      els.userAvatarCircle.style.backgroundPosition = "center";
    } else {
      els.userAvatarCircle.style.backgroundImage = "none";
    }
  }
}


// Initialize - hide manage button by default, then check admin status
if (els.manageBtn) {
  els.manageBtn.style.display = "none";
}
if (els.manageReviewsBtn) {
  els.manageReviewsBtn.style.display = "none";
}

// Normalize admin flag once on load – if unset, default to "false"
try {
  const storedAdmin = localStorage.getItem("isAdmin");
  if (storedAdmin !== "true" && storedAdmin !== "false") {
    localStorage.setItem("isAdmin", "false");
  }
} catch (e) {
  console.warn("Could not normalize admin flag", e);
}

// Initial load – now async to prefer backend data when available
(async function init() {
  state.menu = await loadMenu();
  renderMenu();
  renderCart();
  renderReviews();
  applyUserToUI();

  // Check admin status after a small delay to ensure DOM is fully ready
  setTimeout(() => {
    checkAdminStatus();
  }, 100);

  // Also check immediately
  checkAdminStatus();
  
  // Set up periodic sync for all features (every 10 seconds) to catch changes from other devices
  // Increased interval to reduce flickering
  setInterval(() => {
    // Sync reviews (loadReviews will handle rendering if data changed)
    loadReviews().catch(err => {
      console.warn("Periodic review sync failed:", err);
    });
    
    // Sync menu
    loadMenu().then((menuData) => {
      if (JSON.stringify(state.menu.map(m => m.id)) !== JSON.stringify(menuData.map(m => m.id))) {
        state.menu = menuData;
        renderMenu();
      }
    }).catch(err => {
      console.warn("Periodic menu sync failed:", err);
    });
  }, 10000); // Increased to 10 seconds to reduce flickering
  
  // Sync when page becomes visible (user switches back to tab)
  // Debounced to prevent multiple rapid syncs
  let visibilitySyncTimeout = null;
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      // Debounce visibility sync
      if (visibilitySyncTimeout) {
        clearTimeout(visibilitySyncTimeout);
      }
      visibilitySyncTimeout = setTimeout(() => {
        // Page became visible - sync all data
        loadReviews().catch(err => {
          console.warn("Visibility change review sync failed:", err);
        });
        
        loadMenu().then((menuData) => {
          if (JSON.stringify(state.menu.map(m => m.id)) !== JSON.stringify(menuData.map(m => m.id))) {
            state.menu = menuData;
            renderMenu();
          }
        }).catch(err => {
          console.warn("Visibility change menu sync failed:", err);
        });
      }, 500); // 500ms debounce
    }
  });
  
  // Sync when window gains focus
  // Debounced to prevent multiple rapid syncs
  let focusSyncTimeout = null;
  window.addEventListener("focus", () => {
    if (focusSyncTimeout) {
      clearTimeout(focusSyncTimeout);
    }
    focusSyncTimeout = setTimeout(() => {
      loadReviews().catch(err => {
        console.warn("Focus review sync failed:", err);
      });
      
      loadMenu().then((menuData) => {
        if (JSON.stringify(state.menu.map(m => m.id)) !== JSON.stringify(menuData.map(m => m.id))) {
          state.menu = menuData;
          renderMenu();
        }
      }).catch(err => {
        console.warn("Focus menu sync failed:", err);
      });
    }, 500); // 500ms debounce
  });
})();

els.manageBtn.addEventListener("click", () => openModal());

if (els.openProfileBtn && els.profileModal && els.profileForm) {
  els.openProfileBtn.addEventListener("click", () => {
    const user = getCurrentUser();
    const name = user?.name || "Guest";
    if (els.profileName) els.profileName.value = name;
    if (els.profileAvatarUrl) els.profileAvatarUrl.value = user?.avatarUrl || "";
    if (els.profileEmail) els.profileEmail.textContent = user?.email || "Not logged in";
    if (els.profileAvatarInitials) {
      els.profileAvatarInitials.textContent = getInitials(name);
    }
    if (els.profileAvatarCircle) {
      if (user?.avatarUrl) {
        els.profileAvatarCircle.style.backgroundImage = `url('${user.avatarUrl}')`;
        els.profileAvatarCircle.style.backgroundSize = "cover";
        els.profileAvatarCircle.style.backgroundPosition = "center";
      } else {
        els.profileAvatarCircle.style.backgroundImage = "none";
      }
    }
    els.profileModal.classList.remove("hidden");
  });

  if (els.closeProfileModalBtn) {
    els.closeProfileModalBtn.addEventListener("click", () => {
      els.profileModal.classList.add("hidden");
    });
  }

  if (els.profileCancelBtn) {
    els.profileCancelBtn.addEventListener("click", () => {
      els.profileModal.classList.add("hidden");
    });
  }

  els.profileModal.addEventListener("click", (evt) => {
    if (evt.target === els.profileModal) {
      els.profileModal.classList.add("hidden");
    }
  });

  els.profileForm.addEventListener("submit", (evt) => {
    evt.preventDefault();
    const user = getCurrentUser();
    if (!user) {
      alert("Please log in again to update your profile.");
      return;
    }
    const newName = els.profileName.value.trim() || user.name || "Guest";
    const newAvatarUrl = els.profileAvatarUrl.value.trim();
    const updatedUser = { ...user, name: newName, avatarUrl: newAvatarUrl };
    saveCurrentUser(updatedUser);

    // Also update stored users list if present
    try {
      const users = JSON.parse(localStorage.getItem("RestoraUsers")) || [];
      const idx = users.findIndex((u) => u.email === user.email);
      if (idx !== -1) {
        users[idx] = { ...users[idx], name: newName, avatarUrl: newAvatarUrl };
        localStorage.setItem("RestoraUsers", JSON.stringify(users));
      }
    } catch (e) {
      console.warn("Unable to update stored users with profile changes", e);
    }

    applyUserToUI();
    els.profileModal.classList.add("hidden");
  });
}

// Review button event listener - handle if button exists
if (els.writeReviewBtn) {
  els.writeReviewBtn.addEventListener("click", () => openReviewModal());
}

if (els.manageReviewsBtn) {
  els.manageReviewsBtn.addEventListener("click", () => {
    renderManageReviewsList();
    openManageReviewsModal();
  });
}

if (els.closeManageReviewsModalBtn) {
  els.closeManageReviewsModalBtn.addEventListener("click", closeManageReviewsModal);
}

if (els.manageReviewsModal) {
  els.manageReviewsModal.addEventListener("click", (evt) => {
    if (evt.target === els.manageReviewsModal) closeManageReviewsModal();
  });
}

if (els.closeReviewModalBtn) {
  els.closeReviewModalBtn.addEventListener("click", closeReviewModal);
}

if (els.cancelReviewBtn) {
  els.cancelReviewBtn.addEventListener("click", closeReviewModal);
}

if (els.reviewModal) {
  els.reviewModal.addEventListener("click", (evt) => {
    if (evt.target === els.reviewModal) closeReviewModal();
  });
}

// Star rating interaction - will be set up when modal opens
function setupStarRating() {
  if (!els.starRating) return;
  
  // Remove existing listeners by cloning
  const newStarRating = els.starRating.cloneNode(true);
  els.starRating.parentNode.replaceChild(newStarRating, els.starRating);
  els.starRating = newStarRating;
  
  els.starRating.querySelectorAll(".star").forEach((star) => {
    star.addEventListener("click", () => {
      const rating = parseInt(star.dataset.rating);
      setStarRating(rating);
    });
    star.addEventListener("mouseenter", () => {
      const rating = parseInt(star.dataset.rating);
      highlightStars(rating);
    });
  });
  els.starRating.addEventListener("mouseleave", () => {
    const currentRating = parseInt(els.reviewRating.value) || 0;
    highlightStars(currentRating);
  });
}

if (els.reviewForm) {
  els.reviewForm.addEventListener("submit", async (evt) => {
    evt.preventDefault();
    
    if (!els.reviewItemId || !els.reviewRating || !els.reviewerName || !els.reviewText) {
      console.error("Review form elements not found");
      alert("Error: Review form not properly initialized. Please refresh the page.");
      return;
    }
    
    const reviewData = {
      id: createId(),
      itemId: els.reviewItemId.value,
      itemName: state.menu.find((item) => item.id === els.reviewItemId.value)?.name || "Unknown",
      rating: parseInt(els.reviewRating.value),
      reviewerName: els.reviewerName.value.trim(),
      text: els.reviewText.value.trim(),
      timestamp: Date.now(),
    };

    if (!reviewData.itemId || !reviewData.rating || reviewData.rating === 0 || !reviewData.reviewerName || !reviewData.text) {
      alert("Please fill in all fields and select a rating (1-5 stars).");
      return;
    }

    // Load reviews from localStorage (reliable source)
    const saved = localStorage.getItem(STORAGE_KEYS.REVIEWS);
    let reviews = [];
    if (saved) {
      try {
        reviews = JSON.parse(saved) || [];
        if (!Array.isArray(reviews)) {
          reviews = [];
        }
      } catch (e) {
        console.error("Failed to parse reviews:", e);
        reviews = [];
      }
    }
    
    // Add new review
    reviews.push(reviewData);
    
    // Save immediately to localStorage (reliable storage)
    try {
      localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(reviews));
      console.log("Review saved successfully to localStorage");
    } catch (e) {
      console.error("Failed to save review:", e);
      alert("Error: Could not save review. Please try again.");
      return;
    }
    
    // Sync to backend in background (non-blocking)
    saveReviews(reviews).catch(err => {
      console.warn("Background sync failed, but review is saved locally:", err);
    });
    
    // Clear cache and update UI immediately
    state.lastRenderedReviews = null;
    renderReviews();
    renderMenu(); // Update menu to show new ratings
    closeReviewModal();
  });
} else {
  console.warn("Review form not found");
}
els.closeModalBtn.addEventListener("click", closeModal);
els.modal.addEventListener("click", (evt) => {
  if (evt.target === els.modal) closeModal();
});

els.form.addEventListener("submit", (evt) => {
  evt.preventDefault();
  const formData = {
    id: els.itemId.value || createId(),
    name: els.itemName.value.trim(),
    price: Number(els.itemPrice.value),
    image: els.itemImage.value.trim() || getPlaceholderImage(),
    category: els.itemCategory.value.trim() || "Specials",
  };

  if (!formData.name || formData.price <= 0) return;

  const existingIndex = state.menu.findIndex((item) => item.id === formData.id);
  if (existingIndex >= 0) {
    state.menu[existingIndex] = formData;
  } else {
    state.menu.push(formData);
  }

  persistMenu();
  renderMenu();
  closeModal();
});

els.deleteItemBtn.addEventListener("click", () => {
  const id = els.itemId.value;
  if (!id) return;
  state.menu = state.menu.filter((item) => item.id !== id);
  persistMenu();
  renderMenu();
  closeModal();
});

els.clearCartBtn.addEventListener("click", () => {
  state.cart.clear();
  els.paymentArea.classList.add("hidden");
  renderCart();
});

els.payNowBtn.addEventListener("click", handlePayment);
els.printBillBtn.addEventListener("click", () => {
  window.print();
});

// Reservation event listeners
if (els.reserveTableBtn) {
  els.reserveTableBtn.addEventListener("click", openReservationModal);
}

if (els.closeReservationModalBtn) {
  els.closeReservationModalBtn.addEventListener("click", closeReservationModal);
}

if (els.cancelReservationBtn) {
  els.cancelReservationBtn.addEventListener("click", closeReservationModal);
}

if (els.reservationModal) {
  els.reservationModal.addEventListener("click", (evt) => {
    if (evt.target === els.reservationModal) {
      closeReservationModal();
    }
  });
}

if (els.reservationForm) {
  els.reservationForm.addEventListener("submit", async (evt) => {
    evt.preventDefault();
    if (!els.reservationName || !els.reservationTime || !els.reservationGuests) {
      alert("Please fill in all required fields.");
      return;
    }

    const user = getCurrentUser();
    const reservation = {
      id: createId(),
      name: els.reservationName.value.trim(),
      time: els.reservationTime.value,
      guests: Number(els.reservationGuests.value || 0),
      requests: els.reservationRequests ? els.reservationRequests.value.trim() : "",
      userEmail: user?.email || null,
      createdAt: Date.now(),
    };

    if (!reservation.name || !reservation.time || !reservation.guests) {
      alert("Please fill in all required fields.");
      return;
    }

    await saveReservation(reservation);

    if (els.reservationMessage) {
      els.reservationMessage.textContent = "Your table has been reserved successfully!";
      els.reservationMessage.classList.remove("hidden");
    }

    // Reset form but keep name
    const nameValue = els.reservationName.value;
    els.reservationForm.reset();
    els.reservationName.value = nameValue;

    // Close modal after 2 seconds
    setTimeout(() => {
      closeReservationModal();
    }, 2000);
  });
}

// Admin reservations event listeners
if (els.viewReservationsBtn) {
  els.viewReservationsBtn.addEventListener("click", openAdminReservationsModal);
}

if (els.closeAdminReservationsModalBtn) {
  els.closeAdminReservationsModalBtn.addEventListener("click", closeAdminReservationsModal);
}

if (els.adminReservationsModal) {
  els.adminReservationsModal.addEventListener("click", (evt) => {
    if (evt.target === els.adminReservationsModal) {
      closeAdminReservationsModal();
    }
  });
}

async function loadMenu() {
  // 1) Instant local/default menu
  let local = [];
  const saved = localStorage.getItem(STORAGE_KEYS.MENU);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length) {
        local = parsed;
      }
    } catch {
      console.warn("Failed to parse menu storage");
    }
  }
  if (!local.length) {
    local = [...defaultMenu];
    localStorage.setItem(STORAGE_KEYS.MENU, JSON.stringify(local));
  }

  // 2) Background refresh from backend to keep devices in sync
  // Backend is source of truth for menu items
  apiGet("/menu", () => null).then((serverMenu) => {
    if (Array.isArray(serverMenu)) {
      // Use backend as source of truth - sync deletions and additions
      localStorage.setItem(STORAGE_KEYS.MENU, JSON.stringify(serverMenu));
      state.menu = serverMenu;
      renderMenu();
    }
  }).catch(err => {
    console.warn("Menu sync failed (using local data):", err);
  });

  return local;
}

async function persistMenu() {
  // Sync changes to backend (using query param ids) and keep local copy
  try {
    const existing = await apiGet("/menu", () => []);
    const byId = new Map((existing || []).map((m) => [m.id, m]));
    for (const item of state.menu) {
      if (byId.has(item.id)) {
        await apiPatch(`/menu?id=${encodeURIComponent(item.id)}`, item, () => null);
      } else {
        await apiPost("/menu", item, () => null);
      }
    }
  } catch (e) {
    console.warn("Unable to sync menu to backend", e);
  }
  localStorage.setItem(STORAGE_KEYS.MENU, JSON.stringify(state.menu));
}

function isAdmin() {
  try {
    const localStorageAdmin = localStorage.getItem("isAdmin");
    const sessionStorageAdmin = sessionStorage.getItem("isAdmin");
    return localStorageAdmin === "true" || sessionStorageAdmin === "true";
  } catch (e) {
    return false;
  }
}

async function renderMenu() {
  if (!els.menuList) {
    console.error("Menu list element not found!");
    return;
  }
  
  if (!state.menu || state.menu.length === 0) {
    console.warn("Menu is empty!");
    els.menuList.innerHTML = "<p>No menu items available.</p>";
    return;
  }
  
  els.menuList.innerHTML = "";
  const reviews = await loadReviews();
  const adminLoggedIn = isAdmin();
  const currentUser = getCurrentUser();
  const favoriteIds = Array.isArray(currentUser?.favorites)
    ? new Set(currentUser.favorites)
    : new Set();
  
  // Load reviews from localStorage for menu ratings (reliable source)
  const reviewsSaved = localStorage.getItem(STORAGE_KEYS.REVIEWS);
  let reviewsForMenu = [];
  if (reviewsSaved) {
    try {
      reviewsForMenu = JSON.parse(reviewsSaved) || [];
      if (!Array.isArray(reviewsForMenu)) {
        reviewsForMenu = [];
      }
    } catch (e) {
      console.warn("Failed to parse reviews for menu:", e);
      reviewsForMenu = [];
    }
  }
  
  state.menu.forEach((item) => {
    const card = document.createElement("article");
    card.className = "menu-card";
    
    // Calculate average rating for this item
    const itemReviews = reviewsForMenu.filter((r) => r.itemId === item.id);
    const avgRating = itemReviews.length > 0
      ? itemReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / itemReviews.length
      : 0;
    const ratingStars = avgRating > 0 ? getRatingStars(avgRating) : '';
    const isFavorite = favoriteIds.has(item.id);
    
    card.innerHTML = `
      <img src="${item.image}" alt="${item.name}" />
      <h3>${item.name}</h3>
      <p>${item.category}</p>
      <strong>₹${item.price}</strong>
      ${avgRating > 0 ? `<div class="item-rating">${ratingStars} <span class="rating-value">(${avgRating.toFixed(1)})</span></div>` : ''}
      <div class="menu-actions">
        <button class="btn primary" data-action="add">Add</button>
        <button class="icon-btn favorite-btn ${isFavorite ? "favorite-btn--active" : ""}" data-action="favorite" aria-label="Add to favourites">
          ${isFavorite ? "♥" : "♡"}
        </button>
        ${adminLoggedIn ? '<button class="btn ghost" data-action="edit">Edit</button>' : ''}
      </div>
    `;
    card.querySelector('[data-action="add"]').addEventListener("click", () =>
      addToCart(item.id)
    );
    const favBtn = card.querySelector('[data-action="favorite"]');
    if (favBtn) {
      favBtn.addEventListener("click", () => toggleFavorite(item.id));
    }
    const editBtn = card.querySelector('[data-action="edit"]');
    if (editBtn) {
      editBtn.addEventListener("click", () =>
        openModal(item.id)
      );
    }
    els.menuList.appendChild(card);
  });
}

function toggleFavorite(itemId) {
  const user = getCurrentUser();
  if (!user || !user.email) {
    alert("Please log in to save favourites.");
    return;
  }

  const favourites = Array.isArray(user.favorites) ? [...user.favorites] : [];
  const idx = favourites.indexOf(itemId);
  if (idx === -1) {
    favourites.push(itemId);
  } else {
    favourites.splice(idx, 1);
  }

  const updatedUser = { ...user, favorites: favourites };
  saveCurrentUser(updatedUser);

  // Also update stored users list if present
  try {
    const users = JSON.parse(localStorage.getItem("RestoraUsers")) || [];
    const userIndex = users.findIndex((u) => u.email === user.email);
    if (userIndex !== -1) {
      users[userIndex] = { ...users[userIndex], favorites: favourites };
      localStorage.setItem("RestoraUsers", JSON.stringify(users));
    }
  } catch (e) {
    console.warn("Unable to sync favourites to stored users", e);
  }

  // Re-render menu so favourite state updates
  renderMenu();
}

function addToCart(id) {
  const item = state.menu.find((menuItem) => menuItem.id === id);
  if (!item) return;
  const existing = state.cart.get(id) || { ...item, qty: 0 };
  existing.qty += 1;
  state.cart.set(id, existing);
  renderCart();
}

function renderCart() {
  const entries = Array.from(state.cart.values());
  if (!entries.length) {
    els.cartEmptyState.classList.remove("hidden");
    els.cartList.innerHTML = "";
  } else {
    els.cartEmptyState.classList.add("hidden");
    els.cartList.innerHTML = entries
      .map(
        (item) => `
        <div class="cart-item">
          <div>
            <span>${item.name}</span>
            <small>₹${item.price} × ${item.qty}</small>
          </div>
          <div>
            <button class="icon-btn" data-action="dec" data-id="${item.id}">−</button>
            <button class="icon-btn" data-action="inc" data-id="${item.id}">+</button>
          </div>
        </div>
      `
      )
      .join("");
    els.cartList
      .querySelectorAll("button")
      .forEach((btn) =>
        btn.addEventListener("click", () =>
          updateCartQuantity(btn.dataset.id, btn.dataset.action)
        )
      );
  }
  updateBill(entries);
}

function updateCartQuantity(id, action) {
  const entry = state.cart.get(id);
  if (!entry) return;
  if (action === "inc") entry.qty += 1;
  if (action === "dec") entry.qty -= 1;
  if (entry.qty <= 0) state.cart.delete(id);
  renderCart();
}

function updateBill(entries) {
  const subtotal = entries.reduce(
    (sum, item) => sum + item.price * item.qty,
    0
  );
  const tax = subtotal * 0.05;
  const total = subtotal + tax;
  els.subtotal.textContent = formatCurrency(subtotal);
  els.tax.textContent = formatCurrency(tax);
  els.total.textContent = formatCurrency(total);
}

function handlePayment() {
  if (!state.cart.size) return;
  const entries = Array.from(state.cart.values());
  const subtotal = entries.reduce(
    (sum, item) => sum + item.price * item.qty,
    0
  );
  const total = subtotal * 1.05;
  populatePrintArea(entries, total);
  els.paymentArea.classList.remove("hidden");
  state.cart.clear();
  renderCart();
}


function openModal(id) {
  if (id) {
    const item = state.menu.find((menuItem) => menuItem.id === id);
    if (!item) return;
    els.itemId.value = item.id;
    els.itemName.value = item.name;
    els.itemPrice.value = item.price;
    els.itemImage.value = item.image;
    els.itemCategory.value = item.category;
    els.deleteItemBtn.disabled = false;
  } else {
    els.form.reset();
    els.itemId.value = "";
    els.itemImage.value = "";
    els.deleteItemBtn.disabled = true;
  }
  els.modal.classList.remove("hidden");
}

function closeModal() {
  els.modal.classList.add("hidden");
}

function getPlaceholderImage() {
  return "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=60";
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(value);
}

function populatePrintArea(entries, total) {
  printRoot.innerHTML = "";
  const clone = els.billTemplate.content.cloneNode(true);
  const itemsBody = clone.querySelector("#billItems");
  const subtotal = entries.reduce(
    (sum, item) => sum + item.price * item.qty,
    0
  );
  const tax = subtotal * 0.05;
  const grandTotal = subtotal + tax;
  entries.forEach((entry) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${entry.name}</td>
      <td>${entry.qty}</td>
      <td>${formatCurrency(entry.price * entry.qty)}</td>
    `;
    itemsBody.appendChild(row);
  });
  const subtotalEl = clone.querySelector("#billSubtotalPrint");
  const taxEl = clone.querySelector("#billTaxPrint");
  const totalEl = clone.querySelector("#billTotalPrint");
  if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotal);
  if (taxEl) taxEl.textContent = formatCurrency(tax);
  if (totalEl) totalEl.textContent = formatCurrency(grandTotal);
  clone.querySelector(
    "#billTimestamp"
  ).textContent = `Date: ${new Date().toLocaleString()}`;
  printRoot.appendChild(clone);
}


// Reservation functions
async function loadReservations() {
  const raw = localStorage.getItem(STORAGE_KEYS.RESERVATIONS);
  let local = [];
  if (raw) {
    try {
      local = JSON.parse(raw) || [];
      if (!Array.isArray(local)) {
        local = [];
      }
    } catch {
      local = [];
    }
  }

  // Background refresh from backend
  apiGet("/reservations", () => null).then((serverData) => {
    if (Array.isArray(serverData)) {
      localStorage.setItem(STORAGE_KEYS.RESERVATIONS, JSON.stringify(serverData));
      if (isAdmin() && els.adminReservationsModal && !els.adminReservationsModal.classList.contains("hidden")) {
        renderAdminReservations();
      }
    }
  }).catch(err => {
    console.warn("Reservation sync failed (using local data):", err);
  });

  return local;
}

async function saveReservation(reservation) {
  // Save to backend first
  await apiPost("/reservations", reservation, () => {
    console.warn("Backend reservation save failed");
    return null;
  });
  
  // Also save to local storage
  const saved = localStorage.getItem(STORAGE_KEYS.RESERVATIONS);
  let local = [];
  if (saved) {
    try {
      local = JSON.parse(saved) || [];
      if (!Array.isArray(local)) {
        local = [];
      }
    } catch {
      local = [];
    }
  }
  local.push(reservation);
  localStorage.setItem(STORAGE_KEYS.RESERVATIONS, JSON.stringify(local));
}

function openReservationModal() {
  if (!els.reservationModal || !els.reservationForm) return;
  
  // Prefill name from current user if available
  const currentUser = getCurrentUser();
  if (currentUser && els.reservationName) {
    els.reservationName.value = currentUser.name || "";
  }
  
  // Reset form
  els.reservationForm.reset();
  if (currentUser && els.reservationName) {
    els.reservationName.value = currentUser.name || "";
  }
  if (els.reservationMessage) {
    els.reservationMessage.classList.add("hidden");
    els.reservationMessage.textContent = "";
  }
  
  els.reservationModal.classList.remove("hidden");
}

function closeReservationModal() {
  if (els.reservationModal) {
    els.reservationModal.classList.add("hidden");
  }
}

async function renderAdminReservations() {
  if (!els.adminReservationsList) return;

  const reservations = await loadReservations();
  if (!reservations.length) {
    els.adminReservationsList.innerHTML =
      '<p class="empty-state">No reservations yet.</p>';
    return;
  }

  const sorted = [...reservations].sort(
    (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
  );

  els.adminReservationsList.innerHTML = sorted
    .map((res) => {
      const created = res.createdAt
        ? new Date(res.createdAt).toLocaleString()
        : "–";
      const time = res.time || "–";
      const guests = res.guests || 0;
      const requests = res.requests || "None";

      return `
        <article class="admin-res-card">
          <header class="admin-res-header">
            <div>
              <h3>${escapeHtml(res.name || "Guest")}</h3>
              <p>Time: ${time} · Guests: ${guests}</p>
            </div>
          </header>
          <div class="admin-res-body">
            <p><strong>Special Requests:</strong> ${escapeHtml(requests)}</p>
            ${res.userEmail ? `<p><strong>Email:</strong> ${escapeHtml(res.userEmail)}</p>` : ""}
          </div>
          <footer class="admin-res-footer">
            <span class="admin-res-created">Reserved: ${created}</span>
          </footer>
        </article>
      `;
    })
    .join("");
}

function openAdminReservationsModal() {
  if (!els.adminReservationsModal) return;
  renderAdminReservations();
  els.adminReservationsModal.classList.remove("hidden");
}

function closeAdminReservationsModal() {
  if (els.adminReservationsModal) {
    els.adminReservationsModal.classList.add("hidden");
  }
}

function checkAdminStatus() {
  if (!els.manageBtn) {
    console.warn("Manage button not found");
    return;
  }
  
  // Check admin status from storage only (login page controls this)
  let localStorageAdmin = null;
  let sessionStorageAdmin = null;
  try {
    localStorageAdmin = localStorage.getItem("isAdmin");
  } catch (e) {
    console.warn("localStorage not available:", e);
  }
  try {
    sessionStorageAdmin = sessionStorage.getItem("isAdmin");
  } catch (e) {
    console.warn("sessionStorage not available:", e);
  }
  
  const isAdminUser =
    localStorageAdmin === "true" || sessionStorageAdmin === "true";
  
  if (isAdminUser) {
    els.manageBtn.style.display = "inline-block";
    els.manageBtn.style.visibility = "visible";
    els.manageBtn.style.opacity = "1";
    if (els.manageReviewsBtn) {
      els.manageReviewsBtn.style.display = "inline-flex";
    }
    if (els.viewReservationsBtn) {
      els.viewReservationsBtn.style.display = "inline-block";
    }
  } else {
    els.manageBtn.style.display = "none";
    if (els.manageReviewsBtn) {
      els.manageReviewsBtn.style.display = "none";
    }
    if (els.viewReservationsBtn) {
      els.viewReservationsBtn.style.display = "none";
    }
  }
  
  // Re-render menu to show/hide Edit buttons based on admin status
  renderMenu();
}

// Reviews functionality - RELIABLE VERSION: localStorage is source of truth
async function loadReviews() {
  // ALWAYS use localStorage as primary source - most reliable
  const saved = localStorage.getItem(STORAGE_KEYS.REVIEWS);
  let local = [];
  if (saved) {
    try {
      local = JSON.parse(saved) || [];
      // Ensure it's an array
      if (!Array.isArray(local)) {
        local = [];
      }
    } catch (e) {
      console.warn("Failed to parse reviews from localStorage:", e);
      local = [];
    }
  }

  // Background sync: Use backend as source of truth for deletions
  // Backend has the authoritative list - sync deletions and additions
  apiGet("/reviews", () => null).then((backendReviews) => {
    if (Array.isArray(backendReviews)) {
      // Backend is source of truth - use it to sync deletions
      // Create a map of backend review IDs
      const backendIds = new Set(backendReviews.map(r => r.id));
      
      // Start with backend reviews (authoritative)
      const merged = [...backendReviews];
      
      // Add any local reviews that don't exist in backend (pending sync)
      const localMap = new Map(local.map(r => [r.id, r]));
      local.forEach(localReview => {
        if (!backendIds.has(localReview.id)) {
          // This review exists locally but not in backend - might be pending sync
          // But if backend is working, it means it was deleted, so we trust backend
          // Only keep if it's very recent (within last 10 seconds) - might be pending
          const isRecent = localReview.timestamp && (Date.now() - localReview.timestamp < 10000);
          if (isRecent) {
            merged.push(localReview);
          }
        }
      });
      
      // Sort by timestamp
      merged.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      
      // Check if data actually changed before updating
      const currentData = JSON.stringify(local.map(r => r.id).sort());
      const newData = JSON.stringify(merged.map(r => r.id).sort());
      const dataChanged = currentData !== newData;
      
      if (dataChanged) {
        // Only update localStorage if data actually changed
        localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(merged));
        
        // Only re-render if not already rendering (prevents flickering)
        if (!state.isRenderingReviews) {
          renderReviews();
          renderMenu();
        }
      }
    }
  }).catch(err => {
    // If backend fails, keep using local data
    console.warn("Background review sync failed (using local data):", err);
  });

  return local;
}

async function saveReviews(reviews) {
  // CRITICAL: Save to localStorage FIRST - this is our source of truth
  // Ensure reviews is a valid array
  if (!Array.isArray(reviews)) {
    console.error("saveReviews: reviews is not an array", reviews);
    return;
  }
  
  // Save immediately to localStorage - this is the reliable storage
  try {
    localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(reviews));
    console.log("Reviews saved to localStorage:", reviews.length, "reviews");
  } catch (e) {
    console.error("Failed to save reviews to localStorage:", e);
    // This is critical - if localStorage fails, we have a problem
    alert("Warning: Could not save review. Please try again.");
    return;
  }
  
    // Sync to backend - ensure it completes for proper multi-device sync
  const last = reviews[reviews.length - 1];
  if (last) {
    apiPost("/reviews", last, () => {
      console.warn("Backend sync failed, but review is saved locally");
      return null;
    }).then(() => {
      console.log("Review synced to backend successfully");
      // After successful sync, refresh from backend to get any updates
      // Clear cache to force re-render
      state.lastRenderedReviews = null;
      setTimeout(() => {
        loadReviews();
      }, 300);
    }).catch(err => {
      console.warn("Background backend sync failed (review is still saved locally):", err);
    });
  }
}

async function renderReviews() {
  // Prevent concurrent renders to avoid flickering
  if (state.isRenderingReviews) {
    return;
  }
  
  state.isRenderingReviews = true;
  
  try {
    // Load reviews synchronously from localStorage (reliable source)
    const saved = localStorage.getItem(STORAGE_KEYS.REVIEWS);
    let reviews = [];
    if (saved) {
      try {
        reviews = JSON.parse(saved) || [];
        if (!Array.isArray(reviews)) {
          reviews = [];
        }
      } catch (e) {
        console.error("Failed to parse reviews for rendering:", e);
        reviews = [];
      }
    }
    
    // Sort reviews by timestamp
    reviews.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    
    // Check if data actually changed to prevent unnecessary re-renders
    const reviewsKey = JSON.stringify(reviews.map(r => ({ id: r.id, timestamp: r.timestamp })));
    if (state.lastRenderedReviews === reviewsKey) {
      // Data hasn't changed, skip render
      state.isRenderingReviews = false;
      return;
    }
    
    // Update cache
    state.lastRenderedReviews = reviewsKey;
    
    if (!reviews.length) {
      els.reviewsEmptyState.classList.remove("hidden");
      els.reviewsList.innerHTML = "";
      renderManageReviewsList();
      state.isRenderingReviews = false;
      return;
    }

    els.reviewsEmptyState.classList.add("hidden");
    
    // Build HTML
    const reviewsHtml = reviews
      .map((review) => {
        const stars = getRatingStars(review.rating);
        const date = review.timestamp 
          ? new Date(review.timestamp).toLocaleDateString("en-IN", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "Recently";
        return `
          <article class="review-card">
            <div class="review-header">
              <div class="reviewer-info">
                <div class="reviewer-name">${escapeHtml(review.reviewerName || "Anonymous")}</div>
                <div class="review-item-name">${escapeHtml(review.itemName || "Unknown Item")}</div>
                <div class="review-rating-display">
                  <div class="stars">${stars}</div>
                  <span>${review.rating || 0}/5</span>
                </div>
              </div>
            </div>
            <div class="review-text">${escapeHtml(review.text || "")}</div>
            <div class="review-date">${date}</div>
          </article>
        `;
      })
      .join("");

    // Update DOM in one operation to prevent flickering
    els.reviewsList.innerHTML = reviewsHtml;

    renderManageReviewsList();
  } catch (err) {
    console.error("Error rendering reviews:", err);
  } finally {
    state.isRenderingReviews = false;
  }
}

function openReviewModal() {
  if (!els.reviewModal || !els.reviewForm || !els.reviewItemId) {
    console.error("Review modal elements not found");
    return;
  }
  
  // Populate item dropdown
  els.reviewItemId.innerHTML = '<option value="">Choose an item...</option>';
  state.menu.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.name;
    els.reviewItemId.appendChild(option);
  });
  
  // Reset form
  els.reviewForm.reset();
  els.reviewRating.value = "0";
  highlightStars(0);
  els.reviewModal.classList.remove("hidden");
  
  // Setup star rating after modal is visible
  setTimeout(() => {
    setupStarRating();
  }, 100);
}

function closeReviewModal() {
  els.reviewModal.classList.add("hidden");
}

function setStarRating(rating) {
  els.reviewRating.value = rating;
  highlightStars(rating);
}

function highlightStars(rating) {
  els.starRating.querySelectorAll(".star").forEach((star, index) => {
    if (index < rating) {
      star.classList.add("active", "filled");
    } else {
      star.classList.remove("active", "filled");
    }
  });
}

function getRatingStars(rating) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  let starsHtml = "";
  
  for (let i = 0; i < fullStars; i++) {
    starsHtml += '<span>⭐</span>';
  }
  if (hasHalfStar && fullStars < 5) {
    starsHtml += '<span>⭐</span>'; // Using full star for simplicity
  }
  for (let i = fullStars + (hasHalfStar ? 1 : 0); i < 5; i++) {
    starsHtml += '<span style="filter: grayscale(100%) opacity(0.3);">⭐</span>';
  }
  
  return starsHtml;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function openManageReviewsModal() {
  if (!els.manageReviewsModal) return;
  els.manageReviewsModal.classList.remove("hidden");
}

function closeManageReviewsModal() {
  if (!els.manageReviewsModal) return;
  els.manageReviewsModal.classList.add("hidden");
}

async function renderManageReviewsList() {
  if (!els.manageReviewsList) return;
  
  // Load from localStorage directly (reliable source)
  const saved = localStorage.getItem(STORAGE_KEYS.REVIEWS);
  let reviews = [];
  if (saved) {
    try {
      reviews = JSON.parse(saved) || [];
      if (!Array.isArray(reviews)) {
        reviews = [];
      }
    } catch (e) {
      console.error("Failed to parse reviews for manage list:", e);
      reviews = [];
    }
  }

  if (!reviews.length) {
    els.manageReviewsList.innerHTML =
      '<p class="empty-state">No reviews to manage.</p>';
    return;
  }

  els.manageReviewsList.innerHTML = reviews
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .map((review) => {
      const date = review.timestamp 
        ? new Date(review.timestamp).toLocaleString()
        : "Recently";
      return `
        <article class="manage-review-item">
          <header>
            <div>
              <strong>${escapeHtml(review.reviewerName || "Anonymous")}</strong>
              <div>${escapeHtml(review.itemName || "Unknown Item")}</div>
            </div>
            <span>${review.rating || 0}/5</span>
          </header>
          <p>${escapeHtml(review.text || "")}</p>
          <small>${date}</small>
          <button class="btn ghost" data-action="delete-review" data-id="${review.id}">
            Remove Review
          </button>
        </article>
      `;
    })
    .join("");

  els.manageReviewsList
    .querySelectorAll('[data-action="delete-review"]')
    .forEach((btn) =>
      btn.addEventListener("click", () => {
        deleteReview(btn.dataset.id);
      })
    );
}

async function deleteReview(id) {
  if (!id) return;
  
  // Load from localStorage (reliable source)
  const saved = localStorage.getItem(STORAGE_KEYS.REVIEWS);
  let reviews = [];
  if (saved) {
    try {
      reviews = JSON.parse(saved) || [];
      if (!Array.isArray(reviews)) {
        reviews = [];
      }
    } catch (e) {
      console.error("Failed to parse reviews for deletion:", e);
      reviews = [];
    }
  }
  
  // Remove the review
  reviews = reviews.filter((review) => review.id !== id);
  
  // Save immediately to localStorage (reliable storage)
  try {
    localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(reviews));
    console.log("Review deleted from localStorage");
  } catch (e) {
    console.error("Failed to delete review from localStorage:", e);
    alert("Error: Could not delete review. Please try again.");
    return;
  }
  
    // Sync deletion to backend - wait for it to complete to ensure sync
  apiDelete(`/reviews?id=${encodeURIComponent(id)}`, () => {
    console.warn("Backend deletion sync failed, but review is deleted locally");
    return null;
  }).then(() => {
    console.log("Review deletion synced to backend successfully");
    // After successful deletion, trigger a sync to update from backend
    // Clear cache to force re-render
    state.lastRenderedReviews = null;
    setTimeout(() => {
      loadReviews();
    }, 300);
  }).catch(err => {
    console.warn("Background backend deletion sync failed (review is still deleted locally):", err);
  });
  
  // Clear cache and update UI immediately
  state.lastRenderedReviews = null;
  renderReviews();
  renderManageReviewsList();
}

// Make checkAdminStatus available globally for testing
window.checkAdminStatus = checkAdminStatus;

// Debug function to check all admin sources
window.debugAdmin = function() {
  console.log("=== DEBUG ADMIN STATUS ===");
  console.log("Current URL:", window.location.href);
  console.log("URL search:", window.location.search);
  
  try {
    const urlParams = new URLSearchParams(window.location.search);
    console.log("URL param admin:", urlParams.get("admin"));
  } catch (e) {
    console.log("URL param error:", e);
  }
  
  try {
    console.log("localStorage isAdmin:", localStorage.getItem("isAdmin"));
  } catch (e) {
    console.log("localStorage error:", e);
  }
  
  try {
    console.log("sessionStorage isAdmin:", sessionStorage.getItem("isAdmin"));
  } catch (e) {
    console.log("sessionStorage error:", e);
  }
  
  console.log("Button element:", els.manageBtn);
  console.log("Button display:", els.manageBtn ? window.getComputedStyle(els.manageBtn).display : "not found");
  
  // Force set admin if needed
  console.log("\n💡 To force admin mode, run:");
  console.log("localStorage.setItem('isAdmin', 'true'); sessionStorage.setItem('isAdmin', 'true'); checkAdminStatus();");
};

