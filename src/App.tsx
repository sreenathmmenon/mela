import { FormEvent, useMemo, useState } from 'react';
import { tables, reducers } from './module_bindings';
import { useSpacetimeDB, useTable, useReducer } from 'spacetimedb/react';

function App() {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const conn = useSpacetimeDB();
  const { isActive: connected } = conn;

  const [worlds] = useTable(tables.world);
  const [profiles] = useTable(tables.playerProfile);
  const [presence] = useTable(tables.worldPresence);
  const [activity] = useTable(tables.worldActivity);
  const me = useMemo(
    () => {
      const identity = conn.identity;
      return identity ? profiles.find(profile => profile.identity.isEqual(identity)) : undefined;
    },
    [profiles, conn.identity]
  );

  const onboard = useReducer(reducers.onboard);

  const submitOnboarding = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !connected) return;
    try {
      await onboard({ displayName: name });
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to join Mela.');
    }
  };

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '2rem', fontFamily: 'system-ui' }}>
      <p style={{ letterSpacing: 2, color: '#7c3aed' }}>MELA • LIVING PLAYGROUND</p>
      <h1>{worlds[0]?.name ?? 'Mela Commons'}</h1>

      <div style={{ marginBottom: '1rem' }}>
        Status:{' '}
        <strong style={{ color: connected ? 'green' : 'red' }}>
          {connected ? 'Connected' : 'Disconnected'}
        </strong>
      </div>

      {!me && <form onSubmit={submitOnboarding} style={{ marginBottom: '2rem' }}>
        <h2>Enter the world</h2>
        <input
          type="text"
          placeholder="Choose your display name"
          value={name}
          onChange={e => setName(e.target.value)}
          style={{ padding: '0.5rem', marginRight: '0.5rem' }}
          disabled={!connected}
        />
        <button
          type="submit"
          style={{ padding: '0.5rem 1rem' }}
          disabled={!connected}
        >
          Join Mela
        </button>
        {error && <p role="alert">{error}</p>}
      </form>}

      {me && <p>Welcome back, <strong>{me.displayName}</strong>. Your Mela identity persists across reloads.</p>}
      <section><h2>In Mela now ({presence.filter(row => row.state === 'online').length})</h2>
        <ul>{profiles.map(profile => <li key={profile.identity.toHexString()}>{profile.displayName}</li>)}</ul>
      </section>
      <section><h2>Live world activity</h2>
        <ul>{activity.slice(-8).reverse().map(item => <li key={item.id.toString()}>{item.message}</li>)}</ul>
      </section>
    </main>
  );
}

export default App;
