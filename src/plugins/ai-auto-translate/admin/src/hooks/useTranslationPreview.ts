import { useFetchClient, useNotification } from '@strapi/strapi/admin';
import { useEffect, useState } from 'react';
import { PLUGIN_ID } from '../pluginId';
import { type HeaderActionProps } from '@strapi/content-manager/strapi-admin';

export default function useTranslationPreview(options: {
  documentId: string | undefined;
  targetLocale?: string;
  isSingleType: boolean;
  props: HeaderActionProps;
}) {
  const {
    props: { document, collectionType, model, meta },
    targetLocale,
  } = options;

  const [fieldsToTranslate, setFieldsToTranslate] = useState<string[]>([]);
  const [estimatedCost, setEstimatedCost] = useState<string>('~$0.02');
  const [documentId, setDocumentId] = useState<string | undefined>(() => options.documentId);

  const fetchClient = useFetchClient();
  const { toggleNotification } = useNotification();

  useEffect(() => {
    if (meta?.availableLocales.length && !documentId) {
      const availableDocument = meta?.availableLocales[0];
      // @ts-expect-error Property 'documentId' does not exist on type 'AvailableLocaleDocument'
      setDocumentId(availableDocument?.documentId);
    }
    if (!documentId || !targetLocale || targetLocale === 'en') {
      return;
    }

    try {
      fetchClient
        .post<{ fields: string[]; estimatedCost?: string }>(`/${PLUGIN_ID}/translate/preview`, {
          documentId,
          model,
          collectionType,
          targetLocale,
        })
        .then(({ data }) => {
          setFieldsToTranslate(data.fields);
          setEstimatedCost(data.estimatedCost || '~$0.02');
        });
    } catch (err) {
      toggleNotification({
        type: 'danger',
        message: 'Could not load translation data',
      });
    }
  }, [document, options.documentId, collectionType, model, targetLocale]);

  return {
    fieldsToTranslate,
    estimatedCost,
    documentId,
  };
}
