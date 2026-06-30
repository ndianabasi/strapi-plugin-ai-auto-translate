import { useState, useEffect } from 'react';
import { Box, Typography, Checkbox, Button, Loader } from '@strapi/design-system';
import { useFetchClient, useNotification } from '@strapi/strapi/admin';
import { useIntl } from 'react-intl';
import { getTranslation } from '../utils/getTranslation';
import { PLUGIN_ID } from '../pluginId';

const FieldSelector = () => {
  const [contentTypes, setContentTypes] = useState<any[]>([]);
  const [configs, setConfigs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [componentMap, setComponentMap] = useState<Record<string, any>>({});
  const [fieldTrees, setFieldTrees] = useState<Record<string, any[]>>({});
  const [componentConfigs, setComponentConfigs] = useState<Record<string, any>>({});

  const fetchClient = useFetchClient();
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();

  // Safe recursive field tree builder (unchanged)
  const buildFieldTree = (attributes: any = {}, prefix = ''): any[] => {
    if (!attributes || typeof attributes !== 'object') return [];

    return Object.entries(attributes)
      .filter(([_, attr]: [string, any]) => {
        // Skip non-translatable field types
        const skipTypes = ['media', 'datetime', 'relation', 'password', 'uid', 'boolean'];
        return !skipTypes.includes(attr.type);
      })
      .map(([name, attr]: [string, any]) => {
        const path = prefix ? `${prefix}.${name}` : name;

        const field: any = {
          name,
          path,
          label: attr.label || name,
          type: attr.type || 'unknown',
          fields: null,
        };

        if (attr.type === 'component') {
          const compUid = attr.component; // string UID
          const compAttrs = componentMap[compUid] || {};
          field.fields = buildFieldTree(compAttrs, path);
        } else if (attr.type === 'repeatable' && attr.component) {
          const compUid = attr.component;
          const compAttrs = componentMap[compUid] || {};
          field.fields = buildFieldTree(compAttrs, path);
        } else if (attr.type === 'dynamiczone' && Array.isArray(attr.components)) {
          field.fields = attr.components.flatMap((comp: any) =>
            buildFieldTree(comp.attributes || {}, path)
          );
        }

        return field;
      });
  };

  // Load content types + saved configs
  useEffect(() => {
    const loadAll = async () => {
      try {
        const [ctRes, configRes, componentRes] = await Promise.all([
          fetchClient.get('/content-type-builder/content-types'),
          fetchClient.get(`/${PLUGIN_ID}/config`),
          fetchClient.get('/content-type-builder/components'),
        ]);

        // Stricter filter + safety check
        const localized = ctRes.data.data.filter(
          (ct: any) =>
            ct.schema?.pluginOptions?.i18n?.localized === true &&
            ct.schema?.attributes &&
            Object.keys(ct.schema.attributes).length > 0
        );

        const configMap = (configRes.data || []).reduce((acc: any, c: any) => {
          acc[c.contentType] = c;
          return acc;
        }, {});

        // Separate component configs
        const compConfigMap: Record<string, any> = {};
        Object.values(configMap).forEach((c: any) => {
          if (c.isComponent) compConfigMap[c.contentType] = c;
        });

        const map: Record<string, any> = {};
        componentRes.data.data.forEach((comp: any) => {
          map[comp.uid] = comp.schema?.attributes || {};
        });

        setContentTypes(localized);
        setConfigs(configMap);
        setComponentConfigs(compConfigMap);
        setComponentMap(map);

        // Build and cache field trees once
        const trees: Record<string, any[]> = {};
        localized.forEach((ct: any) => {
          trees[ct.uid] = buildFieldTree(ct.schema.attributes);
        });
        setFieldTrees(trees);
      } catch (err) {
        console.error('Failed to load data', err);
        toggleNotification({
          type: 'danger',
          message: formatMessage({
            id: getTranslation('settings.fetchConfigurationsError'),
            defaultMessage: 'Failed to fetch configurations',
          }),
          timeout: 5000,
        });
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, [fetchClient]);

  const toggleField = (ctUid: string, fieldPath: string) => {
    setConfigs((prev) => {
      const current = prev[ctUid] || { contentType: ctUid, enabled: true, translatableFields: [] };
      const fields = current.translatableFields || [];
      const newFields = fields.includes(fieldPath)
        ? fields.filter((f: string) => f !== fieldPath)
        : [...fields, fieldPath];

      return {
        ...prev,
        [ctUid]: { ...current, translatableFields: newFields },
      };
    });
  };

  const toggleAll = (ctUid: string, selectAll: boolean) => {
    setConfigs((prev) => {
      const current = prev[ctUid] || { contentType: ctUid, enabled: true, translatableFields: [] };
      const tree = fieldTrees[ctUid] || [];
      const allPaths = tree.flatMap((f: any) =>
        f.fields ? [f.path, ...f.fields.flatMap((sf: any) => sf.path || [])] : [f.path]
      );

      return {
        ...prev,
        [ctUid]: {
          ...current,
          translatableFields: selectAll ? allPaths : [],
        },
      };
    });
  };

  const toggleAllComponent = (compUid: string, selectAll: boolean) => {
    setComponentConfigs((prev) => {
      const current = prev[compUid] || {
        contentType: compUid,
        isComponent: true,
        translatableFields: [],
      };
      const fields = buildFieldTree(componentMap[compUid] || {});
      const allPaths = fields.flatMap((f: any) =>
        f.fields ? [f.path, ...f.fields.flatMap((sf: any) => sf.path || [])] : [f.path]
      );

      return {
        ...prev,
        [compUid]: {
          ...current,
          translatableFields: selectAll ? allPaths : [],
        },
      };
    });
  };

  // Central component toggle
  const toggleComponentField = (compUid: string, fieldPath: string) => {
    setComponentConfigs((prev) => {
      const current = prev[compUid] || {
        contentType: compUid,
        isComponent: true,
        translatableFields: [],
      };
      const fields = current.translatableFields || [];
      const newFields = fields.includes(fieldPath)
        ? fields.filter((f: string) => f !== fieldPath)
        : [...fields, fieldPath];

      return {
        ...prev,
        [compUid]: { ...current, translatableFields: newFields },
      };
    });
  };

  const saveAll = async () => {
    try {
      await Promise.all(
        Object.values(configs).map((config) => fetchClient.post(`/${PLUGIN_ID}/config`, config))
      );
      // Also save component configs
      await Promise.all(
        Object.values(componentConfigs).map((config) =>
          fetchClient.post(`/${PLUGIN_ID}/config`, config)
        )
      );

      toggleNotification({
        type: 'success',
        message: formatMessage({
          id: getTranslation('settings.saveSuccess'),
          defaultMessage: 'All configurations saved successfully!',
        }),
        timeout: 3000,
      });
    } catch (err) {
      console.error(err);
      toggleNotification({
        type: 'warning',
        message: formatMessage({
          id: getTranslation('settings.saveError'),
          defaultMessage: 'Failed to save configurations',
        }),
        timeout: 5000,
      });
    }
  };

  if (loading) return <Loader />;

  return (
    <Box marginTop={6}>
      {/* === Content Types Section (existing) === */}
      {contentTypes.map((ct) => {
        const config = configs[ct.uid] || { translatableFields: [] };
        return (
          <Box
            key={ct.uid}
            marginBottom={8}
            padding={6}
            background="neutral0"
            borderRadius="4px"
            borderColor="neutral200"
          >
            <Typography variant="beta">
              {(ct.schema?.info?.displayName ?? ct.schema?.displayName) || 'Unknown Content'}
            </Typography>

            <Box marginTop={4}>
              <RecursiveFieldTree
                key={configs[ct.uid]?.translatableFields?.length || 0}
                fields={fieldTrees[ct.uid] || []}
                selected={config.translatableFields || []}
                onChange={(path: string) => toggleField(ct.uid, path)}
                isComponentField={false}
                isGlobalComponent={false}
              />
            </Box>

            {/* Render embedded components as disabled + show name */}
            {Object.entries(ct.schema.attributes).map(([fieldName, attr]: [string, any]) => {
              if (attr.type === 'component' || attr.type === 'repeatable') {
                const compUid = attr.component;
                const compConfig = componentConfigs[compUid] || { translatableFields: [] };
                const compFields = buildFieldTree(componentMap[compUid] || {});

                return (
                  <Box key={fieldName} marginTop={4} paddingLeft={4}>
                    <Typography variant="omega" textColor="neutral600">
                      Component: <strong>{compUid}</strong> ({fieldName})
                    </Typography>
                    <RecursiveFieldTree
                      fields={compFields}
                      selected={compConfig.translatableFields || []}
                      onChange={() => {}} // disabled
                      isComponentField={true}
                      isGlobalComponent={false}
                    />
                  </Box>
                );
              }
              return null;
            })}

            <Box marginTop={4} display="flex">
              <Button variant="secondary" onClick={() => toggleAll(ct.uid, true)}>
                {formatMessage({
                  id: getTranslation('settings.selectAllFields'),
                  defaultMessage: 'Select All Fields',
                })}
              </Button>
              <Button variant="secondary" onClick={() => toggleAll(ct.uid, false)} marginLeft={2}>
                {formatMessage({
                  id: getTranslation('settings.deselectAllFields'),
                  defaultMessage: 'Deselect All Fields',
                })}
              </Button>
            </Box>
          </Box>
        );
      })}

      {/* === Global Component Configurations (Centralized) === */}
      <Box marginTop={10}>
        <Typography variant="alpha">Global Component Configurations</Typography>
        {Object.keys(componentMap).map((compUid) => {
          const config = componentConfigs[compUid] || { translatableFields: [] };
          const fields = buildFieldTree(componentMap[compUid]);

          return (
            <Box
              key={compUid}
              marginTop={6}
              padding={4}
              background="neutral0"
              borderRadius="4px"
              borderColor="neutral200"
            >
              <Typography variant="beta">{compUid}</Typography>
              <Box marginTop={4}>
                <RecursiveFieldTree
                  fields={fields}
                  selected={config.translatableFields || []}
                  onChange={(path: string) => toggleComponentField(compUid, path)}
                  isComponentField={false}
                  isGlobalComponent={true} // enables scalar fields
                />
              </Box>

              {/* Select All / Deselect All for this component */}
              <Box marginTop={4} display="flex">
                <Button variant="secondary" onClick={() => toggleAllComponent(compUid, true)}>
                  {formatMessage({
                    id: getTranslation('settings.selectAllFields'),
                    defaultMessage: 'Select All Fields',
                  })}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => toggleAllComponent(compUid, false)}
                  marginLeft={2}
                >
                  {formatMessage({
                    id: getTranslation('settings.deselectAllFields'),
                    defaultMessage: 'Deselect All Fields',
                  })}
                </Button>
              </Box>
            </Box>
          );
        })}
      </Box>

      <Button fullWidth variant="default" onClick={saveAll} marginTop={6}>
        {formatMessage({
          id: getTranslation('settings.saveAll'),
          defaultMessage: 'Save All Configurations',
        })}
      </Button>
    </Box>
  );
};

// RecursiveFieldTree supports disabled state for component fields
const RecursiveFieldTree = ({
  fields,
  selected,
  onChange,
  level = 0,
  isComponentField = false,
  isGlobalComponent = false,
}: any) => (
  <Box paddingLeft={level * 4}>
    {fields.map((field: any) => {
      const isSubComponent =
        field.type === 'component' || field.type === 'repeatable' || field.type === 'dynamiczone';
      // In Global Component section:
      // - scalar fields -> enabled
      // - sub-component entries -> disabled (configured centrally in their own section)
      const disabled = isComponentField || (isGlobalComponent && isSubComponent);

      return (
        <Box key={field.path} marginBottom={2}>
          <Checkbox
            name={field.path}
            checked={selected.includes(field.path)}
            onCheckedChange={() => onChange(field.path)}
            disabled={disabled}
          >
            {field.label}{' '}
            <Typography variant="omega" textColor="neutral600">
              ({field.type})
            </Typography>
          </Checkbox>

          {/* Only recurse if it's a scalar field or we are in the top-level global component */}
          {field.fields && field.fields.length > 0 && !isSubComponent && (
            <RecursiveFieldTree
              fields={field.fields}
              selected={selected}
              onChange={onChange}
              level={level + 1}
              isComponentField={isComponentField}
              isGlobalComponent={isGlobalComponent}
            />
          )}
        </Box>
      );
    })}
  </Box>
);

export default FieldSelector;
