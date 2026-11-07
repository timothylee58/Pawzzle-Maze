export async function request(path, { method = 'GET', body } = {}) {
  const response = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error ?? 'Request failed.');
    error.status = response.status;
    throw error;
  }
  return data;
}
export const api = {
  session: () => request('/session', { method: 'POST' }),
  daily: () => request('/daily'),
  start: () => request('/rounds', { method: 'POST' }),
  round: (id) => request(`/rounds/${id}`),
  finish: (id) => request(`/rounds/${id}/finish`, { method: 'POST' }),
  submit: (id, body) => request(`/rounds/${id}/submissions`, { method: 'POST', body }),
  leaderboard: (id) => request(`/leaderboard?challengeId=${encodeURIComponent(id)}`),
};
