import { Table, Thead, Tbody, Tr, Th, Td, Typography, IconButton } from '@strapi/design-system';
import { Pencil } from '@strapi/icons';
import { VisuallyHidden } from "@strapi/design-system"
import { Flex } from "@strapi/design-system"
import { useIntl } from "react-intl"
import { getTranslation } from "../utils/getTranslation"
import { useNavigate } from "react-router-dom"
import { PLUGIN_ID } from "../pluginId"
import type { AnyDocument } from "@strapi/types/dist/modules/documents"
import { Badge } from "@strapi/design-system"

const TABLE_HEADERS = [
  {
    name: 'provider',
    label: {
      id: getTranslation('settings.aiProviders.headers.provider'),
      defaultMessage: 'Provider',
    },
    sortable: true,
  },
  {
    name: 'default',
    label: {
      id: getTranslation('settings.aiProviders.headers.default'),
      defaultMessage: 'Default',
    },
    sortable: false,
  },
  {
    name: 'enabled',
    label: {
      id: getTranslation('settings.aiProviders.headers.enabled'),
      defaultMessage: 'Enabled',
    },
    sortable: false,
  },
  {
    name: 'action',
    label: {
      id: getTranslation('settings.aiProviders.headers.actions'),
      defaultMessage: 'Actions',
    },
    sortable: false,
  },
] as const;

const ProviderList = (options: {
  permissions: {
    canEdit: boolean
  },
  providers: AnyDocument[]
  isLoading: boolean
}) => {
  const { canEdit } = options.permissions
  const { providers } = options
  const { formatMessage } = useIntl();
  const navigate = useNavigate()

  return (
    <Table colCount={5} rowCount={providers.length}>
      <Thead>
        <Tr>
          {TABLE_HEADERS.map(header => (
            <Th key={header.name}>
              {
                header.name === 'action' ? (
                  <VisuallyHidden>{ formatMessage(header.label) }</VisuallyHidden>
                ): (
                  <Typography variant="sigma">{ formatMessage(header.label) }</Typography>
                )
              }                
            </Th>
          ))}
        </Tr>
      </Thead>
      <Tbody>
        {providers.map((provider) => (
          <Tr key={provider.id}>
            <Td><Badge textColor="neutral800">{provider.provider}</Badge></Td>
            <Td><Badge textColor="neutral800" backgroundColor={provider.isDefault ? 'success500' : 'primary500'}>{
                provider.isDefault ? formatMessage({
                id: getTranslation('yes'),
                defaultMessage: 'Yes'
              }) : formatMessage({
                id: getTranslation('no'),
                defaultMessage: 'No'
              })
            }
            </Badge></Td>
            <Td><Badge textColor="neutral800" backgroundColor={provider.enabled ? 'success500' : 'danger500'}>{
              provider.enabled ? formatMessage({
                id: getTranslation('yes'),
                defaultMessage: 'Yes'
              }) : formatMessage({
                id: getTranslation('no'),
                defaultMessage: 'No'
              })}
            </Badge></Td>
            <Td>
              {
                <Flex justifyContent={'flex-end'}>
                  {
                    canEdit && (
                      <IconButton onClick={() => {
                        navigate({pathname: `/settings/${PLUGIN_ID}/providers/edit/${provider.documentId}`})
                      }} label="Edit" borderWidth={0}>
                        <Pencil />
                      </IconButton>
                    )
                  }
                </Flex>
              }
              </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  )
};

export default ProviderList;