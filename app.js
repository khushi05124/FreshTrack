/* =====================================
   FRESHTRACK - FIREBASE CONFIGURATION
   ===================================== */

const firebaseConfig = {
  apiKey: "AIzaSyAtu4TV1kZup3lsIHskl9mw_sNU5LAVhh4",
  authDomain: "freshtrack-defb1.firebaseapp.com",
  databaseURL: "https://freshtrack-defb1-default-rtdb.firebaseio.com",
  projectId: "freshtrack-defb1",
  storageBucket: "freshtrack-defb1.firebasestorage.app",
  messagingSenderId: "634639118442",
  appId: "1:634639118442:web:7bd8ccc68659f0e9ec5a13"
};

firebase.initializeApp(firebaseConfig);

const database = firebase.database();
const auth = firebase.auth();

let foodRef = null;
let foods = [];
let editingId = null;
let databaseReady = false;
let busy = false;

/* =====================================
   HTML ELEMENTS
   ===================================== */

// Authentication
const authSection = document.getElementById("authSection");
const appSection = document.getElementById("appSection");

const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");

const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");

const signupEmail = document.getElementById("signupEmail");
const signupPassword = document.getElementById("signupPassword");

const loginMessage = document.getElementById("loginMessage");
const signupMessage = document.getElementById("signupMessage");

const showSignup = document.getElementById("showSignup");
const showLogin = document.getElementById("showLogin");
const logoutButton = document.getElementById("logoutButton");

// Food form
const foodForm = document.getElementById("foodForm");
const foodName = document.getElementById("foodName");
const category = document.getElementById("category");
const quantity = document.getElementById("quantity");
const unit = document.getElementById("unit");
const purchaseDate = document.getElementById("purchaseDate");
const expiryDate = document.getElementById("expiryDate");

const saveButton = document.getElementById("saveButton");
const cancelButton = document.getElementById("cancelButton");
const formHeading = document.getElementById("formHeading");
const formMessage = document.getElementById("formMessage");

// Inventory
const foodList = document.getElementById("foodList");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const loadingMessage = document.getElementById("loadingMessage");
const emptyMessage = document.getElementById("emptyMessage");

/* =====================================
   PAGE NAVIGATION
   ===================================== */

const navLinks = document.querySelectorAll(".nav-link");

const pages = document.querySelectorAll(".page-section");

function showPage(pageId) {
  pages.forEach(page => {
    page.classList.toggle("hidden", page.id !== pageId);
  });

  navLinks.forEach(link => {
    link.classList.toggle(
      "active",
      link.dataset.page === pageId
    );
  });
}

navLinks.forEach(link => {
  link.addEventListener("click", () => {
    showPage(link.dataset.page);
  });
});

/* =====================================
   DATE FUNCTIONS
   ===================================== */

// Get today's date in YYYY-MM-DD format.
function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Default purchase date.
purchaseDate.value = localDateString();

// Calculate remaining days.
function getDaysLeft(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);

  const expiry = new Date(year, month - 1, day);
  const today = new Date();

  expiry.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return Math.round(
    (expiry.getTime() - today.getTime()) / 86400000
  );
}

// Find food status.
function getStatus(dateString) {
  const daysLeft = getDaysLeft(dateString);

  if (daysLeft < 0) {
    return {
      label: "Expired",
      css: "expired"
    };
  }

  if (daysLeft <= 3) {
    return {
      label: "Expiring Soon",
      css: "soon"
    };
  }

  return {
    label: "Fresh",
    css: "fresh"
  };
}

/* =====================================
   FORM MESSAGE
   ===================================== */

function showMessage(message, type = "") {
  formMessage.textContent = message;
  formMessage.className = "message" + (type ? ` ${type}` : "");
}

/* =====================================
   RESET FORM
   ===================================== */

function resetForm() {
  editingId = null;

  foodForm.reset();

  purchaseDate.value = localDateString();

  formHeading.textContent = "➕ Add Food Item";
  saveButton.textContent = "Add Food Item";

  cancelButton.classList.add("hidden");
}

/* =====================================
   BUSY STATE
   ===================================== */

function setBusy(value) {
  busy = value;
  saveButton.disabled = value;

  saveButton.textContent = value
    ? "Saving..."
    : (editingId ? "Save Changes" : "Add Food Item");
}

/* =====================================
   DASHBOARD STATISTICS
   ===================================== */

function updateStats() {
  document.getElementById("totalCount").textContent =
    foods.length;

  document.getElementById("freshCount").textContent =
    foods.filter(food =>
      getStatus(food.expiryDate).label === "Fresh"
    ).length;

  document.getElementById("soonCount").textContent =
    foods.filter(food =>
      getStatus(food.expiryDate).label === "Expiring Soon"
    ).length;

  document.getElementById("expiredCount").textContent =
    foods.filter(food =>
      getStatus(food.expiryDate).label === "Expired"
    ).length;
}

/* =====================================
   EXPIRY ALERTS AND USE FIRST
   ===================================== */

function renderExpiryInsights() {
  const alertsContainer = document.getElementById("expiryAlerts");
  const useFirstContainer = document.getElementById("useFirstList");

  alertsContainer.replaceChildren();
  useFirstContainer.replaceChildren();

  const expiredFoods = foods.filter(food =>
    getDaysLeft(food.expiryDate) < 0
  );

  const expiringSoonFoods = foods.filter(food => {
    const days = getDaysLeft(food.expiryDate);
    return days >= 0 && days <= 3;
  });

  function addAlert(className, message) {
    const alert = document.createElement("div");

    alert.className = `expiry-alert ${className}`;
    alert.textContent = message;

    alertsContainer.append(alert);
  }

  if (expiredFoods.length > 0) {
    addAlert(
      "danger",
      `⚠️ ${expiredFoods.length} expired item(s) found. Check these items.`
    );
  } else {
    addAlert(
      "safe",
      "✅ No expired items in your inventory."
    );
  }

  if (expiringSoonFoods.length > 0) {
    addAlert(
      "warning",
      `⏰ ${expiringSoonFoods.length} item(s) expire within the next 3 days.`
    );
  } else {
    addAlert(
      "safe",
      "🌿 No items expiring within the next 3 days."
    );
  }

  // Items expiring within 7 days.
  const useFirstFoods = foods
    .filter(food => {
      const days = getDaysLeft(food.expiryDate);
      return days >= 0 && days <= 7;
    })
    .sort((a, b) =>
      a.expiryDate.localeCompare(b.expiryDate)
    );

  if (useFirstFoods.length === 0) {
    const empty = document.createElement("div");

    empty.className = "insight-empty";
    empty.textContent =
      "🌱 Nothing is due to expire in the next 7 days. You're all caught up!";

    useFirstContainer.append(empty);
    return;
  }

  useFirstFoods.forEach(food => {
    const days = getDaysLeft(food.expiryDate);

    const item = document.createElement("div");
    item.className = "use-first-item";

    const info = document.createElement("div");

    const name = document.createElement("div");
    name.className = "use-first-name";
    name.textContent = `${food.name} · ${food.category}`;

    const detail = document.createElement("div");
    detail.className = "use-first-detail";
    detail.textContent =
      `${food.quantity} ${food.unit} · Expires ${food.expiryDate}`;

    info.append(name, detail);

    const remaining = document.createElement("div");
    remaining.className = "days-left";

    if (days === 0) {
      remaining.textContent = "Expires today";
    } else if (days === 1) {
      remaining.textContent = "1 day left";
    } else {
      remaining.textContent = `${days} days left`;
    }

    item.append(info, remaining);
    useFirstContainer.append(item);
  });
}

/* =====================================
   CREATE TEXT ELEMENT
   ===================================== */

function makeText(tag, className, text) {
  const element = document.createElement(tag);

  element.className = className;
  element.textContent = text;

  return element;
}

/* =====================================
   DISPLAY INVENTORY
   ===================================== */

function renderFoods() {
  foodList.replaceChildren();

  const search = searchInput.value.trim().toLowerCase();
  const filter = statusFilter.value;

  const filteredFoods = foods.filter(food => {
    const matchesSearch =
      food.name.toLowerCase().includes(search) ||
      food.category.toLowerCase().includes(search);

    const matchesStatus =
      filter === "All" ||
      getStatus(food.expiryDate).label === filter;

    return matchesSearch && matchesStatus;
  });

  emptyMessage.classList.toggle(
    "hidden",
    filteredFoods.length !== 0
  );

  filteredFoods.forEach(food => {
    const status = getStatus(food.expiryDate);

    const card = document.createElement("article");
    card.className = "food-card";

    const details = document.createElement("div");
    details.className = "food-info";

    const name = makeText(
      "h3",
      "food-name",
      food.name
    );

    const badge = makeText(
      "span",
      `status ${status.css}`,
      status.label
    );

    const categoryLine = makeText(
      "p",
      "food-details",
      `Category: ${food.category}`
    );

    const quantityLine = makeText(
      "p",
      "food-details",
      `Quantity: ${food.quantity} ${food.unit}`
    );

    const purchaseLine = makeText(
      "p",
      "food-details",
      `Purchased: ${food.purchaseDate}`
    );

    const expiryLine = makeText(
      "p",
      "food-details",
      `Expiry: ${food.expiryDate}`
    );

    details.append(
      name,
      badge,
      categoryLine,
      quantityLine,
      purchaseLine,
      expiryLine
    );

    const actions = document.createElement("div");
    actions.className = "food-actions";

    const editButton = makeText(
      "button",
      "action-button",
      "✏️ Edit"
    );

    editButton.type = "button";
    editButton.addEventListener("click", () => {
      startEdit(food.id);
    });

    const deleteButton = makeText(
      "button",
      "action-button delete-button",
      "🗑 Delete"
    );

    deleteButton.type = "button";
    deleteButton.addEventListener("click", () => {
      deleteFood(food.id);
    });

    actions.append(editButton, deleteButton);
    details.append(actions);
    card.append(details);

    foodList.append(card);
  });

  updateStats();
  renderExpiryInsights();
}

/* =====================================
   EDIT FOOD ITEM
   ===================================== */

function startEdit(id) {
  const food = foods.find(item => item.id === id);

  if (!food) return;

  editingId = id;

  foodName.value = food.name;
  category.value = food.category;
  quantity.value = food.quantity;
  unit.value = food.unit;
  purchaseDate.value = food.purchaseDate;
  expiryDate.value = food.expiryDate;

  formHeading.textContent = "✏️ Edit Food Item";
  saveButton.textContent = "Save Changes";

  cancelButton.classList.remove("hidden");

  showMessage("Edit the details and save your changes.");

  // Open the Add Inventory page for editing.
  showPage("addPage");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

/* =====================================
   ADD OR UPDATE FOOD ITEM
   ===================================== */

foodForm.addEventListener("submit", async event => {
  event.preventDefault();

  if (busy || !databaseReady || !foodRef) {
    showMessage(
      "Please wait until the database is connected.",
      "error"
    );
    return;
  }

  const name = foodName.value.trim();
  const qty = Number(quantity.value);
  const purchased = purchaseDate.value;
  const expires = expiryDate.value;

  if (
    !name ||
    !purchased ||
    !expires ||
    !Number.isFinite(qty) ||
    qty <= 0
  ) {
    showMessage("Please enter valid food details.", "error");
    return;
  }

  if (expires < purchased) {
    showMessage(
      "Expiry date cannot be before purchase date.",
      "error"
    );
    return;
  }

  const record = {
    name: name,
    category: category.value,
    quantity: qty,
    unit: unit.value,
    purchaseDate: purchased,
    expiryDate: expires
  };

  const wasEditing = Boolean(editingId);

  setBusy(true);
  showMessage("");

  try {
    if (editingId) {
      await foodRef.child(editingId).update(record);
    } else {
      await foodRef.push(record);
    }

    resetForm();

    showMessage(
      wasEditing
        ? "Food item updated successfully!"
        : "Food item added successfully!",
      "success"
    );

    // Show the overview after saving.
    showPage("overviewPage");

  } catch (error) {
    console.error(error);

    showMessage(
      "Could not save the item. Check Firebase Rules and your connection.",
      "error"
    );

  } finally {
    setBusy(false);
  }
});

/* =====================================
   DELETE FOOD ITEM
   ===================================== */

async function deleteFood(id) {
  if (!databaseReady || busy || !foodRef) return;

  const food = foods.find(item => item.id === id);

  if (!food) return;

  if (!confirm(`Delete "${food.name}" from your inventory?`)) {
    return;
  }

  try {
    await foodRef.child(id).remove();

    if (editingId === id) {
      resetForm();
    }

    showMessage("Food item deleted successfully.", "success");

  } catch (error) {
    console.error(error);

    showMessage(
      "Could not delete the item. Check your database rules.",
      "error"
    );
  }
}

/* =====================================
   SEARCH, FILTER AND REFRESH
   ===================================== */

searchInput.addEventListener("input", renderFoods);

statusFilter.addEventListener("change", renderFoods);

document.getElementById("refreshButton").addEventListener("click", () => {
  renderFoods();
});

/* =====================================
   CANCEL EDITING
   ===================================== */

cancelButton.addEventListener("click", () => {
  resetForm();
  showMessage("Edit cancelled.");
});

/* =====================================
   LOGIN AND SIGNUP PAGE SWITCHING
   ===================================== */

showSignup.addEventListener("click", event => {
  event.preventDefault();

  loginForm.classList.add("hidden");
  signupForm.classList.remove("hidden");

  loginMessage.textContent = "";
});

showLogin.addEventListener("click", event => {
  event.preventDefault();

  signupForm.classList.add("hidden");
  loginForm.classList.remove("hidden");

  signupMessage.textContent = "";
});

/* =====================================
   CREATE ACCOUNT
   ===================================== */

signupForm.addEventListener("submit", async event => {
  event.preventDefault();

  const email = signupEmail.value.trim();
  const password = signupPassword.value;

  signupMessage.textContent = "Creating account...";

  try {
    await auth.createUserWithEmailAndPassword(email, password);

    signupForm.reset();
    signupMessage.textContent = "Account created successfully!";

  } catch (error) {
    console.error(error);
    signupMessage.textContent = error.message;
  }
});

/* =====================================
   LOGIN
   ===================================== */

loginForm.addEventListener("submit", async event => {
  event.preventDefault();

  const email = loginEmail.value.trim();
  const password = loginPassword.value;

  loginMessage.textContent = "Logging in...";

  try {
    await auth.signInWithEmailAndPassword(email, password);

    loginForm.reset();
    loginMessage.textContent = "";

  } catch (error) {
    console.error(error);
    loginMessage.textContent = error.message;
  }
});

/* =====================================
   LOGOUT
   ===================================== */

logoutButton.addEventListener("click", async () => {
  try {
    await auth.signOut();
    resetForm();
    showMessage("");

  } catch (error) {
    console.error(error);
    alert("Could not log out. Please try again.");
  }
});

/* =====================================
   AUTHENTICATION AND DATABASE
   ===================================== */

// Start with the login screen visible.
authSection.classList.remove("hidden");
appSection.classList.add("hidden");

// Use in-memory authentication so a previous
// session does not automatically open the dashboard.
auth.setPersistence(firebase.auth.Auth.Persistence.NONE)
  .then(() => auth.signOut())
  .then(() => {

    auth.onAuthStateChanged(user => {

      // No logged-in user: show login screen.
      if (!user) {
        if (foodRef) {
          foodRef.off("value");
          foodRef = null;
        }

        databaseReady = false;
        foods = [];

        authSection.classList.remove("hidden");
        appSection.classList.add("hidden");

        loginForm.classList.remove("hidden");
        signupForm.classList.add("hidden");

        loginMessage.textContent = "";
        signupMessage.textContent = "";

        updateStats();

        foodList.replaceChildren();
        document.getElementById("expiryAlerts").replaceChildren();
        document.getElementById("useFirstList").replaceChildren();

        return;
      }

      // Logged-in user: show application.
      authSection.classList.add("hidden");
      appSection.classList.remove("hidden");

      showPage("addPage");

      loadingMessage.classList.remove("hidden");
      loadingMessage.textContent = "Connecting to FreshTrack...";

      // Remove previous listener if present.
      if (foodRef) {
        foodRef.off("value");
      }

      // Each user has a separate inventory.
      foodRef = database.ref(
        "users/" + user.uid + "/foodItems"
      );

      // Listen for live Firebase changes.
      foodRef.on(
        "value",

        snapshot => {
          foods = [];

          snapshot.forEach(child => {
            const item = child.val();

            if (
              item &&
              typeof item.name === "string" &&
              typeof item.category === "string" &&
              typeof item.expiryDate === "string" &&
              /^\d{4}-\d{2}-\d{2}$/.test(item.expiryDate) &&
              Number.isFinite(Number(item.quantity)) &&
              typeof item.unit === "string" &&
              typeof item.purchaseDate === "string"
            ) {
              foods.push({
                ...item,
                id: child.key,
                quantity: Number(item.quantity)
              });
            }
          });

          databaseReady = true;

          loadingMessage.classList.add("hidden");

          renderFoods();
        },

        error => {
          console.error(error);

          databaseReady = false;

          loadingMessage.textContent =
            "Cannot read inventory. Check Firebase Database Rules.";
        }
      );
    });
  })
  .catch(error => {
    console.error("Firebase authentication startup error:", error);

    loginMessage.textContent =
      "Could not initialize login. Please refresh the page.";
  });