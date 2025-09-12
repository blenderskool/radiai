import { clamp } from 'three/src/math/MathUtils.js';

export const mapRange = (
  value: number,
  [fromMin, fromMax]: [number, number],
  [toMin, toMax]: [number, number],
  shouldClamp: boolean = true
) => {
  const result =
    toMin + ((value - fromMin) * (toMax - toMin)) / (fromMax - fromMin);

  if (shouldClamp) {
    return clamp(result, toMin, toMax);
  }

  return result;
};
