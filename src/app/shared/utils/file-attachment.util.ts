export interface FileAttachmentMetadata {
  icon: string;
  typeLabel: string;
  sizeLabel: string;
  extension: string;
}

export function getFileAttachmentExtension(fileName: string): string {
  const parts = fileName.toLowerCase().split('.');
  return parts.length > 1 ? parts.at(-1) ?? '' : '';
}

export function getFileAttachmentTypeLabel(fileName: string, mimeType: string): string {
  const extension = getFileAttachmentExtension(fileName);

  if (mimeType.startsWith('image/')) {
    return 'Imagen';
  }

  if (extension === 'pdf') {
    return 'PDF';
  }

  if (extension === 'docx') {
    return 'DOCX';
  }

  if (extension === 'doc') {
    return 'DOC';
  }

  return extension ? extension.toUpperCase() : 'Archivo';
}

export function getFileAttachmentIcon(fileName: string, mimeType: string): string {
  if (mimeType.startsWith('image/')) {
    return 'image';
  }

  if (getFileAttachmentExtension(fileName) === 'pdf') {
    return 'picture_as_pdf';
  }

  return 'description';
}

export function formatFileAttachmentSize(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function resolveFileAttachmentMetadata(
  fileName: string,
  mimeType: string,
  sizeBytes: number,
): FileAttachmentMetadata {
  return {
    icon: getFileAttachmentIcon(fileName, mimeType),
    typeLabel: getFileAttachmentTypeLabel(fileName, mimeType),
    sizeLabel: formatFileAttachmentSize(sizeBytes),
    extension: getFileAttachmentExtension(fileName),
  };
}
