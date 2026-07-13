const KEY = "cw-users";

function getUsers() {
  try {
    return JSON.parse(window.localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

function saveUsers(users) {
  window.localStorage.setItem(KEY, JSON.stringify(users));
}

export function findUser(email) {
  return getUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function registerUser({ name, email, password }) {
  const users = getUsers();
  users.push({ name, email, password });
  saveUsers(users);
}

export function getLastUser() {
  const users = getUsers();
  return users.length ? users[users.length - 1] : null;
}

export function checkPassword(email, password) {
  const user = findUser(email);
  return !!user && user.password === password;
}
