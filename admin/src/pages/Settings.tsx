import { Main, Box, Typography, Button } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import FieldSelector from "../components/FieldSelector"
import { getTranslation } from "../utils/getTranslation"

const Settings = () => {
  const { formatMessage } = useIntl();

  return (
    <Main>
      <Box padding={8}>
        <Typography variant="alpha">
          {formatMessage({ id: getTranslation('settings.title'), defaultMessage: 'AI Auto Translate Settings' })}
        </Typography>
        <FieldSelector />
      </Box>
    </Main>
  );
};

export default Settings;