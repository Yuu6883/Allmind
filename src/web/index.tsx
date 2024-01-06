import { createRoot } from 'react-dom/client';
import Background from './img/stargaze.svg';
import { P2P } from './components/p2p';
import { useMemo } from 'react';

const App = () => {
    const { p2pID } = useMemo(
        () => ({ p2pID: new URLSearchParams(location.search).get('p2p') }),
        [],
    );

    return (
        <>
            <Background />
            {p2pID && <P2P p2pID={p2pID} />}
        </>
    );
};

const root = createRoot(document.getElementById('app'));
root.render(<App />);
