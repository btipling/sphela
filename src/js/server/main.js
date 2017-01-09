// @flow
'use strict';

import Server from './server';
import File from './file';
import SiteRoute from './siteroute';
import APIRoute from './apiroute';
import { appCreator } from '../shared/app';
import ApplicationContext from '../shared/applicationcontext';
import {
  POSTGRES_URI,
  POSTGRES_PORT,
  POSTGRES_DB_NAME,
  POSTGRES_USERNAME,
  POSTGRES_PASSWORD,
  SERVER_PORT,
  STATIC_JS_ROOT,
  STATIC_CSS_ROOT,
  STATIC_IMAGE_ROOT,
} from '../shared/config';
import CountImpl from '../shared/models/count';;
import DBImpl from '../shared/db';

import type { RxObservable } from '../shared/interfaces/rx';
import type { Count, DB } from '../shared/interfaces/db';

const express = require('express');
const fs = require('fs');
const vueRendererCreator = require('vue-server-renderer');
const Sequelize = require('sequelize');
const Vuex = require('vuex');
const Vue = require('vue');

function getAssets (assetsPath = '/www/sphela/app/src/js/server/assets.json') {
  const assets = {};
  const initialAssets = JSON.parse(fs.readFileSync(assetsPath, 'utf8'));
  for (const rawPath of Object.keys(initialAssets)) {
    let asset = initialAssets[rawPath].replace('src/js/client', 'static/js');
    asset = asset.replace('src', 'static');
    assets[rawPath] = asset;
  }
  return assets;
}

function initSequelize (): Sequelize {
  return new Sequelize(
    POSTGRES_DB_NAME,
    POSTGRES_USERNAME,
    POSTGRES_PASSWORD,
    {
      dialect: 'postgres',
      host: POSTGRES_URI,
      port: POSTGRES_PORT,
    }
  );
}

function main () {
  const middleware = [];
  middleware.push([ '/static/css', express.static(STATIC_CSS_ROOT) ]);
  middleware.push([ '/static/js', express.static(STATIC_JS_ROOT) ]);
  middleware.push([ '/static/images', express.static(STATIC_IMAGE_ROOT) ]);

  const server = new Server(express(), SERVER_PORT, middleware, vueRendererCreator);
  server.listen();

  const count: Count = new CountImpl(initSequelize());
  const db: DB = new DBImpl(count);
  const applicationContext = new ApplicationContext(db);
  const apiRoute = new APIRoute(applicationContext);
  apiRoute.getCount(server, '/api/count')
    .subscribe(apiRoute.send);

  apiRoute.postCount(server, '/api/count')
    .subscribe(apiRoute.send);

  Vue.use(Vuex);

  const storeCreator = (): RxObservable<Object> => {
    return applicationContext.db.count.getCount()
    .map(currentCount => new Vuex.Store({
      state: {
        count: currentCount
      },
      actions: {
        increment () {},
        getCount (context) {},
      }
    }));
  };

  const route = new SiteRoute(getAssets(), appCreator(storeCreator));

  route.serve(server, '*', new File(`${process.cwd()}/src/html/index.html`, fs))
    .subscribe(route.send);
}

main();
