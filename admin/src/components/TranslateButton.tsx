import {
  type HeaderActionComponent,
  type HeaderActionProps,
} from '@strapi/content-manager/strapi-admin';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { useFetchClient, useNotification, useQueryParams } from '@strapi/strapi/admin';
import { Button, Flex, Typography } from '@strapi/design-system';
import { getTranslation } from '../utils/getTranslation';
import { PLUGIN_ID } from '../pluginId';
import { Dialog, Box } from '@strapi/design-system';
import useTranslationPreview from '../hooks/useTranslationPreview';
import { useParams } from 'react-router-dom';
import { AiIcon } from './AiIcon';

// @ts-expect-error Type '({ onClose }: { onClose: () => void; }) => ReactNode' is not assignable to type 'ReactNode'
const TranslateButton: HeaderActionComponent = (props: HeaderActionProps) => {
  const { documentId: propDocumentId, collectionType, model, document, activeTab } = props;

  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const fetchClient = useFetchClient();
  const [isTranslating, setIsTranslating] = useState(false);
  const [{ query }] = useQueryParams<{ plugins?: { i18n?: { locale?: string } } }>();
  const params = useParams<{
    id: string;
    model: string;
    collectionType: 'single-types' | 'collection-types';
  }>();
  // const form = useForm('useContentManagerContext', (state) => state);

  const isSingleType =
    params['collectionType'] === 'single-types' || collectionType === 'single-types';

  // console.log(props, params, {isSingleType})

  const currentDesiredLocale = query.plugins?.i18n?.locale;

  const { estimatedCost, fieldsToTranslate, documentId } = useTranslationPreview({
    props,
    targetLocale: currentDesiredLocale,
    documentId: propDocumentId || document?.documentId,
    isSingleType,
  });

  console.log({ activeTab, fieldsToTranslate, documentId });
  // console.log('form', form)
  // form.setValues({})

  const handleTranslate = async (onClose: () => void) => {
    if (!documentId) return;
    setIsTranslating(true);

    try {
      const { data } = await fetchClient.post<{
        message: string;
      }>(`/${PLUGIN_ID}/translate`, {
        documentId,
        model,
        collectionType,
        targetLocale: currentDesiredLocale,
      });

      if (data.message) {
        toggleNotification({
          type: 'success',
          message: formatMessage({
            id: getTranslation('translate.queued'),
            defaultMessage: 'Translation job accepted!',
          }),
        });
      }

      onClose();
    } catch (err) {
      toggleNotification({
        type: 'danger',
        message: 'Translation failed',
      });
    } finally {
      setIsTranslating(false);
    }
  };

  return {
    label: formatMessage({
      id: getTranslation('headerActions.translate.button'),
      defaultMessage: 'Translate with AI',
    }),
    type: 'icon',
    icon: <AiIcon size={16} />,
    disabled: activeTab !== 'draft' || document?.locale === 'en',
    dialog: {
      type: 'dialog',
      title: formatMessage({
        id: getTranslation('headerActions.translate.dialog.title'),
        defaultMessage: 'Translate with AI',
      }),
      content: ({ onClose }: { onClose: () => void }) => (
        <>
          <Dialog.Body>
            <Flex direction="column" gap={4}>
              <Typography>
                This content will be translated from <strong>English</strong> to the current locale:{' '}
                {currentDesiredLocale}
              </Typography>

              {/* <Box background="neutral100" padding={4} borderRadius="4px" width="100%">
                {fieldsToTranslate.length > 0 ? (
                  fieldsToTranslate.map((field) => (
                    <Typography key={field} variant="omega">
                      • {field}
                    </Typography>
                  ))
                ) : (
                  <Loader />
                )}
              </Box> */}

              <Typography variant="omega" textColor="neutral600">
                Estimated cost: {estimatedCost}
              </Typography>
            </Flex>
          </Dialog.Body>

          <Dialog.Footer>
            <Flex gap={2} width="100%">
              <Button flex="auto" variant="tertiary" onClick={onClose} disabled={isTranslating}>
                Cancel
              </Button>
              <Button
                flex="auto"
                variant="success"
                onClick={() => handleTranslate(onClose)}
                loading={isTranslating}
              >
                Translate Now
              </Button>
            </Flex>
          </Dialog.Footer>
        </>
      ),
    },
  };
};

export default TranslateButton;
