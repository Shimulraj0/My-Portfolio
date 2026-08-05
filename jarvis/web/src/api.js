export async function getFlows() {
  const resp = await fetch('/api/flows');
  return resp.json();
}

export async function createFlow(flow) {
  const resp = await fetch('/api/flows', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(flow),
  });
  if (!resp.ok) throw new Error(await resp.text());
  return resp.json();
}

export async function runFlow(id) {
  const resp = await fetch(`/api/flows/${id}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (!resp.ok) throw new Error(await resp.text());
  return resp.json();
}

export function openEventsStream(onEvent) {
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${protocol}://${location.host}/ws/events`);
  ws.onmessage = (msg) => onEvent(JSON.parse(msg.data));
  return ws;
}

export async function chat(message, onEvent) {
  const resp = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  if (!resp.ok) throw new Error(await resp.text());
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop();
    for (const block of parts) {
      const line = block.split('\n').find((l) => l.startsWith('data: '));
      if (line) onEvent(JSON.parse(line.slice(6)));
    }
  }
}
