import { createRoot } from 'react-dom/client';
import Background from './img/stargaze.svg';
import { P2P } from './components/p2p';
import { useMemo } from 'react';
import { Pal } from './components/pal';

const App = () => {
    const { p2pID, pal } = useMemo(() => {
        const qs = new URLSearchParams(location.search);
        return { p2pID: qs.get('p2p'), pal: qs.get('pal') };
    }, []);

    return (
        <>
            <Background />
            {p2pID && <P2P p2pID={p2pID} />}
            {pal && <Pal token={pal} />}
        </>
    );
};

const root = createRoot(document.getElementById('app'));
root.render(<App />);
