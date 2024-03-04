import { createRoot } from 'react-dom/client';
import Background from './img/stargaze.svg';
import { P2P } from './components/p2p';
import { useMemo } from 'react';
import { Access } from './components/access';

const App = () => {
    const { p2pID, access } = useMemo(() => {
        const qs = new URLSearchParams(location.search);
        return { p2pID: qs.get('p2p'), access: qs.get('access') };
    }, []);

    return (
        <>
            <Background />
            {p2pID && <P2P p2pID={p2pID} />}
            {access && <Access token={access} />}
        </>
    );
};

const root = createRoot(document.getElementById('app'));
root.render(<App />);
