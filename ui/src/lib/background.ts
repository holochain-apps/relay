export function setBackgroundColor(backgroundColor: string): () => void {
  // Save current bg color
  const current = document.body.style["background-color" as any];
  const reset = () =>
    (document.body.style["background-color" as any] = current);

  // Update bg color
  document.body.style["background-color" as any] = backgroundColor;

  return reset;
}
