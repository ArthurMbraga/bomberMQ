export function getOscillation([min, max]: [number, number], speed: number) {
  return min + (max - min) * 0.5 * (Math.sin(time() * speed) + 1);
}
