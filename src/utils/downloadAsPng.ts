async function renderWithTitle(elementId: string, title: string): Promise<string | null> {
  const el = document.getElementById(elementId);
  if (!el) return null;
  const { toPng } = await import('html-to-image');
  const dataUrl = await toPng(el, { pixelRatio: 2, backgroundColor: '#ffffff' });
  const img = new Image();
  await new Promise<void>((resolve) => { img.onload = () => resolve(); img.src = dataUrl; });
  const titleHeight = 36;
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height + titleHeight * 2;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillStyle = '#111827';
  ctx.textAlign = 'center';
  ctx.fillText(title, canvas.width / 2, titleHeight);
  ctx.drawImage(img, 0, titleHeight * 2);
  return canvas.toDataURL('image/png');
}

/** Capture a chart div as a PNG data URL (for ZIP download). */
export async function captureChartAsPng(elementId: string, title: string): Promise<string | null> {
  return renderWithTitle(elementId, title);
}

export async function downloadAsPng(elementId: string, title: string): Promise<void> {
  const dataUrl = await renderWithTitle(elementId, title);
  if (!dataUrl) return;
  const link = document.createElement('a');
  link.download = `${title}.png`;
  link.href = dataUrl;
  link.click();
}
