const { URLSearchParams } = require('url');

const API = 'https://api.challonge.com/v1';
const OAUTH2 = 'https://api.challonge.com/oauth';
const SCOPE = 'me';

module.exports = class ChallongeAPI {
    /** @param {App} app */
    constructor(app) {
        this.app = app;

        this.redirect =
            `${OAUTH2}/authorize?client_id=` +
            `${this.options.challonge_app_id}` +
            `&scope=${SCOPE}&` +
            `response_type=code&redirect_uri=` +
            `${this.options.oauth2_redirect}`;
    }

    get options() {
        return this.app.options;
    }

    params() {
        const params = new URLSearchParams();
        params.append('api_key', this.options.challonge_api_key);
        return params;
    }

    /**
     * @param {String} code
     * @param {Boolean} refresh
     * @returns {Promise<ChallongeResponse & ChallongeAuthorization>}
     */
    async exchange(code, refresh) {
        const type = refresh ? 'refresh_token' : 'authorization_code';
        const codeType = refresh ? 'refresh_token' : 'code';

        const params = new URLSearchParams();
        params.append('client_id', this.options.challonge_app_id);
        params.append('client_secret', this.options.challonge_secret);
        params.append('grant_type', type);
        params.append(codeType, code);

        if (!refresh) params.append('redirect_uri', this.options.oauth2_redirect);

        const res = await fetch(`${OAUTH2}/token`, {
            method: 'POST',
            body: params,
        }).catch(e => ({
            json: async _ => ({
                error: true,
                error_description: `Fetch failed: ${e}`,
            }),
        }));
        return await res.json();
    }

    /** @param {string} url */
    get(url, body = {}) {
        const params = this.params();
        for (const key in body) params.append(key, body[key]);
        return fetch(url + '?' + encodeURIComponent(params.toString()));
    }

    /** @param {string} url */
    put(url, body = {}) {
        const params = this.params();
        for (const key in body) params.append(key, body[key]);
        return fetch(url + '?' + encodeURIComponent(params.toString()), {
            method: 'PUT',
        });
    }

    /** @param {string} id */
    async getTournament(id) {
        const res = await this.get(`${API}/tournaments/${id}.json`);

        console.log(res.status);
        if (res.status === 200) {
            return await res.json();
        } else {
            console.log(res.statusText);
            return null;
        }
    }

    /** @param {string} id */
    async checkTournamentPerm(id) {
        const res = await this.put(`${API}/tournaments/${id}.json`, {
            open_signup: false,
        });

        console.log(res.status);
        if (res.status === 200) {
            return await res.json();
        } else {
            return null;
        }
    }
};
