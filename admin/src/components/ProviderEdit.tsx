import * as React from 'react';
import { Flex } from '@strapi/design-system';
import { Formik, Form, FormikHelpers } from 'formik';
import { useIntl } from 'react-intl';
import { useMatch, useNavigate } from 'react-router-dom';
import {
  Page,
  useAPIErrorHandler,
  useFetchClient,
  useNotification,
  type BaseQueryError,
} from '@strapi/strapi/admin';
import { PLUGIN_ID } from '../pluginId';
import { getTranslation } from '../utils/getTranslation';
import * as Yup from 'yup';
import { Typography } from '@strapi/design-system';
import { Grid } from '@strapi/design-system';
import { Field } from '@strapi/design-system';
import { TextInput } from '@strapi/design-system';
import { Toggle } from '@strapi/design-system';
import { Button } from '@strapi/design-system';

const EditProvider = () => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const fetchClient = useFetchClient();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const navigate = useNavigate();

  const match = useMatch(`/settings/${PLUGIN_ID}/providers/edit/:id`);
  const id = match?.params?.id;

  const [provider, setProvider] = React.useState<any>(null);

  // Load provider
  React.useEffect(() => {
    if (!id) return;

    const loadProvider = async () => {
      try {
        const { data } = await fetchClient.get(`/${PLUGIN_ID}/providers/${id}`);
        setProvider(data);
      } catch (err) {
        toggleNotification({
          type: 'danger',
          message: formatAPIError(err as BaseQueryError),
        });
      }
    };

    loadProvider();
  }, [id, fetchClient, toggleNotification, formatAPIError]);

  const validationSchema = Yup.object({
    apiKey: Yup.string().required('API Key is required'),
    teamId: Yup.string().nullable(),
    mgmtApiKey: Yup.string().nullable(),
    enabled: Yup.boolean().default(true),
    isDefault: Yup.boolean().default(false),
  });

  type FormSchema = Yup.InferType<typeof validationSchema>;

  const handleSubmit = async (values: FormSchema, actions?: FormikHelpers<FormSchema>) => {
    try {
      await fetchClient.put(`/${PLUGIN_ID}/providers/${id}`, {
        ...values,
        provider: provider.provider,
      });

      toggleNotification({
        type: 'success',
        message: formatMessage({
          id: getTranslation('settings.aiProviders.edit.update'),
          defaultMessage: 'Provider updated successfully',
        }),
      });

      // Go back to list
      navigate({ pathname: `/settings/${PLUGIN_ID}/providers` });
    } catch (err) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(err as BaseQueryError),
      });
    } finally {
      actions?.setSubmitting(false);
    }
  };

  if (!provider) {
    return <Page.Loading />;
  }

  return (
    <Formik
      validationSchema={validationSchema}
      initialValues={{
        apiKey: provider.apiKey || '',
        teamId: provider.teamId || '',
        mgmtApiKey: provider.mgmtApiKey || '',
        enabled: provider.enabled ?? true,
        isDefault: provider.isDefault ?? false,
      }}
      enableReinitialize
      onSubmit={(body, actions) => handleSubmit(body, actions)}
    >
      {({ errors, handleChange, isSubmitting, values }) => (
        <Form>
          <Flex direction="column" alignItems="stretch" gap={6}>
            {/* Provider name (read-only) */}
            <Flex gap={2} direction="row" alignItems="center">
              <Typography variant="sigma">
                {formatMessage({
                  id: getTranslation('settings.aiProviders.provider'),
                  defaultMessage: 'Provider',
                })}{' '}
                :
              </Typography>
              <Typography variant="sigma" textColor="neutral800">
                {provider.provider}
              </Typography>
            </Flex>

            <Grid.Root gap={5}>
              {/* API Key */}
              <Grid.Item key="apiKey" m={6} xs={12} direction="column" alignItems="stretch">
                <Field.Root
                  id="apiKey"
                  error={errors.apiKey ? `` : undefined}
                  hint="API key is required"
                >
                  <Field.Label>
                    {formatMessage({
                      id: getTranslation('settings.aiProviders.edit.label.apiKey'),
                      defaultMessage: 'API Key (required)',
                    })}
                  </Field.Label>
                  <TextInput
                    placeholder="xai-..."
                    name="apiKey"
                    type="text"
                    autoComplete="one-time-code"
                    onChange={handleChange}
                    value={values.apiKey}
                  />
                  <Field.Error />
                  <Field.Hint />
                </Field.Root>
              </Grid.Item>

              {/* Team ID (optional) */}
              <Grid.Item key="teamId" m={6} xs={12} direction="column" alignItems="stretch">
                <Field.Root id="teamId">
                  <Field.Label>
                    {formatMessage({
                      id: getTranslation('settings.aiProviders.edit.label.teamId'),
                      defaultMessage: 'Team ID (optional)',
                    })}
                  </Field.Label>
                  <TextInput
                    placeholder="team_..."
                    name="teamId"
                    type="text"
                    autoComplete="one-time-code"
                    onChange={handleChange}
                    value={values.teamId}
                  />
                </Field.Root>
              </Grid.Item>

              {/* Management API Key (optional) */}
              <Grid.Item key="mgmtApiKey" m={6} xs={12} direction="column" alignItems="stretch">
                <Field.Root id="mgmtApiKey">
                  <Field.Label>
                    {formatMessage({
                      id: getTranslation('settings.aiProviders.edit.label.mgmtApiKey'),
                      defaultMessage: 'Management API Key (optional)',
                    })}
                  </Field.Label>
                  <TextInput
                    placeholder="token_..."
                    name="mgmtApiKey"
                    type="text"
                    autoComplete="one-time-code"
                    onChange={handleChange}
                    value={values.mgmtApiKey}
                  />
                </Field.Root>
              </Grid.Item>

              {/* Enabled */}
              <Grid.Item key="enabled" m={6} xs={12} direction="column" alignItems="stretch">
                <Field.Root id="enabled">
                  <Field.Label>
                    {formatMessage({
                      id: getTranslation('settings.aiProviders.edit.label.enabled'),
                      defaultMessage: 'Enabled?',
                    })}
                  </Field.Label>
                  <Toggle
                    onLabel="Yes"
                    offLabel="No"
                    onChange={handleChange}
                    checked={values.enabled}
                  />
                </Field.Root>
              </Grid.Item>

              {/* Is Default */}
              <Grid.Item key="isDefault" m={6} xs={12} direction="column" alignItems="stretch">
                <Field.Root id="isDefault">
                  <Field.Label>
                    {formatMessage({
                      id: getTranslation('settings.aiProviders.edit.label.isDefault'),
                      defaultMessage: 'Is Default?',
                    })}
                  </Field.Label>
                  <Toggle
                    onLabel="Yes"
                    offLabel="No"
                    onChange={handleChange}
                    checked={values.isDefault}
                  />
                </Field.Root>
              </Grid.Item>
            </Grid.Root>

            <Button loading={isSubmitting} type="submit" disabled={isSubmitting}>
              {formatMessage({
                id: getTranslation('save'),
                defaultMessage: 'Save',
              })}
            </Button>
          </Flex>
        </Form>
      )}
    </Formik>
  );
};

export default EditProvider;
