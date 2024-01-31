import { useEffect, useState } from 'react';
import Style from '../style/p2p.module.css';

export const Pal = ({ token }: { token: string }) => {
    const [data, setData] = useState<{ pfp: string; name: string }>(null);

    useEffect(() => {
        const endpoint = process.env.PAL_ENDPOINT;
        console.log(endpoint);
    }, []);

    return (
        <div className={Style.panel}>
            {data && (
                <div className={Style.pfpDiv}>
                    <div className={Style.pfpContainer}>
                        <img className={Style.pfp} src={data.pfp} />
                    </div>
                </div>
            )}
            <div className={Style.statusPanel}>
                <p>Requesting Access...</p>
            </div>
        </div>
    );
};
