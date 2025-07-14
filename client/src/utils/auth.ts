export function isDev(): boolean {
  const token = sessionStorage.getItem('sessionToken');
  if (!token) return false;
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.isDev || false;
  } catch { return false; }
}

export function getCurrentUser() {
  const token = localStorage.getItem('sessionToken');
  if (!token) return null;

  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return {
      username: decoded.username,
      isDev: decoded.isDev || false,
      userId: decoded.userId
    };
  } catch (error) {
    return null;
  }
}
