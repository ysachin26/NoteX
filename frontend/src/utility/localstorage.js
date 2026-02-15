export function setlocalStorage(state, key = 'pastes') {
  localStorage.setItem(key, JSON.stringify(state));
}
