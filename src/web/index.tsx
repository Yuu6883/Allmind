import { createRoot } from 'react-dom/client';
import SVG from './img/stargaze.svg';

const App = () => {
    return (
        <div>
            <SVG />
        </div>
    );
};

const root = createRoot(document.getElementById('app'));
root.render(<App />);
