import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export default class CrowdaqClient {
  endpoint: string;
  axios: AxiosInstance;
  token: string | undefined;

  constructor(endpoint = '/apiV2') {
    this.endpoint = endpoint;
    this.axios = axios.create({
      headers: {
        'content-type': 'application/json'
      },
      withCredentials: true
    });
  }

  switchEndpoint(endpoint: string){
    this.endpoint = endpoint;
  }

  async login(username: string, password: string) {
    const resp = await this.makeRequest('login', {
      username, password
    });
    this.token = resp.data.token;
  }

  async makeRequest(fn: string, args: object) {

    const headers: any = {
      'content-type': 'application/json'
    };

    if (this.token) {
      headers['authorization'] = `Bearer ${this.token}`;
    }

    const ret = await this.axios.post(this.endpoint, {
        fn, args
      }, {
        headers
      }
    );
    return ret;
  }
}
