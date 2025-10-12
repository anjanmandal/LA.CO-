import { useCallback, useRef, useState } from 'react';
import { Box, Stack, Typography, Button, alpha } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

/**
 * Accessible drag-and-drop zone for files (CSV).
 * @param {{ onFiles: (files: FileList|File[])=>void, accept?: string }}
 */
export default function FileDropZone({ onFiles, accept = '.csv' }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const files = e.dataTransfer?.files;
      if (files?.length) onFiles(files);
    },
    [onFiles]
  );

  const openPicker = () => inputRef.current?.click();

  return (
    <Box
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      onClick={openPicker}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openPicker(); }}
      role="button"
      aria-label="Drop CSV file here or click to choose"
      tabIndex={0}
      sx={{
        p: 3,
        borderRadius: 3,
        textAlign: 'center',
        border: '2px dashed',
        borderColor: dragOver ? 'primary.main' : 'divider',
        bgcolor: (t) => (dragOver ? alpha(t.palette.primary.main, 0.06) : 'transparent'),
        transition: 'all .2s',
        cursor: 'pointer',
      }}
    >
      <Stack spacing={1} alignItems="center">
        <CloudUploadIcon color={dragOver ? 'primary' : 'disabled'} />
        <Typography variant="subtitle1">Drag & drop your CSV here</Typography>
        <Typography variant="body2" color="text.secondary">…or click to choose a file</Typography>
      </Stack>

      <input
        ref={inputRef}
        hidden
        type="file"
        accept={accept}
        onChange={(e) => e.target.files && onFiles(e.target.files)}
      />
    </Box>
  );
}
