export async function copyText(
  value: string,
  clipboard: Pick<Clipboard, 'writeText'> | undefined,
) {
  if (!clipboard)
    throw new Error('Clipboard unavailable. Select and copy the text below.');
  try {
    await clipboard.writeText(value);
  } catch {
    throw new Error('Copy failed. Select and copy the text below.');
  }
}
