// src/components/common/SectionCard.jsx
import { Card, CardContent, Stack, Typography, alpha, useTheme } from '@mui/material';

export default function SectionCard({ title, subtitle, actions, children, height, dense=false }) {
  const theme = useTheme();
  return (
    <Card
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        height: height || 'auto',
        bgcolor: (t) => alpha(t.palette.background.paper, 0.85),
        backdropFilter: 'blur(6px)',
      }}
    >
      <CardContent sx={{ p: dense ? 2 : 3 }}>
        {(title || actions || subtitle) && (
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 2 }}>
            <Stack spacing={0.25}>
              {title && <Typography variant="h6" fontWeight={700}>{title}</Typography>}
              {subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
            </Stack>
            {actions}
          </Stack>
        )}
        {children}
      </CardContent>
    </Card>
  );
}
