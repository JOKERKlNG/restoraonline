// Shared in-memory data for Vercel serverless functions.
// NOTE: This is suitable for demos; real apps should persist to a database.

const createId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

/** Menu items */
const menu = [
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

/** Reviews shared across devices */
const reviews = [];

/** Reservations shared across devices */
const reservations = [];

/** Sales reports */
const sales = [];

/** Simple user store for demo purposes */
const users = [
  {
    id: createId(),
    email: "123@gmail.com",
    password: "asdfghjkl",
    name: "123",
    role: "user",
  },
  {
    id: createId(),
    email: "admin@gmail.com",
    password: "12345678",
    name: "Admin",
    role: "admin",
  },
];

module.exports = {
  createId,
  menu,
  reviews,
  reservations,
  sales,
  users,
};


