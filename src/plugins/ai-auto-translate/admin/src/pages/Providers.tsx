import { useIntl } from 'react-intl';
import { PLUGIN_ID } from '../pluginId';
import ProviderList from "../components/ProviderList"
import { Layouts, Page, useFetchClient, useQueryParams } from "@strapi/admin/strapi-admin"
import pluginPermissions from "../permissions"
import { LinkButton } from "@strapi/design-system"
import { List } from "@strapi/icons"
import { Link, useLocation } from "react-router-dom"
import { useEffect, useState } from "react"
import { EmptyStateLayout } from "@strapi/design-system"
import { EmptyDocuments } from '@strapi/icons/symbols';
import { getTranslation } from "../utils/getTranslation"
import { Routes, Route, useMatch } from "react-router-dom"
import EditProvider from "../components/ProviderEdit"

const Providers = () => {
  const { formatMessage } = useIntl();
  const fetchClient = useFetchClient();
  const location = useLocation();
  const [{ query }] = useQueryParams();

  const [providers, setProviders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false)

  // Detect if we are on the edit route
  const isEditRoute = useMatch(`/settings/${PLUGIN_ID}/providers/edit/:id`);

  const loadProviders = async () => {
    setIsLoading(true)
    await fetchClient.get(`/${PLUGIN_ID}/providers`).then(data => {
      setProviders(data.data);
    }).finally(() => {
      setIsLoading(false)
    })
  };

  useEffect(() => {
    if (isEditRoute) {
      return
    }
    loadProviders();
  }, [location.pathname, query]);

  // console.log(allowedActions)

  return (
    // Temporarily disable permisision checks as it isn't working.
    // The use of `useRBAC` is also causing errors.
    // <Page.Protect permissions={pluginPermissions.listAiProviders}>
    <>
      <Page.Title>
        {isEditRoute
          ? formatMessage({ id: getTranslation('settings.aiProviders.edit'), defaultMessage: 'Edit AI Provider' })
          : formatMessage({ id: getTranslation('settings.aiProviders'), defaultMessage: 'Manage AI providers and their credentials' })
        }
      </Page.Title>

      <Layouts.Header
        title={isEditRoute
          ? formatMessage({ id: getTranslation('settings.aiProviders.edit'), defaultMessage: 'Edit AI Provider' })
          : formatMessage({ id: getTranslation('settings.aiProviders'), defaultMessage: 'Manage AI providers and their credentials' })
        }
        subtitle={isEditRoute
          ? formatMessage({
              id: getTranslation('settings.aiProviders.edit.description'),
              defaultMessage: 'Edit provider credentials and settings',
            })
          : formatMessage({
              id: getTranslation('settings.aiProviders.description'),
              defaultMessage: 'List of AI Providers',
            })
        }
        primaryAction={
          isEditRoute && (
            <LinkButton
              tag={Link}
              data-testid={`list-providers-${PLUGIN_ID}-button`}
              startIcon={<List />}
              size="S"
              to={`/settings/${PLUGIN_ID}/providers`}
            >
              {formatMessage({
                id: getTranslation('settings.aiProviders'),
                defaultMessage: 'AI Providers',
              })}
            </LinkButton>
          )
        }
      />

      <Page.Main aria-busy={isLoading}>
        <Layouts.Content>
          <Routes>
            {/* List View */}
            <Route
              path="/"
              element={
                providers.length > 0 ? (
                  <ProviderList
                    permissions={{ canEdit: true }}
                    isLoading={isLoading}
                    providers={providers}
                  />
                ) : (
                  <EmptyStateLayout
                    icon={<EmptyDocuments width="16rem" />}
                    content={formatMessage({
                      id: getTranslation('settings.aiProviders.emptyState.noProviders'),
                      defaultMessage: 'No AI provider has been created yet. This should have been created automatically.',
                    })}
                  />
                )
              }
            />

            {/* Edit View */}
            <Route path="/edit/:id" element={<EditProvider />} />
          </Routes>
        </Layouts.Content>
      </Page.Main>
    </>
  );
};

export default Providers;