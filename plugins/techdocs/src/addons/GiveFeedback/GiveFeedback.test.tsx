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

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';
import { scmIntegrationsApiRef } from '@backstage/integration-react';
import { TechDocsAddonBuilder } from '@backstage/techdocs-addons';
import { GiveFeedback } from './GiveFeedback';
import { TechDocsReaderPage } from '../../reader/components/TechDocsReaderPage';

const byUrl = jest.fn().mockReturnValue({ type: 'github' });

const fireSelectionChangeEvent = (window: Window) => {
  const selectionChangeEvent = window.document.createEvent('Event');
  selectionChangeEvent.initEvent('selectionchange', true, true);
  window.document.addEventListener('selectionchange', () => {}, false);
  fireEvent(window.document, selectionChangeEvent);
};

describe('GiveFeedback', () => {
  const selection = {
    type: 'Range',
    rangeCount: 1,
    isCollapsed: true,
    getRangeAt: () => ({
      startContainer: 'this is a sentence',
      endContainer: 'this is a sentence',
      startOffset: 1,
      endOffset: 3,
      getBoundingClientRect: () => ({
        right: 100,
        top: 100,
        width: 100,
        height: 100,
      }),
    }),
    toString: () => 'his ',
    containsNode: () => true,
  } as unknown as Selection;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without exploding', async () => {
    const { shadowRoot, getByText } =
      await TechDocsAddonBuilder.buildAddonsInTechDocs([
        <GiveFeedback debounceTime={0} />,
      ])
        .withDom(
          <div data-md-component="main">
            <div className="md-content">
              <article>
                <a
                  title="Leave feedback for this page"
                  href="https://github.com/backstage/backstage/issues/new"
                >
                  Leave feedback
                </a>
                <a
                  title="Edit this page"
                  href="https://github.com/backstage/backstage/edit/master/docs/README.md"
                >
                  Edit page
                </a>
              </article>
            </div>
          </div>,
        )
        .withReaderPage(<TechDocsReaderPage />)
        .withApis([[scmIntegrationsApiRef, { byUrl }]])
        .renderWithEffects();

    (shadowRoot as ShadowRoot & Pick<Document, 'getSelection'>).getSelection =
      () => selection;

    fireSelectionChangeEvent(window);

    await waitFor(() => {
      expect(getByText('Open new Github issue')).toBeInTheDocument();
    });
  });
});
