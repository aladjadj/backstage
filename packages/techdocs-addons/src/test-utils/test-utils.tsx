/*
 * Copyright 2022 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// import order matters for jest manual mocks! import this first.
import {
  useTechDocsReaderDom,
  useParams,
  useTechDocsMetadata,
  useEntityMetadata,
} from './mocks';

import React, { ReactElement, Fragment } from 'react';

// Shadow DOM support for the simple and complete DOM testing utilities
// https://github.com/testing-library/dom-testing-library/issues/742#issuecomment-674987855
import { screen } from 'testing-library__dom';
import { renderToStaticMarkup } from 'react-dom/server';
import { Route, Routes } from 'react-router-dom';
import { act, render } from '@testing-library/react';

import {
  wrapInTestApp,
  TestApiProvider,
  TestApiProviderProps,
} from '@backstage/test-utils';

import { TechDocsAddons } from '../addons';

/**
 * @public
 */
export type Apis = TestApiProviderProps<any>['apis'];

/**
 * options for {@link TechDocsAddonBuilder}
 * @public
 */
export type TechDocsAddonBuilderOptions = {
  dom: ReactElement;
  entity: any; // TODO: TechDocsEntityMetadata type in techdocs-common?
  metadata: any; // TODO  TechDocsMetadata in techdocs-common?;
  componentId: string;
  readerPage?: ReactElement;
  apis: Apis;
  path: string;
};

const defaultOptions: TechDocsAddonBuilderOptions = {
  dom: <></>,
  entity: {},
  metadata: {},
  componentId: 'docs',
  apis: [],
  path: '',
};

const defaultMetadata = {
  site_name: 'Tech Docs',
  site_description: 'Tech Docs',
};

const defaultEntity = {
  kind: 'Component',
  metadata: { namespace: 'default', name: 'docs' },
};

const defaultDom = (
  <html lang="en">
    <head />
    <body>
      <div data-md-component="container">
        <div data-md-component="navigation" />
        <div data-md-component="toc" />
        <div data-md-component="main" />
      </div>
    </body>
  </html>
);

/**
 * test utility that can be used to build addons in techdocs page
 * @public
 */
export class TechDocsAddonBuilder {
  private options: TechDocsAddonBuilderOptions = defaultOptions;
  private addons: ReactElement[];

  static buildAddonsInTechDocs(addons: ReactElement[]) {
    return new TechDocsAddonBuilder(addons);
  }

  constructor(addons: ReactElement[]) {
    this.addons = addons;
  }

  withApis(apis: Apis) {
    const refs = apis.map(([ref]) => ref);
    this.options.apis = this.options.apis
      .filter(([ref]) => !refs.includes(ref))
      .concat(apis);
    return this;
  }

  withDom(dom: ReactElement) {
    this.options.dom = dom;
    return this;
  }

  withMetadata(metadata: any) {
    this.options.metadata = metadata;
    return this;
  }

  withEntity(entity: any) {
    this.options.entity = entity;
    return this;
  }

  withReaderPage(readerPage: ReactElement) {
    this.options.readerPage = readerPage;
    return this;
  }

  atPath(path: string) {
    this.options.path = path;
    return this;
  }

  build() {
    const apis = [...this.options.apis];
    const entityName = {
      namespace:
        this.options.entity?.metadata?.namespace ||
        defaultEntity.metadata.namespace,
      kind: this.options.entity?.kind || defaultEntity.kind,
      name: this.options.entity?.metadata?.name || defaultEntity.metadata.name,
    };

    const techDocsMetadata: any = {
      loading: false,
      error: undefined,
      value: this.options.metadata || {
        ...defaultMetadata,
      },
    };

    useTechDocsMetadata.mockReturnValue(techDocsMetadata);

    const entityMetadata: any = {
      loading: false,
      error: undefined,
      value: this.options.entity || {
        ...defaultEntity,
      },
    };

    useEntityMetadata.mockReturnValue(entityMetadata);

    const dom = document.createElement('html');
    dom.innerHTML = renderToStaticMarkup(this.options.dom || defaultDom);
    useTechDocsReaderDom.mockReturnValue(dom);
    // todo(backstage/techdocs-core): Use core test-utils' `routeEntries` option to mock
    // the current path. We use jest mocks instead for now because of a bug in
    // react-router that prevents '*' params from being mocked.
    useParams.mockReturnValue({
      ...entityName,
      '*': this.options.path,
    });

    return wrapInTestApp(
      <TestApiProvider apis={apis}>
        <Routes>
          <Route path="*" element={this.options.readerPage}>
            <TechDocsAddons>
              {this.addons.map((addon, index) => (
                <Fragment key={index}>{addon}</Fragment>
              ))}
            </TechDocsAddons>
          </Route>
        </Routes>
      </TestApiProvider>,
    );
  }

  render(): typeof screen & { shadowRoot: ShadowRoot | null } {
    render(this.build());

    const shadowHost = screen.getByTestId('techdocs-native-shadowroot');

    return {
      ...screen,
      shadowRoot: shadowHost?.shadowRoot,
    };
  }

  // Components using useEffect to perform an asynchronous action (such as fetch) must be rendered within an async
  // act call to properly get the final state, even with mocked responses. This utility method makes the signature a bit
  // cleaner, since act doesn't return the result of the evaluated function.
  // https://github.com/testing-library/react-testing-library/issues/281
  // https://github.com/facebook/react/pull/14853
  async renderWithEffects(): Promise<
    ReturnType<TechDocsAddonBuilder['render']>
  > {
    await act(async () => {
      this.render();
    });

    const shadowHost = screen.getByTestId('techdocs-native-shadowroot');

    return {
      ...screen,
      shadowRoot: shadowHost?.shadowRoot,
    };
  }
}

export default TechDocsAddonBuilder.buildAddonsInTechDocs;
