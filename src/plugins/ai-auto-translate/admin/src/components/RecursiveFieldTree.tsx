import { Box, Typography, Checkbox } from '@strapi/design-system';


const RecursiveFieldTree = ({ fields, selected, onChange, level = 0 }: any) => {
  return (
    <Box paddingLeft={level * 4}>
      {fields.map((field: any) => {
        const path = field.path || field.name;
        const isChecked = selected.includes(path);

        return (
          <Box key={path} marginBottom={2}>
            <Checkbox
              name={path}
              checked={isChecked}
              onCheckedChange={() => onChange(path)}
            >
              {field.label || field.name}
              {field.type && <Typography variant="omega" textColor="neutral600"> ({field.type})</Typography>}
            </Checkbox>

            {/* Recurse into components / dynamic zones */}
            {field.fields && (
              <RecursiveFieldTree
                fields={field.fields}
                selected={selected}
                onChange={onChange}
                level={level + 1}
              />
            )}
          </Box>
        );
      })}
    </Box>
  );
};

export default RecursiveFieldTree;