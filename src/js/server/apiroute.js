// @flow
'use string';

const Rx = require('rxjs');

import { httpStatus } from './server';

import type { RxObservable, RxObserve } from '../shared/interfaces/rx';
import type { APIRouteState } from '../shared/interfaces/apiroute';
import type { Server, ExpressRx } from '../shared/interfaces/server';

export default class ApiRoute {

  _count: number;

  constructor () {
    this._count = 0;
  }

  count ({ req, res }: ExpressRx): RxObservable<APIRouteState> {
    return Rx.Observable.create((observe: RxObserve<APIRouteState>) => {
      console.log('getting count', this._count);
      const result = this._count;
      observe.next({ req, res, result });
    });
  }

  getCount (server: Server, path: string): RxObservable<APIRouteState> {
    return server.get(path)
      .mergeMap((msg: ExpressRx) => this.count(msg))
      .share();
  }

  setCount ({ req, res }: ExpressRx): RxObservable<APIRouteState> {
    return Rx.Observable.create((observe: RxObserve<APIRouteState>) => {
      this._count += 1;
      const result = this._count;
      console.log('setting count', this._count);
      observe.next({ req, res, result });
    });
  }

  postCount (server: Server, path: string): RxObservable<APIRouteState> {
    return server.post(path)
      .mergeMap((msg: ExpressRx) => this.setCount(msg))
      .share();
  }

  send ({ res, result }: APIRouteState) {
    res.status(httpStatus.OK).send(JSON.stringify(result));
  }
}
