const queries = [
  'Kuari Pass astrophotography',
  'Kuari Pass milky way',
  'Kuari Pass night sky',
  'Kuari Pass trek',
  'Kuari Pass Himalaya stars',
];

async function openverse(q) {
  const u = new URL('https://api.openverse.org/v1/images/');
  u.searchParams.set('q', q);
  u.searchParams.set('page_size', '5');
  const r = await fetch(u, {
    headers: { 'User-Agent': 'Aruna/0.1', Accept: 'application/json' },
  });
  const j = await r.json();
  return { count: j.result_count, titles: (j.results || []).map((x) => x.title) };
}

async function commons(q) {
  const u = new URL('https://commons.wikimedia.org/w/api.php');
  u.searchParams.set('action', 'query');
  u.searchParams.set('list', 'search');
  u.searchParams.set('srsearch', q);
  u.searchParams.set('srnamespace', '6');
  u.searchParams.set('srlimit', '5');
  u.searchParams.set('format', 'json');
  const r = await fetch(u, { headers: { 'User-Agent': 'Aruna/0.1' } });
  const j = await r.json();
  return (j.query?.search || []).map((s) => s.title);
}

for (const q of queries) {
  const ov = await openverse(q);
  const cm = await commons(q);
  console.log('\n===', q);
  console.log('Openverse', ov.count, ov.titles.slice(0, 3));
  console.log('Commons', cm.slice(0, 3));
}
