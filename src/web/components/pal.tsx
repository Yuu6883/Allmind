import { useEffect, useState } from 'react';
import Style from '../style/p2p.module.css';

declare var PAL_ENDPOINT: string;

export const Pal = ({ token }: { token: string }) => {
    const [data, setData] = useState<{ pfp: string; name: string }>(null);
    const [status, setStatus] = useState('Requesting Access...');

    useEffect(() => {
        if (!PAL_ENDPOINT) return;
        fetch(`${location.protocol}//${PAL_ENDPOINT}/${token}`).then(async res => {
            console.log(res.status);
            if (res.status === 200) {
                setData(await res.json());
            }
            setStatus(
                {
                    200: 'Access Granted',
                    404: 'Request Not Found',
                    401: 'Request Unauthorized',
                    500: 'Internal Server Error',
                }[res.status],
            );
        });
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
                <p>{status}</p>
            </div>
        </div>
    );
};
