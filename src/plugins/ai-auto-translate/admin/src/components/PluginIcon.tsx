import { useIntl } from 'react-intl';
import { AiIcon } from './AiIcon';
import { useNotification } from '@strapi/strapi/admin';
import { getTranslation } from '../utils/getTranslation';
import { PLUGIN_ID } from '../pluginId';
import { EventSource } from 'extended-eventsource';

let isConnected = false;

const PluginIcon = () => {
  const { toggleNotification } = useNotification();
  const { formatMessage } = useIntl();

  const parseSSEData = (data: unknown) => {
    try {
      if (typeof data === 'string') {
        data = JSON.parse(data);
      }
      return data;
    } catch (error) {
      console.error(error);
      return {};
    }
  };

  const STORAGE_KEYS = {
    TOKEN: 'jwtToken',
    USER: 'userInfo',
  };

  const getToken = (): string | null => {
    const fromLocalStorage = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (fromLocalStorage) {
      return JSON.parse(fromLocalStorage);
    }
    return null;
  };

  if (!isConnected) {
    const eventSource = new EventSource(`/${PLUGIN_ID}/sse`, {
      withCredentials: true,
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
      retry: 3000,
    });

    eventSource.onopen = () => {
      isConnected = true;
    };
    eventSource.onerror = () => {
      isConnected = false;
    };

    eventSource.addEventListener('translation:success', ({ data }) => {
      data = parseSSEData(data);
      console.log('SSE:translation:success', data);

      toggleNotification({
        type: 'success',
        message: formatMessage(
          {
            id: getTranslation('translate.success'),
            defaultMessage:
              'Translation was successful. Model: "{model}". Target locale: "{locale}"',
          },
          data
        ),
        timeout: 3000,
        blockTransition: true,
      });
    });

    eventSource.addEventListener('translation:failure', ({ data }) => {
      data = parseSSEData(data);
      console.log('SSE:translation:failure', data);

      toggleNotification({
        type: 'danger',
        message: formatMessage(
          {
            id: getTranslation('translate.failure'),
            defaultMessage:
              'Translation was not successful. See backend console for details. Model: "{model}". Target locale: "{locale}"',
          },
          data
        ),
        timeout: 3000,
        blockTransition: true,
      });
    });
  }

  return <AiIcon />;
};

export { PluginIcon };
